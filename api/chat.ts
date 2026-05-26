import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// 本地開發時若金鑰不存在，嘗試手動從根目錄的 .env.local 載入 (相容 vercel dev)
if (!process.env.GEMINI_API_KEY || !process.env.NVIDIA_API_KEY) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          if (key) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.error('無法讀取本地 .env.local 檔案:', e);
  }
}

// 預設系統提示詞（客服問答規則）
const DEFAULT_SYSTEM_INSTRUCTION = `你是一位專業、親切、有耐心的虛擬客服助理。
請遵循以下規則來回答使用者的問題：
1. 必須使用親切友善的「繁體中文（台灣）」進行回覆，常用詞彙如「您好」、「謝謝」、「請」等。
2. 回答內容應條理清晰、切中要點，可適當使用條列式、粗體字來提高可讀性。
3. 如果使用者詢問不清楚或資訊不足的問題，請委婉地請其提供更多細節。
4. 保持專業、客觀與耐心的客服態度，對於不理性或不友善的提問，仍需維持禮貌性的回覆。
5. 每次回覆字數儘量精簡，控制在 150 - 300 字內，避免冗長贅述。`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, messages, customSystemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '無效的 messages 格式。' });
    }

    const systemInstructionValue = customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

    // 根據選擇的 AI 提供商進行路由
    if (provider === 'nvidia') {
      const apiKey = process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: '找不到 NVIDIA_API_KEY。請在 Vercel 後台設定環境變數，或確認本地的 .env.local 已正確載入。'
        });
      }

      // NVIDIA API 為 OpenAI 相容格式，格式化對話紀錄
      const formattedMessages = [
        { role: 'system', content: systemInstructionValue },
        ...messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text || '',
        })),
      ];

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-mini-4b-instruct',
          messages: formattedMessages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NVIDIA API 回傳錯誤:', errorText);
        return res.status(response.status).json({
          error: `NVIDIA API 錯誤 (狀態碼 ${response.status}): ${response.statusText}`
        });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '抱歉，我暫時無法回答您的問題。';
      return res.status(200).json({ reply });

    } else {
      // 預設為 Google Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: '找不到 GEMINI_API_KEY。請在 Vercel 後台設定環境變數，或確認本地的 .env.local 已正確載入。'
        });
      }

      const aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // 格式化對話紀錄為 Gemini SDK 格式
      const contents = messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || '' }],
      }));

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents,
        config: {
          systemInstruction: systemInstructionValue,
          temperature: 0.7,
        },
      });

      const reply = response.text || '抱歉，我暫時無法回答您的問題。';
      return res.status(200).json({ reply });
    }
  } catch (error: any) {
    console.error('Serverless Function 執行錯誤:', error);
    return res.status(500).json({ error: error?.message || '內部伺服器錯誤。' });
  }
}
