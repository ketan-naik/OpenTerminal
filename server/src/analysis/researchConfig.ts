/**
 * Central configuration for Institutional Hedge Fund Research & Capital Allocation.
 * All quantitative scoring weights, DCF baselines, risk thresholds, and position sizing tiers
 * are centralized here for easy tuning and customization.
 */

export const RESEARCH_CONFIG = {
  // Score Component Weights (Total = 100%)
  scoreWeights: {
    businessQuality: 0.15,
    growth: 0.10,
    profitability: 0.10,
    balanceSheet: 0.05,
    valuation: 0.15,
    fundamentalMomentum: 0.10,
    priceMomentum: 0.05,
    competitivePosition: 0.10,
    catalysts: 0.05,
    riskReward: 0.10,
    variantPerception: 0.05,
  },

  // DCF Model Assumptions
  dcf: {
    taxRate: 0.21, // 21% US Corporate Tax Baseline
    reinvestmentRateDefault: 0.25, // Fallback reinvestment rate if CapEx unavailable
    scenarios: {
      bear: {
        probability: 0.20,
        wacc: 0.10, // 10.0% Discount Rate
        terminalGrowth: 0.02, // 2.0% Terminal Growth
        growthHaircut: 0.60, // 40% haircut to historical growth
        marginCompression: 0.85, // 15% margin compression
      },
      base: {
        probability: 0.55,
        wacc: 0.09, // 9.0% Discount Rate
        terminalGrowth: 0.025, // 2.5% Terminal Growth
        growthMultiplier: 1.0, // 100% of trend growth
        marginMultiplier: 1.0, // Stable margins
      },
      bull: {
        probability: 0.25,
        wacc: 0.085, // 8.5% Discount Rate
        terminalGrowth: 0.03, // 3.0% Terminal Growth
        growthExpansion: 1.25, // 25% growth acceleration
        marginExpansion: 1.10, // 10% margin expansion
      },
    },
  },

  // Market Expectations (Reverse DCF) Thresholds for Implied 5Y Revenue CAGR
  expectations: {
    extremelyLow: 0.03, // < 3% implies market expects contraction or stagnation
    low: 0.08, // 3% - 8% mature / defensive
    reasonable: 0.15, // 8% - 15% solid growth
    high: 0.25, // 15% - 25% aggressive growth priced in
    extremelyHigh: 0.25, // > 25% hyper-growth priced in (high vulnerability to earnings misses)
  },

  // Risk Classification Thresholds (Annualized Realized Volatility)
  risk: {
    volatility: {
      low: 0.20, // < 20%
      moderate: 0.35, // 20% - 35%
      high: 0.50, // 35% - 50%
      veryHigh: 0.50, // > 50%
    },
    maxDrawdown: {
      low: 0.15, // < 15%
      moderate: 0.30, // 15% - 30%
      high: 0.45, // 30% - 45%
      veryHigh: 0.45, // > 45%
    },
  },

  // Position Sizing Tiers for a $1 Billion Fund ($10M - $80M ticket size)
  positionSizing: {
    noPosition: { label: "0% — No Position", min: 0.0, target: 0.0, max: 0.0 },
    watchPosition: { label: "0.5%–1.0% — Watch Position", min: 0.005, target: 0.01, max: 0.01 },
    smallPosition: { label: "1.0%–2.0% — Small / Starter Position", min: 0.01, target: 0.02, max: 0.025 },
    normalPosition: { label: "2.0%–4.0% — Normal Core Allocation", min: 0.02, target: 0.035, max: 0.045 },
    highConviction: { label: "4.0%–6.0% — High-Conviction Allocation", min: 0.04, target: 0.05, max: 0.065 },
    exceptionalConviction: { label: "6.0%–8.0% — Exceptional-Conviction Best Idea", min: 0.06, target: 0.07, max: 0.08 },
  },

  // Valuation Multiple Classification Percentiles
  valuation: {
    pe: { veryCheap: 12, cheap: 18, fair: 25, expensive: 35 },
    ps: { veryCheap: 1.5, cheap: 3.0, fair: 6.0, expensive: 12.0 },
    evEbitda: { veryCheap: 8, cheap: 12, fair: 18, expensive: 26 },
    fcfYield: { veryCheap: 0.08, cheap: 0.055, fair: 0.035, expensive: 0.02 }, // higher yield = cheaper
  },

  // Security Types & Valuation Suitability
  securityTypes: {
    etfSymbols: new Set(["SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLU", "XLB", "XLC", "GLD", "SLV", "USO", "TLT", "HYG", "LQD"]),
    financialSectors: new Set(["Finance", "Financials", "Commercial Banks", "Investment Banking", "Major Banks", "Regional Banks", "Life Insurance", "Property & Casualty Insurance"]),
    reitSectors: new Set(["Real Estate", "REIT", "Real Estate Development", "Real Estate Investment Trusts"]),
  },

  // Quantitative Monitoring KPI Defaults & Tripwire Break Levels
  kpiBenchmarks: {
    revenueGrowthYoY: { label: "Revenue Growth YoY", warning: 0.08, breaker: 0.02 },
    grossMargin: { label: "Gross Margin", warning: 0.40, breaker: 0.30 },
    operatingMargin: { label: "Operating Margin", warning: 0.15, breaker: 0.08 },
    fcfMargin: { label: "FCF Margin", warning: 0.12, breaker: 0.05 },
    roic: { label: "Return on Invested Capital", warning: 0.12, breaker: 0.06 },
    debtToEbitda: { label: "Net Debt / EBITDA", warning: 3.0, breaker: 4.5 },
    distance200DMA: { label: "Distance vs 200 DMA", warning: -0.05, breaker: -0.15 },
  },
};

export type ResearchConfig = typeof RESEARCH_CONFIG;
