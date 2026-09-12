"use client";

import { useState } from "react";
import { HistoricalFinancials, FinancialStatementRow } from "../../../lib/screenerTypes";
import { getCurrencySymbol } from "../../../lib/api";
import MetricTrendChart from "./MetricTrendChart";

export default function ProfitLossTab({
  financials,
  currency,
  symbol,
}: {
  financials: HistoricalFinancials;
  currency?: string;
  symbol?: string;
}) {
  const [viewMode, setViewMode] = useState<"values" | "growth" | "commonsize">("values");
  const [activeChartRow, setActiveChartRow] = useState<FinancialStatementRow | null>(null);
  const curSym = getCurrencySymbol(currency, symbol);

  const { periods, incomeStatement } = financials;
  const revRow = incomeStatement.find((r) => r.id === "revenue");

  const formatCell = (row: FinancialStatementRow, periodKey: string, pIdx: number) => {
    const raw = row.values[periodKey];
    if (raw === null || raw === undefined) return "—";

    if (viewMode === "commonsize" && revRow && row.format === "currency") {
      const rev = revRow.values[periodKey];
      if (!rev || rev === 0) return "—";
      const pct = (raw / rev) * 100;
      return `${pct.toFixed(1)}%`;
    }

    if (viewMode === "growth" && pIdx > 0) {
      const prev = row.values[periods[pIdx - 1].key];
      if (prev === null || prev === undefined || prev === 0) return "—";
      const g = ((raw - prev) / Math.abs(prev)) * 100;
      return `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
    }

    if (row.format === "currency") {
      if (Math.abs(raw) >= 1e12) return `${curSym}${(raw / 1e12).toFixed(2)}T`;
      if (Math.abs(raw) >= 1e9) return `${curSym}${(raw / 1e9).toFixed(2)}B`;
      if (Math.abs(raw) >= 1e6) return `${curSym}${(raw / 1e6).toFixed(2)}M`;
      return `${curSym}${raw.toFixed(2)}`;
    }
    if (row.format === "percent") {
      return `${raw.toFixed(1)}%`;
    }
    return raw.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
        <div>
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>📈</span>
            <span>Annual Profit & Loss Statement (10-Year History)</span>
          </h3>
          <p className="text-[11px] text-[var(--text-dim)]">
            Multi-year income statement with 3Y & 5Y Compound Annual Growth Rates (CAGRs).
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--panel)] p-0.5 rounded border border-[var(--border)] text-[11px] font-mono">
          <button
            onClick={() => setViewMode("values")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              viewMode === "values" ? "bg-[var(--amber)] text-black" : "text-[var(--text-dim)] hover:text-white"
            }`}
          >
            VALUES ({curSym})
          </button>
          <button
            onClick={() => setViewMode("growth")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              viewMode === "growth" ? "bg-[var(--amber)] text-black" : "text-[var(--text-dim)] hover:text-white"
            }`}
          >
            YOY GROWTH %
          </button>
          <button
            onClick={() => setViewMode("commonsize")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              viewMode === "commonsize" ? "bg-[var(--amber)] text-black" : "text-[var(--text-dim)] hover:text-white"
            }`}
          >
            COMMON SIZE %
          </button>
        </div>
      </div>

      {/* Metric Trend Drilldown */}
      {activeChartRow && (
        <MetricTrendChart
          title={activeChartRow.label}
          periods={periods.map((p) => p.label)}
          values={periods.map((p) => activeChartRow.values[p.key])}
          format={activeChartRow.format}
          cagr3Y={activeChartRow.cagr3Y}
          cagr5Y={activeChartRow.cagr5Y}
          onClose={() => setActiveChartRow(null)}
        />
      )}

      {/* P&L Table */}
      <div className="border border-[var(--border)] rounded overflow-x-auto bg-[var(--panel-2)]">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5 sticky left-0 bg-[var(--panel)] z-10 min-w-[220px]">Income Statement Line</th>
              {periods.map((p) => (
                <th key={p.key} className="p-2.5 text-right whitespace-nowrap min-w-[100px]">
                  {p.label}
                </th>
              ))}
              <th className="p-2.5 text-right whitespace-nowrap text-[var(--up)] min-w-[80px]">3Y CAGR</th>
              <th className="p-2.5 text-right whitespace-nowrap text-[var(--up)] min-w-[80px]">5Y CAGR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {incomeStatement.map((row) => {
              const isSelected = activeChartRow?.id === row.id;
              const isHeader = row.indent === 0;

              return (
                <tr
                  key={row.id}
                  onClick={() => setActiveChartRow(row)}
                  className={`hover:bg-[var(--panel)] transition-colors cursor-pointer ${
                    isSelected ? "bg-[var(--amber)]/10 font-bold border-l-2 border-l-[var(--amber)]" : ""
                  }`}
                  title="Click to view interactive trend chart for this row"
                >
                  <td
                    className={`p-2.5 sticky left-0 bg-[var(--panel-2)] z-10 ${
                      row.indent ? "pl-6 text-[var(--text-dim)]" : "font-bold text-[var(--text)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{row.label}</span>
                      <span className="text-[9px] text-[var(--text-dim)] opacity-0 hover:opacity-100 font-normal">📈 chart</span>
                    </div>
                  </td>
                  {periods.map((p, pIdx) => {
                    const text = formatCell(row, p.key, pIdx);
                    const isPositive = text.startsWith("+");
                    const isNegative = text.startsWith("-");

                    return (
                      <td
                        key={p.key}
                        className={`p-2.5 text-right whitespace-nowrap ${
                          viewMode === "growth"
                            ? isPositive
                              ? "text-emerald-400 font-semibold"
                              : isNegative
                              ? "text-rose-400 font-semibold"
                              : "text-[var(--text)]"
                            : isHeader
                            ? "font-bold text-[var(--text)]"
                            : "text-[var(--text-dim)]"
                        }`}
                      >
                        {text}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right text-[var(--up)] font-bold whitespace-nowrap">
                    {row.cagr3Y !== null && row.cagr3Y !== undefined ? `+${row.cagr3Y}%` : "—"}
                  </td>
                  <td className="p-2.5 text-right text-[var(--up)] font-bold whitespace-nowrap">
                    {row.cagr5Y !== null && row.cagr5Y !== undefined ? `+${row.cagr5Y}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
