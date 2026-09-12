"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiPost, getCurrencySymbol } from "../../lib/api";
import { useTerminal, useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import {
  type HedgeFundResearch,
  type InvestmentCommitteeAnalysis,
  type SecurityType,
} from "../../lib/researchTypes";

type ResearchTab =
  | "overview"
  | "decision"
  | "variant"
  | "short"
  | "breakers"
  | "fundamentals"
  | "valuation"
  | "expectations"
  | "quant"
  | "scenarios"
  | "kpis"
  | "cio";

const TABS: Array<{ id: ResearchTab; label: string; badge?: string }> = [
  { id: "overview", label: "CIO OVERVIEW" },
  { id: "decision", label: "CAPITAL ALLOCATION" },
  { id: "variant", label: "VARIANT PERCEPTION" },
  { id: "short", label: "STRONGEST SHORT" },
  { id: "breakers", label: "THESIS BREAKERS" },
  { id: "fundamentals", label: "FUNDAMENTALS" },
  { id: "valuation", label: "VALUATION & DCF" },
  { id: "expectations", label: "REVERSE DCF" },
  { id: "quant", label: "QUANT & RISK" },
  { id: "scenarios", label: "SCENARIOS" },
  { id: "kpis", label: "MONITORING KPIS" },
  { id: "cio", label: "AI COMMITTEE" },
];

function fmtNum(val: number | null | undefined, prefix = "", suffix = "", decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${prefix}${val.toFixed(decimals)}${suffix}`;
}

function fmtCurrency(val: number | null | undefined, curSym = "$"): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  if (Math.abs(val) >= 1e12) return `${curSym}${(val / 1e12).toFixed(2)}T`;
  if (Math.abs(val) >= 1e9) return `${curSym}${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `${curSym}${(val / 1e6).toFixed(2)}M`;
  return `${curSym}${val.toLocaleString()}`;
}

function OriginBadge({
  type,
  source,
}: {
  type: "MARKET DATA" | "CALCULATED" | "AI ASSESSMENT";
  source?: string;
}) {
  const color =
    type === "MARKET DATA"
      ? "text-[var(--cyan)] border-[var(--cyan)]/40 bg-[var(--cyan)]/10"
      : type === "CALCULATED"
      ? "text-[var(--amber)] border-[var(--amber)]/40 bg-[var(--amber)]/10"
      : "text-[var(--purple,#a855f7)] border-[var(--purple,#a855f7)]/40 bg-[var(--purple,#a855f7)]/10";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[8px] font-mono px-1 py-0.2 rounded border ${color}`}
      title={source ? `Origin: ${type} via ${source}` : `Origin: ${type}`}
    >
      <span>[{type}]</span>
      {source && <span className="opacity-70">({source})</span>}
    </span>
  );
}

export default function HedgeFundResearchWidget({ widget }: { widget?: WidgetInstance }) {
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const symbol = widget ? useWidgetSymbol(widget) : activeSymbol;
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");
  const queryClient = useQueryClient();

  // 1. Fetch Quantitative Research Dossier
  const { data: research, isLoading, error } = useQuery({
    queryKey: ["research", symbol],
    queryFn: () => apiGet<HedgeFundResearch>(`/api/research/${symbol}`),
    staleTime: 300_000,
    retry: 1,
  });

  // 2. Fetch or trigger AI Investment Committee Layer
  const {
    mutate: runAiCommittee,
    data: aiAnalysis,
    isPending: isAiPending,
  } = useMutation({
    mutationFn: () => apiPost<InvestmentCommitteeAnalysis>(`/api/research/${symbol}/ai-committee`, {}),
    onSuccess: (data) => {
      queryClient.setQueryData(["research-ai", symbol], data);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="animate-spin text-2xl text-[var(--amber)] mb-3">⟳</div>
        <div className="font-bold text-[12px] text-[var(--text)] tracking-wider">
          COMPUTING HEDGE FUND RESEARCH DOSSIER FOR {symbol}
        </div>
        <div className="text-[10px] text-[var(--text-dim)] mt-1 flex items-center gap-2">
          <span>Stage 1: Market & Quant</span>
          <span>→</span>
          <span>Stage 2: Fundamentals & Valuation</span>
          <span>→</span>
          <span>Stage 3: DCF & Asymmetry</span>
        </div>
      </div>
    );
  }

  if (error || !research) {
    return (
      <div className="p-4 text-center">
        <div className="text-[var(--down)] font-bold mb-1">Research Generation Error</div>
        <div className="dim text-[11px]">
          {error instanceof Error ? error.message : `Unable to compile research dossier for ${symbol}.`}
        </div>
      </div>
    );
  }

  const {
    scores,
    decision,
    fundamentals,
    valuation,
    expectations,
    momentum,
    risk,
    scenarios,
    dataConfidence,
    opportunityCost,
    threeDimensionalAssessment,
    quantitativeThesisBreakers,
    deterministicKPIs,
    securityType,
  } = research;

  const curSym = getCurrencySymbol(undefined, research.symbol || symbol);

  // Decision styling
  const decisionColor =
    decision.decision === "STRONG BUY" || decision.decision === "BUY"
      ? "bg-[var(--up)]/15 text-[var(--up)] border-[var(--up)]"
      : decision.decision === "HOLD" || decision.decision === "WATCH"
      ? "bg-[var(--amber)]/15 text-[var(--amber)] border-[var(--amber-dim)]"
      : "bg-[var(--down)]/15 text-[var(--down)] border-[var(--down)]";

  const securityTypeLabel =
    securityType === "ETF"
      ? "ETF / INDEX BASKET"
      : securityType === "BANK_FINANCIAL"
      ? "BANK / FINANCIAL"
      : securityType === "REIT"
      ? "REIT / REAL ESTATE"
      : securityType === "UNPROFITABLE_GROWTH"
      ? "UNPROFITABLE GROWTH"
      : "CORPORATE EQUITY";

  const hasVariantPerception =
    aiAnalysis?.variantPerception &&
    !aiAnalysis.variantPerception.toUpperCase().includes("NO MATERIAL VARIANT PERCEPTION IDENTIFIED") &&
    aiAnalysis.variantPerception.trim().length > 15;

  return (
    <div className="flex flex-col h-full bg-[var(--panel)] text-[11px] overflow-hidden select-none">
      {/* 1. TOP EXECUTIVE SUMMARY: DECISION-FIRST CAPITAL ALLOCATION (10-Second PM Glance) */}
      <div className="p-2.5 bg-[var(--panel-2)] border-b border-[var(--border)] shrink-0 space-y-2">
        {/* Row A: Header & Security Classification */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[15px] text-[var(--text)]">{research.symbol}</span>
            <span className="text-[11px] text-[var(--text-dim)] truncate max-w-[180px]">
              {research.companyName}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--amber)] font-mono font-bold">
              {securityTypeLabel}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-dim)] font-mono">
              {research.sector}
            </span>
            <span className="font-mono text-[14px] font-bold text-[var(--text)] ml-1">
              {fmtCurrency(research.currentPrice, curSym)}
            </span>
            <OriginBadge type="MARKET DATA" source="Yahoo / Real-Time Feed" />
          </div>

          {/* Row A Right: Data Confidence & Freshness */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">Data Confidence:</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                dataConfidence.level === "HIGH"
                  ? "bg-[var(--up)]/10 text-[var(--up)] border-[var(--up)]"
                  : dataConfidence.level === "MEDIUM"
                  ? "bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]"
                  : "bg-[var(--down)]/10 text-[var(--down)] border-[var(--down)]"
              }`}
            >
              {dataConfidence.level} ({dataConfidence.score}%)
            </span>
            <span className="text-[8px] text-[var(--text-dim)] hidden sm:inline">
              ({dataConfidence.availableFieldsCount}/{dataConfidence.totalFieldsEvaluated} fields)
            </span>
          </div>
        </div>

        {/* Row B: 10-Second Capital Allocation Metrics Grid (Requirement 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5">
          {/* 1. Investment Score */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <div className="text-[8px] uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
              <span>Score</span>
              <OriginBadge type="CALCULATED" />
            </div>
            <span
              className={`font-mono text-[16px] font-bold ${
                scores.totalInvestmentScore >= 75
                  ? "text-[var(--up)]"
                  : scores.totalInvestmentScore >= 55
                  ? "text-[var(--amber)]"
                  : "text-[var(--down)]"
              }`}
            >
              {scores.totalInvestmentScore} <span className="text-[9px] text-[var(--text-dim)]">/100</span>
            </span>
          </div>

          {/* 2. Decision */}
          <div className={`p-1.5 border rounded flex flex-col items-center justify-center ${decisionColor}`}>
            <span className="text-[8px] uppercase tracking-wider font-semibold">Decision</span>
            <span className="font-mono text-[13px] font-bold tracking-wider">{decision.decision}</span>
          </div>

          {/* 3. Conviction */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Conviction</span>
            <span
              className={`font-mono text-[12px] font-bold ${
                decision.conviction === "HIGH"
                  ? "text-[var(--up)]"
                  : decision.conviction === "MEDIUM"
                  ? "text-[var(--amber)]"
                  : "text-[var(--down)]"
              }`}
            >
              {decision.conviction}
            </span>
          </div>

          {/* 4. Current Price */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Price</span>
            <span className="font-mono text-[13px] font-bold text-[var(--text)]">
              {fmtCurrency(research.currentPrice, curSym)}
            </span>
          </div>

          {/* 5. Probability-Weighted Fair Value */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Fair Value</span>
            <span className="font-mono text-[13px] font-bold text-[var(--amber)]">
              {scenarios?.probabilityWeightedTarget ? `${curSym}${scenarios.probabilityWeightedTarget}` : "—"}
            </span>
          </div>

          {/* 6. Expected Return */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Exp. Return</span>
            <span
              className={`font-mono text-[13px] font-bold ${
                (scenarios?.expectedReturnPercent ?? 0) >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {scenarios?.expectedReturnPercent !== undefined
                ? `${scenarios.expectedReturnPercent > 0 ? "+" : ""}${scenarios.expectedReturnPercent}%`
                : "—"}
            </span>
          </div>

          {/* 7. Expected Downside */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Exp. Downside</span>
            <span className="font-mono text-[13px] font-bold text-[var(--down)]">
              {scenarios?.expectedDownsidePercent !== undefined ? `${scenarios.expectedDownsidePercent}%` : "—"}
            </span>
          </div>

          {/* 8. Risk / Reward */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Risk / Reward</span>
            <span className="font-mono text-[13px] font-bold text-[var(--amber)]">
              {scenarios?.upsideDownsideRatio ? `${scenarios.upsideDownsideRatio}x` : "—"}
            </span>
          </div>

          {/* 9. Initial Position */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Initial Size</span>
            <span className="font-mono text-[12px] font-bold text-[var(--text)]">
              {(decision.initialPositionSize * 100).toFixed(1)}%
            </span>
          </div>

          {/* 10. Target Position */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Target Size</span>
            <span className="font-mono text-[12px] font-bold text-[var(--amber)]">
              {(decision.targetPositionSize * 100).toFixed(1)}%
            </span>
          </div>

          {/* 11. Max Position */}
          <div className="p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded flex flex-col items-center justify-center">
            <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">Max Size</span>
            <span className="font-mono text-[12px] font-bold text-[var(--text-dim)]">
              {(decision.maxPositionSize * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Row C: Opportunity Cost & Sizing Framework Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-dim)] uppercase font-semibold">Fund Hurdle:</span>
            <span className="font-mono text-[var(--text)] font-bold">{opportunityCost.hurdleRatePercent}%</span>
            <span className="text-[var(--text-dim)]">|</span>
            <span className="text-[var(--text-dim)] uppercase font-semibold">Excess vs Hurdle:</span>
            <span
              className={`font-mono font-bold ${
                opportunityCost.excessReturnOverHurdle >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {opportunityCost.excessReturnOverHurdle >= 0 ? "+" : ""}
              {opportunityCost.excessReturnOverHurdle}%
            </span>
            <span className="text-[var(--text-dim)]">|</span>
            <span className="text-[var(--amber)] font-bold">{opportunityCost.verdict}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--text-dim)]">Tier:</span>
            <span className="font-mono font-bold text-[var(--amber)]">{decision.positionSizingLabel}</span>
          </div>
        </div>

        {/* Low Data Confidence Warning Alert */}
        {dataConfidence.level === "LOW" && (
          <div className="p-1.5 bg-[var(--down)]/10 border border-[var(--down)] rounded text-[10px] text-[var(--down)] flex items-center justify-between">
            <span>⚠️ {dataConfidence.qualityNotice}</span>
            <span className="font-mono">Missing: {dataConfidence.missingKeyFields.join(", ")}</span>
          </div>
        )}
      </div>

      {/* 2. TAB NAVIGATOR */}
      <div className="flex border-b border-[var(--border)] bg-[var(--panel-2)] overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === t.id
                ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--panel)]"
                : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: OVERVIEW (Comprehensive Synthesis) */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* 3-Dimensional Investment Distinction (Requirement 16) */}
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                <span>Three-Dimensional Institutional Distinction</span>
                <OriginBadge type="CALCULATED" source="Deterministic Rule Engine" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 1. A Great Company */}
                <div
                  className={`p-2 rounded border ${
                    threeDimensionalAssessment.isGreatCompany.pass
                      ? "bg-[var(--up)]/5 border-[var(--up)]/30"
                      : "bg-[var(--panel)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-[var(--text)]">1. A Great Company?</span>
                    <span
                      className={`text-[9px] px-1 rounded font-bold ${
                        threeDimensionalAssessment.isGreatCompany.pass
                          ? "bg-[var(--up)]/20 text-[var(--up)]"
                          : "bg-[var(--down)]/20 text-[var(--down)]"
                      }`}
                    >
                      {threeDimensionalAssessment.isGreatCompany.pass ? "PASS" : "FAIL"} (
                      {threeDimensionalAssessment.isGreatCompany.score}/100)
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                    {threeDimensionalAssessment.isGreatCompany.rationale}
                  </div>
                </div>

                {/* 2. A Great Stock */}
                <div
                  className={`p-2 rounded border ${
                    threeDimensionalAssessment.isGreatStock.pass
                      ? "bg-[var(--up)]/5 border-[var(--up)]/30"
                      : "bg-[var(--panel)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-[var(--text)]">2. A Great Stock?</span>
                    <span
                      className={`text-[9px] px-1 rounded font-bold ${
                        threeDimensionalAssessment.isGreatStock.pass
                          ? "bg-[var(--up)]/20 text-[var(--up)]"
                          : "bg-[var(--down)]/20 text-[var(--down)]"
                      }`}
                    >
                      {threeDimensionalAssessment.isGreatStock.pass ? "PASS" : "FAIL"} (
                      {threeDimensionalAssessment.isGreatStock.score}/100)
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                    {threeDimensionalAssessment.isGreatStock.rationale}
                  </div>
                </div>

                {/* 3. A Great Investment at Today's Price */}
                <div
                  className={`p-2 rounded border ${
                    threeDimensionalAssessment.isGreatInvestmentAtTodayPrice.pass
                      ? "bg-[var(--up)]/5 border-[var(--up)]/30"
                      : "bg-[var(--panel)] border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-[var(--text)]">3. Great Investment Today?</span>
                    <span
                      className={`text-[9px] px-1 rounded font-bold ${
                        threeDimensionalAssessment.isGreatInvestmentAtTodayPrice.pass
                          ? "bg-[var(--up)]/20 text-[var(--up)]"
                          : "bg-[var(--down)]/20 text-[var(--down)]"
                      }`}
                    >
                      {threeDimensionalAssessment.isGreatInvestmentAtTodayPrice.pass ? "PASS" : "FAIL"} (
                      {threeDimensionalAssessment.isGreatInvestmentAtTodayPrice.score}/100)
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                    {threeDimensionalAssessment.isGreatInvestmentAtTodayPrice.rationale}
                  </div>
                </div>
              </div>
            </div>

            {/* Scorecard Multi-Factor Progress Bars */}
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                <span>Multi-Factor Quantitative Breakdown (100% Configurable)</span>
                <OriginBadge type="CALCULATED" source="RESEARCH_CONFIG" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: "Business Quality & Moat (15%)", score: scores.businessQuality },
                  { label: "Valuation Attractiveness (15%)", score: scores.valuation },
                  { label: "Revenue & Earnings Growth (10%)", score: scores.growth },
                  { label: "Profitability & Margins (10%)", score: scores.profitability },
                  { label: "Capital Efficiency & ROIC (10%)", score: scores.capitalEfficiency },
                  { label: "Risk / Reward Asymmetry (10%)", score: scores.riskReward },
                  { label: "Cash Flow Quality (10%)", score: scores.cashFlowQuality },
                  { label: "Balance Sheet & Solvency (5%)", score: scores.balanceSheet },
                  { label: "Price Momentum & Trend (5%)", score: scores.priceMomentum },
                  { label: "Catalyst Visibility (5%)", score: scores.catalysts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="dim w-48 truncate">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-[var(--panel)] border border-[var(--border)] rounded overflow-hidden">
                      <div
                        className={`h-full ${
                          item.score >= 75
                            ? "bg-[var(--up)]"
                            : item.score >= 50
                            ? "bg-[var(--amber)]"
                            : "bg-[var(--down)]"
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold w-7 text-right">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick-Look Variant Perception & Short Thesis Snippet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Variant Perception */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                  <span>Variant Perception</span>
                  <button onClick={() => setActiveTab("variant")} className="text-[9px] underline hover:text-[var(--text)]">
                    Deep View →
                  </button>
                </div>
                {hasVariantPerception ? (
                  <div className="text-[11px] text-[var(--text)] leading-relaxed">
                    {aiAnalysis?.variantPerception}
                  </div>
                ) : (
                  <div className="p-2 bg-[var(--down)]/10 border border-[var(--down)]/30 rounded text-[10px] text-[var(--down)] font-bold">
                    NO MATERIAL VARIANT PERCEPTION IDENTIFIED — Consensus view is priced in.
                  </div>
                )}
              </div>

              {/* Strongest Short Thesis */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--down)] flex justify-between">
                  <span>Strongest Short Thesis (Anti-Confirmation)</span>
                  <button onClick={() => setActiveTab("short")} className="text-[9px] underline hover:text-[var(--text)]">
                    Deep View →
                  </button>
                </div>
                <div className="text-[11px] text-[var(--text)] leading-relaxed">
                  {aiAnalysis?.strongestShortThesis ??
                    `Key risks include multiple compression on slowing growth, competitive pricing pressure, and customer capex digestion.`}
                </div>
              </div>
            </div>

            {/* Final CIO Capital Allocation Question (Requirement 16) */}
            <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded text-center space-y-1">
              <div className="text-[11px] font-bold text-[var(--text)] italic">
                &ldquo;If this were a $1 billion hedge fund and every dollar had to compete for the best risk-adjusted return, would this ticker deserve capital today?&rdquo;
              </div>
              <div className="text-[11px] font-bold text-[var(--amber)]">
                {decision.decision === "STRONG BUY" || decision.decision === "BUY"
                  ? `YES — Compelling capital deployment (+${scenarios?.expectedReturnPercent}% return vs ${opportunityCost.hurdleRatePercent}% hurdle, ${scenarios?.upsideDownsideRatio}x R/R). Allocate ${(decision.targetPositionSize * 100).toFixed(1)}%.`
                  : decision.decision === "WATCH" || decision.decision === "HOLD"
                  ? `NEUTRAL — Meets basic hurdle but lacks sufficient valuation discount or variant asymmetry. Maintain ${decision.positionSizingLabel}.`
                  : `NO — Sub-hurdle risk/reward or high downside risk. Better opportunities exist across the watchlist.`}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAPITAL ALLOCATION (Requirement 1, 8, 9) */}
        {activeTab === "decision" && (
          <div className="space-y-3">
            <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-3">
              <div className="text-[11px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                <span>$1B Long/Short Fund Capital Sizing Framework</span>
                <OriginBadge type="CALCULATED" source="RESEARCH_CONFIG" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="text-[9px] uppercase dim">Initial Deployment Size</div>
                  <div className="font-mono text-[16px] font-bold text-[var(--text)] mt-0.5">
                    {(decision.initialPositionSize * 100).toFixed(1)}% ($
                    {(decision.initialPositionSize * 1000).toFixed(1)}M)
                  </div>
                  <div className="text-[8px] text-[var(--text-dim)] mt-0.5">Starter tranche on underwriting</div>
                </div>

                <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="text-[9px] uppercase dim">Target Core Allocation</div>
                  <div className="font-mono text-[16px] font-bold text-[var(--amber)] mt-0.5">
                    {(decision.targetPositionSize * 100).toFixed(1)}% ($
                    {(decision.targetPositionSize * 1000).toFixed(1)}M)
                  </div>
                  <div className="text-[8px] text-[var(--text-dim)] mt-0.5">Fully scaled position size</div>
                </div>

                <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="text-[9px] uppercase dim">Maximum Risk Limit</div>
                  <div className="font-mono text-[16px] font-bold text-[var(--down)] mt-0.5">
                    {(decision.maxPositionSize * 100).toFixed(1)}% ($
                    {(decision.maxPositionSize * 1000).toFixed(1)}M)
                  </div>
                  <div className="text-[8px] text-[var(--text-dim)] mt-0.5">Hard risk limit / stop cap</div>
                </div>
              </div>

              {/* Sizing Framework Tiers Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tier Band</th>
                    <th>Weight</th>
                    <th>Dollar Equivalent ($1B AUM)</th>
                    <th>Required Criteria</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tier: "0% — No Position", range: "0.0%", dollar: "$0M", req: "Score < 45 or Asymmetry < 1.0x", match: decision.targetPositionSize === 0 },
                    { tier: "0.5%–1.0% — Watch Position", range: "0.5%–1.0%", dollar: "$5M–$10M", req: "Great business, rich multiple (Reverse DCF high)", match: decision.decision === "WATCH" },
                    { tier: "1.0%–2.0% — Small / Starter", range: "1.0%–2.0%", dollar: "$10M–$20M", req: "Fair valuation, balanced risk/reward", match: decision.decision === "HOLD" },
                    { tier: "2.0%–4.0% — Normal Core Allocation", range: "2.0%–4.0%", dollar: "$20M–$40M", req: "Score >= 68, R/R >= 1.3x, Exp Return >= 8%", match: decision.decision === "BUY" },
                    { tier: "4.0%–6.0% — High Conviction", range: "4.0%–6.0%", dollar: "$40M–$60M", req: "Score >= 80, R/R >= 1.8x, Exp Return >= 15%", match: decision.decision === "STRONG BUY" },
                    { tier: "6.0%–8.0% — Exceptional Conviction", range: "6.0%–8.0%", dollar: "$60M–$80M", req: "Best-in-universe asymmetry & high data confidence", match: false },
                  ].map((row) => (
                    <tr key={row.tier} className={row.match ? "bg-[var(--hover-bg)] font-bold" : ""}>
                      <td className={row.match ? "text-[var(--amber)]" : ""}>{row.tier}</td>
                      <td className="font-mono">{row.range}</td>
                      <td className="font-mono">{row.dollar}</td>
                      <td className="dim">{row.req}</td>
                      <td>
                        {row.match ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--amber)]/20 text-[var(--amber)] font-bold">
                            CURRENT ALLOCATION
                          </span>
                        ) : (
                          <span className="text-[9px] text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Allocation Rationale */}
              <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                <div className="text-[10px] font-bold text-[var(--text)] uppercase">PM Allocation Rationale:</div>
                <div className="text-[11px] text-[var(--text)] leading-relaxed">{decision.summaryReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VARIANT PERCEPTION (Requirement 2) */}
        {activeTab === "variant" && (
          <div className="space-y-3">
            <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase font-bold tracking-wider text-[var(--amber)]">
                    Differentiated Variant Perception Matrix
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)]">
                    Identifies where our proprietary view materially diverges from the consensus sell-side view.
                  </div>
                </div>
                <OriginBadge type="AI ASSESSMENT" source="Claude Opus CIO" />
              </div>

              {hasVariantPerception ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Consensus View */}
                    <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                      <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                        1. Consensus Market View
                      </div>
                      <div className="text-[11px] text-[var(--text)] leading-relaxed">
                        {aiAnalysis?.consensusView ?? "Broad market expects steady baseline compounding in line with consensus guidance."}
                      </div>
                    </div>

                    {/* Our View */}
                    <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                      <div className="text-[10px] font-bold text-[var(--amber)] uppercase">
                        2. Our Fund View (Proprietary)
                      </div>
                      <div className="text-[11px] text-[var(--text)] leading-relaxed">
                        {aiAnalysis?.variantPerception}
                      </div>
                    </div>
                  </div>

                  {/* Why the Market is Wrong */}
                  <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                    <div className="text-[10px] font-bold text-[var(--up)] uppercase">
                      3. Why the Market May Be Wrong
                    </div>
                    <div className="text-[11px] text-[var(--text)] leading-relaxed">
                      {aiAnalysis?.whyMarketMayBeWrong ?? "Consensus underestimates pricing elasticity, operating leverage, and software attach rates."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[var(--down)]/10 border border-[var(--down)]/30 rounded space-y-2 text-center">
                  <div className="text-[12px] font-bold text-[var(--down)]">
                    NO MATERIAL VARIANT PERCEPTION IDENTIFIED
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] max-w-xl mx-auto">
                    The current consensus sell-side estimates and market pricing appear reasonable. Without an asymmetric differentiated view or mispricing, the overall investment attractiveness score is conservatively adjusted.
                  </div>
                  <button
                    onClick={() => runAiCommittee()}
                    disabled={isAiPending}
                    className="term-btn !px-3 !py-1 text-[10px] font-bold text-[var(--amber)] border-[var(--amber)]"
                  >
                    {isAiPending ? "GENERATING COMMITTEE VIEW…" : "REFRESH VARIANT ANALYSIS"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STRONGEST SHORT THESIS (Requirement 3) */}
        {activeTab === "short" && (
          <div className="space-y-3">
            <div className="p-3 bg-[var(--down)]/10 border border-[var(--down)]/40 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase font-bold tracking-wider text-[var(--down)] flex items-center gap-1.5">
                  <span>⚠️ STRONGEST SHORT THESIS (ANTI-CONFIRMATION BIAS)</span>
                </div>
                <OriginBadge type="AI ASSESSMENT" source="Claude Opus CIO" />
              </div>

              <div className="text-[11px] leading-relaxed text-[var(--text)]">
                {aiAnalysis?.strongestShortThesis ??
                  `Even under a bullish base case, the bear scenario could materialize through multiple contraction if growth slows below peak levels, competitive pricing pressures erode gross margins, or customer capital expenditures pause. Valuation multiple offers limited protection in a macro downturn.`}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[var(--down)]/20">
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="text-[9px] font-bold text-[var(--down)] uppercase">Multiple Compression Risk</div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-0.5">
                    Trading at {fmtNum(valuation.multiples.trailingPE, "", "x")} P/E. A contraction to historical median would represent a {scenarios?.expectedDownsidePercent ?? -15}% drawdown.
                  </div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="text-[9px] font-bold text-[var(--down)] uppercase">Execution & Cash Flow Risks</div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-0.5">
                    Working capital expansion, customer concentration, or CapEx acceleration could degrade cash conversion.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: THESIS BREAKERS (Requirement 4) */}
        {activeTab === "breakers" && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--down)] flex justify-between">
                <span>Quantitative Thesis Breakers & Exit Tripwires</span>
                <OriginBadge type="CALCULATED" source="Deterministic Risk Rules" />
              </div>
              <div className="text-[10px] text-[var(--text-dim)]">
                Strict numerical conditions defining when this investment thesis is broken and capital must be liquidated or trimmed.
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Condition / Event</th>
                    <th>Tripwire Level</th>
                    <th>Current Value</th>
                    <th>Severity</th>
                    <th>Mandated Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quantitativeThesisBreakers.map((tb, idx) => (
                    <tr key={idx}>
                      <td className="font-bold">{tb.metric}</td>
                      <td>{tb.condition}</td>
                      <td className="font-mono font-bold text-[var(--down)]">{tb.tripwireLevel}</td>
                      <td className="font-mono font-bold text-[var(--amber)]">{tb.currentValue}</td>
                      <td>
                        <span
                          className={`text-[9px] px-1 rounded font-bold ${
                            tb.severity === "CRITICAL"
                              ? "bg-[var(--down)]/20 text-[var(--down)]"
                              : "bg-[var(--amber)]/20 text-[var(--amber)]"
                          }`}
                        >
                          {tb.severity}
                        </span>
                      </td>
                      <td className="font-bold text-[var(--text)]">{tb.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: FUNDAMENTALS (Requirement 6, 12) */}
        {activeTab === "fundamentals" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Growth & Margins */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                  <span>Growth & Margin Profile</span>
                  <OriginBadge type="MARKET DATA" source="TradingView / SEC" />
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Total Revenue (TTM)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtCurrency(fundamentals.revenue)}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Revenue Growth (YoY)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.revenueGrowthYoY, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Gross Margin</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.grossMargin, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Operating Margin</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.operatingMargin, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Net Margin</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.netMargin, "", "%")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 dim">FCF Margin</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.fcfMargin, "", "%")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Capital Efficiency & Solvency */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                  <span>Capital Efficiency & Solvency</span>
                  <OriginBadge type="CALCULATED" source="Balance Sheet Analysis" />
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">ROIC (Invested Capital)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.roic, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">ROE (Equity)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.roe, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Total Debt</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtCurrency(fundamentals.totalDebt, curSym)}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Cash & Equivalents</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtCurrency(fundamentals.cash, curSym)}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Net Debt</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtCurrency(fundamentals.netDebt, curSym)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 dim">Debt / EBITDA</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(fundamentals.debtToEbitda, "", "x")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: VALUATION & DCF (Requirement 7, 12) */}
        {activeTab === "valuation" && (
          <div className="space-y-3">
            {/* Multiples Matrix */}
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                <span>Valuation Multiples & Classification</span>
                <span className="text-[var(--text-dim)]">Status: {valuation.classification}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="dim text-[9px]">Trailing P/E</div>
                  <div className="font-mono font-bold text-[13px]">{fmtNum(valuation.multiples.trailingPE, "", "x")}</div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="dim text-[9px]">Price / Sales</div>
                  <div className="font-mono font-bold text-[13px]">{fmtNum(valuation.multiples.priceToSales, "", "x")}</div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="dim text-[9px]">EV / EBITDA</div>
                  <div className="font-mono font-bold text-[13px]">{fmtNum(valuation.multiples.evToEbitda, "", "x")}</div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="dim text-[9px]">FCF Yield</div>
                  <div className="font-mono font-bold text-[13px]">{fmtNum(valuation.multiples.fcfYield, "", "%")}</div>
                </div>
              </div>
            </div>

            {/* 3-Stage DCF Model */}
            {valuation.dcf ? (
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                  <span>Transparent 3-Stage Discounted Cash Flow (DCF) Model</span>
                  <OriginBadge type="CALCULATED" source="OpenTerminal DCF Engine" />
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>5Y Revenue CAGR</th>
                      <th>Target Margin</th>
                      <th>WACC</th>
                      <th>Terminal Growth</th>
                      <th>Projected Y5 FCF</th>
                      <th>Fair Value</th>
                      <th>Upside / Downside</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold text-[var(--down)]">Bear Case</td>
                      <td>{(valuation.dcf.bear.revenueGrowth5Y * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bear.terminalOperatingMargin * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bear.wacc * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bear.terminalGrowth * 100).toFixed(1)}%</td>
                      <td>{fmtCurrency(valuation.dcf.bear.projectedFCF5Y, curSym)}</td>
                      <td className="font-mono font-bold">{curSym}{valuation.dcf.bear.fairValue}</td>
                      <td className="font-mono font-bold text-[var(--down)]">
                        {valuation.dcf.bear.upsideDownsidePercent}%
                      </td>
                    </tr>
                    <tr className="bg-[var(--hover-bg)] font-medium">
                      <td className="font-bold text-[var(--amber)]">Base Case</td>
                      <td>{(valuation.dcf.base.revenueGrowth5Y * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.base.terminalOperatingMargin * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.base.wacc * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.base.terminalGrowth * 100).toFixed(1)}%</td>
                      <td>{fmtCurrency(valuation.dcf.base.projectedFCF5Y, curSym)}</td>
                      <td className="font-mono font-bold text-[var(--amber)]">{curSym}{valuation.dcf.base.fairValue}</td>
                      <td className={`font-mono font-bold ${valuation.dcf.base.upsideDownsidePercent >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {valuation.dcf.base.upsideDownsidePercent > 0 ? "+" : ""}{valuation.dcf.base.upsideDownsidePercent}%
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold text-[var(--up)]">Bull Case</td>
                      <td>{(valuation.dcf.bull.revenueGrowth5Y * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bull.terminalOperatingMargin * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bull.wacc * 100).toFixed(1)}%</td>
                      <td>{(valuation.dcf.bull.terminalGrowth * 100).toFixed(1)}%</td>
                      <td>{fmtCurrency(valuation.dcf.bull.projectedFCF5Y, curSym)}</td>
                      <td className="font-mono font-bold text-[var(--up)]">{curSym}{valuation.dcf.bull.fairValue}</td>
                      <td className="font-mono font-bold text-[var(--up)]">
                        +{valuation.dcf.bull.upsideDownsidePercent}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded text-center dim">
                Corporate DCF is marked <strong>NOT APPLICABLE</strong> for this security type ({securityTypeLabel}).
              </div>
            )}
          </div>
        )}

        {/* TAB 8: EXPECTATIONS / REVERSE DCF (Requirement 7) */}
        {activeTab === "expectations" && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                <span>Reverse DCF — What Market Expectations Are Priced In?</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--amber)] font-bold">
                  {expectations.assessment}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded text-center">
                  <div className="dim text-[9px] uppercase">Implied 5Y Revenue CAGR</div>
                  <div className="font-mono text-[15px] font-bold text-[var(--amber)] mt-1">
                    {expectations.impliedRevenueCAGR5Y !== null ? `${(expectations.impliedRevenueCAGR5Y * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded text-center">
                  <div className="dim text-[9px] uppercase">Implied Operating Margin</div>
                  <div className="font-mono text-[15px] font-bold text-[var(--text)] mt-1">
                    {expectations.impliedTerminalMargin !== null ? `${(expectations.impliedTerminalMargin * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div className="p-2 bg-[var(--panel)] border border-[var(--border)] rounded text-center">
                  <div className="dim text-[9px] uppercase">Implied Terminal Growth</div>
                  <div className="font-mono text-[15px] font-bold text-[var(--text)] mt-1">
                    {expectations.impliedTerminalGrowth !== null ? `${(expectations.impliedTerminalGrowth * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1 mt-2">
                <div className="text-[10px] font-bold text-[var(--text)]">Hurdle Assessment:</div>
                <div className="text-[11px] text-[var(--text)] leading-relaxed">{expectations.narrativeSummary}</div>
                <div className="text-[10px] text-[var(--text-dim)] pt-1 border-t border-[var(--border)]/50">
                  {expectations.hurdleRateAssessment}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: QUANT & RISK */}
        {activeTab === "quant" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Momentum Matrix */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                  <span>Price Momentum & Trend</span>
                  <span className="text-[var(--text)] font-bold">{momentum.trendClassification}</span>
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">1-Week Return</td>
                      <td className={`py-1 font-mono text-right font-bold ${(momentum.return1Week ?? 0) >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {fmtNum(momentum.return1Week, "", "%")}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">1-Month Return</td>
                      <td className={`py-1 font-mono text-right font-bold ${(momentum.return1Month ?? 0) >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {fmtNum(momentum.return1Month, "", "%")}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">3-Month Return</td>
                      <td className={`py-1 font-mono text-right font-bold ${(momentum.return3Month ?? 0) >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {fmtNum(momentum.return3Month, "", "%")}
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Distance from 50DMA</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(momentum.distance50DMA, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Distance from 200DMA</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(momentum.distance200DMA, "", "%")}</td>
                    </tr>
                    <tr>
                      <td className="py-1 dim">RSI (14-Day)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(momentum.rsi14)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Risk Analytics */}
              <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] mb-2 flex justify-between">
                  <span>Statistical Risk & Volatility</span>
                  <span className="text-[var(--amber)] font-bold">{risk.riskClassification} RISK</span>
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Realized Volatility (30D)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(risk.volatility30D, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Realized Volatility (1Y)</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(risk.volatility1Year, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Max Drawdown (1Y)</td>
                      <td className="py-1 font-mono text-right font-bold text-[var(--down)]">{fmtNum(risk.maxDrawdown1Year, "", "%")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]/50">
                      <td className="py-1 dim">Beta</td>
                      <td className="py-1 font-mono text-right font-bold">{fmtNum(risk.beta, "", "", 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: SCENARIOS */}
        {activeTab === "scenarios" && scenarios && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                <span>Probability-Weighted Scenario Matrix</span>
                <span className="text-[var(--text)] font-bold">{scenarios.asymmetryVerdict}</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Probability</th>
                    <th>Price Target</th>
                    <th>Expected Return</th>
                    <th>Key Assumptions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.scenarios.map((s) => (
                    <tr key={s.name} className={s.name === "Base" ? "bg-[var(--hover-bg)]" : ""}>
                      <td className={`font-bold ${s.name === "Bear" ? "text-[var(--down)]" : s.name === "Bull" ? "text-[var(--up)]" : "text-[var(--amber)]"}`}>
                        {s.name}
                      </td>
                      <td className="font-mono font-bold">{(s.probability * 100).toFixed(0)}%</td>
                      <td className="font-mono font-bold">{curSym}{s.targetPrice}</td>
                      <td className={`font-mono font-bold ${s.expectedReturnPercent >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                        {s.expectedReturnPercent > 0 ? "+" : ""}{s.expectedReturnPercent}%
                      </td>
                      <td className="dim">{s.assumptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 11: MONITORING KPIS (Requirement 10) */}
        {activeTab === "kpis" && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--amber)] flex justify-between">
                <span>12–15 Quantitative Monitoring KPIs</span>
                <OriginBadge type="CALCULATED" source="Deterministic Baseline" />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>KPI Metric</th>
                    <th>Current Value</th>
                    <th>Expected Level</th>
                    <th>Warning Level</th>
                    <th>Thesis-Break Level</th>
                  </tr>
                </thead>
                <tbody>
                  {deterministicKPIs.map((kpi, idx) => (
                    <tr key={idx}>
                      <td className="dim">{kpi.category}</td>
                      <td className="font-bold">{kpi.metric}</td>
                      <td className="font-mono font-bold text-[var(--amber)]">{kpi.currentValue}</td>
                      <td className="font-mono text-[var(--up)]">{kpi.expectedValue}</td>
                      <td className="font-mono text-[var(--amber)]">{kpi.warningLevel}</td>
                      <td className="font-mono text-[var(--down)] font-bold">{kpi.thesisBreakLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 12: AI INVESTMENT COMMITTEE (Requirement 11, 14, 16) */}
        {activeTab === "cio" && (
          <div className="space-y-3">
            <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-wider">
                    Chief Investment Officer — $1B Investment Committee Layer
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)]">
                    Deep qualitative synthesis, opportunity-cost benchmarking, and variant perception.
                  </div>
                </div>
                <button
                  onClick={() => runAiCommittee()}
                  disabled={isAiPending}
                  className="term-btn !px-3 !py-1 font-bold text-[var(--amber)] border-[var(--amber-dim)] hover:bg-[var(--hover-bg)]"
                >
                  {isAiPending ? "COMPILING COMMITTEE VIEW…" : "RUN CIO COMMITTEE"}
                </button>
              </div>

              {aiAnalysis ? (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[var(--amber)] mb-1">Core Investment Thesis</div>
                    <div className="text-[11px] text-[var(--text)] leading-relaxed whitespace-pre-line">
                      {aiAnalysis.investmentThesis}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                      <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase">Consensus Market View</div>
                      <div className="text-[11px] text-[var(--text)] leading-relaxed">{aiAnalysis.consensusView}</div>
                    </div>
                    <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                      <div className="text-[10px] font-bold text-[var(--amber)] uppercase">Variant Perception</div>
                      <div className="text-[11px] text-[var(--text)] leading-relaxed">{aiAnalysis.variantPerception}</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded space-y-1">
                    <div className="text-[10px] font-bold text-[var(--up)] uppercase">Why the Market May Be Wrong</div>
                    <div className="text-[11px] text-[var(--text)] leading-relaxed">{aiAnalysis.whyMarketMayBeWrong}</div>
                  </div>

                  <div className="p-2.5 bg-[var(--down)]/10 border border-[var(--down)]/30 rounded space-y-1">
                    <div className="text-[10px] font-bold text-[var(--down)] uppercase">Strongest Short Thesis</div>
                    <div className="text-[11px] text-[var(--text)] leading-relaxed">{aiAnalysis.strongestShortThesis}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-[var(--panel)] border border-[var(--border)] rounded">
                  <div className="dim text-[11px] mb-2">
                    Click <strong>RUN CIO COMMITTEE</strong> to trigger Claude&apos;s qualitative synthesis on {symbol}.
                  </div>
                  <div className="text-[9px] text-[var(--text-dim)]">
                    All quantitative DCF models, Reverse DCF hurdle rates, 3D assessments, and monitoring KPIs are already active and computed across the tabs.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
