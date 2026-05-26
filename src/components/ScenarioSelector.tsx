import React from "react";
import { ShoppingBag, Wrench, HeartHandshake, Info } from "lucide-react";
import { PresetScenario } from "../types";
import { PRESET_SCENARIOS } from "../constants";

interface ScenarioSelectorProps {
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  customInstruction: string;
  onInstructionChange: (val: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ScenarioSelector({
  selectedScenarioId,
  onSelectScenario,
  customInstruction,
  onInstructionChange,
  isExpanded,
  onToggleExpand,
}: ScenarioSelectorProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "ShoppingBag":
        return <ShoppingBag className="w-5 h-5" />;
      case "Wrench":
        return <Wrench className="w-5 h-5" />;
      case "HeartHandshake":
      default:
        return <HeartHandshake className="w-5 h-5" />;
    }
  };

  const activeScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-100 dark:border-neutral-800 p-4 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* 場景選擇器 */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
            目前服務場景比對
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((scenario) => {
              const isActive = scenario.id === selectedScenarioId;
              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 transform active:scale-95 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  {getIcon(scenario.icon)}
                  <span>{scenario.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右側：場景說明與控制項 */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>{activeScenario.description}</span>
          </div>

          <button
            onClick={onToggleExpand}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-800 select-none cursor-pointer hover:underline transition-all"
          >
            {isExpanded ? "隱藏後台系統提示 (System Instruction)" : "進階：自訂系統提示 (System Instruction)"}
          </button>
        </div>
      </div>

      {/* 展開後的自訂 System Instruction 區塊 */}
      {isExpanded && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-neutral-200/80 animate-slide-down">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-700">
              🧠 自訂客服核心提示 (System Instruction)
            </h4>
            <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
              Gemini 3.5 角色引導
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
            系統提示詞可以在底層決定 AI 的人設、語音風格與回答邏輯。您可以直接編輯下方內容，機器人將立即套用新設定：
          </p>
          <textarea
            value={customInstruction}
            onChange={(e) => onInstructionChange(e.target.value)}
            className="w-full h-32 p-3 text-xs bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-700 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            placeholder="請輸入 AI 客服的角色指令..."
          />
          <div className="mt-2 flex justify-between items-center">
            <span className="text-[11px] text-neutral-400">
              * 切換上方場景會自動載入該場景的預置系統提示
            </span>
            <button
              onClick={() => onInstructionChange(activeScenario.systemInstruction)}
              className="text-[11px] text-neutral-500 hover:text-indigo-600 underline font-medium cursor-pointer"
            >
              重設為此場景預設值
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
