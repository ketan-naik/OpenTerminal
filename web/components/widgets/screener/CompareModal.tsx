"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, getCurrencySymbol } from "../../../lib/api";
import { CompanyProfile } from "../../../lib/screenerTypes";
import { findMetric, formatMetricValue } from "../../../lib/metricRegistry";

const COMPARE_METRIC_KEYS = [
  "price",
  "marketCap",
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
  "return1Y",
];

export default function CompareModal({
  currentSymbol,
  onClose,
  onSelectTicker,
}: {
  currentSymbol: string;
  onClose: () => void;
  onSelectTicker: (sym: string) => void;
}) {
  const [tickers, setTickers] = useState<string[]>([
    currentSymbol,
    currentSymbol === "AAPL" ? "MSFT" : "AAPL",
    currentSymbol === "NVDA" ? "AMD" : "NVDA",
  ]);
  const [inputTicker, setInputTicker] = useState("");

  const addTicker = () => {
    const sym = inputTicker.trim().toUpperCase();
    if (sym && !tickers.includes(sym) && tickers.length < 5) {
      setTickers([...tickers, sym]);
      setInputTicker("");
    }
  };

  const removeTicker = (sym: string) => {
    if (tickers.length > 1) {
      setTickers(tickers.filter((t) => t !== sym));
    }
  };

  // Fetch company dossiers in parallel for all compared tickers
  const queries = useQuery({
    queryKey: ["compare_dossiers", tickers.join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(
        tickers.map((t) => apiGet<any>(`/api/screener-dashboard/company/${t}`))
      );
      return results.map((r, i) => ({
        symbol: tickers[i],
        dossier: r.status === "fulfilled" ? r.value : null,
      }));
    },
  });

  const dossiers = queries.data ?? [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 bg-[var(--panel-2)] border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[14px] text-[var(--amber)] flex items-center gap-1.5">
              <span>⚖</span>
              <span>Side-by-Side Multi-Company Fundamental Matrix</span>
            </h3>
            <p className="text-[11px] text-[var(--text-dim)]">Compare up to 5 equities across valuation, returns on capital, growth, and leverage.</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-white text-[16px] font-mono px-2">
            ✕
          </button>
        </div>

        {/* Ticker Management Bar */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--panel)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tickers.map((t) => (
              <span
                key={t}
                className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-[11px] font-mono font-bold text-[var(--amber)] flex items-center gap-1.5"
              >
                <span className="cursor-pointer hover:underline" onClick={() => onSelectTicker(t)}>
                  {t}
                </span>
                <button
                  onClick={() => removeTicker(t)}
                  className="text-[var(--text-dim)] hover:text-[var(--down)] text-[11px]"
                  title="Remove from comparison"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {tickers.length < 5 && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={inputTicker}
                onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addTicker()}
                placeholder="Add ticker..."
                className="term-input !text-[11px] !py-0.5 w-28"
              />
              <button onClick={addTicker} className="term-btn !text-[10px] !py-0.5">
                + ADD
              </button>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="p-3 overflow-y-auto flex-1 bg-[var(--panel-2)]">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
                <th className="p-2.5 sticky left-0 bg-[var(--panel)] z-10 min-w-[180px]">Metric</th>
                {tickers.map((t) => (
                  <th key={t} className="p-2.5 text-right whitespace-nowrap min-w-[120px] font-bold text-[var(--amber)]">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {COMPARE_METRIC_KEYS.map((mKey) => {
                const def = findMetric(mKey);
                const title = def?.displayName ?? mKey;

                return (
                  <tr key={mKey} className="hover:bg-[var(--panel)] transition-colors">
                    <td className="p-2.5 sticky left-0 bg-[var(--panel-2)] z-10 font-semibold text-[var(--text)]">
                      {title}
                    </td>
                    {tickers.map((t) => {
                      const item = dossiers.find((d) => d.symbol === t);
                      const curSym = getCurrencySymbol(item?.dossier?.profile?.currency, t);
                      const rawVal = item?.dossier?.keyRatios?.[mKey] ?? (def ? item?.dossier?.keyRatios?.[def.fieldKey] : null);
                      const formatted = def
                        ? formatMetricValue(rawVal, def.format, def.unit, curSym)
                        : rawVal !== null && rawVal !== undefined
                        ? String(rawVal)
                        : "—";

                      return (
                        <td key={t} className="p-2.5 text-right whitespace-nowrap text-[var(--text)] font-semibold">
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--panel)] border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="term-btn !px-4 !py-1 bg-[var(--amber)] text-black font-bold"
          >
            CLOSE COMPARISON
          </button>
        </div>
      </div>
    </div>
  );
}
