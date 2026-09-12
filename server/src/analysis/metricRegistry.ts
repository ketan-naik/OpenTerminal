/**
 * Central Metric Registry for Screener Dashboard, Tables, Autocomplete, Tooltips, and Queries.
 * Provides unified definitions, mathematical formulas, formatters, and metadata.
 */

import { SecurityType } from "./screenerTypes.js";

export type MetricCategory =
  | "Valuation"
  | "Profitability"
  | "Capital Efficiency"
  | "Operating Efficiency"
  | "Financial Health"
  | "Growth"
  | "Cash Flow"
  | "Dividends"
  | "Per Share"
  | "Market & Technical"
  | "Quality";

export type MetricDefinition = {
  id: string;
  aliases: string[];
  displayName: string;
  shortName: string;
  category: MetricCategory;
  description: string;
  formula: string;
  format: "currency" | "percent" | "number" | "ratio" | "multiple" | "days";
  unit?: string;
  higherIsBetter: boolean | null; // true: higher is better, false: lower is better, null: context dependent
  applicableSecurityTypes: SecurityType[];
  fieldKey: string;
};

export const METRIC_REGISTRY: MetricDefinition[] = [
  // --- VALUATION ---
  {
    id: "pe",
    aliases: ["pe", "p/e", "trailing pe", "trailing p/e", "price to earnings", "price/earnings"],
    displayName: "Price to Earnings (TTM)",
    shortName: "P/E",
    category: "Valuation",
    description: "Current share price divided by diluted trailing twelve months earnings per share.",
    formula: "Current Share Price / Diluted EPS (TTM)",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL"],
    fieldKey: "pe",
  },
  {
    id: "forwardPe",
    aliases: ["forward pe", "forward p/e", "fwd pe", "fwd p/e", "next year pe"],
    displayName: "Forward P/E",
    shortName: "Fwd P/E",
    category: "Valuation",
    description: "Current share price divided by consensus estimated forward 1-year earnings per share.",
    formula: "Current Share Price / Estimated Forward EPS",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL"],
    fieldKey: "forwardPe",
  },
  {
    id: "peg",
    aliases: ["peg", "peg ratio", "p/e to growth"],
    displayName: "PEG Ratio",
    shortName: "PEG",
    category: "Valuation",
    description: "Price/Earnings ratio divided by the annualized earnings/revenue growth rate.",
    formula: "Trailing P/E / YoY Revenue Growth Rate (%)",
    format: "ratio",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "peg",
  },
  {
    id: "ps",
    aliases: ["ps", "p/s", "price to sales", "price/sales", "price sales"],
    displayName: "Price to Sales (P/S)",
    shortName: "P/S",
    category: "Valuation",
    description: "Market capitalization divided by total annual revenue.",
    formula: "Market Capitalization / Total Revenue (TTM)",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "UNPROFITABLE_GROWTH"],
    fieldKey: "ps",
  },
  {
    id: "pb",
    aliases: ["pb", "p/b", "price to book", "price/book", "price book"],
    displayName: "Price to Book (P/B)",
    shortName: "P/B",
    category: "Valuation",
    description: "Market capitalization divided by total shareholders' tangible book value.",
    formula: "Market Capitalization / Shareholders' Tangible Equity",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT"],
    fieldKey: "pb",
  },
  {
    id: "evSales",
    aliases: ["ev/sales", "ev to sales", "ev sales", "enterprise value to sales"],
    displayName: "EV to Sales",
    shortName: "EV/Sales",
    category: "Valuation",
    description: "Enterprise Value (Market Cap + Net Debt) divided by Total Revenue.",
    formula: "(Market Cap + Total Debt - Cash) / Total Revenue",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "UNPROFITABLE_GROWTH"],
    fieldKey: "evSales",
  },
  {
    id: "evEbitda",
    aliases: ["ev/ebitda", "ev to ebitda", "ev ebitda", "enterprise value to ebitda"],
    displayName: "EV to EBITDA",
    shortName: "EV/EBITDA",
    category: "Valuation",
    description: "Enterprise Value divided by Earnings Before Interest, Taxes, Depreciation & Amortization.",
    formula: "(Market Cap + Total Debt - Cash) / EBITDA",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "evEbitda",
  },
  {
    id: "priceToFCF",
    aliases: ["price to fcf", "price/fcf", "p/fcf", "p to fcf"],
    displayName: "Price to Free Cash Flow",
    shortName: "P/FCF",
    category: "Valuation",
    description: "Market capitalization divided by annual Free Cash Flow (OCF - CapEx).",
    formula: "Market Capitalization / Free Cash Flow",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "priceToFCF",
  },
  {
    id: "fcfYield",
    aliases: ["fcf yield", "free cash flow yield", "fcf/mcap"],
    displayName: "Free Cash Flow Yield",
    shortName: "FCF Yield",
    category: "Valuation",
    description: "Annual Free Cash Flow divided by Market Capitalization.",
    formula: "(Free Cash Flow / Market Capitalization) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "fcfYield",
  },
  {
    id: "dividendYield",
    aliases: ["dividend yield", "div yield", "yield"],
    displayName: "Dividend Yield",
    shortName: "Div Yield",
    category: "Dividends",
    description: "Annual dividend payout per share divided by the current share price.",
    formula: "(Annual Dividend Per Share / Current Share Price) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF"],
    fieldKey: "dividendYield",
  },

  // --- PROFITABILITY ---
  {
    id: "grossMargin",
    aliases: ["gross margin", "gm", "gross profit margin"],
    displayName: "Gross Margin",
    shortName: "Gross Margin",
    category: "Profitability",
    description: "Gross Profit divided by Total Revenue, measuring direct production profitability.",
    formula: "((Total Revenue - Cost of Goods Sold) / Total Revenue) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "UNPROFITABLE_GROWTH"],
    fieldKey: "grossMargin",
  },
  {
    id: "operatingMargin",
    aliases: ["operating margin", "om", "ebit margin", "operating profit margin"],
    displayName: "Operating Margin",
    shortName: "Oper Margin",
    category: "Profitability",
    description: "Operating Income (EBIT) divided by Total Revenue.",
    formula: "(Operating Income / Total Revenue) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "operatingMargin",
  },
  {
    id: "netMargin",
    aliases: ["net margin", "profit margin", "net profit margin"],
    displayName: "Net Profit Margin",
    shortName: "Net Margin",
    category: "Profitability",
    description: "Net Income divided by Total Revenue.",
    formula: "(Net Income / Total Revenue) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL"],
    fieldKey: "netMargin",
  },
  {
    id: "fcfMargin",
    aliases: ["fcf margin", "free cash flow margin"],
    displayName: "FCF Margin",
    shortName: "FCF Margin",
    category: "Profitability",
    description: "Free Cash Flow (Operating Cash Flow - CapEx) divided by Total Revenue.",
    formula: "(Free Cash Flow / Total Revenue) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "fcfMargin",
  },
  {
    id: "roe",
    aliases: ["roe", "return on equity"],
    displayName: "Return on Equity (ROE)",
    shortName: "ROE",
    category: "Profitability",
    description: "Net Income divided by average Shareholders' Equity.",
    formula: "(Net Income / Total Shareholders' Equity) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT"],
    fieldKey: "roe",
  },
  {
    id: "roa",
    aliases: ["roa", "return on assets"],
    displayName: "Return on Assets (ROA)",
    shortName: "ROA",
    category: "Profitability",
    description: "Net Income divided by Total Assets.",
    formula: "(Net Income / Total Assets) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL"],
    fieldKey: "roa",
  },
  {
    id: "roic",
    aliases: ["roic", "return on invested capital", "return on capital"],
    displayName: "Return on Invested Capital (ROIC)",
    shortName: "ROIC",
    category: "Capital Efficiency",
    description: "Net Operating Profit After Tax (NOPAT) divided by Invested Capital (Total Debt + Equity - Cash).",
    formula: "(NOPAT / (Total Debt + Equity - Cash)) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "roic",
  },

  // --- GROWTH ---
  {
    id: "revenueGrowthYoY",
    aliases: ["revenue growth", "rev growth", "sales growth", "revenue growth yoy", "topline growth"],
    displayName: "Revenue Growth (YoY)",
    shortName: "Rev Growth",
    category: "Growth",
    description: "Year-over-year percentage change in total revenue.",
    formula: "((Revenue_t - Revenue_{t-1}) / Revenue_{t-1}) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "UNPROFITABLE_GROWTH"],
    fieldKey: "revenueGrowthYoY",
  },
  {
    id: "revenueCagr3Y",
    aliases: ["revenue cagr 3y", "revenue 3y cagr", "3y revenue cagr", "rev cagr 3y"],
    displayName: "Revenue 3Y CAGR",
    shortName: "Rev 3Y CAGR",
    category: "Growth",
    description: "3-year compound annual growth rate of total revenue.",
    formula: "((Revenue_t / Revenue_{t-3})^(1/3) - 1) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "revenueCagr3Y",
  },
  {
    id: "revenueCagr5Y",
    aliases: ["revenue cagr 5y", "revenue 5y cagr", "5y revenue cagr", "rev cagr 5y"],
    displayName: "Revenue 5Y CAGR",
    shortName: "Rev 5Y CAGR",
    category: "Growth",
    description: "5-year compound annual growth rate of total revenue.",
    formula: "((Revenue_t / Revenue_{t-5})^(1/5) - 1) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "revenueCagr5Y",
  },
  {
    id: "epsGrowthYoY",
    aliases: ["eps growth", "profit growth", "earnings growth", "eps growth yoy"],
    displayName: "EPS Growth (YoY)",
    shortName: "EPS Growth",
    category: "Growth",
    description: "Year-over-year percentage change in Diluted EPS.",
    formula: "((EPS_t - EPS_{t-1}) / EPS_{t-1}) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL"],
    fieldKey: "epsGrowthYoY",
  },
  {
    id: "epsCagr3Y",
    aliases: ["eps cagr 3y", "eps 3y cagr", "profit cagr 3y"],
    displayName: "EPS 3Y CAGR",
    shortName: "EPS 3Y CAGR",
    category: "Growth",
    description: "3-year compound annual growth rate of Diluted EPS.",
    formula: "((EPS_t / EPS_{t-3})^(1/3) - 1) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "epsCagr3Y",
  },
  {
    id: "epsCagr5Y",
    aliases: ["eps cagr 5y", "eps 5y cagr", "profit cagr 5y"],
    displayName: "EPS 5Y CAGR",
    shortName: "EPS 5Y CAGR",
    category: "Growth",
    description: "5-year compound annual growth rate of Diluted EPS.",
    formula: "((EPS_t / EPS_{t-5})^(1/5) - 1) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "epsCagr5Y",
  },

  // --- FINANCIAL HEALTH & SOLVENCY ---
  {
    id: "netDebt",
    aliases: ["net debt", "netdebt", "debt - cash", "total debt - cash"],
    displayName: "Net Debt",
    shortName: "Net Debt",
    category: "Financial Health",
    description: "Total Debt minus Cash & Cash Equivalents.",
    formula: "Total Debt - Cash & Cash Equivalents",
    format: "currency",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "netDebt",
  },
  {
    id: "freeCashFlow",
    aliases: ["free cash flow", "fcf", "free cashflow", "unlevered fcf"],
    displayName: "Free Cash Flow (FCF)",
    shortName: "FCF",
    category: "Cash Flow",
    description: "Cash generated by operations minus Capital Expenditures (CapEx).",
    formula: "Operating Cash Flow - Capital Expenditures",
    format: "currency",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "freeCashFlow",
  },
  {
    id: "debtToEquity",
    aliases: ["debt to equity", "debt/equity", "d/e", "de ratio"],
    displayName: "Debt to Equity (D/E)",
    shortName: "Debt / Equity",
    category: "Financial Health",
    description: "Total Debt divided by Shareholders' Equity, measuring financial leverage.",
    formula: "Total Debt / Total Shareholders' Equity",
    format: "ratio",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "debtToEquity",
  },
  {
    id: "debtToEbitda",
    aliases: ["debt to ebitda", "debt/ebitda", "net debt to ebitda", "net debt/ebitda"],
    displayName: "Net Debt to EBITDA",
    shortName: "Net Debt/EBITDA",
    category: "Financial Health",
    description: "Net Debt (Total Debt - Cash) divided by EBITDA, representing debt payback duration.",
    formula: "(Total Debt - Cash & Equivalents) / EBITDA",
    format: "multiple",
    unit: "x",
    higherIsBetter: false,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "debtToEbitda",
  },
  {
    id: "currentRatio",
    aliases: ["current ratio", "cr"],
    displayName: "Current Ratio",
    shortName: "Current Ratio",
    category: "Financial Health",
    description: "Total Current Assets divided by Total Current Liabilities.",
    formula: "Total Current Assets / Total Current Liabilities",
    format: "ratio",
    unit: "x",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "currentRatio",
  },
  {
    id: "quickRatio",
    aliases: ["quick ratio", "acid test"],
    displayName: "Quick Ratio (Acid Test)",
    shortName: "Quick Ratio",
    category: "Financial Health",
    description: "Liquid Current Assets (Cash + Short-Term Inv + Receivables) divided by Current Liabilities.",
    formula: "(Cash + Short Term Investments + Accounts Receivable) / Current Liabilities",
    format: "ratio",
    unit: "x",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "quickRatio",
  },
  {
    id: "interestCoverage",
    aliases: ["interest coverage", "ic ratio", "times interest earned"],
    displayName: "Interest Coverage",
    shortName: "Int Coverage",
    category: "Financial Health",
    description: "Operating Income (EBIT) divided by Annual Interest Expense.",
    formula: "Operating Income / Interest Expense",
    format: "multiple",
    unit: "x",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "interestCoverage",
  },

  // --- CASH FLOW & CONVERSION ---
  {
    id: "fcfConversion",
    aliases: ["fcf conversion", "cash conversion ratio", "fcf to net income", "fcf/ni"],
    displayName: "FCF Conversion",
    shortName: "FCF Conversion",
    category: "Cash Flow",
    description: "Free Cash Flow divided by Net Income, measuring earnings quality.",
    formula: "(Free Cash Flow / Net Income) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "fcfConversion",
  },
  {
    id: "capex",
    aliases: ["capex", "capital expenditure", "capital expenditures"],
    displayName: "Capital Expenditures (CapEx)",
    shortName: "CapEx",
    category: "Cash Flow",
    description: "Funds spent by a company to acquire, upgrade, and maintain physical assets.",
    formula: "Cash Flow Statement CapEx (Absolute USD)",
    format: "currency",
    higherIsBetter: null,
    applicableSecurityTypes: ["EQUITY", "REIT"],
    fieldKey: "capex",
  },

  // --- MARKET & TECHNICAL ---
  {
    id: "marketCap",
    aliases: ["market cap", "mcap", "market capitalization", "size"],
    displayName: "Market Capitalization",
    shortName: "Market Cap",
    category: "Market & Technical",
    description: "Total dollar market value of a company's outstanding shares.",
    formula: "Current Share Price * Total Shares Outstanding",
    format: "currency",
    higherIsBetter: null,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF", "UNPROFITABLE_GROWTH"],
    fieldKey: "marketCap",
  },
  {
    id: "currentPrice",
    aliases: ["price", "current price", "last price", "close"],
    displayName: "Current Stock Price",
    shortName: "Price",
    category: "Market & Technical",
    description: "Latest market trading price per share.",
    formula: "Real-Time / Close Share Price",
    format: "currency",
    higherIsBetter: null,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF", "UNPROFITABLE_GROWTH"],
    fieldKey: "price",
  },
  {
    id: "return1Y",
    aliases: ["1y return", "1 year return", "perf 1y", "1y perf", "return 1y"],
    displayName: "1-Year Price Return",
    shortName: "1Y Return",
    category: "Market & Technical",
    description: "Percentage change in stock price over the trailing 12 months.",
    formula: "((Price_t - Price_{t-252}) / Price_{t-252}) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF", "UNPROFITABLE_GROWTH"],
    fieldKey: "return1Y",
  },
  {
    id: "priceVs50DMA",
    aliases: ["50 dma", "price vs 50 dma", "distance from 50 dma", "sma50 distance"],
    displayName: "Price vs 50 DMA",
    shortName: "vs 50 DMA",
    category: "Market & Technical",
    description: "Percentage distance of current price above or below its 50-day moving average.",
    formula: "((Price - 50_DMA) / 50_DMA) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF"],
    fieldKey: "priceVs50DMA",
  },
  {
    id: "priceVs200DMA",
    aliases: ["200 dma", "price vs 200 dma", "distance from 200 dma", "sma200 distance"],
    displayName: "Price vs 200 DMA",
    shortName: "vs 200 DMA",
    category: "Market & Technical",
    description: "Percentage distance of current price above or below its 200-day moving average.",
    formula: "((Price - 200_DMA) / 200_DMA) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF"],
    fieldKey: "priceVs200DMA",
  },
  {
    id: "beta",
    aliases: ["beta", "market beta", "1y beta"],
    displayName: "Beta (1-Year)",
    shortName: "Beta",
    category: "Market & Technical",
    description: "Systematic volatility and covariance of the stock relative to the benchmark index.",
    formula: "Cov(Stock, S&P 500) / Var(S&P 500)",
    format: "number",
    higherIsBetter: null,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "ETF"],
    fieldKey: "beta",
  },

  // --- OWNERSHIP & CIO ---
  {
    id: "insiderOwnership",
    aliases: ["insider ownership", "insider %", "insiders"],
    displayName: "Insider Ownership",
    shortName: "Insider Own",
    category: "Quality",
    description: "Percentage of total shares outstanding held by corporate executives and board directors.",
    formula: "(Shares Held by Insiders / Total Shares Outstanding) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "insiderOwnership",
  },
  {
    id: "institutionalOwnership",
    aliases: ["institutional ownership", "institution %", "institutions", "13f ownership"],
    displayName: "Institutional Ownership",
    shortName: "Inst Own",
    category: "Quality",
    description: "Percentage of total shares outstanding held by institutional asset managers (13F filings).",
    formula: "(Shares Held by Institutions / Total Shares Outstanding) * 100",
    format: "percent",
    unit: "%",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY"],
    fieldKey: "institutionalOwnership",
  },
  {
    id: "cioScore",
    aliases: ["cio score", "investment score", "hedge fund score", "total score"],
    displayName: "CIO Investment Score",
    shortName: "CIO Score",
    category: "Quality",
    description: "Composite multi-factor institutional equity attractiveness score (0–100).",
    formula: "Sum of Quality (15%), Valuation (15%), ROIC (10%), Growth (10%), FCF (10%), Solvency (5%), Momentum (15%), Asymmetry (10%), Variant Perception (10%)",
    format: "number",
    unit: "/100",
    higherIsBetter: true,
    applicableSecurityTypes: ["EQUITY", "BANK_FINANCIAL", "REIT", "UNPROFITABLE_GROWTH"],
    fieldKey: "cioScore",
  },
];

