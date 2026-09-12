/**
 * Expectations Engine / Reverse DCF
 * Solves for the market-implied growth rates and margin requirements embedded in the current stock price.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";
import { type FundamentalAnalysis } from "./fundamentalEngine.js";

export type ExpectationsAnalysis = {
  impliedRevenueCAGR5Y: number | null; // e.g. 0.18 = 18%
  impliedTerminalMargin: number | null; // e.g. 0.34 = 34%
  impliedTerminalGrowth: number | null; // e.g. 0.028 = 2.8%
  assessment: "EXTREMELY LOW" | "LOW" | "REASONABLE" | "HIGH" | "EXTREMELY HIGH" | "UNAVAILABLE";
  narrativeSummary: string;
  hurdleRateAssessment: string;
};

/**
 * Reverse DCF Solver:
 * Uses binary search / Newton-Raphson approximation to find the 5Y Revenue CAGR
 * that equates DCF Fair Value with the Current Market Price.
 */
export function analyzeExpectations(
  currentPrice: number | null,
  fundamentals: FundamentalAnalysis
): ExpectationsAnalysis {
  if (
    !currentPrice ||
    currentPrice <= 0 ||
    !fundamentals.revenue ||
    fundamentals.revenue <= 0 ||
    !fundamentals.sharesOutstanding ||
    fundamentals.sharesOutstanding <= 0
  ) {
    return {
      impliedRevenueCAGR5Y: null,
      impliedTerminalMargin: null,
      impliedTerminalGrowth: null,
      assessment: "UNAVAILABLE",
      narrativeSummary: "Insufficient revenue or share count data to run Reverse DCF.",
      hurdleRateAssessment: "Data unavailable for reverse expectations modeling.",
    };
  }

  const revenue = fundamentals.revenue;
  const shares = fundamentals.sharesOutstanding;
  const netDebt = fundamentals.netDebt ?? 0;
  const baseMargin = (fundamentals.operatingMargin && fundamentals.operatingMargin > 0)
    ? fundamentals.operatingMargin / 100
    : 0.18;
  const taxRate = RESEARCH_CONFIG.dcf.taxRate;
  const wacc = RESEARCH_CONFIG.dcf.scenarios.base.wacc;
  const terminalGrowth = RESEARCH_CONFIG.dcf.scenarios.base.terminalGrowth;
  const reinvestmentRate = RESEARCH_CONFIG.dcf.reinvestmentRateDefault;

  // Target equity value per share = currentPrice
  const targetEquityValue = currentPrice * shares;
  const targetEnterpriseValue = targetEquityValue + (netDebt > 0 ? netDebt : 0) - (netDebt < 0 ? Math.abs(netDebt) : 0);

  // Binary search for implied revenue growth rate 'g' in range [-30%, +80%]
  let low = -0.30;
  let high = 0.80;
  let impliedGrowth = 0.10;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    let dcfEV = 0;
    let projectedRev = revenue;
    let y5FCF = 0;

    for (let year = 1; year <= 5; year++) {
      projectedRev *= (1 + mid);
      const operatingIncome = projectedRev * baseMargin;
      const nopat = operatingIncome * (1 - taxRate);
      const fcf = Math.max(0, nopat * (1 - reinvestmentRate));
      if (year === 5) y5FCF = fcf;
      dcfEV += fcf / Math.pow(1 + wacc, year);
    }

    const terminalVal = (wacc > terminalGrowth) ? (y5FCF * (1 + terminalGrowth)) / (wacc - terminalGrowth) : (y5FCF / 0.05);
    dcfEV += terminalVal / Math.pow(1 + wacc, 5);

    if (dcfEV < targetEnterpriseValue) {
      low = mid;
    } else {
      high = mid;
    }
    impliedGrowth = mid;
  }

  impliedGrowth = Number(impliedGrowth.toFixed(3));
  const impliedTerminalMargin = Number(baseMargin.toFixed(3));
  const impliedTermGrowth = Number(terminalGrowth.toFixed(3));

  // Categorize Assessment
  let assessment: ExpectationsAnalysis["assessment"] = "REASONABLE";
  let narrativeSummary = "";
  let hurdleRateAssessment = "";

  if (impliedGrowth < RESEARCH_CONFIG.expectations.extremelyLow) {
    assessment = "EXTREMELY LOW";
    narrativeSummary = `Current price implies market expects revenue stagnation or contraction (${(impliedGrowth * 100).toFixed(1)}% CAGR). High margin of safety if core business stabilizes.`;
    hurdleRateAssessment = "Low execution hurdle. Stock is priced for severe deceleration or structural decline.";
  } else if (impliedGrowth < RESEARCH_CONFIG.expectations.low) {
    assessment = "LOW";
    narrativeSummary = `Market embeds modest ${(impliedGrowth * 100).toFixed(1)}% annual growth. Favorable asymmetry if company outperforms GDP-like growth.`;
    hurdleRateAssessment = "Moderate hurdle rate. Multiple expansion likely upon any positive earnings surprise.";
  } else if (impliedGrowth <= RESEARCH_CONFIG.expectations.reasonable) {
    assessment = "REASONABLE";
    narrativeSummary = `Market prices in a healthy ${(impliedGrowth * 100).toFixed(1)}% 5-year revenue CAGR with ${(baseMargin * 100).toFixed(1)}% operating margins. Valuation aligns with historical execution.`;
    hurdleRateAssessment = "Balanced risk/reward. Returns will track fundamental earnings compounding.";
  } else if (impliedGrowth <= RESEARCH_CONFIG.expectations.high) {
    assessment = "HIGH";
    narrativeSummary = `Current valuation demands aggressive ${(impliedGrowth * 100).toFixed(1)}% revenue CAGR and sustained ${(baseMargin * 100).toFixed(1)}% margins. Limited room for execution missteps.`;
    hurdleRateAssessment = "Elevated hurdle rate. Company must maintain high market share and strong pricing power.";
  } else {
    assessment = "EXTREMELY HIGH";
    narrativeSummary = `Priced for perfection: Market assumes ${(impliedGrowth * 100).toFixed(1)}% CAGR over 5 years. Any macro deceleration or margin compression creates steep downside.`;
    hurdleRateAssessment = "Severe hurdle rate. Asymmetric downside if growth slows even slightly toward industry averages.";
  }

  return {
    impliedRevenueCAGR5Y: impliedGrowth,
    impliedTerminalMargin,
    impliedTerminalGrowth: impliedTermGrowth,
    assessment,
    narrativeSummary,
    hurdleRateAssessment,
  };
}
