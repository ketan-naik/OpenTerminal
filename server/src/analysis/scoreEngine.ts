/**
 * Quantitative Scoring Engine
 * Computes deterministic scores (0-100) with transparent, documented rules.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";
import { type FundamentalAnalysis } from "./fundamentalEngine.js";
import { type ValuationAnalysis } from "./valuationEngine.js";
import { type MomentumAnalysis } from "./momentumEngine.js";
import { type RiskAnalysis } from "./riskEngine.js";
import { type ScenarioAnalysis } from "./scenarioEngine.js";

export type ResearchScores = {
  businessQuality: number; // 0 - 100
  growth: number; // 0 - 100
  profitability: number; // 0 - 100
  balanceSheet: number; // 0 - 100
  cashFlowQuality: number; // 0 - 100
  capitalEfficiency: number; // 0 - 100
  valuation: number; // 0 - 100 (higher = cheaper / more attractive)
  priceMomentum: number; // 0 - 100
  riskReward: number; // 0 - 100
  competitivePosition: number; // 0 - 100 (default heuristic / AI refined)
  catalysts: number; // 0 - 100 (default heuristic / AI refined)
  variantPerception: number; // 0 - 100 (default heuristic / AI refined)
  totalInvestmentScore: number; // 0 - 100 Weighted Total
};

const clamp = (val: number, min = 10, max = 98) => Math.max(min, Math.min(max, Math.round(val)));

export function computeScores(
  fundamentals: FundamentalAnalysis,
  valuation: ValuationAnalysis,
  momentum: MomentumAnalysis,
  risk: RiskAnalysis,
  scenarios: ScenarioAnalysis | null,
  qualitativeOverrides?: {
    competitivePosition?: number;
    catalysts?: number;
    variantPerception?: number;
  }
): ResearchScores {
  // 1. Profitability Score (Gross margin, Operating margin, Net margin, FCF margin)
  let profitScore = 50;
  if (fundamentals.grossMargin !== null) {
    if (fundamentals.grossMargin > 70) profitScore += 18;
    else if (fundamentals.grossMargin > 50) profitScore += 10;
    else if (fundamentals.grossMargin < 25) profitScore -= 10;
  }
  if (fundamentals.operatingMargin !== null) {
    if (fundamentals.operatingMargin > 30) profitScore += 18;
    else if (fundamentals.operatingMargin > 15) profitScore += 10;
    else if (fundamentals.operatingMargin < 5) profitScore -= 15;
  }
  if (fundamentals.netMargin !== null) {
    if (fundamentals.netMargin > 25) profitScore += 14;
    else if (fundamentals.netMargin > 10) profitScore += 6;
    else if (fundamentals.netMargin < 0) profitScore -= 20;
  }
  const profitability = clamp(profitScore);

  // 2. Growth Score (Revenue growth, EPS growth)
  let growthScore = 50;
  if (fundamentals.revenueGrowthYoY !== null) {
    if (fundamentals.revenueGrowthYoY > 30) growthScore += 35;
    else if (fundamentals.revenueGrowthYoY > 15) growthScore += 20;
    else if (fundamentals.revenueGrowthYoY > 5) growthScore += 8;
    else if (fundamentals.revenueGrowthYoY < 0) growthScore -= 25;
  }
  const growth = clamp(growthScore);

  // 3. Capital Efficiency Score (ROIC, ROE, ROA)
  let capEffScore = 50;
  const roic = fundamentals.roic ?? fundamentals.roe;
  if (roic !== null) {
    if (roic > 35) capEffScore += 35;
    else if (roic > 20) capEffScore += 20;
    else if (roic > 10) capEffScore += 8;
    else if (roic < 0) capEffScore -= 20;
  }
  if (fundamentals.roa !== null) {
    if (fundamentals.roa > 15) capEffScore += 15;
    else if (fundamentals.roa < 3) capEffScore -= 10;
  }
  const capitalEfficiency = clamp(capEffScore);

  // 4. Balance Sheet Score (Debt/EBITDA, Net Debt, Interest Coverage)
  let bsScore = 65;
  if (fundamentals.netDebt !== null) {
    if (fundamentals.netDebt <= 0) bsScore += 20; // Net Cash Positive
    else if (fundamentals.debtToEbitda !== null) {
      if (fundamentals.debtToEbitda < 1.5) bsScore += 10;
      else if (fundamentals.debtToEbitda > 4.0) bsScore -= 25;
      else if (fundamentals.debtToEbitda > 3.0) bsScore -= 15;
    }
  }
  if (fundamentals.interestCoverage !== null) {
    if (fundamentals.interestCoverage > 10) bsScore += 15;
    else if (fundamentals.interestCoverage < 2) bsScore -= 25;
  }
  const balanceSheet = clamp(bsScore);

  // 5. Cash Flow Quality (FCF Margin, FCF Conversion)
  let cfScore = 50;
  if (fundamentals.fcfMargin !== null) {
    if (fundamentals.fcfMargin > 25) cfScore += 25;
    else if (fundamentals.fcfMargin > 12) cfScore += 12;
    else if (fundamentals.fcfMargin < 0) cfScore -= 20;
  }
  if (fundamentals.fcfConversion !== null) {
    if (fundamentals.fcfConversion > 1.0) cfScore += 20; // FCF > Net Income
    else if (fundamentals.fcfConversion < 0.5) cfScore -= 15;
  }
  const cashFlowQuality = clamp(cfScore);

  // 6. Business Quality Composite (Weighted combination of Margins, ROIC, Balance Sheet, FCF)
  const businessQuality = clamp(
    profitability * 0.35 + capitalEfficiency * 0.30 + balanceSheet * 0.20 + cashFlowQuality * 0.15
  );

  // 7. Valuation Score (Higher = cheaper/more attractive)
  let valScore = 50;
  const pe = valuation.multiples.trailingPE;
  const ps = valuation.multiples.priceToSales;
  const fcfYield = valuation.multiples.fcfYield;

  if (pe !== null) {
    if (pe < 0) valScore = 20; // Unprofitable
    else if (pe < 15) valScore += 35;
    else if (pe < 22) valScore += 20;
    else if (pe > 45) valScore -= 25;
    else if (pe > 32) valScore -= 12;
  } else if (ps !== null) {
    if (ps < 2.0) valScore += 25;
    else if (ps > 15) valScore -= 25;
  }
  if (fcfYield !== null) {
    if (fcfYield > 6.0) valScore += 15;
    else if (fcfYield < 1.5) valScore -= 12;
  }
  if (valuation.dcf) {
    const upsideBase = valuation.dcf.base.upsideDownsidePercent;
    if (upsideBase > 30) valScore += 15;
    else if (upsideBase < -20) valScore -= 15;
  }
  const valuationScore = clamp(valScore);

  // 8. Price Momentum Score
  const priceMomentum = momentum.momentumScore;

  // 9. Risk / Reward Score
  let rrScore = 50;
  if (scenarios) {
    if (scenarios.upsideDownsideRatio > 2.5) rrScore += 30;
    else if (scenarios.upsideDownsideRatio > 1.5) rrScore += 15;
    else if (scenarios.upsideDownsideRatio < 0.8) rrScore -= 25;

    if (scenarios.expectedReturnPercent > 20) rrScore += 15;
    else if (scenarios.expectedReturnPercent < 0) rrScore -= 20;
  }
  const riskReward = clamp(rrScore);

  // 10. Qualitative Components (Heuristics with AI-Refinement capability)
  const competitivePosition = clamp(qualitativeOverrides?.competitivePosition ?? (businessQuality > 80 ? 88 : 65));
  const catalysts = clamp(qualitativeOverrides?.catalysts ?? (momentum.trendClassification.includes("Uptrend") ? 75 : 60));
  const variantPerception = clamp(qualitativeOverrides?.variantPerception ?? (valuationScore > 70 || businessQuality > 85 ? 72 : 55));

  // 11. Total Composite Investment Score (0 - 100)
  const w = RESEARCH_CONFIG.scoreWeights;
  const totalScoreRaw =
    businessQuality * w.businessQuality +
    growth * w.growth +
    profitability * w.profitability +
    balanceSheet * w.balanceSheet +
    valuationScore * w.valuation +
    growth * w.fundamentalMomentum +
    priceMomentum * w.priceMomentum +
    competitivePosition * w.competitivePosition +
    catalysts * w.catalysts +
    riskReward * w.riskReward +
    variantPerception * w.variantPerception;

  const totalInvestmentScore = clamp(totalScoreRaw, 15, 95);

  return {
    businessQuality,
    growth,
    profitability,
    balanceSheet,
    cashFlowQuality,
    capitalEfficiency,
    valuation: valuationScore,
    priceMomentum,
    riskReward,
    competitivePosition,
    catalysts,
    variantPerception,
    totalInvestmentScore,
  };
}
