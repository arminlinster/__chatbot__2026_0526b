import React from "react";
import { Bot } from "lucide-react";

export function LoadingIndicator() {
  return (
    <div className="flex w-full gap-3 md:gap-4 my-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-[10px] text-white font-bold shrink-0 select-none animate-pulse">
        AI
      </div>

      <div className="flex flex-col items-start max-w-[80%] md:max-w-[70%]">
        <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-slate-400 font-medium">
          <span>智能客服助理</span>
          <span>•</span>
          <span>輸入中...</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-none bg-white py-3 px-4 border border-slate-100 shadow-sm">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"></div>
          </div>
          <span className="text-xs text-slate-500 font-medium">輸入中...</span>
        </div>
      </div>
    </div>
  );
}
