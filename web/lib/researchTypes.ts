export type SecurityType = "EQUITY" | "ETF" | "BANK_FINANCIAL" | "REIT" | "UNPROFITABLE_GROWTH";

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
  fcfConversion: number | null;
  capitalIntensity: number | null;
};

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
  revenueGrowth5Y: number;
  terminalOperatingMargin: number;
  terminalGrowth: number;
  wacc: number;
  projectedFCF5Y: number;
  impliedMultiple: number;
  upsideDownsidePercent: number;
};

export type DCFModel = {
  bear: DCFCase;
  base: DCFCase;
  bull: DCFCase;
  taxRate: number;
  modelType: string;
  notes?: string;
};

export type ValuationAnalysis = {
  currentPrice: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  multiples: ValuationMultiples;
  classification: "Very Cheap" | "Cheap" | "Fair" | "Expensive" | "Very Expensive" | "Unprofitable / Negative Multiple" | "ETF / Index Basket — Corporate DCF Not Applicable" | "Financial Institution / Bank — Valuation relies on P/B, ROE";
  dcf: DCFModel | null;
};

export type ExpectationsAnalysis = {
  impliedRevenueCAGR5Y: number | null;
  impliedTerminalMargin: number | null;
  impliedTerminalGrowth: number | null;
  assessment: "EXTREMELY LOW" | "LOW" | "REASONABLE" | "HIGH" | "EXTREMELY HIGH" | "UNAVAILABLE";
  narrativeSummary: string;
  hurdleRateAssessment: string;
};

export type MomentumAnalysis = {
  return1Week: number | null;
  return1Month: number | null;
  return3Month: number | null;
  return6Month: number | null;
  return12Month: number | null;
  returnYTD: number | null;
  sma50: number | null;
  sma200: number | null;
  distance50DMA: number | null;
  distance200DMA: number | null;
  distance52WHigh: number | null;
  distance52WLow: number | null;
  rsi14: number | null;
  trendClassification: "Strong Uptrend" | "Uptrend" | "Neutral" | "Downtrend" | "Strong Downtrend";
  momentumScore: number;
};

export type RiskAnalysis = {
  volatility30D: number | null;
  volatility90D: number | null;
  volatility1Year: number | null;
  maxDrawdown1Year: number | null;
  downsideDeviation: number | null;
  valueAtRisk95_1D: number | null;
  valueAtRisk95_1M: number | null;
  beta: number | null;
  riskClassification: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
  riskSummary: string;
};

export type ScenarioRow = {
  name: "Bear" | "Base" | "Bull";
  probability: number;
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

export type ResearchScores = {
  businessQuality: number;
  growth: number;
  profitability: number;
  balanceSheet: number;
  cashFlowQuality: number;
  capitalEfficiency: number;
  valuation: number;
  priceMomentum: number;
  riskReward: number;
  competitivePosition: number;
  catalysts: number;
  variantPerception: number;
  totalInvestmentScore: number;
};

export type InvestmentDecision = {
  decision: "STRONG BUY" | "BUY" | "WATCH" | "HOLD" | "REDUCE" | "AVOID" | "SHORT";
  conviction: "HIGH" | "MEDIUM" | "LOW";
  summaryReason: string;
  initialPositionSize: number;
  targetPositionSize: number;
  maxPositionSize: number;
  positionSizingLabel: string;
};

export type DataConfidence = {
  level: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  availableFieldsCount: number;
  totalFieldsEvaluated: number;
  missingKeyFields: string[];
  freshness: string;
  qualityNotice?: string;
};

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

export type CatalystItem = {
  timeframe: "0–3 Months" | "3–12 Months" | "1–3 Years";
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
};

export type RiskItem = {
  risk: string;
  probability: "HIGH" | "MEDIUM" | "LOW";
  severity: "HIGH" | "MEDIUM" | "LOW";
  potentialImpact: string;
  leadingIndicator: string;
};

export type MonitoringKPI = {
  metric: string;
  currentValue: string;
  expectedValue: string;
  warningLevel: string;
  thesisBreakLevel: string;
};

export type InvestmentCommitteeAnalysis = {
  symbol: string;
  investmentThesis: string;
  consensusView: string;
  variantPerception: string;
  whyMarketMayBeWrong: string;
  strongestShortThesis: string;
  bullCase: string;
  bearCase: string;
  catalysts: CatalystItem[];
  risks: RiskItem[];
  thesisBreakers: string[];
  managementAssessment: string;
  competitiveAssessment: string;
  macroSensitivity: string;
  monitoringKPIs: MonitoringKPI[];
  qualitativeScores: {
    competitivePosition: number;
    catalysts: number;
    variantPerception: number;
  };
  cioVerdict: {
    decision: "STRONG BUY" | "BUY" | "WATCH" | "HOLD" | "REDUCE" | "AVOID" | "SHORT";
    conviction: "HIGH" | "MEDIUM" | "LOW";
    initialPositionPercent: number;
    targetPositionPercent: number;
    maxPositionPercent: number;
    allocationRationale: string;
  };
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
  recentInsiderTransactions: Array<{
    filingDate: string;
    transactionDate: string;
    ownerName: string;
    ownerTitle: string | null;
    acquiredDisposed: "A" | "D" | null;
    shares: number | null;
    pricePerShare: number | null;
    value: number | null;
    sharesOwnedAfter: number | null;
  }>;
};
