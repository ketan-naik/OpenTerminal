/**
 * Valuation & DCF Engine
 * Calculates multiples, valuation percentile/classification, and a transparent 3-stage DCF model.
 */

import { RESEARCH_CONFIG } from "./researchConfig.js";
import { type FundamentalAnalysis } from "./fundamentalEngine.js";

export type ValuationMultiples = {
  trailingPE: number | null;
  forwardPE: number | null;
  peg: number | null;
  priceToSales: number | null;
  evToSales: number | null;
  evToEbitda: number | null;
  priceToFCF: number | null;
  fcfYield: number | null;
  earningsYield: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
};

export type DCFCase = {
  fairValue: number;
  revenueGrowth5Y: number; // e.g. 0.15 = 15%
  terminalOperatingMargin: number; // e.g. 0.35 = 35%
  terminalGrowth: number; // e.g. 0.025 = 2.5%
  wacc: number; // e.g. 0.09 = 9.0%
  projectedFCF5Y: number;
  impliedMultiple: number;
  upsideDownsidePercent: number;
};

export type DCFModel = {
  bear: DCFCase;
  base: DCFCase;
  bull: DCFCase;
  taxRate: number;
  modelType: "3-Stage Unlevered FCF DCF";
  notes?: string;
};

export type ValuationAnalysis = {
  currentPrice: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  multiples: ValuationMultiples;
  classification:
    | "Very Cheap"
    | "Cheap"
    | "Fair"
    | "Expensive"
    | "Very Expensive"
    | "Unprofitable / Negative Multiple"
    | "ETF / Index Basket — Corporate DCF Not Applicable"
    | "Financial Institution / Bank — Valuation relies on P/B, ROE";
  dcf: DCFModel | null;
};

const n = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

/**
 * 3-Stage Unlevered DCF Calculator
 * Forecasts 5-year discrete FCFs -> Terminal Value -> Discount to Enterprise Value -> Equity Value per Share
 */
function calculateDCFCase(
  currentRevenue: number,
  currentMargin: number,
  shares: number,
  netDebt: number,
  growthRate: number,
  targetMargin: number,
  wacc: number,
  terminalGrowth: number,
  currentPrice: number
): DCFCase {
  const taxRate = RESEARCH_CONFIG.dcf.taxRate;
  let discountedFCFSum = 0;
  let projectedRev = currentRevenue;
  let year5FCF = 0;

  // 5-Year Discrete Forecast
  for (let year = 1; year <= 5; year++) {
    projectedRev *= (1 + growthRate);
    // Margin transitions smoothly toward target margin
    const margin = currentMargin + (targetMargin - currentMargin) * (year / 5);
    const operatingIncome = projectedRev * margin;
    const nopat = operatingIncome * (1 - taxRate);
    // Estimated Reinvestment / CapEx (25% of NOPAT for reinvestment in growth)
    const reinvestment = nopat * RESEARCH_CONFIG.dcf.reinvestmentRateDefault;
    const fcf = Math.max(0, nopat - reinvestment);
    if (year === 5) year5FCF = fcf;

    const discountFactor = Math.pow(1 + wacc, year);
    discountedFCFSum += fcf / discountFactor;
  }

  // Terminal Value (Gordon Growth Model)
  const terminalFCF = year5FCF * (1 + terminalGrowth);
  const terminalValue = (wacc > terminalGrowth) ? (terminalFCF / (wacc - terminalGrowth)) : (terminalFCF / 0.05);
  const discountedTerminalValue = terminalValue / Math.pow(1 + wacc, 5);

  const enterpriseValue = discountedFCFSum + discountedTerminalValue;
  // Equity Value = Enterprise Value - Net Debt
  const equityValue = Math.max(0, enterpriseValue - (netDebt > 0 ? netDebt : 0) + (netDebt < 0 ? Math.abs(netDebt) : 0));
  const fairValue = shares > 0 ? Number((equityValue / shares).toFixed(2)) : 0;

  const upside = currentPrice > 0 ? Number((((fairValue - currentPrice) / currentPrice) * 100).toFixed(1)) : 0;
  const impliedMultiple = year5FCF > 0 && shares > 0 ? Number((equityValue / (year5FCF * 1.2)).toFixed(1)) : 0;

  return {
    fairValue,
    revenueGrowth5Y: Number(growthRate.toFixed(3)),
    terminalOperatingMargin: Number(targetMargin.toFixed(3)),
    terminalGrowth: Number(terminalGrowth.toFixed(3)),
    wacc: Number(wacc.toFixed(3)),
    projectedFCF5Y: Math.round(year5FCF),
    impliedMultiple,
    upsideDownsidePercent: upside,
  };
}

