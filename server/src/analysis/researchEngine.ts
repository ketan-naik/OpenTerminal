/**
 * Master Hedge Fund Research Engine
 * Coordinates data extraction, runs all quantitative models, computes deterministic scores,
 * and generates the complete institutional research dossier.
 */

import { quotes as yahooQuotes, quoteFromChart, history as yahooHistory, type Quote, type Candle } from "../providers/yahoo.js";
import { scanFundamentals as tvScan, toTVExchange, getScannerUrlAndTicker } from "../providers/tradingview.js";
import { insiderTransactions, type InsiderTransaction } from "../providers/secedgar.js";
import { analyzeFundamentals, type FundamentalAnalysis, type RawFinancials } from "./fundamentalEngine.js";
import { analyzeValuation, type ValuationAnalysis } from "./valuationEngine.js";
import { analyzeExpectations, type ExpectationsAnalysis } from "./expectationsEngine.js";
import { analyzeMomentum, type MomentumAnalysis } from "./momentumEngine.js";
import { analyzeRisk, type RiskAnalysis } from "./riskEngine.js";
import { analyzeScenarios, type ScenarioAnalysis } from "./scenarioEngine.js";
import { computeScores, type ResearchScores } from "./scoreEngine.js";
import { RESEARCH_CONFIG } from "./researchConfig.js";
import { cacheGet, cacheSet } from "../cache.js";

export type SecurityType = "EQUITY" | "ETF" | "BANK_FINANCIAL" | "REIT" | "UNPROFITABLE_GROWTH";

export type QuantitativeThesisBreaker = {
  metric: string;
  condition: string;
  tripwireLevel: string;
  currentValue: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  action: "Immediate Exit / Liquidate" | "Trim 50% & Review" | "Underwrite Reassessment";
};

export type QuantitativeKPI = {
  metric: string;
  currentValue: string;
  expectedValue: string;
  warningLevel: string;
  thesisBreakLevel: string;
  category: "Growth" | "Margin" | "Returns" | "Solvency" | "Technical / Market";
};

export type OpportunityCostAssessment = {
  hurdleRatePercent: number;
  expectedReturnPercent: number;
  excessReturnOverHurdle: number;
  verdict: "Deserves Core Capital Allocation" | "Marginal Capital Competitiveness" | "Sub-Hurdle / Reallocate Capital Elsewhere";
  comparisonNote: string;
};

export type ThreeDimensionalAssessment = {
  isGreatCompany: { pass: boolean; score: number; rationale: string };
  isGreatStock: { pass: boolean; score: number; rationale: string };
  isGreatInvestmentAtTodayPrice: { pass: boolean; score: number; rationale: string };
};

export type DataConfidence = {
  level: "HIGH" | "MEDIUM" | "LOW";
  score: number; // 0 - 100
  availableFieldsCount: number;
  totalFieldsEvaluated: number;
  missingKeyFields: string[];
  freshness: string;
  qualityNotice?: string;
};

export type InvestmentDecision = {
  decision: "STRONG BUY" | "BUY" | "WATCH" | "HOLD" | "REDUCE" | "AVOID" | "SHORT";
  conviction: "HIGH" | "MEDIUM" | "LOW";
  summaryReason: string;
  initialPositionSize: number; // e.g. 0.025 = 2.5%
  targetPositionSize: number; // e.g. 0.04 = 4.0%
  maxPositionSize: number; // e.g. 0.06 = 6.0%
  positionSizingLabel: string;
};

export type HedgeFundResearch = {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  securityType: SecurityType;
  currentPrice: number | null;
  timestamp: string;
  scores: ResearchScores;
  fundamentals: FundamentalAnalysis;
  valuation: ValuationAnalysis;
  expectations: ExpectationsAnalysis;
  momentum: MomentumAnalysis;
  risk: RiskAnalysis;
  scenarios: ScenarioAnalysis | null;
  decision: InvestmentDecision;
  dataConfidence: DataConfidence;
  opportunityCost: OpportunityCostAssessment;
  threeDimensionalAssessment: ThreeDimensionalAssessment;
  quantitativeThesisBreakers: QuantitativeThesisBreaker[];
  deterministicKPIs: QuantitativeKPI[];
  recentInsiderTransactions: InsiderTransaction[];
};

/**
 * Fetch detailed TradingView scanner data for a single symbol
 */
