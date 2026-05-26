import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

// 讀取 .env.local 中的環境變數到 process.env (供本地開發使用)
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf-8');
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

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'local-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/chat') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { provider, messages, customSystemInstruction } = JSON.parse(body);
                  const systemInstructionValue = customSystemInstruction || `你是一位專業、親切、有耐心的虛擬客服助理。
請遵循以下規則來回答使用者的問題：
1. 必須使用親切友善的「繁體中文（台灣）」進行回覆，常用詞彙如「您好」、「謝謝」、「請」等。
2. 回答內容應條理清晰、切中要點，可適當使用條列式、粗體字來提高可讀性。
3. 如果使用者詢問不清楚或資訊不足的問題，請委婉地請其提供更多細節。
4. 保持專業、客觀與耐心的客服態度，對於不理性或不友善的提問，仍需維持禮貌性的回覆。
5. 每次回覆字數儘量精簡，控制在 150 - 300 字內，避免冗長贅述。`;

                  if (provider === 'nvidia') {
                    const apiKey = process.env.NVIDIA_API_KEY;
                    if (!apiKey || apiKey === '你的_NVIDIA_API_Key') {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: '找不到有效的 NVIDIA_API_KEY。請確認本地 .env.local 中的金鑰是否已填寫。' }));
                      return;
                    }

                    const formattedMessages = [
                      { role: 'system', content: systemInstructionValue },
                      ...messages.map((msg: any) => ({
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        content: msg.text || '',
                      })),
                    ];

                    const nvResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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

                    if (!nvResponse.ok) {
                      const errorText = await nvResponse.text();
                      res.statusCode = nvResponse.status;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: `NVIDIA API 錯誤: ${errorText}` }));
                      return;
                    }

                    const data = await nvResponse.json();
                    const reply = data.choices?.[0]?.message?.content || '抱歉，我暫時無法回答您的問題。';
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ reply }));

                  } else {
                    // Default to Gemini
                    const apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey || apiKey === '你的_Gemini_API_Key') {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: '找不到有效的 GEMINI_API_KEY。請確認本地 .env.local 中的金鑰是否已填寫。' }));
                      return;
                    }

                    const aiClient = new GoogleGenAI({
                      apiKey: apiKey,
                      httpOptions: {
                        headers: {
                          'User-Agent': 'aistudio-build',
                        },
                      },
                    });

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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ reply }));
                  }
                } catch (error: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: error?.message || '內部伺服器錯誤。' }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
