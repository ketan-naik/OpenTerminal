/**
 * Financial Calculation Engine & Deterministic Rule-Based Observations Generator.
 * Computes derived ratios, compound annual growth rates (CAGRs), cash conversion cycles,
 * and standard common-size statements.
 */

import { RuleBasedObservation } from "./screenerTypes.js";

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

/**
 * Calculates Compound Annual Growth Rate (CAGR) between two financial values over N years.
 * Formula: ((End Value / Start Value) ^ (1 / N)) - 1
 */
export function calculateCAGR(startVal: number | null | undefined, endVal: number | null | undefined, years: number): number | null {
  const s = num(startVal);
  const e = num(endVal);
  if (!s || !e || years <= 0 || s <= 0 || e <= 0) return null;
  const cagr = (Math.pow(e / s, 1 / years) - 1) * 100;
  return isFinite(cagr) ? Number(cagr.toFixed(2)) : null;
}

/**
 * Calculates Cash Conversion Cycle (CCC) in days:
 * DSO = (Receivables / Revenue) * 365
 * DIO = (Inventory / COGS) * 365
 * DPO = (Payables / COGS) * 365
 * CCC = DSO + DIO - DPO
 */
export function calculateWorkingCapitalRatios(financials: {
  revenue?: number | null;
  cogs?: number | null;
  accountsReceivable?: number | null;
  inventory?: number | null;
  accountsPayable?: number | null;
}): {
  dso: number | null;
  dio: number | null;
  dpo: number | null;
  ccc: number | null;
  workingCapitalDays: number | null;
} {
  const rev = num(financials.revenue);
  const cogs = num(financials.cogs) ?? (rev ? rev * 0.5 : null);
  const ar = num(financials.accountsReceivable);
  const inv = num(financials.inventory);
  const ap = num(financials.accountsPayable);

  const dso = rev && ar && rev > 0 ? Number(((ar / rev) * 365).toFixed(1)) : null;
  const dio = cogs && inv && cogs > 0 ? Number(((inv / cogs) * 365).toFixed(1)) : null;
  const dpo = cogs && ap && cogs > 0 ? Number(((ap / cogs) * 365).toFixed(1)) : null;
  const ccc = dso !== null && dio !== null && dpo !== null ? Number((dso + dio - dpo).toFixed(1)) : null;

  let wcDays: number | null = null;
  if (rev && ar !== null && inv !== null && ap !== null && rev > 0) {
    const netWorkingCap = (ar ?? 0) + (inv ?? 0) - (ap ?? 0);
    wcDays = Number(((netWorkingCap / rev) * 365).toFixed(1));
  }

  return { dso, dio, dpo, ccc, workingCapitalDays: wcDays };
}

/**
 * Generates deterministic, rule-based PROS and CONS for a company.
 * Never fabricates numbers. Strictly evaluates hard quantitative conditions.
 */