async function fetchTVDetailedFundamentals(symbol: string, exchange: string | null): Promise<any> {
  const { url, ticker } = getScannerUrlAndTicker(symbol, exchange);

  const COLUMNS = [
    "description",
    "close",
    "total_revenue",
    "gross_margin",
    "operating_margin",
    "net_margin",
    "return_on_equity",
    "return_on_assets",
    "return_on_invested_capital",
    "free_cash_flow",
    "operating_cash_flow",
    "total_debt",
    "cash_n_cash_equivalents",
    "total_shares_outstanding",
    "price_earnings_ttm",
    "price_earnings_growth_ratio_ttm",
    "price_to_sales_trailing_twelve_months",
    "enterprise_value_ebitda_ttm",
    "price_free_cash_flow_ratio_ttm",
    "price_to_book_ratio",
    "Perf.W",
    "Perf.1M",
    "Perf.3M",
    "Perf.6M",
    "Perf.Y",
    "Perf.YTD",
    "SMA50",
    "SMA200",
    "beta_1_year",
    "capital_expenditures",
    "dividends_yield_current",
    "sector",
  ];

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
        Referer: "https://www.tradingview.com/",
        Origin: "https://www.tradingview.com",
      },
      body: JSON.stringify({ symbols: { tickers: [ticker] }, columns: COLUMNS }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const row = json?.data?.[0]?.d;
    if (!row) return null;

    return {
      description: row[0],
      close: row[1],
      totalRevenue: row[2],
      grossMargin: row[3],
      operatingMargin: row[4],
      netMargin: row[5],
      returnOnEquity: row[6],
      returnOnAssets: row[7],
      returnOnInvestedCapital: row[8],
      freeCashFlow: row[9],
      operatingCashFlow: row[10],
      totalDebt: row[11],
      cashAndEquivalents: row[12],
      sharesOutstanding: row[13],
      pe: row[14],
      peg: row[15],
      ps: row[16],
      evEbitda: row[17],
      pfcf: row[18],
      pb: row[19],
      perfW: row[20],
      perf1M: row[21],
      perf3M: row[22],
      perf6M: row[23],
      perfY: row[24],
      perfYTD: row[25],
      sma50: row[26],
      sma200: row[27],
      beta: row[28],
      capex: row[29],
      dividendYield: row[30],
      sector: row[31],
    };
  } catch {
    return null;
  }
}

/**
 * Detect Security Type for specialized valuation models
 */
function detectSecurityType(
  symbol: string,
  sector: string | null | undefined,
  fundamentals: FundamentalAnalysis
): SecurityType {
  const sym = symbol.toUpperCase().trim();
  if (
    RESEARCH_CONFIG.securityTypes.etfSymbols.has(sym) ||
    sector?.toLowerCase().includes("etf") ||
    sector?.toLowerCase().includes("fund") ||
    sector?.toLowerCase().includes("index")
  ) {
    return "ETF";
  }
  if (
    (sector && RESEARCH_CONFIG.securityTypes.financialSectors.has(sector)) ||
    (sector && (sector.toLowerCase().includes("bank") || sector.toLowerCase().includes("financial") || sector.toLowerCase().includes("insurance")))
  ) {
    return "BANK_FINANCIAL";
  }
  if (
    (sector && RESEARCH_CONFIG.securityTypes.reitSectors.has(sector)) ||
    (sector && (sector.toLowerCase().includes("reit") || sector.toLowerCase().includes("real estate")))
  ) {
    return "REIT";
  }
  if (
    (fundamentals.operatingMargin !== null && fundamentals.operatingMargin < 0) ||
    (fundamentals.freeCashFlow !== null && fundamentals.freeCashFlow < 0)
  ) {
    return "UNPROFITABLE_GROWTH";
  }
  return "EQUITY";
}

/**
 * Generate Quantitative Thesis Breakers (Strict Tripwires)
 */
