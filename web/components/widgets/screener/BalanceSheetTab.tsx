"use client";

import { useState } from "react";
import { HistoricalFinancials, FinancialStatementRow } from "../../../lib/screenerTypes";
import { getCurrencySymbol } from "../../../lib/api";
import MetricTrendChart from "./MetricTrendChart";

export default function BalanceSheetTab({
  financials,
  currency,
  symbol,
}: {
  financials: HistoricalFinancials;
  currency?: string;
  symbol?: string;
}) {
  const [viewMode, setViewMode] = useState<"values" | "commonsize">("values");
  const [activeChartRow, setActiveChartRow] = useState<FinancialStatementRow | null>(null);
  const curSym = getCurrencySymbol(currency, symbol);

  const { periods, balanceSheet } = financials;
  const assetsRow = balanceSheet.find((r) => r.id === "totalAssets");

  const formatCell = (row: FinancialStatementRow, periodKey: string) => {
    const raw = row.values[periodKey];
    if (raw === null || raw === undefined) return "—";

    if (viewMode === "commonsize" && assetsRow && row.format === "currency") {
      const assets = assetsRow.values[periodKey];
      if (!assets || assets === 0) return "—";
      const pct = (raw / assets) * 100;
      return `${pct.toFixed(1)}%`;
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
    if (row.format === "ratio") {
      return `${raw.toFixed(2)}x`;
    }
    return raw.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
        <div>
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>🛡</span>
            <span>Historical Balance Sheet & Working Capital (10-Year History)</span>
          </h3>
          <p className="text-[11px] text-[var(--text-dim)]">
            Assets, Liabilities, Working Capital, Net Debt, and Tangible Book Value.
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
            onClick={() => setViewMode("commonsize")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              viewMode === "commonsize" ? "bg-[var(--amber)] text-black" : "text-[var(--text-dim)] hover:text-white"
            }`}
          >
            % OF ASSETS
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
          onClose={() => setActiveChartRow(null)}
        />
      )}

      {/* Balance Sheet Table */}
      <div className="border border-[var(--border)] rounded overflow-x-auto bg-[var(--panel-2)]">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5 sticky left-0 bg-[var(--panel)] z-10 min-w-[220px]">Balance Sheet Line</th>
              {periods.map((p) => (
                <th key={p.key} className="p-2.5 text-right whitespace-nowrap min-w-[100px]">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {balanceSheet.map((row) => {
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
                  {periods.map((p) => {
                    const text = formatCell(row, p.key);

                    return (
                      <td
                        key={p.key}
                        className={`p-2.5 text-right whitespace-nowrap ${
                          isHeader ? "font-bold text-[var(--text)]" : "text-[var(--text-dim)]"
                        }`}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