export function analyzeValuation(
  price: number | null,
  marketCap: number | null,
  fundamentals: FundamentalAnalysis,
  rawMultiples: {
    pe?: number | null;
    fwdPe?: number | null;
    ps?: number | null;
    evSales?: number | null;
    evEbitda?: number | null;
    pb?: number | null;
    divYield?: number | null;
  },
  securityType: "EQUITY" | "ETF" | "BANK_FINANCIAL" | "REIT" | "UNPROFITABLE_GROWTH" = "EQUITY"
): ValuationAnalysis {
  const curPrice = n(price);
  const mcap = n(marketCap);
  const netDebt = fundamentals.netDebt ?? 0;
  const ev = (mcap !== null) ? mcap + netDebt : null;

  const pe = n(rawMultiples.pe) ?? (curPrice && fundamentals.eps && fundamentals.eps > 0 ? curPrice / fundamentals.eps : null);
  const fwdPe = n(rawMultiples.fwdPe);
  const ps = n(rawMultiples.ps) ?? (mcap && fundamentals.revenue && fundamentals.revenue > 0 ? mcap / fundamentals.revenue : null);
  const evSales = n(rawMultiples.evSales) ?? (ev && fundamentals.revenue && fundamentals.revenue > 0 ? ev / fundamentals.revenue : null);
  const evEbitda = n(rawMultiples.evEbitda);
  const pb = n(rawMultiples.pb);
  const divYield = n(rawMultiples.divYield);

  // FCF Multiples
  let priceToFCF: number | null = null;
  let fcfYield: number | null = null;
  if (mcap && fundamentals.freeCashFlow && fundamentals.freeCashFlow > 0) {
    priceToFCF = mcap / fundamentals.freeCashFlow;
    fcfYield = fundamentals.freeCashFlow / mcap;
  }

  // Earnings Yield
  let earningsYield: number | null = null;
  if (pe && pe > 0) {
    earningsYield = 1 / pe;
  }

  // PEG
  let peg: number | null = null;
  if (pe && fundamentals.revenueGrowthYoY && fundamentals.revenueGrowthYoY > 0) {
    peg = pe / fundamentals.revenueGrowthYoY;
  }

  const multiples: ValuationMultiples = {
    trailingPE: pe ? Number(pe.toFixed(1)) : null,
    forwardPE: fwdPe ? Number(fwdPe.toFixed(1)) : null,
    peg: peg ? Number(peg.toFixed(2)) : null,
    priceToSales: ps ? Number(ps.toFixed(2)) : null,
    evToSales: evSales ? Number(evSales.toFixed(2)) : null,
    evToEbitda: evEbitda ? Number(evEbitda.toFixed(1)) : null,
    priceToFCF: priceToFCF ? Number(priceToFCF.toFixed(1)) : null,
    fcfYield: fcfYield ? Number((fcfYield * 100).toFixed(2)) : null,
    earningsYield: earningsYield ? Number((earningsYield * 100).toFixed(2)) : null,
    dividendYield: divYield ? Number((divYield * 100).toFixed(2)) : null,
    priceToBook: pb ? Number(pb.toFixed(2)) : null,
  };

  // Valuation Classification
  let classification: ValuationAnalysis["classification"] = "Fair";
  if (securityType === "ETF") {
    classification = "ETF / Index Basket — Corporate DCF Not Applicable";
  } else if (securityType === "BANK_FINANCIAL") {
    classification = "Financial Institution / Bank — Valuation relies on P/B, ROE";
  } else if (pe !== null && pe < 0) {
    classification = "Unprofitable / Negative Multiple";
  } else if (pe !== null) {
    if (pe <= RESEARCH_CONFIG.valuation.pe.veryCheap) classification = "Very Cheap";
    else if (pe <= RESEARCH_CONFIG.valuation.pe.cheap) classification = "Cheap";
    else if (pe <= RESEARCH_CONFIG.valuation.pe.fair) classification = "Fair";
    else if (pe <= RESEARCH_CONFIG.valuation.pe.expensive) classification = "Expensive";
    else classification = "Very Expensive";
  } else if (ps !== null) {
    if (ps <= RESEARCH_CONFIG.valuation.ps.veryCheap) classification = "Very Cheap";
    else if (ps <= RESEARCH_CONFIG.valuation.ps.cheap) classification = "Cheap";
    else if (ps <= RESEARCH_CONFIG.valuation.ps.fair) classification = "Fair";
    else if (ps <= RESEARCH_CONFIG.valuation.ps.expensive) classification = "Expensive";
    else classification = "Very Expensive";
  }

  // 3-Stage DCF Model (Applied to Operating Businesses only)
  let dcf: DCFModel | null = null;
  if (
    securityType !== "ETF" &&
    curPrice &&
    curPrice > 0 &&
    fundamentals.revenue &&
    fundamentals.revenue > 0 &&
    fundamentals.sharesOutstanding &&
    fundamentals.sharesOutstanding > 0
  ) {
    const baseGrowth = (fundamentals.revenueGrowthYoY && fundamentals.revenueGrowthYoY > 0)
      ? Math.min(fundamentals.revenueGrowthYoY / 100, 0.40) // cap at 40% sustainable baseline
      : 0.10; // 10% default growth

    const baseMargin = (fundamentals.operatingMargin && fundamentals.operatingMargin > 0)
      ? (fundamentals.operatingMargin / 100)
      : 0.15; // 15% default margin

    const bearCfg = RESEARCH_CONFIG.dcf.scenarios.bear;
    const baseCfg = RESEARCH_CONFIG.dcf.scenarios.base;
    const bullCfg = RESEARCH_CONFIG.dcf.scenarios.bull;

    const bear = calculateDCFCase(
      fundamentals.revenue,
      baseMargin,
      fundamentals.sharesOutstanding,
      netDebt,
      Math.max(0.02, baseGrowth * bearCfg.growthHaircut),
      Math.max(0.08, baseMargin * bearCfg.marginCompression),
      bearCfg.wacc,
      bearCfg.terminalGrowth,
      curPrice
    );

    const base = calculateDCFCase(
      fundamentals.revenue,
      baseMargin,
      fundamentals.sharesOutstanding,
      netDebt,
      baseGrowth * baseCfg.growthMultiplier,
      baseMargin * baseCfg.marginMultiplier,
      baseCfg.wacc,
      baseCfg.terminalGrowth,
      curPrice
    );

    const bull = calculateDCFCase(
      fundamentals.revenue,
      baseMargin,
      fundamentals.sharesOutstanding,
      netDebt,
      Math.min(0.50, baseGrowth * bullCfg.growthExpansion),
      Math.min(0.70, baseMargin * bullCfg.marginExpansion),
      bullCfg.wacc,
      bullCfg.terminalGrowth,
      curPrice
    );

    dcf = {
      bear,
      base,
      bull,
      taxRate: RESEARCH_CONFIG.dcf.taxRate,
      modelType: "3-Stage Unlevered FCF DCF",
      notes: securityType === "BANK_FINANCIAL" ? "Financial entity: DCF shown for reference, P/B & ROE primary" : undefined,
    };
  }

  return {
    currentPrice: curPrice,
    marketCap: mcap,
    enterpriseValue: ev,
    multiples,
    classification,
    dcf,
  };
}