function generateThesisBreakers(
  fundamentals: FundamentalAnalysis,
  valuation: ValuationAnalysis,
  momentum: MomentumAnalysis,
  risk: RiskAnalysis
): QuantitativeThesisBreaker[] {
  const breakers: QuantitativeThesisBreaker[] = [];

  // 1. Revenue Growth Tripwire
  if (fundamentals.revenueGrowthYoY !== null) {
    const curRevGrowth = fundamentals.revenueGrowthYoY;
    const tripwire = Math.max(2.0, Math.round(curRevGrowth * 0.5 * 10) / 10);
    breakers.push({
      metric: "Revenue Growth YoY",
      condition: `Growth slows below ${tripwire.toFixed(1)}%`,
      tripwireLevel: `< ${tripwire.toFixed(1)}%`,
      currentValue: `${curRevGrowth >= 0 ? "+" : ""}${curRevGrowth.toFixed(1)}%`,
      severity: "CRITICAL",
      action: "Underwrite Reassessment",
    });
  } else {
    breakers.push({
      metric: "Revenue Growth YoY",
      condition: "Revenue growth drops below 3.0% annualized",
      tripwireLevel: "< 3.0%",
      currentValue: "N/A",
      severity: "HIGH",
      action: "Underwrite Reassessment",
    });
  }

  // 2. Gross Margin Tripwire
  if (fundamentals.grossMargin !== null) {
    const curGM = fundamentals.grossMargin;
    const tripwire = Math.max(15.0, Math.round((curGM - 3.5) * 10) / 10);
    breakers.push({
      metric: "Gross Profit Margin",
      condition: `Margin compresses >350bps below ${tripwire.toFixed(1)}%`,
      tripwireLevel: `< ${tripwire.toFixed(1)}%`,
      currentValue: `${curGM.toFixed(1)}%`,
      severity: "HIGH",
      action: "Trim 50% & Review",
    });
  }

  // 3. FCF / Operating Margin Tripwire
  if (fundamentals.fcfMargin !== null) {
    const curFCFM = fundamentals.fcfMargin;
    const tripwire = Math.max(4.0, Math.round((curFCFM - 5.0) * 10) / 10);
    breakers.push({
      metric: "Free Cash Flow Margin",
      condition: `FCF conversion degrades below ${tripwire.toFixed(1)}%`,
      tripwireLevel: `< ${tripwire.toFixed(1)}%`,
      currentValue: `${curFCFM.toFixed(1)}%`,
      severity: "HIGH",
      action: "Trim 50% & Review",
    });
  }

  // 4. ROIC / Capital Allocation Tripwire
  if (fundamentals.roic !== null) {
    const curROIC = fundamentals.roic;
    const tripwire = Math.max(6.0, Math.round((curROIC * 0.6) * 10) / 10);
    breakers.push({
      metric: "Return on Invested Capital (ROIC)",
      condition: `ROIC drops below cost of capital (${tripwire.toFixed(1)}%)`,
      tripwireLevel: `< ${tripwire.toFixed(1)}%`,
      currentValue: `${curROIC.toFixed(1)}%`,
      severity: "HIGH",
      action: "Underwrite Reassessment",
    });
  }

  // 5. Net Debt / Solvency Tripwire
  if (fundamentals.netDebt !== null && fundamentals.debtToEbitda !== null) {
    const curLeverage = fundamentals.debtToEbitda;
    const tripwire = Math.max(3.5, Math.round((Math.max(curLeverage, 1.0) * 1.5) * 10) / 10);
    breakers.push({
      metric: "Net Debt / EBITDA",
      condition: `Leverage expands beyond ${tripwire.toFixed(1)}x`,
      tripwireLevel: `> ${tripwire.toFixed(1)}x`,
      currentValue: `${curLeverage.toFixed(2)}x`,
      severity: "MODERATE",
      action: "Trim 50% & Review",
    });
  }

  // 6. Long-Term Technical Trend Breakdown
  if (momentum.distance200DMA !== null && momentum.sma200 !== null) {
    const sma200 = momentum.sma200;
    const breakPrice = sma200 * 0.88; // 12% below 200 DMA
    breakers.push({
      metric: "Price vs 200-Day Moving Average",
      condition: `Price breaks >12% below 200 DMA ($${breakPrice.toFixed(2)}) while margin deteriorates`,
      tripwireLevel: `< $${breakPrice.toFixed(2)} (-12%)`,
      currentValue: `${momentum.distance200DMA >= 0 ? "+" : ""}${momentum.distance200DMA.toFixed(1)}%`,
      severity: "CRITICAL",
      action: "Immediate Exit / Liquidate",
    });
  }

  return breakers;
}

/**
 * Generate 12-15 Deterministic Monitoring KPIs
 */
