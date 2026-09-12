import { describe, expect, it } from "vitest";
import { analyzeFundamentals } from "./fundamentalEngine.js";
import { analyzeValuation } from "./valuationEngine.js";
import { analyzeExpectations } from "./expectationsEngine.js";
import { analyzeMomentum } from "./momentumEngine.js";
import { analyzeRisk } from "./riskEngine.js";
import { analyzeScenarios } from "./scenarioEngine.js";
import { computeScores } from "./scoreEngine.js";

describe("Hedge Fund Research Quantitative Engines", () => {
  it("computes fundamental metrics and margins correctly", () => {
    const raw = {
      totalRevenue: 100_000_000_000,
      grossMargin: 70.0,
      operatingMargin: 30.0,
      netMargin: 25.0,
      freeCashFlow: 28_000_000_000,
      operatingCashFlow: 35_000_000_000,
      capitalExpenditures: -7_000_000_000,
      returnOnEquity: 45.0,
      returnOnAssets: 25.0,
      returnOnInvestedCapital: 35.0,
      totalDebt: 10_000_000_000,
      cashAndEquivalents: 15_000_000_000,
      sharesOutstanding: 2_500_000_000,
      eps: 10.0,
      revenueGrowthYoY: 22.0,
    };

    const res = analyzeFundamentals(raw);
    expect(res.revenue).toBe(100_000_000_000);
    expect(res.grossMargin).toBe(70.0);
    expect(res.operatingMargin).toBe(30.0);
    expect(res.fcfMargin).toBe(28.0);
    expect(res.fcfPerShare).toBe(11.2);
    expect(res.netDebt).toBe(-5_000_000_000); // Net cash positive
    expect(res.fcfConversion).toBe(1.12); // FCF > Net income
  });

  it("handles missing fundamental data with null preservation", () => {
    const res = analyzeFundamentals({});
    expect(res.revenue).toBeNull();
    expect(res.grossMargin).toBeNull();
    expect(res.operatingMargin).toBeNull();
    expect(res.freeCashFlow).toBeNull();
    expect(res.roic).toBeNull();
  });

  it("computes scores deterministically and correctly weights multi-factor signals", () => {
    const fundamentals = analyzeFundamentals({
      grossMargin: 65.0,
      operatingMargin: 28.0,
      netMargin: 22.0,
      revenueGrowthYoY: 25.0,
      returnOnInvestedCapital: 30.0,
      returnOnEquity: 35.0,
      totalDebt: 5_000_000_000,
      cashAndEquivalents: 10_000_000_000,
    });

    const val = analyzeValuation(120, 120_000_000_000, fundamentals, {
      pe: 22.0,
      evEbitda: 14.0,
    });

    const mom = analyzeMomentum([]);
    const risk = analyzeRisk([]);
    const scenarios = analyzeScenarios(120, val.dcf);

    const scores = computeScores(fundamentals, val, mom, risk, scenarios);
    expect(scores.totalInvestmentScore).toBeGreaterThan(50);
    expect(scores.businessQuality).toBeGreaterThan(60);
    expect(scores.profitability).toBeGreaterThan(60);
    expect(scores.capitalEfficiency).toBeGreaterThan(60);
  });

  it("handles ETFs by disabling corporate DCF and classifying as ETF basket", () => {
    const fundamentals = analyzeFundamentals({});
    const val = analyzeValuation(
      500,
      500_000_000_000,
      fundamentals,
      { pe: 24.0, pb: 4.5 },
      "ETF"
    );

    expect(val.dcf).toBeNull();
    expect(val.classification).toBe("ETF / Index Basket — Corporate DCF Not Applicable");
  });

  it("handles Banks and Financial Institutions with P/B and ROE focus", () => {
    const fundamentals = analyzeFundamentals({
      returnOnEquity: 18.0,
      totalRevenue: 40_000_000_000,
      sharesOutstanding: 2_000_000_000,
    });

    const val = analyzeValuation(
      150,
      300_000_000_000,
      fundamentals,
      { pe: 11.0, pb: 1.2 },
      "BANK_FINANCIAL"
    );

    expect(val.classification).toBe("Financial Institution / Bank — Valuation relies on P/B, ROE");
  });

  it("calculates 3-Stage DCF model with Bear, Base, Bull cases", () => {
    const fundamentals = analyzeFundamentals({
      totalRevenue: 50_000_000_000,
      operatingMargin: 25.0,
      sharesOutstanding: 1_000_000_000,
      revenueGrowthYoY: 15.0,
      totalDebt: 5_000_000_000,
      cashAndEquivalents: 10_000_000_000,
    });

    const val = analyzeValuation(100, 100_000_000_000, fundamentals, {
      pe: 25.0,
      ps: 2.0,
      evEbitda: 14.0,
    });

    expect(val.dcf).not.toBeNull();
    if (val.dcf) {
      expect(val.dcf.bear.fairValue).toBeLessThan(val.dcf.base.fairValue);
      expect(val.dcf.base.fairValue).toBeLessThan(val.dcf.bull.fairValue);
      expect(val.dcf.base.wacc).toBe(0.09);
      expect(val.dcf.base.terminalGrowth).toBe(0.025);
    }
  });

  it("solves Reverse DCF expectations accurately", () => {
    const fundamentals = analyzeFundamentals({
      totalRevenue: 60_000_000_000,
      operatingMargin: 30.0,
      sharesOutstanding: 2_000_000_000,
      totalDebt: 0,
      cashAndEquivalents: 10_000_000_000,
    });

    const exp = analyzeExpectations(150, fundamentals);
    expect(exp.impliedRevenueCAGR5Y).not.toBeNull();
    expect(typeof exp.impliedRevenueCAGR5Y).toBe("number");
    expect(["EXTREMELY LOW", "LOW", "REASONABLE", "HIGH", "EXTREMELY HIGH"]).toContain(exp.assessment);
  });

  it("calculates momentum metrics and moving average distances", () => {
    // Generate synthetic 252 days of upward price series
    const candles = Array.from({ length: 252 }, (_, i) => ({
      time: 1700000000 + i * 86400,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99 + i * 0.5,
      close: 100 + i * 0.5,
      volume: 1000000,
    }));

    const mom = analyzeMomentum(candles);
    expect(mom.trendClassification).toBe("Strong Uptrend");
    expect(mom.distance50DMA).toBeGreaterThan(0);
    expect(mom.distance200DMA).toBeGreaterThan(0);
    expect(mom.momentumScore).toBeGreaterThan(60);
  });

  it("calculates annualized risk metrics, drawdown and VaR", () => {
    const candles = Array.from({ length: 252 }, (_, i) => ({
      time: 1700000000 + i * 86400,
      open: 100,
      high: 102,
      low: 98,
      close: 100 + Math.sin(i / 10) * 10,
      volume: 1000000,
    }));

    const risk = analyzeRisk(candles, 1.2);
    expect(risk.volatility1Year).toBeGreaterThan(0);
    expect(risk.maxDrawdown1Year).toBeLessThanOrEqual(0);
    expect(risk.valueAtRisk95_1D).toBeLessThan(0);
  });

  it("computes scenario asymmetry and rule-based investment score", () => {
    const fundamentals = analyzeFundamentals({
      totalRevenue: 100_000_000_000,
      grossMargin: 75.0,
      operatingMargin: 35.0,
      netMargin: 30.0,
      freeCashFlow: 35_000_000_000,
      returnOnEquity: 50.0,
      revenueGrowthYoY: 25.0,
      sharesOutstanding: 2_000_000_000,
    });

    const val = analyzeValuation(150, 300_000_000_000, fundamentals, { pe: 25.0 });
    const candles = Array.from({ length: 252 }, (_, i) => ({
      time: 1700000000 + i * 86400,
      open: 100 + i * 0.2,
      high: 101 + i * 0.2,
      low: 99 + i * 0.2,
      close: 100 + i * 0.2,
      volume: 1000000,
    }));

    const mom = analyzeMomentum(candles);
    const risk = analyzeRisk(candles);
    const scenarios = analyzeScenarios(150, val.dcf);

    expect(scenarios).not.toBeNull();
    if (scenarios) {
      expect(scenarios.probabilityWeightedTarget).toBeGreaterThan(0);
      expect(scenarios.upsideDownsideRatio).toBeGreaterThan(0);
    }

    const scores = computeScores(fundamentals, val, mom, risk, scenarios);
    expect(scores.totalInvestmentScore).toBeGreaterThanOrEqual(15);
    expect(scores.totalInvestmentScore).toBeLessThanOrEqual(95);
    expect(scores.businessQuality).toBeGreaterThan(70);
    expect(scores.profitability).toBeGreaterThan(70);
  });
});