/** Lookup map by id and aliases */
const METRIC_MAP = new Map<string, MetricDefinition>();
for (const m of METRIC_REGISTRY) {
  METRIC_MAP.set(m.id.toLowerCase(), m);
  METRIC_MAP.set(m.displayName.toLowerCase(), m);
  METRIC_MAP.set(m.shortName.toLowerCase(), m);
  for (const alias of m.aliases) {
    METRIC_MAP.set(alias.toLowerCase(), m);
  }
}

export function findMetric(query: string): MetricDefinition | null {
  const clean = query.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  const hit = METRIC_MAP.get(clean);
  if (hit) return hit;

  // Try normalized slash (e.g. "price / book" -> "price/book" or vice versa)
  const noSlashSpaces = clean.replace(/\s*\/\s*/g, "/");
  const hitNoSlash = METRIC_MAP.get(noSlashSpaces);
  if (hitNoSlash) return hitNoSlash;

  const withSlashSpaces = clean.replace(/\//g, " / ");
  return METRIC_MAP.get(withSlashSpaces) ?? null;
}

export function formatMetricValue(
  val: number | null | undefined,
  format: MetricDefinition["format"],
  unit?: string,
  currencySymbol = "$"
): string {
  if (val === null || val === undefined || isNaN(val)) return "—";

  switch (format) {
    case "currency":
      if (Math.abs(val) >= 1e12) return `${currencySymbol}${(val / 1e12).toFixed(2)}T`;
      if (Math.abs(val) >= 1e9) return `${currencySymbol}${(val / 1e9).toFixed(2)}B`;
      if (Math.abs(val) >= 1e6) return `${currencySymbol}${(val / 1e6).toFixed(2)}M`;
      if (Math.abs(val) >= 1e3) return `${currencySymbol}${(val / 1e3).toFixed(2)}K`;
      return `${currencySymbol}${val.toFixed(2)}`;
    case "percent":
      return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    case "multiple":
      return `${val.toFixed(1)}x`;
    case "ratio":
      return `${val.toFixed(2)}`;
    case "days":
      return `${Math.round(val)}d`;
    case "number":
    default:
      return `${val.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
  }
}