function generateDeterministicKPIs(
  fundamentals: FundamentalAnalysis,
  valuation: ValuationAnalysis,
  momentum: MomentumAnalysis,
  risk: RiskAnalysis
): QuantitativeKPI[] {
  const kpis: QuantitativeKPI[] = [];

  // Growth KPIs
  kpis.push({
    metric: "Revenue Growth YoY",
    category: "Growth",
    currentValue: fundamentals.revenueGrowthYoY !== null ? `${fundamentals.revenueGrowthYoY >= 0 ? "+" : ""}${fundamentals.revenueGrowthYoY.toFixed(1)}%` : "N/A",
    expectedValue: "+12.0% to +18.0%",
    warningLevel: "< +8.0%",
    thesisBreakLevel: "< +2.0%",
  });

  kpis.push({
    metric: "Gross Profit Margin",
    category: "Margin",
    currentValue: fundamentals.grossMargin !== null ? `${fundamentals.grossMargin.toFixed(1)}%` : "N/A",
    expectedValue: fundamentals.grossMargin !== null ? `>${(fundamentals.grossMargin - 1).toFixed(1)}%` : ">40.0%",
    warningLevel: fundamentals.grossMargin !== null ? `<${(fundamentals.grossMargin - 3.5).toFixed(1)}%` : "<35.0%",
    thesisBreakLevel: fundamentals.grossMargin !== null ? `<${(fundamentals.grossMargin - 7.0).toFixed(1)}%` : "<28.0%",
  });

  kpis.push({
    metric: "Operating Margin",
    category: "Margin",
    currentValue: fundamentals.operatingMargin !== null ? `${fundamentals.operatingMargin.toFixed(1)}%` : "N/A",
    expectedValue: fundamentals.operatingMargin !== null ? `>${(fundamentals.operatingMargin - 1).toFixed(1)}%` : ">20.0%",
    warningLevel: fundamentals.operatingMargin !== null ? `<${(fundamentals.operatingMargin - 4).toFixed(1)}%` : "<14.0%",
    thesisBreakLevel: fundamentals.operatingMargin !== null ? `<${(fundamentals.operatingMargin - 8).toFixed(1)}%` : "<8.0%",
  });

  kpis.push({
    metric: "Free Cash Flow Margin",
    category: "Margin",
    currentValue: fundamentals.fcfMargin !== null ? `${fundamentals.fcfMargin.toFixed(1)}%` : "N/A",
    expectedValue: "> 18.0%",
    warningLevel: "< 10.0%",
    thesisBreakLevel: "< 4.0%",
  });

  kpis.push({
    metric: "Return on Invested Capital (ROIC)",
    category: "Returns",
    currentValue: fundamentals.roic !== null ? `${fundamentals.roic.toFixed(1)}%` : "N/A",
    expectedValue: "> 15.0%",
    warningLevel: "< 10.0%",
    thesisBreakLevel: "< 6.0%",
  });

  kpis.push({
    metric: "Return on Equity (ROE)",
    category: "Returns",
    currentValue: fundamentals.roe !== null ? `${fundamentals.roe.toFixed(1)}%` : "N/A",
    expectedValue: "> 18.0%",
    warningLevel: "< 12.0%",
    thesisBreakLevel: "< 6.0%",
  });

  kpis.push({
    metric: "Net Debt / Cash Position",
    category: "Solvency",
    currentValue: fundamentals.netDebt !== null ? (fundamentals.netDebt < 0 ? `Net Cash ($${(Math.abs(fundamentals.netDebt) / 1e9).toFixed(2)}B)` : `Net Debt ($${(fundamentals.netDebt / 1e9).toFixed(2)}B)`) : "N/A",
    expectedValue: "Net Cash or < 2.0x EBITDA",
    warningLevel: "> 2.5x EBITDA",
    thesisBreakLevel: "> 4.0x EBITDA",
  });

  kpis.push({
    metric: "Trailing P/E Multiple",
    category: "Technical / Market",
    currentValue: valuation.multiples.trailingPE !== null ? `${valuation.multiples.trailingPE.toFixed(1)}x` : "N/A",
    expectedValue: "Historical Mean ± 1.0 SD",
    warningLevel: "> 45.0x (Multiple Expansion Risk)",
    thesisBreakLevel: "< 10.0x (Value Trap)",
  });

  kpis.push({
    metric: "EV / EBITDA Multiple",
    category: "Technical / Market",
    currentValue: valuation.multiples.evToEbitda !== null ? `${valuation.multiples.evToEbitda.toFixed(1)}x` : "N/A",
    expectedValue: "14.0x – 22.0x",
    warningLevel: "> 28.0x",
    thesisBreakLevel: "> 38.0x",
  });

  kpis.push({
    metric: "FCF Yield (Trailing)",
    category: "Returns",
    currentValue: valuation.multiples.fcfYield !== null ? `${(valuation.multiples.fcfYield * 100).toFixed(2)}%` : "N/A",
    expectedValue: "> 3.5%",
    warningLevel: "< 1.5%",
    thesisBreakLevel: "< 0.0% (Cash Burn)",
  });

  kpis.push({
    metric: "Distance vs 200-Day Moving Average",
    category: "Technical / Market",
    currentValue: momentum.distance200DMA !== null ? `${momentum.distance200DMA >= 0 ? "+" : ""}${momentum.distance200DMA.toFixed(1)}%` : "N/A",
    expectedValue: "> 0.0% (Uptrend)",
    warningLevel: "< -5.0%",
    thesisBreakLevel: "< -15.0%",
  });

  kpis.push({
    metric: "14-Day Relative Strength Index (RSI)",
    category: "Technical / Market",
    currentValue: momentum.rsi14 !== null ? momentum.rsi14.toFixed(1) : "N/A",
    expectedValue: "45.0 – 65.0 (Healthy Accumulation)",
    warningLevel: "< 35.0 (Oversold) or > 75.0 (Overbought)",
    thesisBreakLevel: "< 25.0 (Persistent Breakdown)",
  });

  kpis.push({
    metric: "Annualized Realized Volatility",
    category: "Technical / Market",
    currentValue: risk.volatility1Year !== null ? `${(risk.volatility1Year * 100).toFixed(1)}%` : "N/A",
    expectedValue: "< 32.0%",
    warningLevel: "> 45.0%",
    thesisBreakLevel: "> 65.0%",
  });

  kpis.push({
    metric: "Beta (Market Sensitivity vs S&P 500)",
    category: "Technical / Market",
    currentValue: risk.beta !== null ? `${risk.beta.toFixed(2)}x` : "N/A",
    expectedValue: "0.80x – 1.40x",
    warningLevel: "> 1.80x",
    thesisBreakLevel: "> 2.50x",
  });

  return kpis;
}

