"use client";

import { CompanyScreenerDossier } from "../../../lib/screenerTypes";
import { formatMetricValue, findMetric } from "../../../lib/metricRegistry";
import { getCurrencySymbol } from "../../../lib/api";

export default function SummaryTab({
  dossier,
  onNavigateTab,
}: {
  dossier: CompanyScreenerDossier;
  onNavigateTab?: (tab: string) => void;
}) {
  const { profile, keyRatios, observations, quarterlyFinancials, annualFinancials } = dossier;
  const curSym = getCurrencySymbol(profile.currency, profile.symbol);
  const pros = observations.filter((o) => o.type === "PRO");
  const cons = observations.filter((o) => o.type === "CON");

  const latestQ = quarterlyFinancials.periods[quarterlyFinancials.periods.length - 1];
  const latestRev = quarterlyFinancials.incomeStatement.find((r) => r.id === "revenue")?.values[latestQ?.key ?? ""];
  const latestNet = quarterlyFinancials.incomeStatement.find((r) => r.id === "netIncome")?.values[latestQ?.key ?? ""];
  const latestEps = quarterlyFinancials.incomeStatement.find((r) => r.id === "dilutedEps")?.values[latestQ?.key ?? ""];

  return (
    <div className="space-y-4 p-4">
      {/* 1. Executive Summary & Business Model Banner */}
      <div className="p-3.5 bg-[var(--panel-2)] border border-[var(--border)] rounded flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[13px] text-[var(--amber)] tracking-wide">ABOUT {profile.name.toUpperCase()}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-dim)]">
              {profile.sector} • {profile.industry}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text)] leading-relaxed">{profile.description}</p>
        </div>

        {/* Quick Decision Snapshot */}
        <div className="p-3 bg-[var(--panel)] border border-[var(--border)] rounded shrink-0 min-w-[240px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5">
            <span className="text-[10px] text-[var(--text-dim)] font-semibold">CAPITAL ALLOCATION</span>
            <span className="text-[10px] font-bold text-[var(--amber)] font-mono">10-SEC SCAN</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <div className="text-[9px] text-[var(--text-dim)]">ROIC</div>
              <div className="font-bold text-[var(--up)]">{keyRatios.roic?.toFixed(1) ?? "—"}%</div>
            </div>
            <div>
              <div className="text-[9px] text-[var(--text-dim)]">P/E (TTM)</div>
              <div className="font-bold text-[var(--text)]">{keyRatios.pe?.toFixed(1) ?? "—"}x</div>
            </div>
            <div>
              <div className="text-[9px] text-[var(--text-dim)]">FCF YIELD</div>
              <div className="font-bold text-[var(--text)]">{keyRatios.fcfYield?.toFixed(1) ?? "—"}%</div>
            </div>
            <div>
              <div className="text-[9px] text-[var(--text-dim)]">NET DEBT/EBITDA</div>
              <div className="font-bold text-[var(--text)]">{keyRatios.netDebt !== null && keyRatios.netDebt <= 0 ? "Net Cash" : "Safe"}</div>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("cio")}
              className="mt-2 text-[10px] text-center text-[var(--amber)] hover:underline font-mono"
            >
              View Full CIO Research Dossier →
            </button>
          )}
        </div>
      </div>

      {/* 2. Deterministic Pros and Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* PROS */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-2">
            <span className="text-emerald-400 font-bold text-[12px]">▲ PROS ({pros.length})</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Rule-Based Quantitative Strengths
            </span>
          </div>
          <div className="space-y-2">
            {pros.map((pro, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <div className="font-semibold text-[var(--text)]">{pro.title}</div>
                  <div className="text-[var(--text-dim)] text-[10.5px] mt-0.5">{pro.detail}</div>
                </div>
              </div>
            ))}
            {pros.length === 0 && (
              <div className="text-[11px] text-[var(--text-dim)] italic">No major outsized quantitative strengths flagged.</div>
            )}
          </div>
        </div>

        {/* CONS */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-2">
            <span className="text-rose-400 font-bold text-[12px]">▼ CONS & RISKS ({cons.length})</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Rule-Based Risk Tripwires
            </span>
          </div>
          <div className="space-y-2">
            {cons.map((con, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-rose-400 font-bold">✕</span>
                <div>
                  <div className="font-semibold text-[var(--text)]">{con.title}</div>
                  <div className="text-[var(--text-dim)] text-[10.5px] mt-0.5">{con.detail}</div>
                </div>
              </div>
            ))}
            {cons.length === 0 && (
              <div className="text-[11px] text-emerald-400 italic">No critical quantitative failure tripwires triggered.</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 4-Pillar Financial Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Growth Pillar */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>🚀 Growth Track</span>
            <span className="text-[9px] font-mono text-[var(--amber)]">CAGR</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Rev Growth (YoY):</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.revenueGrowthYoY, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Rev 3Y CAGR:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.revenueCagr3Y, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">EPS Growth (YoY):</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.epsGrowthYoY, "percent")}</span>
            </div>
          </div>
        </div>

        {/* Profitability Pillar */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>💎 Profitability</span>
            <span className="text-[9px] font-mono text-[var(--up)]">MARGINS</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Gross Margin:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.grossMargin, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Operating Margin:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.operatingMargin, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">FCF Margin:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.fcfMargin, "percent")}</span>
            </div>
          </div>
        </div>

        {/* Capital Efficiency Pillar */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>⚙ Efficiency</span>
            <span className="text-[9px] font-mono text-[var(--amber)]">RETURNS</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">ROIC:</span>
              <span className="font-bold text-[var(--up)]">{formatMetricValue(keyRatios.roic, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">ROE:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.roe, "percent")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">FCF Conversion:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.fcfConversion, "percent")}</span>
            </div>
          </div>
        </div>

        {/* Balance Sheet Pillar */}
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
          <div className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>🛡 Solvency</span>
            <span className="text-[9px] font-mono text-[var(--text-dim)]">HEALTH</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Net Debt:</span>
              <span className="font-bold text-[var(--text)]">
                {keyRatios.netDebt !== null && keyRatios.netDebt <= 0 ? "Net Cash" : formatMetricValue(keyRatios.netDebt, "currency", undefined, curSym)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Debt to Equity:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.debtToEquity, "ratio", "x")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Current Ratio:</span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(keyRatios.currentRatio, "ratio", "x")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Latest Quarter Highlights Snapshot */}
      {latestQ && (
        <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[var(--amber)] font-mono">📊 LATEST QUARTER ({latestQ.label})</span>
            <span className="text-[10px] text-[var(--text-dim)]">Period ended {latestQ.date}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div>
              <span className="text-[var(--text-dim)]">Revenue: </span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(latestRev, "currency", undefined, curSym)}</span>
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Net Income: </span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(latestNet, "currency", undefined, curSym)}</span>
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Diluted EPS: </span>
              <span className="font-bold text-[var(--text)]">{formatMetricValue(latestEps, "currency", undefined, curSym)}</span>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("quarters")}
                className="term-btn !text-[10px] !py-0.5"
              >
                VIEW ALL QUARTERS →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
