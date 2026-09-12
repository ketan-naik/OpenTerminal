"use client";

import { useState } from "react";
import { PRESET_METAS, useTerminal, type WidgetType } from "../store/terminal";

const ITEMS: Array<{ type: WidgetType; label: string; icon: string }> = [
  { type: "screener-dashboard", label: "Screener & Fundamentals", icon: "🔍" },
  { type: "research", label: "Hedge Fund CIO Research", icon: "🏛️" },
  { type: "chart", label: "Candlestick Chart", icon: "📊" },
  { type: "quote", label: "Real-time Quote", icon: "⚡" },
  { type: "watchlist", label: "Watchlist", icon: "⭐" },
  { type: "macro", label: "Macro & Yields", icon: "🌐" },
  { type: "news", label: "Market News", icon: "📰" },
  { type: "options", label: "Option Chain", icon: "⛓️" },
  { type: "heatmap", label: "Sector Heatmap", icon: "🗺️" },
  { type: "crypto", label: "Crypto Board", icon: "🪙" },
  { type: "ai", label: "AI Analyst", icon: "🤖" },
  { type: "screener", label: "Stock Screener Snapshot", icon: "📑" },
  { type: "calendar", label: "Economic Calendar", icon: "📅" },
  { type: "portfolio", label: "Paper Portfolio", icon: "💼" },
  { type: "insider", label: "Insider Trades", icon: "👔" },
  { type: "tv", label: "Live Financial TV", icon: "📺" },
  { type: "recap", label: "Market Recap", icon: "📋" },
];

export default function Sidebar() {
  const [tab, setTab] = useState<"widgets" | "desks">("widgets");
  const widgets = useTerminal((s) => s.widgets);
  const activePreset = useTerminal((s) => s.activePreset);
  const addWidget = useTerminal((s) => s.addWidget);
  const openSoloWidget = useTerminal((s) => s.openSoloWidget);
  const loadPreset = useTerminal((s) => s.loadPreset);
  const resetWorkspace = useTerminal((s) => s.resetWorkspace);

  const isSolo = widgets.length === 1;
  const soloType = isSolo ? widgets[0].type : null;
  const activeTypes = new Set(widgets.map((w) => w.type));

  return (
    <nav className="w-52 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col shrink-0 select-none text-[11px]">
      {/* Top Navigation Tabs: WIDGETS vs DESKS */}
      <div className="flex border-b border-[var(--border)] bg-[var(--panel-2)] p-1 gap-1">
        <button
          onClick={() => setTab("widgets")}
          className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition-colors text-center ${
            tab === "widgets"
              ? "bg-[var(--panel)] text-[var(--amber)] border border-[var(--amber-dim)]"
              : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
          }`}
        >
          Widgets
        </button>
        <button
          onClick={() => setTab("desks")}
          className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition-colors text-center ${
            tab === "desks"
              ? "bg-[var(--panel)] text-[var(--amber)] border border-[var(--amber-dim)]"
              : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
          }`}
        >
          Trading Desks
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {tab === "widgets" ? (
          <div className="py-1">
            <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider font-semibold border-b border-[var(--border)]/50 mb-1 flex justify-between items-center text-[var(--text-dim)]">
              <span>Solo View</span>
              <span className="text-[var(--amber)] text-[8px] font-bold">CLICK TO OPEN FULL</span>
            </div>

            {/* Quick Switch to Master Full Board */}
            <div className="px-2 mb-1.5">
              <button
                onClick={() => resetWorkspace()}
                className={`w-full py-1 px-2 rounded text-[10px] font-bold flex items-center justify-between border transition-all ${
                  widgets.length > 1
                    ? "bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/40"
                    : "bg-[var(--panel-2)] text-[var(--text-dim)] border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text-dim)]"
                }`}
                title="Open all 17 widgets in master command center layout"
              >
                <span className="flex items-center gap-1.5">
                  <span>★</span>
                  <span>Master Board</span>
                </span>
                <span className="text-[9px] font-mono opacity-80">17 widgets</span>
              </button>
            </div>

            {ITEMS.map((item) => {
              const isCurrentSolo = soloType === item.type;
              const isOpenInMulti = !isSolo && activeTypes.has(item.type);

              return (
                <div
                  key={item.type}
                  onClick={() => openSoloWidget(item.type)}
                  title={`Click to open ${item.label} in full-page mode`}
                  className={`group w-full px-2.5 py-1.5 text-[11px] flex items-center justify-between cursor-pointer transition-colors border-l-2 ${
                    isCurrentSolo
                      ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)] font-bold shadow-xs"
                      : isOpenInMulti
                      ? "border-[var(--up)] bg-[var(--hover-bg)]/70 text-[var(--text)] font-medium"
                      : "border-transparent text-[var(--text-dim)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                        isCurrentSolo
                          ? "bg-[var(--amber)] shadow-[0_0_6px_var(--amber)] ring-1 ring-[var(--amber)]"
                          : isOpenInMulti
                          ? "bg-[var(--up)] shadow-[0_0_6px_var(--up)] ring-1 ring-[var(--up)]"
                          : "bg-[var(--border)]"
                      }`}
                    />
                    <span className="text-[12px]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isCurrentSolo && (
                      <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-[var(--amber)] text-black">
                        FULL
                      </span>
                    )}
                    <button
                      title="Add as secondary widget without clearing"
                      onClick={(e) => {
                        e.stopPropagation();
                        addWidget(item.type);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-[var(--amber)] hover:bg-[var(--panel-2)] border border-[var(--border)] px-1 rounded text-[9px] transition-opacity"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            <div className="dim px-1 py-0.5 text-[9px] uppercase tracking-wider font-semibold">
              Preset Workspaces
            </div>
            {PRESET_METAS.map((preset) => {
              const isSelected = activePreset === preset.id || (preset.id === "master" && activePreset === "all");
              return (
                <div
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  title={preset.description}
                  className={`w-full p-2 rounded cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-[var(--panel-2)] border-[var(--amber)] shadow-sm text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--panel)]/40 hover:bg-[var(--hover-bg)] hover:border-[var(--text-dim)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 truncate">
                      <span className="text-[13px]">{preset.icon}</span>
                      <span className={isSelected ? "text-[var(--amber)] font-bold" : ""}>{preset.label}</span>
                    </span>
                    {isSelected && (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-[var(--amber)]/20 text-[var(--amber)] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] line-clamp-2 leading-tight">
                    {preset.description}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="border-t border-[var(--border)] p-2 bg-[var(--panel-2)] flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[9px] text-[var(--text-dim)] uppercase tracking-wider">
          <span>Active Desk</span>
          <span className="font-bold text-[var(--amber)] truncate max-w-[100px]">
            {activePreset.toUpperCase()}
          </span>
        </div>
        <button
          onClick={resetWorkspace}
          className="w-full text-center py-1 text-[10px] font-semibold border border-[var(--border)] rounded bg-[var(--panel)] hover:bg-[var(--hover-bg)] hover:text-[var(--amber)] transition-colors"
        >
          RESET TO MASTER
        </button>
      </div>
    </nav>
  );
}
