import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  ShoppingBag,
  Wrench,
  HeartHandshake,
  Settings,
  X,
  Menu,
  ChevronDown,
  ChevronUp,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Message, PresetScenario } from "./types";
import { PRESET_SCENARIOS } from "./constants";
import { MessageItem } from "./components/MessageItem";
import { LoadingIndicator } from "./components/LoadingIndicator";

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("techshop");
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>(" ");
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI 服務提供商狀態
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "nvidia">("gemini");
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState<boolean>(false);
  
  // 用於行動端控制 Sidebar 展開
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 取得目前選取的場景
  const currentScenario =
    PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  const agentConfig: Record<string, { name: string; sub: string; avatarChar: string }> = {
    techshop: { name: "TechShop 客服：小幫手", sub: "親切貼心的網購小幫手", avatarChar: "幫" },
    general: { name: "智能客服：阿創", sub: "企業業務諮詢專家", avatarChar: "創" },
    tech: { name: "技術專家：小維", sub: "障礙排除與操作系統引導", avatarChar: "維" }
  };

  const getWelcomeMessage = (scenarioId: string): string => {
    switch (scenarioId) {
      case "techshop":
        return "您好！我是 TechShop 的購物客服「小幫手」。🛒\n高興為您服務！不論您想詢問關於**訂單出貨進度**、**修改與取消時限**、**退換貨條件流程**、**免運與運費計算**、**3C 商品保固**等事項，我都可以協助您喔！\n\n請問今天有什麼我可以協助您的問題嗎？😊";
      case "tech":
        return "工程師您好！我是您的專屬技術支援客服。🛠️\n此場景專門解決系統配置與使用障礙。請儘可能描述您遇到的具體障礙（如：*密碼重設、API 錯誤、同步失敗*），我將為您提供條理分明的步驟指引。";
      case "general":
      default:
        return "您好！我是「創智無限科技有限公司」的專屬虛擬客服專員。🤝\n很高興為您服務！不論您想了解我們的**服務範圍**、**營業時間**，或是想尋找**真人客服的聯絡方式**，都可直接在此對話諮詢。";
    }
  };

  const getInitialWelcomeMessage = (scenarioId: string): Message => {
    return {
      id: `welcome-${scenarioId}`,
      role: "model",
      text: getWelcomeMessage(scenarioId),
      timestamp: new Date().toISOString(),
    };
  };

  // 1. 初始化系統指示與對話紀錄
  useEffect(() => {
    setCustomInstruction(currentScenario.systemInstruction);

    const cached = localStorage.getItem(`chat_history_${selectedScenarioId}`);
    if (cached) {
      try {
        setMessages(JSON.parse(cached));
      } catch (err) {
        setMessages([getInitialWelcomeMessage(selectedScenarioId)]);
      }
    } else {
      setMessages([getInitialWelcomeMessage(selectedScenarioId)]);
    }
    setError(null);
  }, [selectedScenarioId]);

  // 2. 儲存至 LocalStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${selectedScenarioId}`, JSON.stringify(messages));
    }
  }, [messages, selectedScenarioId]);

  // 3. 滾動置底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 送出訊息
  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    setError(null);

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          messages: updatedMessages,
          customSystemInstruction: customInstruction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `連線伺服器失敗，狀態碼: ${response.status}`);
      }

      const data = await response.json();

      const modelMessage: Message = {
        id: `msg-${Date.now()}-model`,
        role: "model",
        text: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "無法與智能客服建立安全連線。請確認 API 金鑰是否已正確設定。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("確定要清除與此客服專家的所有舊有對話歷史嗎？")) {
      const initial = getInitialWelcomeMessage(selectedScenarioId);
      setMessages([initial]);
      localStorage.removeItem(`chat_history_${selectedScenarioId}`);
      setError(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const currentAgent = agentConfig[selectedScenarioId] || agentConfig.general;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "ShoppingBag":
        return <ShoppingBag className="w-4 h-4" />;
      case "Wrench":
        return <Wrench className="w-4 h-4" />;
      case "HeartHandshake":
      default:
        return <HeartHandshake className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden text-slate-800">
      
      {/* ────────────────────────────────────────────────────────────────
          LEFT SIDEBAR: Preset Scenarios & Quick Tools
          ──────────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:relative md:translate-x-0
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-100">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">智能客服系統</h1>
          </div>
          {/* 行動端關閉按鈕 */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1 px-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 md:hidden"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Presets - Service Scenarios */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-2">
            切換客服專員頻道
          </div>
          {PRESET_SCENARIOS.map((scenario) => {
            const isActive = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedScenarioId(scenario.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-50/70 border-blue-200/65 text-blue-700 shadow-sm"
                    : "bg-white hover:bg-slate-50 border-transparent text-slate-600 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <div className={`p-1 rounded-lg ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                    {getIcon(scenario.icon)}
                  </div>
                  <span>{scenario.name}</span>
                </div>
                <span className={`text-[11px] leading-relaxed mt-0.5 ${isActive ? "text-blue-600/80" : "text-slate-400"}`}>
                  {scenario.description}
                </span>
              </button>
            );
          })}

          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className="flex w-full items-center justify-between p-2 px-3 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-slate-400" />
                <span>後台自訂指令設定</span>
              </div>
              {isSettingsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            
            {/* 折疊式的系統提示設定 (System Instruction) */}
            {isSettingsExpanded && (
              <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <p className="text-[10px] text-slate-400 leading-normal">
                  自訂底層 AI 客服角色與答覆規則，編輯完成後，後續對話將採用此系統設定。
                </p>
                <textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="w-full h-40 p-2.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="請輸入自訂角色指示..."
                />
                <button
                  onClick={() => setCustomInstruction(currentScenario.systemInstruction)}
                  className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer block select-none"
                >
                  還原為當前客服預設值
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={handleClear}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/50 rounded-xl border border-rose-100/30 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Trash2 size={13.5} />
            清除歷史對話
          </button>
        </div>
      </aside>

      {/* 遮罩，在手機端展開 Sidebar 時顯示 */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ────────────────────────────────────────────────────────────────
          RIGHT AREA: Chat Window Panel
          ──────────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col h-full min-w-0 bg-[#F8FAFC]">
        
        {/* Premium Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-5 md:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            {/* 行動端主選單切換 */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1 px-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 md:hidden cursor-pointer mr-0.5"
            >
              <Menu size={18} />
            </button>

            <div className="relative">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center">
                <div className="h-full w-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-extrabold select-none">
                  {currentAgent.avatarChar}
                </div>
              </div>
              {/* 心跳在線亮點 */}
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-green-500 animate-pulse"></div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-slate-900">{currentAgent.name}</h2>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-green-50 text-green-600">
                  隨時在線
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{currentAgent.sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-sm select-none"
              >
                <div className={`h-1.5 w-1.5 rounded-full ${selectedProvider === "gemini" ? "bg-indigo-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                <span className="hidden sm:inline">{selectedProvider === "gemini" ? "Google Gemini" : "NVIDIA Nemotron"}</span>
                <span className="inline sm:hidden">{selectedProvider === "gemini" ? "Gemini" : "NVIDIA"}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isProviderDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProviderDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProviderDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 z-50 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-900/5"
                    >
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        選擇 AI 服務提供商
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedProvider("gemini");
                          setIsProviderDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          selectedProvider === "gemini"
                            ? "bg-indigo-50/60 text-indigo-700 font-medium"
                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${selectedProvider === "gemini" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                          <Sparkles size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>Google Gemini</span>
                            {selectedProvider === "gemini" && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">gemini-2.5-flash-lite</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProvider("nvidia");
                          setIsProviderDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer mt-1 ${
                          selectedProvider === "nvidia"
                            ? "bg-emerald-50/60 text-emerald-700 font-medium"
                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${selectedProvider === "nvidia" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                          <Cpu size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>NVIDIA Nemotron</span>
                            {selectedProvider === "nvidia" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">nemotron-mini-4b</p>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* 錯誤展示區 */}
        {error && (
          <div className="m-4 mx-6 p-3.5 bg-rose-50 border border-rose-200/70 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">系統提醒：</span>
              <p className="leading-relaxed text-[11px]">{error}</p>
              <p className="mt-1 text-rose-500/80 text-[10px]">
                請確認您已在 Vercel 後台或本地環境中設定 `{selectedProvider === "gemini" ? "GEMINI_API_KEY" : "NVIDIA_API_KEY"}` 環境變數以載入 API 金鑰。
              </p>
            </div>
          </div>
        )}

        {/* Chat List Box */}
        <section className="flex-1 overflow-y-auto px-5 md:px-8 py-4 space-y-4">
          <div className="max-w-3xl mx-auto py-2">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <HelpCircle size={36} className="text-slate-300 mb-2.5 stroke-1" />
                <p className="text-xs font-medium">尚未寫入歷史。在下方打字即可向客服即時提問</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <MessageItem message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Suggestions & Text Input Form */}
        <footer className="bg-white border-t border-slate-200/80 p-4 md:p-6 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3.5">
            
            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 max-w-full">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>常見問題推薦：</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentScenario.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                    className="bg-slate-50 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-xs px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar Code */}
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1">
                <textarea
                  value={inputText === " " ? "" : inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="請輸入您的問題... (按 Enter 直接送出，Shift + Enter 換行)"
                  rows={1}
                  disabled={isLoading}
                  maxLength={1000}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 px-5 pr-14 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all resize-none h-13 overflow-y-hidden text-slate-800 placeholder-slate-400"
                />
                
                {/* 發送鍵 */}
                <button
                  onClick={() => handleSend(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  title="傳送訊息"
                  className={`absolute right-2 top-1.5 h-10 w-10 flex items-center justify-center rounded-xl text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                    !inputText.trim() || isLoading
                      ? "bg-slate-200 shadow-none text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 shadow-blue-200/50 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Send size={16} className="translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 leading-normal">
              AI 回覆僅為系統調試參考。若有任何急迫之業務諮詢與對答，請不吝聯絡本企業真人代表。
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}
