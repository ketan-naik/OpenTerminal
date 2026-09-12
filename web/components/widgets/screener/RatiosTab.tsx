"use client";

import { METRIC_REGISTRY, formatMetricValue } from "../../../lib/metricRegistry";
import { CompanyScreenerDossier } from "../../../lib/screenerTypes";

export default function RatiosTab({ dossier }: { dossier: CompanyScreenerDossier }) {
  const { keyRatios } = dossier;

  const categories = [
    "Valuation",
    "Profitability",
    "Capital Efficiency",
    "Financial Health",
    "Growth",
    "Dividends",
    "Per Share",
    "Market & Technical",
  ] as const;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
        <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
          <span>📐</span>
          <span>Comprehensive Financial Ratios & Multiples Directory</span>
        </h3>
        <p className="text-[11px] text-[var(--text-dim)]">
          Standardized ratios categorized across valuation, profitability, return on capital, and leverage.
        </p>
      </div>

      {/* Grouped Category Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const metrics = METRIC_REGISTRY.filter((m) => m.category === cat);
          if (metrics.length === 0) return null;

          return (
            <div key={cat} className="border border-[var(--border)] rounded bg-[var(--panel-2)] overflow-hidden">
              <div className="px-3 py-1.5 bg-[var(--panel)] border-b border-[var(--border)] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[var(--text)] uppercase tracking-wider">{cat} Ratios</span>
                <span className="text-[10px] text-[var(--text-dim)] font-mono">{metrics.length} Metrics</span>
              </div>
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <tbody className="divide-y divide-[var(--border)]">
                  {metrics.map((m) => {
                    const rawVal = keyRatios[m.id] ?? keyRatios[m.fieldKey];
                    const valStr = formatMetricValue(rawVal, m.format, m.unit);

                    return (
                      <tr key={m.id} className="hover:bg-[var(--panel)] transition-colors" title={`Formula: ${m.formula}\n${m.description}`}>
                        <td className="p-2 text-[var(--text-dim)]">
                          <div className="font-semibold text-[var(--text)]">{m.displayName}</div>
                          <div className="text-[9.5px] text-[var(--text-dim)] line-clamp-1">{m.formula}</div>
                        </td>
                        <td className="p-2 text-right font-bold text-[var(--text)] whitespace-nowrap">
                          {valStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
