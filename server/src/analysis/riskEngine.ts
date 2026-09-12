/**
 * Quantitative Risk Engine
 * Calculates multi-period realized volatilities, maximum drawdown, downside deviation, VaR, and risk classification.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";
import { type Candle } from "../providers/yahoo.js";

export type RiskAnalysis = {
  volatility30D: number | null; // Annualized percentage e.g. 28.5%
  volatility90D: number | null; // Annualized percentage
  volatility1Year: number | null; // Annualized percentage
  maxDrawdown1Year: number | null; // Percentage e.g. -22.4%
  downsideDeviation: number | null;
  valueAtRisk95_1D: number | null; // 1-day 95% VaR e.g. -2.8%
  valueAtRisk95_1M: number | null; // 1-month 95% VaR e.g. -11.5%
  beta: number | null;
  riskClassification: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
  riskSummary: string;
};

export function analyzeRisk(
  candles: Candle[],
  fallbackBeta?: number | null
): RiskAnalysis {
  if (!candles || candles.length < 10) {
    const estVol = fallbackBeta ? Number((Math.abs(fallbackBeta) * 18.5).toFixed(2)) : null;
    let cls: RiskAnalysis["riskClassification"] = "MODERATE";
    if (estVol) {
      if (estVol < 20) cls = "LOW";
      else if (estVol > 40) cls = "VERY HIGH";
      else if (estVol > 28) cls = "HIGH";
    }
    return {
      volatility30D: estVol,
      volatility90D: estVol,
      volatility1Year: estVol,
      maxDrawdown1Year: estVol ? Number((-estVol * 0.75).toFixed(2)) : null,
      downsideDeviation: estVol ? Number((estVol * 0.7).toFixed(2)) : null,
      valueAtRisk95_1D: estVol ? Number((-(estVol / Math.sqrt(252)) * 1.645).toFixed(2)) : null,
      valueAtRisk95_1M: estVol ? Number((-(estVol / Math.sqrt(12)) * 1.645).toFixed(2)) : null,
      beta: fallbackBeta ?? null,
      riskClassification: cls,
      riskSummary: fallbackBeta
        ? `Statistical risk modeled from market beta (${fallbackBeta.toFixed(2)}) with ${estVol}% estimated annual volatility.`
        : "Insufficient price history for statistical risk computation.",
    };
  }

  const closes = candles.map((c) => c.close);
  const len = closes.length;

  // Daily log returns
  const logReturns: number[] = [];
  for (let i = 1; i < len; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }

  // Annualized Volatility Helper (sqrt(252) * standard deviation)
  const calcAnnualVol = (sample: number[]): number | null => {
    if (sample.length < 5) return null;
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    const variance = sample.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (sample.length - 1);
    const dailyStd = Math.sqrt(variance);
    return Number((dailyStd * Math.sqrt(252) * 100).toFixed(2));
  };

  const vol30D = calcAnnualVol(logReturns.slice(-21));
  const vol90D = calcAnnualVol(logReturns.slice(-63));
  const vol1Y = calcAnnualVol(logReturns.slice(-252));

  // Max Drawdown over 1Y (or available length)
  const sample1Y = closes.slice(Math.max(0, len - 252));
  let peak = sample1Y[0];
  let maxDD = 0;
  for (const price of sample1Y) {
    if (price > peak) peak = price;
    const dd = (price - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  const maxDrawdown1Year = Number((maxDD * 100).toFixed(2));

  // Downside Deviation (standard deviation of negative returns only)
  const sampleReturns1Y = logReturns.slice(-252);
  const negativeReturns = sampleReturns1Y.filter((r) => r < 0);
  let downsideDeviation: number | null = null;
  if (negativeReturns.length > 3) {
    const sumSq = negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0);
    const ddDaily = Math.sqrt(sumSq / sampleReturns1Y.length);
    downsideDeviation = Number((ddDaily * Math.sqrt(252) * 100).toFixed(2));
  }

  // Parametric Value at Risk (VaR 95% = 1.645 * daily std dev)
  let valueAtRisk95_1D: number | null = null;
  let valueAtRisk95_1M: number | null = null;
  const currentVol = vol90D ?? vol1Y ?? vol30D;
  if (currentVol !== null) {
    const dailyVolFraction = (currentVol / 100) / Math.sqrt(252);
    valueAtRisk95_1D = Number((-1.645 * dailyVolFraction * 100).toFixed(2));
    valueAtRisk95_1M = Number((valueAtRisk95_1D * Math.sqrt(21)).toFixed(2));
  }

  // Risk Classification
  const refVol = vol1Y ?? vol90D ?? 30;
  const refDD = Math.abs(maxDrawdown1Year);
  let riskClassification: RiskAnalysis["riskClassification"] = "MODERATE";
  let riskSummary = "";

  const cfg = RESEARCH_CONFIG.risk;
  if (refVol < cfg.volatility.low * 100 && refDD < cfg.maxDrawdown.low * 100) {
    riskClassification = "LOW";
    riskSummary = `Low statistical volatility (${refVol.toFixed(1)}% annualized) and contained drawdown (${maxDrawdown1Year.toFixed(1)}%). Suitable for larger defensive sizing.`;
  } else if (refVol <= cfg.volatility.moderate * 100 && refDD <= cfg.maxDrawdown.moderate * 100) {
    riskClassification = "MODERATE";
    riskSummary = `Moderate risk profile with standard market volatility (${refVol.toFixed(1)}%) and manageable drawdown (${maxDrawdown1Year.toFixed(1)}%).`;
  } else if (refVol <= cfg.volatility.high * 100 || refDD <= cfg.maxDrawdown.high * 100) {
    riskClassification = "HIGH";
    riskSummary = `Elevated volatility (${refVol.toFixed(1)}%) and historical drawdown risk (${maxDrawdown1Year.toFixed(1)}%). Demands strict position sizing discipline.`;
  } else {
    riskClassification = "VERY HIGH";
    riskSummary = `High-beta / volatile profile (${refVol.toFixed(1)}% vol, ${maxDrawdown1Year.toFixed(1)}% max DD). Vulnerable to sharp liquidation events.`;
  }

  return {
    volatility30D: vol30D,
    volatility90D: vol90D,
    volatility1Year: vol1Y,
    maxDrawdown1Year,
    downsideDeviation,
    valueAtRisk95_1D,
    valueAtRisk95_1M,
    beta: fallbackBeta ?? null,
    riskClassification,
    riskSummary,
  };
}
