import { describe, it, expect } from "vitest";
import { findMetric, formatMetricValue, METRIC_REGISTRY } from "./metricRegistry.js";
import { calculateCAGR, calculateWorkingCapitalRatios, generateRuleBasedObservations } from "./financialCalculations.js";
import {
  tokenizeQuery,
  parseNumericValue,
  ScreenerParser,
  evaluateAST,
  executeScreenerQuery,
  PREBUILT_SCREENS,
} from "./screenerQueryEngine.js";
import { ScreenerRow } from "./screenerTypes.js";

describe("Metric Registry", () => {
  it("has registered over 30 fundamental metrics across categories", () => {
    expect(METRIC_REGISTRY.length).toBeGreaterThan(25);
  });

  it("finds metrics by exact ID and common aliases", () => {
    expect(findMetric("roic")?.id).toBe("roic");
    expect(findMetric("ROIC")?.id).toBe("roic");
    expect(findMetric("return on invested capital")?.id).toBe("roic");
    expect(findMetric("P/E")?.id).toBe("pe");
    expect(findMetric("Price to Earnings")?.id).toBe("pe");
    expect(findMetric("Market Cap")?.id).toBe("marketCap");
    expect(findMetric("debt to equity")?.id).toBe("debtToEquity");
  });

  it("formats metric values correctly according to unit and format", () => {
    expect(formatMetricValue(1234567890000, "currency")).toBe("$1.23T");
    expect(formatMetricValue(45000000000, "currency")).toBe("$45.00B");
    expect(formatMetricValue(18.526, "percent")).toBe("+18.53%");
    expect(formatMetricValue(-4.2, "percent")).toBe("-4.20%");
    expect(formatMetricValue(24.5, "multiple", "x")).toBe("24.5x");
    expect(formatMetricValue(42.3, "days")).toBe("42d");
  });
});

describe("Financial Calculations Engine", () => {
  it("calculates CAGR correctly", () => {
    // 100 to 133.1 in 3 years = 10% CAGR
    const cagr = calculateCAGR(100, 133.1, 3);
    expect(cagr).toBe(10);
  });

  it("calculates Cash Conversion Cycle correctly", () => {
    const res = calculateWorkingCapitalRatios({
      revenue: 1000,
      cogs: 600,
      accountsReceivable: 100, // DSO = (100/1000)*365 = 36.5
      inventory: 150, // DIO = (150/600)*365 = 91.25
      accountsPayable: 80, // DPO = (80/600)*365 = 48.67
    });
    expect(res.dso).toBe(36.5);
    expect(res.dio).toBe(91.3);
    expect(res.dpo).toBe(48.7);
    expect(res.ccc).toBe(79.1);
  });

  it("generates deterministic pros and cons from quantitative metrics", () => {
    const observations = generateRuleBasedObservations({
      roic: 28.5,
      netDebt: -5000000000, // Net Cash
      revenueGrowthYoY: 25.4,
      fcfMargin: 22.1,
      pe: 75.0, // High valuation
    });
    const pros = observations.filter((o) => o.type === "PRO");
    const cons = observations.filter((o) => o.type === "CON");

    expect(pros.some((p) => p.metric === "ROIC")).toBe(true);
    expect(pros.some((p) => p.metric === "Net Debt")).toBe(true);
    expect(pros.some((p) => p.metric === "Revenue Growth (YoY)")).toBe(true);
    expect(cons.some((c) => c.metric === "Trailing P/E")).toBe(true);
  });
});

