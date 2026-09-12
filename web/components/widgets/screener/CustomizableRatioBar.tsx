"use client";

import { useEffect, useState } from "react";
import { findMetric, formatMetricValue, METRIC_REGISTRY } from "../../../lib/metricRegistry";
import { getCurrencySymbol } from "../../../lib/api";

const DEFAULT_SELECTED_RATIOS = [
  "marketCap",
  "currentPrice",
  "pe",
  "forwardPe",
  "ps",
  "pb",
  "evEbitda",
  "roic",
  "roe",
  "grossMargin",
  "operatingMargin",
  "netMargin",
  "fcfMargin",
  "fcfYield",
  "revenueGrowthYoY",
  "debtToEquity",
  "netDebt",
  "currentRatio",
  "interestCoverage",
  "dividendYield",
];

export default function CustomizableRatioBar({
  keyRatios,
  currency,
  symbol,
}: {
  keyRatios: Record<string, number | null>;
  currency?: string;
  symbol?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_RATIOS);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const curSym = getCurrencySymbol(currency, symbol);

  // Load persistent user preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem("openterminal:screener:custom_ratios");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedIds(parsed);
        }
      }
    } catch {}
  }, []);

  const saveSelected = (ids: string[]) => {
    setSelectedIds(ids);
    try {
      localStorage.setItem("openterminal:screener:custom_ratios", JSON.stringify(ids));
    } catch {}
  };

  const removeRatio = (id: string) => {
    saveSelected(selectedIds.filter((i) => i !== id));
  };

  const toggleRatio = (id: string) => {
    if (selectedIds.includes(id)) {
      saveSelected(selectedIds.filter((i) => i !== id));
    } else {
      saveSelected([...selectedIds, id]);
    }
  };

  const resetToDefault = () => {
    saveSelected(DEFAULT_SELECTED_RATIOS);
  };

  return (
    <div className="bg-[var(--panel)] border-b border-[var(--border)] px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
          <span>⚡ KEY RATIOS & MULTIPLES</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--panel-2)] border border-[var(--border)]">
            {selectedIds.length} ACTIVE
          </span>
        </span>
        <button
          onClick={() => setModalOpen(true)}
          className="text-[10px] text-[var(--amber)] hover:underline flex items-center gap-1 font-mono"
        >
          <span>⚙ CUSTOMIZE METRICS</span>
        </button>
      </div>

      {/* Metric Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10 gap-1.5">
        {selectedIds.map((id) => {
          const def = findMetric(id);
          const rawVal = keyRatios[id] ?? (def ? keyRatios[def.fieldKey] : null);
          const formatted = def ? formatMetricValue(rawVal, def.format, def.unit, curSym) : (rawVal !== null && rawVal !== undefined ? String(rawVal) : "—");

          return (
            <div
              key={id}
              className="p-1.5 bg-[var(--panel-2)] border border-[var(--border)] rounded flex flex-col justify-between group hover:border-[var(--amber)]/50 transition-colors relative"
              title={`${def?.displayName ?? id}: ${def?.description ?? ""}\nFormula: ${def?.formula ?? ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-dim)] font-semibold truncate max-w-[85px]">
                  {def?.shortName ?? id}
                </span>
                <button
                  onClick={() => removeRatio(id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--text-dim)] hover:text-[var(--down)] px-0.5"
                  title="Remove this metric chip"
                >
                  ✕
                </button>
              </div>
              <div className="font-mono text-[13px] font-bold text-[var(--text)] mt-0.5 truncate">
                {formatted}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customize Metrics Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--panel-2)]">
              <div>
                <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
                  <span>⚙</span>
                  <span>Customize Key Ratios Dashboard</span>
                </h3>
                <p className="text-[11px] text-[var(--text-dim)]">Select or uncheck financial ratios to display on the quick-ratio header.</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-dim)] hover:text-white text-[14px] font-mono px-2"
              >
                ✕
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-3 border-b border-[var(--border)] bg-[var(--panel)] flex items-center gap-2">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search any metric (e.g. ROIC, Margin, Debt, P/E, Cash)..."
                className="term-input flex-1 !text-[12px] !py-1"
                autoFocus
              />
              <button
                onClick={resetToDefault}
                className="term-btn !text-[10px] !py-1"
              >
                RESET DEFAULTS
              </button>
            </div>

            {/* Metrics Checklist */}
            <div className="p-3 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {METRIC_REGISTRY.filter(
                (m) =>
                  !searchFilter ||
                  m.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  m.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  m.aliases.some((a) => a.toLowerCase().includes(searchFilter.toLowerCase()))
              ).map((m) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      checked
                        ? "bg-[var(--amber)]/10 border-[var(--amber)]/40 text-[var(--text)]"
                        : "bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRatio(m.id)}
                      className="mt-0.5 accent-[var(--amber)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-[var(--text)] truncate">{m.displayName}</span>
                        <span className="text-[9px] px-1 rounded bg-[var(--panel)] border border-[var(--border)] font-mono">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-dim)] mt-0.5 line-clamp-1">{m.formula}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--panel-2)] flex justify-between items-center text-[11px]">
              <span className="text-[var(--text-dim)] font-mono">{selectedIds.length} metrics selected</span>
              <button
                onClick={() => setModalOpen(false)}
                className="term-btn !px-4 !py-1 bg-[var(--amber)] text-black font-bold hover:bg-[var(--amber-bright)]"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