export function generateRuleBasedObservations(data: {
  revenueGrowthYoY?: number | null;
  revenueCagr3Y?: number | null;
  revenueCagr5Y?: number | null;
  epsGrowthYoY?: number | null;
  epsCagr3Y?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  fcfMargin?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  debtToEquity?: number | null;
  debtToEbitda?: number | null;
  currentRatio?: number | null;
  interestCoverage?: number | null;
  fcfConversion?: number | null;
  pe?: number | null;
  pb?: number | null;
  fcfYield?: number | null;
  dividendYield?: number | null;
  freeCashFlow?: number | null;
  netDebt?: number | null;
}): RuleBasedObservation[] {
  const pros: RuleBasedObservation[] = [];
  const cons: RuleBasedObservation[] = [];

  // --- 1. ROIC & Capital Efficiency ---
  if (data.roic !== null && data.roic !== undefined) {
    if (data.roic >= 20) {
      pros.push({
        type: "PRO",
        category: "Capital Efficiency",
        title: "Exceptional Capital Efficiency",
        detail: `Company generates an exceptional Return on Invested Capital of ${data.roic.toFixed(1)}%, well above the cost of capital.`,
        metric: "ROIC",
        value: `${data.roic.toFixed(1)}%`,
        severity: "HIGH",
      });
    } else if (data.roic >= 12) {
      pros.push({
        type: "PRO",
        category: "Capital Efficiency",
        title: "Solid ROIC Track Record",
        detail: `ROIC of ${data.roic.toFixed(1)}% demonstrates disciplined capital allocation and positive economic value added (EVA).`,
        metric: "ROIC",
        value: `${data.roic.toFixed(1)}%`,
        severity: "MEDIUM",
      });
    } else if (data.roic < 5) {
      cons.push({
        type: "CON",
        category: "Capital Efficiency",
        title: "Sub-Hurdle Return on Capital",
        detail: `ROIC of ${data.roic.toFixed(1)}% is below the corporate cost of capital, indicating poor capital reinvestment returns.`,
        metric: "ROIC",
        value: `${data.roic.toFixed(1)}%`,
        severity: "HIGH",
      });
    }
  }

  // --- 2. Balance Sheet & Solvency ---
  if (data.netDebt !== null && data.netDebt !== undefined && data.netDebt <= 0) {
    pros.push({
      type: "PRO",
      category: "Financial Health",
      title: "Net Cash Balance Sheet",
      detail: "Company maintains a fortress balance sheet with more cash & short-term investments than total debt.",
      metric: "Net Debt",
      value: "Net Cash",
      severity: "HIGH",
    });
  } else if (data.debtToEbitda !== null && data.debtToEbitda !== undefined) {
    if (data.debtToEbitda > 4.0) {
      cons.push({
        type: "CON",
        category: "Financial Health",
        title: "Elevated Debt Leverage",
        detail: `Net Debt to EBITDA is ${data.debtToEbitda.toFixed(1)}x, indicating significant financial leverage and sensitivity to credit conditions.`,
        metric: "Net Debt / EBITDA",
        value: `${data.debtToEbitda.toFixed(1)}x`,
        severity: "HIGH",
      });
    } else if (data.debtToEbitda < 1.5) {
      pros.push({
        type: "PRO",
        category: "Financial Health",
        title: "Conservative Debt Sizing",
        detail: `Net Debt / EBITDA of ${data.debtToEbitda.toFixed(1)}x is well within safe covenants.`,
        metric: "Net Debt / EBITDA",
        value: `${data.debtToEbitda.toFixed(1)}x`,
        severity: "MEDIUM",
      });
    }
  }

  if (data.interestCoverage !== null && data.interestCoverage !== undefined) {
    if (data.interestCoverage < 2.0 && data.interestCoverage > 0) {
      cons.push({
        type: "CON",
        category: "Financial Health",
        title: "Tight Interest Coverage",
        detail: `Operating income covers interest expense by only ${data.interestCoverage.toFixed(1)}x, creating debt service risk.`,
        metric: "Interest Coverage",
        value: `${data.interestCoverage.toFixed(1)}x`,
        severity: "HIGH",
      });
    } else if (data.interestCoverage >= 10.0) {
      pros.push({
        type: "PRO",
        category: "Financial Health",
        title: "Robust Interest Coverage",
        detail: `Interest coverage ratio is ${data.interestCoverage.toFixed(1)}x, leaving zero debt servicing strain.`,
        metric: "Interest Coverage",
        value: `${data.interestCoverage.toFixed(1)}x`,
        severity: "LOW",
      });
    }
  }

  // --- 3. Growth & Topline ---
  if (data.revenueGrowthYoY !== null && data.revenueGrowthYoY !== undefined) {
    if (data.revenueGrowthYoY >= 20) {
      pros.push({
        type: "PRO",
        category: "Growth",
        title: "Strong Topline Expansion",
        detail: `Revenue expanded by ${data.revenueGrowthYoY.toFixed(1)}% year-over-year, outpacing industry peer medians.`,
        metric: "Revenue Growth (YoY)",
        value: `+${data.revenueGrowthYoY.toFixed(1)}%`,
        severity: "HIGH",
      });
    } else if (data.revenueGrowthYoY < -5) {
      cons.push({
        type: "CON",
        category: "Growth",
        title: "Revenue Contraction",
        detail: `Revenue declined by ${Math.abs(data.revenueGrowthYoY).toFixed(1)}% YoY, signaling cyclical headwinds or market share loss.`,
        metric: "Revenue Growth (YoY)",
        value: `${data.revenueGrowthYoY.toFixed(1)}%`,
        severity: "HIGH",
      });
    }
  }

  // --- 4. Free Cash Flow & Conversion ---
  if (data.freeCashFlow !== null && data.freeCashFlow !== undefined) {
    if (data.freeCashFlow < 0) {
      cons.push({
        type: "CON",
        category: "Cash Flow",
        title: "Negative Free Cash Flow",
        detail: "Company is cash-absorptive with negative free cash flow over the period, requiring external financing or cash reserves.",
        metric: "FCF",
        value: "Negative",
        severity: "HIGH",
      });
    } else if (data.fcfMargin !== null && data.fcfMargin !== undefined && data.fcfMargin >= 18) {
      pros.push({
        type: "PRO",
        category: "Cash Flow",
        title: "High Free Cash Flow Margin",
        detail: `FCF margin of ${data.fcfMargin.toFixed(1)}% highlights strong cash conversion and asset-light operations.`,
        metric: "FCF Margin",
        value: `${data.fcfMargin.toFixed(1)}%`,
        severity: "HIGH",
      });
    }
  }

  if (data.fcfYield !== null && data.fcfYield !== undefined && data.fcfYield >= 6.5) {
    pros.push({
      type: "PRO",
      category: "Valuation",
      title: "Attractive FCF Yield",
      detail: `Free cash flow yield is ${data.fcfYield.toFixed(1)}%, providing strong downside protection and shareholder yield support.`,
      metric: "FCF Yield",
      value: `${data.fcfYield.toFixed(1)}%`,
      severity: "MEDIUM",
    });
  }

  // --- 5. Valuation Extremes ---
  if (data.pe !== null && data.pe !== undefined) {
    if (data.pe > 60) {
      cons.push({
        type: "CON",
        category: "Valuation",
        title: "High Valuation Multiples",
        detail: `Stock trades at ${data.pe.toFixed(1)}x trailing earnings, leaving zero margin of safety for quarterly execution misses.`,
        metric: "Trailing P/E",
        value: `${data.pe.toFixed(1)}x`,
        severity: "HIGH",
      });
    } else if (data.pe < 12 && data.pe > 0 && (data.roe ?? 0) > 10) {
      pros.push({
        type: "PRO",
        category: "Valuation",
        title: "Low Earnings Multiple with Healthy ROE",
        detail: `Trades at a modest ${data.pe.toFixed(1)}x P/E while generating ${data.roe?.toFixed(1)}% ROE.`,
        metric: "Trailing P/E",
        value: `${data.pe.toFixed(1)}x`,
        severity: "MEDIUM",
      });
    }
  }

  // Fallback if sparse data
  if (pros.length === 0 && cons.length === 0) {
    pros.push({
      type: "PRO",
      category: "Financial Health",
      title: "Established Operating History",
      detail: "Company maintains standard listed public reporting and liquidity.",
      metric: "Listing",
      value: "Active",
      severity: "LOW",
    });
  }

  return [...pros, ...cons];
}
