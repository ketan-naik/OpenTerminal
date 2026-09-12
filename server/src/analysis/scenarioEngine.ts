/**
 * Scenario Analysis & Asymmetry Engine
 * Computes Bear / Base / Bull probabilistic outcomes, expected returns, and upside/downside ratios.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";
import { type DCFModel } from "./valuationEngine.js";

export type ScenarioRow = {
  name: "Bear" | "Base" | "Bull";
  probability: number; // e.g. 0.20 = 20%
  targetPrice: number;
  expectedReturnPercent: number;
  assumptions: string;
};

export type ScenarioAnalysis = {
  scenarios: [ScenarioRow, ScenarioRow, ScenarioRow];
  probabilityWeightedTarget: number;
  expectedReturnPercent: number;
  expectedDownsidePercent: number;
  upsideDownsideRatio: number;
  asymmetryVerdict: "Highly Favorable Asymmetry" | "Favorable" | "Balanced" | "Unfavorable" | "Severely Asymmetric Downside";
};

export function analyzeScenarios(
  currentPrice: number | null,
  dcf: DCFModel | null,
  multiplesValuation?: { pe?: number | null; eps?: number | null }
): ScenarioAnalysis | null {
  if (!currentPrice || currentPrice <= 0) return null;

  const cfg = RESEARCH_CONFIG.dcf.scenarios;
  let bearTarget: number;
  let baseTarget: number;
  let bullTarget: number;

  if (dcf) {
    bearTarget = dcf.bear.fairValue;
    baseTarget = dcf.base.fairValue;
    bullTarget = dcf.bull.fairValue;
  } else {
    // Fallback heuristic based on price and typical dispersion
    bearTarget = Number((currentPrice * 0.75).toFixed(2));
    baseTarget = Number((currentPrice * 1.18).toFixed(2));
    bullTarget = Number((currentPrice * 1.50).toFixed(2));
  }

  // Ensure logical ordering (Bear < Base < Bull)
  if (bearTarget >= baseTarget) bearTarget = Number((baseTarget * 0.80).toFixed(2));
  if (bullTarget <= baseTarget) bullTarget = Number((baseTarget * 1.25).toFixed(2));

  const bearReturn = Number((((bearTarget - currentPrice) / currentPrice) * 100).toFixed(1));
  const baseReturn = Number((((baseTarget - currentPrice) / currentPrice) * 100).toFixed(1));
  const bullReturn = Number((((bullTarget - currentPrice) / currentPrice) * 100).toFixed(1));

  const scenarios: [ScenarioRow, ScenarioRow, ScenarioRow] = [
    {
      name: "Bear",
      probability: cfg.bear.probability,
      targetPrice: bearTarget,
      expectedReturnPercent: bearReturn,
      assumptions: dcf
        ? `${(dcf.bear.revenueGrowth5Y * 100).toFixed(1)}% 5Y CAGR, ${(dcf.bear.terminalOperatingMargin * 100).toFixed(1)}% margin, ${dcf.bear.impliedMultiple}x exit multiple`
        : "Downside multiple compression and growth deceleration",
    },
    {
      name: "Base",
      probability: cfg.base.probability,
      targetPrice: baseTarget,
      expectedReturnPercent: baseReturn,
      assumptions: dcf
        ? `${(dcf.base.revenueGrowth5Y * 100).toFixed(1)}% 5Y CAGR, ${(dcf.base.terminalOperatingMargin * 100).toFixed(1)}% margin, ${dcf.base.impliedMultiple}x exit multiple`
        : "Consensus execution, stable operating margins",
    },
    {
      name: "Bull",
      probability: cfg.bull.probability,
      targetPrice: bullTarget,
      expectedReturnPercent: bullReturn,
      assumptions: dcf
        ? `${(dcf.bull.revenueGrowth5Y * 100).toFixed(1)}% 5Y CAGR, ${(dcf.bull.terminalOperatingMargin * 100).toFixed(1)}% margin, ${dcf.bull.impliedMultiple}x exit multiple`
        : "Market share gains, margin expansion, and multiple rerating",
    },
  ];

  // Probability Weighted Fair Value
  const pwFairValue = Number(
    (
      scenarios[0].targetPrice * scenarios[0].probability +
      scenarios[1].targetPrice * scenarios[1].probability +
      scenarios[2].targetPrice * scenarios[2].probability
    ).toFixed(2)
  );

  const expectedReturnPercent = Number((((pwFairValue - currentPrice) / currentPrice) * 100).toFixed(1));
  const expectedDownsidePercent = bearReturn < 0 ? bearReturn : -10.0;

  // Upside / Downside Ratio
  const absDownside = Math.abs(expectedDownsidePercent);
  const upsideDownsideRatio = absDownside > 0 ? Number((Math.max(0, bullReturn) / absDownside).toFixed(2)) : 3.0;

  let asymmetryVerdict: ScenarioAnalysis["asymmetryVerdict"] = "Balanced";
  if (upsideDownsideRatio >= 2.5 && expectedReturnPercent > 15) {
    asymmetryVerdict = "Highly Favorable Asymmetry";
  } else if (upsideDownsideRatio >= 1.5 && expectedReturnPercent > 5) {
    asymmetryVerdict = "Favorable";
  } else if (upsideDownsideRatio < 0.8 || expectedReturnPercent < -5) {
    asymmetryVerdict = "Severely Asymmetric Downside";
  } else if (upsideDownsideRatio < 1.1) {
    asymmetryVerdict = "Unfavorable";
  }

  return {
    scenarios,
    probabilityWeightedTarget: pwFairValue,
    expectedReturnPercent,
    expectedDownsidePercent,
    upsideDownsideRatio,
    asymmetryVerdict,
  };
}