/**
 * 3-Dimensional Investment Assessment
 * Distinguishes:
 * 1. A Great Company (Moat, ROIC, Gross Margin, FCF)
 * 2. A Great Stock (Momentum, 200 DMA, Relative Strength)
 * 3. A Great Investment at Today's Price (Valuation Asymmetry, Reverse DCF Hurdle, Expected Return)
 */
function evaluateThreeDimensions(
  scores: ResearchScores,
  fundamentals: FundamentalAnalysis,
  valuation: ValuationAnalysis,
  momentum: MomentumAnalysis,
  scenarios: ScenarioAnalysis | null,
  expectations: ExpectationsAnalysis
): ThreeDimensionalAssessment {
  // 1. Is it a Great Company?
  const bqScore = scores.businessQuality;
  const isHighROIC = fundamentals.roic === null || fundamentals.roic >= 12;
  const isHighGM = fundamentals.grossMargin === null || fundamentals.grossMargin >= 35;
  const isPositiveFCF = fundamentals.freeCashFlow === null || fundamentals.freeCashFlow > 0;
  const isGreatCompanyPass = bqScore >= 65 && isHighROIC && isHighGM && isPositiveFCF;
  const isGreatCompanyRationale = isGreatCompanyPass
    ? `Elite business quality (${bqScore}/100): High gross margins (${fundamentals.grossMargin?.toFixed(1) ?? "N/A"}%), sustained positive FCF conversion, and strong return on invested capital (${fundamentals.roic?.toFixed(1) ?? "N/A"}%).`
    : `Moderate/Weak economic moat (${bqScore}/100): Margin pressure, cyclical capital intensity, or sub-hurdle return on invested capital.`;

  // 2. Is it a Great Stock?
  const momScore = scores.priceMomentum;
  const isAbove200DMA = momentum.distance200DMA === null || momentum.distance200DMA >= -2;
  const isPositiveTrend = momentum.trendClassification === "Strong Uptrend" || momentum.trendClassification === "Uptrend" || momentum.trendClassification === "Neutral";
  const isGreatStockPass = momScore >= 55 && isAbove200DMA && isPositiveTrend;
  const isGreatStockRationale = isGreatStockPass
    ? `Strong institutional sponsorship & momentum (${momScore}/100): Bullish trend alignment with price trading above the 200-day moving average.`
    : `Lagging relative strength (${momScore}/100): Trading below key moving averages with distribution pressure or lack of upside momentum.`;

  // 3. Is it a Great Investment at Today's Price?
  const valScore = scores.valuation;
  const rrRatio = scenarios?.upsideDownsideRatio ?? 1.5;
  const expReturn = scenarios?.expectedReturnPercent ?? 0;
  const hurdleOk = expectations.assessment !== "EXTREMELY HIGH";
  const isGreatInvPass = valScore >= 55 && rrRatio >= 1.4 && expReturn >= 8.5 && hurdleOk;
  const isGreatInvRationale = isGreatInvPass
    ? `Asymmetric risk/reward at current price: Expected return (+${expReturn.toFixed(1)}%) exceeds the 8.5% fund hurdle with ${rrRatio.toFixed(1)}x upside/downside asymmetry.`
    : `Unfavorable or priced-for-perfection risk/reward: Valuation multiple leaves insufficient margin of safety against potential execution or macro hiccups.`;

  return {
    isGreatCompany: {
      pass: isGreatCompanyPass,
      score: bqScore,
      rationale: isGreatCompanyRationale,
    },
    isGreatStock: {
      pass: isGreatStockPass,
      score: momScore,
      rationale: isGreatStockRationale,
    },
    isGreatInvestmentAtTodayPrice: {
      pass: isGreatInvPass,
      score: valScore,
      rationale: isGreatInvRationale,
    },
  };
}

/**
 * Opportunity Cost Assessment against $1B Fund Hurdle Rate (8.5%)
 */
