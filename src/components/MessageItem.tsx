import React, { useState } from "react";
import { Bot, User, Copy, Check } from "lucide-react";
import { Message } from "../types";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("無法複製文字: ", err);
    }
  };

  // 簡易的 Markdown 與 HTML 格式渲染
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, index) => {
      // 處理條列式
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      const isNumList = /^\d+\.\s/.test(line.trim());

      let processedText = line;
      if (isBullet) {
        processedText = line.trim().substring(2);
      } else if (isNumList) {
        processedText = line.trim().replace(/^\d+\.\s/, "");
      }

      // 處理 **粗體**
      const parts = processedText.split(/(\*\*.*?\*\*)/);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-neutral-900 dark:text-neutral-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={index} className="ml-5 list-disc my-1 leading-relaxed">
            {formattedParts}
          </li>
        );
      }

      if (isNumList) {
        const num = line.match(/^\d+/)?.[0] || "1";
        return (
          <li key={index} className="ml-5 list-decimal my-1 leading-relaxed" style={{ listStyleType: "decimal" }}>
            <span className="font-mono text-xs text-neutral-400 mr-1"></span>
            {formattedParts}
          </li>
        );
      }

      return (
        <p key={index} className="min-h-[1.5rem] leading-relaxed my-1">
          {formattedParts}
        </p>
      );
    });
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex w-full gap-3 md:gap-4 my-6 ease-out duration-300 animate-fade-in ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* 頭像區域 */}
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold shrink-0 transition-transform select-none ${
          isUser
            ? "bg-slate-300 text-white"
            : "bg-blue-600 text-white"
        }`}
      >
        {isUser ? "ME" : "AI"}
      </div>

      {/* 訊息氣泡 */}
      <div className={`flex flex-col max-w-[80%] md:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        {/* 角色標題與時間 */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-slate-400 font-medium">
          <span>{isUser ? "您" : "智能客服助理"}</span>
          <span>•</span>
          <span>{formattedTime}</span>
        </div>

        {/* 內文主體 */}
        <div
          className={`relative group px-4 py-3.5 rounded-2xl text-sm transition-all ${
            isUser
              ? "bg-blue-600 text-white rounded-tr-none shadow-md"
              : "bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm hover:shadow"
          }`}
        >
          <div className="whitespace-pre-wrap selection:bg-blue-200 dark:selection:bg-blue-800 selection:text-slate-900 leading-relaxed text-sm">
            {renderFormattedText(message.text)}
          </div>

          {/* 複製按鈕 */}
          <button
            onClick={handleCopy}
            title="複製此訊息"
            className={`absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-xs cursor-pointer ${
              isUser ? "text-blue-100 hover:text-white" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
