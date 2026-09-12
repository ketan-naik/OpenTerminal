"use client";

import { useMemo } from "react";
import { getCurrencySymbol } from "../../../lib/api";

export default function MetricTrendChart({
  title,
  periods,
  values,
  format = "currency",
  cagr3Y,
  cagr5Y,
  currency,
  symbol,
  onClose,
}: {
  title: string;
  periods: string[];
  values: (number | null)[];
  format?: "currency" | "percent" | "number" | "ratio";
  cagr3Y?: number | null;
  cagr5Y?: number | null;
  currency?: string;
  symbol?: string;
  onClose?: () => void;
}) {
  const curSym = getCurrencySymbol(currency, symbol);
  const chartData = useMemo(() => {
    const valid = values.map((v, i) => ({
      period: periods[i] || `P${i}`,
      val: v ?? 0,
      isNull: v === null,
    }));
    const nums = valid.filter((d) => !d.isNull).map((d) => d.val);
    const min = nums.length > 0 ? Math.min(...nums) : 0;
    const max = nums.length > 0 ? Math.max(...nums) : 100;
    const range = max - min || 1;

    return { items: valid, min, max, range };
  }, [periods, values]);

  const formatVal = (v: number) => {
    if (format === "currency") {
      if (Math.abs(v) >= 1e12) return `${curSym}${(v / 1e12).toFixed(2)}T`;
      if (Math.abs(v) >= 1e9) return `${curSym}${(v / 1e9).toFixed(2)}B`;
      if (Math.abs(v) >= 1e6) return `${curSym}${(v / 1e6).toFixed(2)}M`;
      return `${curSym}${v.toFixed(2)}`;
    }
    if (format === "percent") return `${v.toFixed(1)}%`;
    return v.toFixed(2);
  };

  return (
    <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded shadow-md my-2">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--amber)] font-bold text-[12px]">📈 {title} Trend Drilldown</span>
          {cagr3Y !== null && cagr3Y !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--up)] font-mono">
              3Y CAGR: +{cagr3Y}%
            </span>
          )}
          {cagr5Y !== null && cagr5Y !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--up)] font-mono">
              5Y CAGR: +{cagr5Y}%
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--text-dim)] hover:text-[var(--text)] text-[12px] font-mono px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* SVG Sparkline / Bar chart */}
      <div className="h-28 flex items-end gap-1.5 pt-4 px-2">
        {chartData.items.map((d, i) => {
          const heightPct = Math.max(8, Math.min(100, ((d.val - chartData.min) / chartData.range) * 100));
          const isPositive = d.val >= 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              <div
                className={`w-full rounded-t transition-all ${
                  isPositive ? "bg-[var(--amber)] group-hover:bg-[var(--amber-bright)]" : "bg-[var(--down)]"
                }`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[9px] text-[var(--text-dim)] font-mono mt-1 truncate max-w-[45px]">
                {d.period.replace("FY", "'")}
              </span>

              {/* Tooltip */}
              <div className="hidden group-hover:block absolute bottom-full mb-1 bg-black/90 border border-[var(--border)] text-white text-[10px] px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap">
                <div className="font-bold">{d.period}</div>
                <div className="text-[var(--amber)]">{d.isNull ? "N/A" : formatVal(d.val)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