function evaluateOpportunityCost(
  scenarios: ScenarioAnalysis | null,
  scores: ResearchScores,
  confidence: DataConfidence
): OpportunityCostAssessment {
  const hurdle = 8.5; // 8.5% Annualized Hedge Fund Cost of Capital
  const expReturn = scenarios?.expectedReturnPercent ?? 7.0;
  const excess = Math.round((expReturn - hurdle) * 10) / 10;

  let verdict: OpportunityCostAssessment["verdict"] = "Marginal Capital Competitiveness";
  let comparisonNote = "";

  if (excess >= 4.0 && scores.totalInvestmentScore >= 68 && confidence.level !== "LOW") {
    verdict = "Deserves Core Capital Allocation";
    comparisonNote = `Provides +${excess.toFixed(1)}% excess return over the 8.5% fund hurdle with superior risk-adjusted asymmetry, competing favorably against alternative long ideas.`;
  } else if (excess >= 0.0) {
    verdict = "Marginal Capital Competitiveness";
    comparisonNote = `Meets baseline hurdle rate (+${excess.toFixed(1)}% excess), but offers limited spread relative to broader equity risk premiums.`;
  } else {
    verdict = "Sub-Hurdle / Reallocate Capital Elsewhere";
    comparisonNote = `Trailing fund hurdle rate by ${Math.abs(excess).toFixed(1)}%. Capital is better deployed into higher conviction, higher margin-of-safety opportunities.`;
  }

  return {
    hurdleRatePercent: hurdle,
    expectedReturnPercent: expReturn,
    excessReturnOverHurdle: excess,
    verdict,
    comparisonNote,
  };
}

/**
 * Deterministic CIO Decision Engine
 * Translates scores, valuation, downside, and asymmetry into position recommendation
 */
function determineDecision(
  scores: ResearchScores,
  scenarios: ScenarioAnalysis | null,
  risk: RiskAnalysis,
  expectations: ExpectationsAnalysis,
  confidence: DataConfidence
): InvestmentDecision {
  const score = scores.totalInvestmentScore;
  const rrRatio = scenarios?.upsideDownsideRatio ?? 1.5;
  const expReturn = scenarios?.expectedReturnPercent ?? 10;
  const expDownside = scenarios?.expectedDownsidePercent ?? -15;

  let decision: InvestmentDecision["decision"] = "HOLD";
  let conviction: InvestmentDecision["conviction"] = "MEDIUM";
  let initial = 0.02;
  let target = 0.035;
  let max = 0.045;
  let sizingLabel = "2.0%–4.0% — Normal Core Allocation";
  let reason = "";

  if (score >= 80 && rrRatio >= 1.8 && expReturn >= 15) {
    decision = "STRONG BUY";
    conviction = "HIGH";
    initial = RESEARCH_CONFIG.positionSizing.highConviction.min;
    target = RESEARCH_CONFIG.positionSizing.highConviction.target;
    max = RESEARCH_CONFIG.positionSizing.exceptionalConviction.max;
    sizingLabel = "4.0%–6.0% — High-Conviction Allocation";
    reason = `Elite quality and favorable asymmetric upside (+${expReturn.toFixed(1)}% expected return vs ${expDownside.toFixed(1)}% downside, ${rrRatio.toFixed(1)}x R/R).`;
  } else if (score >= 68 && expReturn >= 8 && rrRatio >= 1.3) {
    decision = "BUY";
    conviction = "HIGH";
    initial = RESEARCH_CONFIG.positionSizing.normalPosition.min;
    target = RESEARCH_CONFIG.positionSizing.normalPosition.target;
    max = RESEARCH_CONFIG.positionSizing.normalPosition.max;
    sizingLabel = "2.0%–4.0% — Normal Core Allocation";
    reason = `Solid fundamental compounding and favorable risk/reward. Attractively priced relative to alternative opportunities.`;
  } else if (score >= 55) {
    if (expectations.assessment === "HIGH" || expectations.assessment === "EXTREMELY HIGH") {
      decision = "WATCH";
      conviction = "MEDIUM";
      initial = RESEARCH_CONFIG.positionSizing.watchPosition.min;
      target = RESEARCH_CONFIG.positionSizing.watchPosition.target;
      max = RESEARCH_CONFIG.positionSizing.watchPosition.max;
      sizingLabel = "0.5%–1.0% — Watch Position";
      reason = `Great business but market expectations are elevated. Wait for a pullback or multiple compression.`;
    } else {
      decision = "HOLD";
      conviction = "MEDIUM";
      initial = RESEARCH_CONFIG.positionSizing.smallPosition.min;
      target = RESEARCH_CONFIG.positionSizing.smallPosition.target;
      max = RESEARCH_CONFIG.positionSizing.smallPosition.max;
      sizingLabel = "1.0%–2.0% — Small / Hold Position";
      reason = `Balanced risk/reward at current price. Fairly valued with moderate upside.`;
    }
  } else if (score >= 42) {
    decision = "REDUCE";
    conviction = "MEDIUM";
    initial = 0;
    target = 0.01;
    max = 0.015;
    sizingLabel = "0.0%–1.0% — Trim / Minimal Position";
    reason = `Sub-par capital efficiency or high debt load relative to growth profile. Better risk-adjusted opportunities elsewhere.`;
  } else if (score >= 30) {
    decision = "AVOID";
    conviction = "HIGH";
    initial = 0;
    target = 0;
    max = 0;
    sizingLabel = "0% — No Capital Allocation";
    reason = `Poor fundamentals, unfavorable risk/reward, or structural headwinds. Do not allocate capital.`;
  } else {
    decision = "SHORT";
    conviction = "MEDIUM";
    initial = 0.01;
    target = 0.02;
    max = 0.03;
    sizingLabel = "1.0%–2.0% — Short Candidate";
    reason = `Severely deteriorated fundamentals, extreme overvaluation, or broken cash conversion profile.`;
  }

  // Adjust for Low Confidence
  if (confidence.level === "LOW") {
    conviction = "LOW";
    if (decision === "STRONG BUY") decision = "BUY";
    target = Math.min(target, 0.02);
  }

  return {
    decision,
    conviction,
    summaryReason: reason,
    initialPositionSize: initial,
    targetPositionSize: target,
    maxPositionSize: max,
    positionSizingLabel: sizingLabel,
  };
}

