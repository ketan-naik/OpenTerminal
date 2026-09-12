/**
 * Normalized Schemas and Types for Screener Dashboard & Fundamental Research Engine.
 * Strict Rule: Never fabricate values. All metrics are mapped from authoritative data
 * (SEC EDGAR XBRL, TradingView Scanner, Yahoo Finance, FRED) or calculated via explicit formulas.
 */

export type SecurityType = "EQUITY" | "ETF" | "BANK_FINANCIAL" | "REIT" | "UNPROFITABLE_GROWTH";

export type CompanyProfile = {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  description: string;
  website: string | null;
  fiscalYearEnd: string | null;
  securityType: SecurityType;
  currentPrice: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  marketCap: number | null;
  week52High: number | null;
  week52Low: number | null;
  sharesOutstanding: number | null;
  bookValuePerShare: number | null;
  dividendYield: number | null;
  beta: number | null;
};

export type FinancialStatementRow = {
  id: string;
  label: string;
  category?: string;
  indent?: number;
  format: "currency" | "percent" | "number" | "ratio";
  values: Record<string, number | null>; // keyed by period e.g. "FY2024", "Q3 2024"
  cagr3Y?: number | null;
  cagr5Y?: number | null;
  cagr10Y?: number | null;
  sparkline?: number[];
};

export type StatementPeriod = {
  key: string; // e.g. "FY2024", "Q3 2024"
  label: string; // Display label
  date: string; // Period end date "2024-09-30"
  calendarYear?: number;
  periodType: "ANNUAL" | "QUARTER";
};

export type HistoricalFinancials = {
  periods: StatementPeriod[];
  incomeStatement: FinancialStatementRow[];
  balanceSheet: FinancialStatementRow[];
  cashFlowStatement: FinancialStatementRow[];
  ratios: FinancialStatementRow[];
};

export type RuleBasedObservation = {
  type: "PRO" | "CON";
  category: "Growth" | "Profitability" | "Capital Efficiency" | "Financial Health" | "Valuation" | "Cash Flow" | "Corporate Governance";
  title: string;
  detail: string;
  metric: string;
  value: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
};

export type PeerCompany = {
  symbol: string;
  name: string;
  currentPrice: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  ps: number | null;
  pb: number | null;
  evEbitda: number | null;
  revenueGrowthYoY: number | null;
  profitGrowthYoY: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  isCurrent?: boolean;
};

export type OwnershipData = {
  institutionalPercent: number | null;
  insiderPercent: number | null;
  publicPercent: number | null;
  topInstitutionalHolders: Array<{ name: string; shares: number; percent: number; value: number }>;
  recentInsiderTransactions: Array<{
    filingDate: string;
    transactionDate: string;
    ownerName: string;
    ownerTitle: string | null;
    transactionCode: string;
    shares: number | null;
    pricePerShare: number | null;
    value: number | null;
  }>;
  indianShareholding?: {
    promoter: number | null;
    fii: number | null;
    dii: number | null;
    public: number | null;
    pledgedSharesPercent: number | null;
  };
};

export type FilingDocument = {
  id: string;
  documentType: "10-K" | "10-Q" | "8-K" | "Annual Report" | "Quarterly Report" | "Proxy" | "Other";
  filingDate: string;
  periodEnded: string;
  description: string;
  source: string;
  url: string;
};

export type CompanyScreenerDossier = {
  profile: CompanyProfile;
  keyRatios: Record<string, number | null>;
  observations: RuleBasedObservation[];
  quarterlyFinancials: HistoricalFinancials;
  annualFinancials: HistoricalFinancials;
  peers: PeerCompany[];
  ownership: OwnershipData;
  documents: FilingDocument[];
  cioScore?: {
    totalScore: number;
    decision: string;
    conviction: string;
    expectedReturn: number;
    fairValue: number;
    businessQuality: number;
    valuationScore: number;
    riskRewardRatio: number;
  };
};

export type ScreenerRow = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  peg: number | null;
  ps: number | null;
  pb: number | null;
  evSales: number | null;
  evEbitda: number | null;
  priceToFCF: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  fcfMargin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  revenueGrowthYoY: number | null;
  revenueCagr3Y: number | null;
  revenueCagr5Y: number | null;
  epsGrowthYoY: number | null;
  epsCagr3Y: number | null;
  epsCagr5Y: number | null;
  fcfGrowthYoY: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  debtToEquity: number | null;
  debtToEbitda: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  interestCoverage: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  capex: number | null;
  fcfConversion: number | null;
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  priceVs50DMA: number | null;
  priceVs200DMA: number | null;
  beta: number | null;
  volatility: number | null;
  insiderOwnership: number | null;
  institutionalOwnership: number | null;
  cioScore?: number | null;
};

export type ScreenerPrebuilt = {
  id: string;
  name: string;
  category: string;
  description: string;
  query: string;
  defaultColumns: string[];
};

export type SavedScreen = {
  id: string;
  name: string;
  query: string;
  columns: string[];
  sortKey: string;
  sortDir: "asc" | "desc";
  createdAt: string;
  lastRunAt?: string;
};
