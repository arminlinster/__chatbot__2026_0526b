import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 預設系統提示詞（客服問答規則）
const DEFAULT_SYSTEM_INSTRUCTION = `你是一位專業、親切、有耐心的虛擬客服助理。
請遵循以下規則來回答使用者的問題：
1. 必須使用親切友善的「繁體中文（台灣）」進行回覆，常用詞彙如「您好」、「謝謝」、「請」等。
2. 回答內容應條理清晰、切中要點，可適當使用條列式、粗體字來提高可讀性。
3. 如果使用者詢問不清楚或資訊不足的問題，請委婉地請其提供更多細節。
4. 保持專業、客觀與耐心的客服態度，對於不理性或不友善的提問，仍需維持禮貌性的回覆。
5. 每次回覆字數儘量精簡，控制在 150 - 300 字內，避免冗長贅述。`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 聊天端點
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, customSystemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "無效的 messages 格式" });
        return;
      }

      const client = getAiClient();
      const systemInstructionValue = customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: messages,
        config: {
          systemInstruction: systemInstructionValue,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "抱歉，我暫時無法回答您的問題。";
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error?.message || "內部伺服器錯誤" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
