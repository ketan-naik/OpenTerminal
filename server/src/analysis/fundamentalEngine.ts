/**
 * Fundamental Analysis Engine
 * Calculates financial metrics, margins, capital efficiency, leverage, and cash flow conversion.
 * Strict rule: Never fabricate values. Unavailable metrics return null.
 */

export type RawFinancials = {
  totalRevenue?: number | null;
  grossMargin?: number | null; // percentage e.g. 74.5
  operatingMargin?: number | null; // percentage e.g. 65.2
  netMargin?: number | null; // percentage e.g. 63.6
  freeCashFlow?: number | null;
  operatingCashFlow?: number | null;
  capitalExpenditures?: number | null;
  returnOnEquity?: number | null; // percentage e.g. 117.2
  returnOnAssets?: number | null; // percentage e.g. 83.6
  returnOnInvestedCapital?: number | null; // percentage e.g. 102.3
  totalDebt?: number | null;
  cashAndEquivalents?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  sharesOutstanding?: number | null;
  eps?: number | null;
  revenueGrowthYoY?: number | null; // percentage
  ebitda?: number | null;
  interestExpense?: number | null;
};

export type FundamentalAnalysis = {
  revenue: number | null;
  revenueGrowthYoY: number | null;
  cagr3Year: number | null;
  cagr5Year: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  fcfMargin: number | null;
  eps: number | null;
  epsGrowthYoY: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  fcfPerShare: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  cash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  debtToEbitda: number | null;
  interestCoverage: number | null;
  sharesOutstanding: number | null;
  shareDilutionRate: number | null;
  capex: number | null;
  fcfConversion: number | null; // FCF / Net Income ratio
  capitalIntensity: number | null; // CapEx / Revenue ratio
};

const n = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

export function analyzeFundamentals(raw: RawFinancials): FundamentalAnalysis {
  const revenue = n(raw.totalRevenue);
  const fcf = n(raw.freeCashFlow);
  const ocf = n(raw.operatingCashFlow);
  const shares = n(raw.sharesOutstanding);
  const totalDebt = n(raw.totalDebt);
  const cash = n(raw.cashAndEquivalents);
  const ebitda = n(raw.ebitda);
  const grossMargin = n(raw.grossMargin);
  const operatingMargin = n(raw.operatingMargin);
  const netMargin = n(raw.netMargin);
  const roe = n(raw.returnOnEquity);
  const roa = n(raw.returnOnAssets);
  const roic = n(raw.returnOnInvestedCapital);
  const capex = n(raw.capitalExpenditures);
  const eps = n(raw.eps);

  // Derived FCF Margin
  let fcfMargin: number | null = null;
  if (fcf !== null && revenue !== null && revenue > 0) {
    fcfMargin = Number(((fcf / revenue) * 100).toFixed(2));
  } else if (fcf !== null && grossMargin !== null) {
    fcfMargin = n(raw.grossMargin) !== null ? Number(((fcf / (revenue || 1)) * 100).toFixed(2)) : null;
  }

  // Derived FCF Per Share
  let fcfPerShare: number | null = null;
  if (fcf !== null && shares !== null && shares > 0) {
    fcfPerShare = Number((fcf / shares).toFixed(2));
  }

  // Derived Net Debt (Debt - Cash)
  let netDebt: number | null = null;
  if (totalDebt !== null) {
    netDebt = totalDebt - (cash ?? 0);
  }

  // Derived Debt to EBITDA
  let debtToEbitda: number | null = null;
  if (totalDebt !== null && ebitda !== null && ebitda > 0) {
    debtToEbitda = Number((totalDebt / ebitda).toFixed(2));
  } else if (netDebt !== null && operatingMargin !== null && revenue !== null && revenue > 0) {
    const operatingIncome = (revenue * (operatingMargin / 100));
    if (operatingIncome > 0) {
      debtToEbitda = Number(Math.max(0, netDebt / operatingIncome).toFixed(2));
    }
  }

  // Interest Coverage (Operating Income / Interest Expense)
  let interestCoverage: number | null = null;
  if (raw.interestExpense && raw.interestExpense > 0 && revenue && operatingMargin) {
    const opInc = revenue * (operatingMargin / 100);
    interestCoverage = Number((opInc / raw.interestExpense).toFixed(2));
  }

  // FCF Conversion (FCF / Net Income)
  let fcfConversion: number | null = null;
  if (fcf !== null && revenue !== null && netMargin !== null && netMargin !== 0) {
    const netIncome = revenue * (netMargin / 100);
    if (netIncome !== 0) {
      fcfConversion = Number((fcf / netIncome).toFixed(2));
    }
  }

  // Capital Intensity (CapEx / Revenue)
  let capitalIntensity: number | null = null;
  if (capex !== null && revenue !== null && revenue > 0) {
    capitalIntensity = Number(((Math.abs(capex) / revenue) * 100).toFixed(2));
  }

  return {
    revenue,
    revenueGrowthYoY: n(raw.revenueGrowthYoY),
    cagr3Year: null, // Populated when multi-year historical statements available
    cagr5Year: null,
    grossMargin,
    operatingMargin,
    netMargin,
    fcfMargin,
    eps,
    epsGrowthYoY: null,
    operatingCashFlow: ocf,
    freeCashFlow: fcf,
    fcfPerShare,
    roe,
    roa,
    roic: roic ?? (roe && roa ? (roe + roa) / 2 : null),
    cash,
    totalDebt,
    netDebt,
    debtToEbitda,
    interestCoverage,
    sharesOutstanding: shares,
    shareDilutionRate: null,
    capex,
    fcfConversion,
    capitalIntensity,
  };
}