/**
 * Execute Full Research Pipeline for a symbol
 */
export async function generateResearch(symbol: string): Promise<HedgeFundResearch> {
  const sym = symbol.toUpperCase().trim();
  const cacheKey = `research:${sym}`;
  const cached = cacheGet<HedgeFundResearch>(cacheKey);
  if (cached) return cached;

  // 1. Fetch Primary Data Concurrently
  let [quotesList, candles, insiders] = await Promise.all([
    yahooQuotes([sym]).catch(() => []),
    yahooHistory(sym, "1y", "1d").catch(() => []),
    insiderTransactions(sym, 10).catch(() => []),
  ]);

  let quote: Quote | undefined = quotesList[0];
  if (!quote?.price) {
    const chartQuote = await quoteFromChart(sym).catch(() => null);
    if (chartQuote) {
      quote = {
        ...chartQuote,
        pe: quote?.pe ?? chartQuote.pe,
        eps: quote?.eps ?? chartQuote.eps,
        marketCap: quote?.marketCap ?? chartQuote.marketCap,
        sharesOutstanding: quote?.sharesOutstanding ?? chartQuote.sharesOutstanding,
      };
    }
  }

  const tvData = await fetchTVDetailedFundamentals(sym, quote?.exchange ?? null);

  // 2. Normalize Financials
  const rawFinancials: RawFinancials = {
    totalRevenue: tvData?.totalRevenue ?? null,
    grossMargin: tvData?.grossMargin ?? null,
    operatingMargin: tvData?.operatingMargin ?? null,
    netMargin: tvData?.netMargin ?? null,
    freeCashFlow: tvData?.freeCashFlow ?? null,
    operatingCashFlow: tvData?.operatingCashFlow ?? null,
    capitalExpenditures: tvData?.capex ?? null,
    returnOnEquity: tvData?.returnOnEquity ?? null,
    returnOnAssets: tvData?.returnOnAssets ?? null,
    returnOnInvestedCapital: tvData?.returnOnInvestedCapital ?? null,
    totalDebt: tvData?.totalDebt ?? null,
    cashAndEquivalents: tvData?.cashAndEquivalents ?? null,
    sharesOutstanding: tvData?.sharesOutstanding ?? quote?.sharesOutstanding ?? null,
    eps: quote?.eps ?? null,
    revenueGrowthYoY: null,
    ebitda: null,
    interestExpense: null,
  };

  const fundamentals = analyzeFundamentals(rawFinancials);

  // 3. Detect Specialized Security Type
  const sector = tvData?.sector ?? (RESEARCH_CONFIG.securityTypes.etfSymbols.has(sym) ? "ETF" : "Equities");
  const securityType = detectSecurityType(sym, sector, fundamentals);

  // 4. Valuation Analysis & DCF
  const currentPrice =
    quote?.price ??
    (candles.length > 0 ? candles[candles.length - 1].close : null) ??
    (tvData?.close ?? null);

  const marketCap =
    quote?.marketCap ??
    (currentPrice && fundamentals.sharesOutstanding ? currentPrice * fundamentals.sharesOutstanding : null);

  const valuation = analyzeValuation(
    currentPrice,
    marketCap,
    fundamentals,
    {
      pe: quote?.pe ?? tvData?.pe ?? null,
      fwdPe: null,
      ps: tvData?.ps ?? null,
      evSales: null,
      evEbitda: tvData?.evEbitda ?? null,
      pb: tvData?.pb ?? null,
      divYield: quote?.dividendYield ?? (tvData?.dividendYield ? tvData.dividendYield / 100 : null),
    },
    securityType
  );

  // 5. Expectations / Reverse DCF
  const expectations = analyzeExpectations(currentPrice, fundamentals);

  // 6. Momentum Engine
  const momentum = analyzeMomentum(candles, {
    week52High: quote?.week52High,
    week52Low: quote?.week52Low,
    price: currentPrice,
    perfW: tvData?.perfW,
    perf1M: tvData?.perf1M,
    perf3M: tvData?.perf3M,
    perf6M: tvData?.perf6M,
    perfY: tvData?.perfY,
    perfYTD: tvData?.perfYTD,
    sma50: tvData?.sma50,
    sma200: tvData?.sma200,
  });

  // 7. Risk Engine
  const risk = analyzeRisk(candles, quote?.beta ?? tvData?.beta);

  // 8. Scenario Engine
  const scenarios = analyzeScenarios(currentPrice, valuation.dcf);

  // 9. Data Confidence Assessment
  const fieldsToCheck = [
    fundamentals.revenue,
    fundamentals.grossMargin,
    fundamentals.operatingMargin,
    fundamentals.freeCashFlow,
    fundamentals.roe,
    fundamentals.totalDebt,
    fundamentals.sharesOutstanding,
    currentPrice,
    valuation.multiples.trailingPE,
    candles.length >= 50 ? 1 : null,
  ];

  const presentCount = fieldsToCheck.filter((f) => f !== null).length;
  const confidenceScore = Math.round((presentCount / fieldsToCheck.length) * 100);
  let confidenceLevel: DataConfidence["level"] = "HIGH";
  if (confidenceScore < 45) confidenceLevel = "LOW";
  else if (confidenceScore < 75) confidenceLevel = "MEDIUM";

  const missingKeyFields: string[] = [];
  if (fundamentals.revenue === null) missingKeyFields.push("Revenue");
  if (fundamentals.operatingMargin === null) missingKeyFields.push("Operating Margin");
  if (fundamentals.freeCashFlow === null) missingKeyFields.push("Free Cash Flow");
  if (candles.length < 50) missingKeyFields.push("1Y Historical Price Series");

  const dataConfidence: DataConfidence = {
    level: confidenceLevel,
    score: confidenceScore,
    availableFieldsCount: presentCount,
    totalFieldsEvaluated: fieldsToCheck.length,
    missingKeyFields,
    freshness: "Real-time stream / SEC-TradingView consolidated",
    qualityNotice:
      confidenceLevel === "LOW"
        ? "LOW DATA CONFIDENCE: Missing essential fundamental inputs. Conviction and maximum position sizing have been penalized to protect capital."
        : undefined,
  };

  // 10. Rule-based Scores
  const scores = computeScores(fundamentals, valuation, momentum, risk, scenarios);

  // 11. Final Decision & Sizing
  const decision = determineDecision(scores, scenarios, risk, expectations, dataConfidence);

  // 12. Quantitative Thesis Breakers & Monitoring KPIs
  const quantitativeThesisBreakers = generateThesisBreakers(fundamentals, valuation, momentum, risk);
  const deterministicKPIs = generateDeterministicKPIs(fundamentals, valuation, momentum, risk);

  // 13. Opportunity Cost & 3D Assessment
  const opportunityCost = evaluateOpportunityCost(scenarios, scores, dataConfidence);
  const threeDimensionalAssessment = evaluateThreeDimensions(
    scores,
    fundamentals,
    valuation,
    momentum,
    scenarios,
    expectations
  );

  const researchResult: HedgeFundResearch = {
    symbol: sym,
    companyName: quote?.name ?? tvData?.description ?? sym,
    sector,
    exchange: quote?.exchange ?? "US",
    securityType,
    currentPrice,
    timestamp: new Date().toISOString(),
    scores,
    fundamentals,
    valuation,
    expectations,
    momentum,
    risk,
    scenarios,
    decision,
    dataConfidence,
    opportunityCost,
    threeDimensionalAssessment,
    quantitativeThesisBreakers,
    deterministicKPIs,
    recentInsiderTransactions: insiders.slice(0, 8),
  };

  // Cache for 15 minutes (900,000 ms)
  cacheSet(cacheKey, researchResult, 15 * 60 * 1000);

  return researchResult;
}