describe("Screener Query Engine", () => {
  const sampleUniverse: ScreenerRow[] = [
    {
      symbol: "NVDA",
      name: "Nvidia Corporation",
      sector: "Electronic Technology",
      industry: "Semiconductors",
      exchange: "NASDAQ",
      country: "US",
      price: 120,
      changePercent: 2.5,
      marketCap: 3000000000000,
      pe: 45,
      forwardPe: 30,
      peg: 1.2,
      ps: 28,
      pb: 35,
      evSales: 27,
      evEbitda: 40,
      priceToFCF: 50,
      fcfYield: 2.0,
      dividendYield: 0.1,
      grossMargin: 75,
      operatingMargin: 62,
      netMargin: 55,
      fcfMargin: 48,
      roe: 110,
      roa: 80,
      roic: 95,
      revenueGrowthYoY: 122,
      revenueCagr3Y: 65,
      revenueCagr5Y: 45,
      epsGrowthYoY: 150,
      epsCagr3Y: 70,
      epsCagr5Y: 50,
      fcfGrowthYoY: 180,
      totalDebt: 10000000000,
      netDebt: -20000000000,
      debtToEquity: 0.2,
      debtToEbitda: 0.2,
      currentRatio: 3.5,
      quickRatio: 3.0,
      interestCoverage: 50,
      operatingCashFlow: 45000000000,
      freeCashFlow: 40000000000,
      capex: 5000000000,
      fcfConversion: 90,
      return1M: 5,
      return3M: 15,
      return6M: 30,
      return1Y: 140,
      priceVs50DMA: 8,
      priceVs200DMA: 25,
      beta: 1.6,
      volatility: 42,
      insiderOwnership: 4.2,
      institutionalOwnership: 68,
      cioScore: 84,
    },
    {
      symbol: "F",
      name: "Ford Motor Company",
      sector: "Consumer Durables",
      industry: "Motor Vehicles",
      exchange: "NYSE",
      country: "US",
      price: 10,
      changePercent: -0.5,
      marketCap: 40000000000,
      pe: 6.5,
      forwardPe: 7.0,
      peg: 2.5,
      ps: 0.25,
      pb: 0.9,
      evSales: 0.8,
      evEbitda: 5.5,
      priceToFCF: 8.0,
      fcfYield: 12.5,
      dividendYield: 5.8,
      grossMargin: 12,
      operatingMargin: 4.5,
      netMargin: 3.2,
      fcfMargin: 2.8,
      roe: 9.5,
      roa: 2.1,
      roic: 4.8,
      revenueGrowthYoY: 2.1,
      revenueCagr3Y: 4.5,
      revenueCagr5Y: 1.2,
      epsGrowthYoY: -10,
      epsCagr3Y: -2,
      epsCagr5Y: -5,
      fcfGrowthYoY: -15,
      totalDebt: 140000000000,
      netDebt: 110000000000,
      debtToEquity: 3.2,
      debtToEbitda: 8.5,
      currentRatio: 1.2,
      quickRatio: 0.9,
      interestCoverage: 2.1,
      operatingCashFlow: 8000000000,
      freeCashFlow: 4000000000,
      capex: 4000000000,
      fcfConversion: 40,
      return1M: -2,
      return3M: -8,
      return6M: -12,
      return1Y: -15,
      priceVs50DMA: -4,
      priceVs200DMA: -10,
      beta: 1.2,
      volatility: 28,
      insiderOwnership: 1.5,
      institutionalOwnership: 52,
      cioScore: 42,
    },
  ];

  it("parses numeric multipliers correctly (B, M, K, %)", () => {
    expect(parseNumericValue("10B")).toBe(10000000000);
    expect(parseNumericValue("500M")).toBe(500000000);
    expect(parseNumericValue("25K")).toBe(25000);
    expect(parseNumericValue("15%")).toBe(15);
  });

  it("tokenizes and parses simple comparison queries", () => {
    const tokens = tokenizeQuery("ROIC > 15 AND Market Cap > 10B");
    const parser = new ScreenerParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe("LOGICAL");
    expect((ast as any).operator).toBe("AND");
  });

  it("evaluates queries accurately against sample stock universe", () => {
    const query = "ROIC > 20 AND Market Cap > 100B";
    const res = executeScreenerQuery(query, sampleUniverse);
    expect(res.error).toBeNull();
    expect(res.results.length).toBe(1);
    expect(res.results[0].symbol).toBe("NVDA");
  });

  it("handles complex parenthesized OR / AND queries", () => {
    const query = "(ROIC > 50 OR P/E < 10) AND Market Cap > 10B";
    const res = executeScreenerQuery(query, sampleUniverse);
    expect(res.error).toBeNull();
    expect(res.results.length).toBe(2); // Both NVDA (high ROIC) and F (low PE) match
  });

  it("all prebuilt screens parse and validate without syntax errors", () => {
    for (const prebuilt of PREBUILT_SCREENS) {
      const res = executeScreenerQuery(prebuilt.query, sampleUniverse);
      expect(res.error).toBeNull();
    }
  });
});
