/**
 * Research API Routes
 * Exposes GET /api/research/:symbol (deterministic quantitative pipeline)
 * and POST /api/research/:symbol/ai-committee (CIO qualitative investment committee analysis).
 */

import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { generateResearch, type HedgeFundResearch } from "../analysis/researchEngine.js";
import { computeScores } from "../analysis/scoreEngine.js";
import { cacheGet, cacheSet } from "../cache.js";

export const researchRouter = Router();

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

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

import { createHash } from "crypto";

function computeResearchFingerprint(research: HedgeFundResearch): string {
  const payload = [
    research.symbol,
    research.currentPrice?.toFixed(2) ?? "0",
    research.fundamentals.revenue?.toFixed(0) ?? "0",
    research.fundamentals.operatingMargin?.toFixed(1) ?? "0",
    research.fundamentals.freeCashFlow?.toFixed(0) ?? "0",
    research.valuation.dcf?.base.fairValue.toFixed(2) ?? "0",
    research.scores.totalInvestmentScore.toFixed(0),
    research.dataConfidence.level,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

const CIO_SYSTEM_PROMPT = `You are the Chief Investment Officer of a $1 billion long/short equity hedge fund.
Your job is capital allocation under strict risk-adjusted hurdle rates.
You are analyzing a security based on structured market, fundamental, valuation, risk, momentum, scenario, and opportunity-cost data produced by our research platform.

CRITICAL RULES:
1. Do not fabricate numbers. Retain exact data from the dossier.
2. If data is unavailable, explicitly state 'NOT APPLICABLE' or 'DATA UNAVAILABLE'.
3. Always evaluate the 3 distinct dimensions:
   - Is it a GREAT COMPANY? (Moat, ROIC, Gross Margin, Free Cash Flow)
   - Is it a GREAT STOCK? (Momentum, 200 DMA, Relative Strength, Trend)
   - Is it a GREAT INVESTMENT AT TODAY'S PRICE? (Valuation asymmetry vs expectations hurdle)
4. VARIANT PERCEPTION: Identify where the market consensus is wrong. If there is NO material variant perception, write explicitly: 'NO MATERIAL VARIANT PERCEPTION IDENTIFIED'.
5. STRONGEST SHORT THESIS: Even if recommending a STRONG BUY, always construct the strongest, most rigorous short thesis (potential multiple compression, customer concentration, competitive disruption, execution risk, accounting quality) to ruthlessly challenge confirmation bias.
6. THESIS BREAKERS: Define explicit, quantitative triggers that invalidate the thesis.
7. OPPORTUNITY COST: Compare this opportunity against our fund hurdle rate (8.5% annualized net) and ask: 'If this were a $1 billion hedge fund and every dollar had to compete for the best risk-adjusted return, would this ticker deserve capital today?'

You must respond ONLY with a valid, clean JSON object (no markdown formatting, no backticks, no wrapping text) adhering to this schema:
{
  "investmentThesis": "string (2-3 punchy paragraphs with clear institutional capital allocation rationale)",
  "consensusView": "string (what the broad sell-side and market consensus currently prices in)",
  "variantPerception": "string (how our view differs from consensus; if none, write 'NO MATERIAL VARIANT PERCEPTION IDENTIFIED')",
  "whyMarketMayBeWrong": "string (concrete reasons why consensus assumptions may be flawed)",
  "strongestShortThesis": "string (the most compelling bear case, even if recommending a long, addressing multiple compression, execution risks, and headwinds)",
  "bullCase": "string (upside catalyst scenario)",
  "bearCase": "string (downside risk scenario)",
  "catalysts": [
    { "timeframe": "0–3 Months", "title": "string", "description": "string", "impact": "HIGH" },
    { "timeframe": "3–12 Months", "title": "string", "description": "string", "impact": "HIGH" },
    { "timeframe": "1–3 Years", "title": "string", "description": "string", "impact": "MEDIUM" }
  ],
  "risks": [
    { "risk": "string", "probability": "HIGH", "severity": "HIGH", "potentialImpact": "string", "leadingIndicator": "string" },
    { "risk": "string", "probability": "MEDIUM", "severity": "HIGH", "potentialImpact": "string", "leadingIndicator": "string" },
    { "risk": "string", "probability": "LOW", "severity": "HIGH", "potentialImpact": "string", "leadingIndicator": "string" }
  ],
  "thesisBreakers": [
    "string (e.g. Revenue growth falls below 12.0% annualized)",
    "string (e.g. Gross margin compresses by >250bps below 71.0%)",
    "string (e.g. Price closes >12% below 200 DMA with deteriorating operating cash flow)"
  ],
  "managementAssessment": "string",
  "competitiveAssessment": "string",
  "macroSensitivity": "string",
  "monitoringKPIs": [
    { "metric": "string", "currentValue": "string", "expectedValue": "string", "warningLevel": "string", "thesisBreakLevel": "string" }
  ],
  "qualitativeScores": {
    "competitivePosition": 85,
    "catalysts": 80,
    "variantPerception": 75
  },
  "cioVerdict": {
    "decision": "BUY",
    "conviction": "HIGH",
    "initialPositionPercent": 2.5,
    "targetPositionPercent": 4.0,
    "maxPositionPercent": 6.0,
    "allocationRationale": "string"
  }
}`;

/**
 * GET /api/research/:symbol
 * Deterministic quantitative hedge fund research dossier
 */
researchRouter.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  if (!symbol) return res.status(400).json({ error: "Ticker symbol required" });

  try {
    const research = await generateResearch(symbol);
    res.json(research);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Research generation failed for ${symbol}: ${msg}` });
  }
});

/**
 * POST /api/research/:symbol/ai-committee
 * Runs Claude CIO Investment Committee layer on the quantitative research dossier
 * Caches output by research-data fingerprint
 */
researchRouter.post("/:symbol/ai-committee", async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  if (!symbol) return res.status(400).json({ error: "Ticker symbol required" });

  try {
    const research = await generateResearch(symbol);
    const fingerprint = computeResearchFingerprint(research);
    const aiCacheKey = `research-ai:${symbol}:${fingerprint}`;

    const cached = cacheGet<InvestmentCommitteeAnalysis>(aiCacheKey);
    if (cached) return res.json(cached);

    const userPrompt = `Analyze the following institutional quantitative research dossier for ${symbol} (${research.companyName}):
Security Type: ${research.securityType}
Current Price: $${research.currentPrice ?? "N/A"}
Sector: ${research.sector}
Market Cap: $${research.valuation.marketCap ? (research.valuation.marketCap / 1e9).toFixed(2) + "B" : "N/A"}
Fundamentals: ${JSON.stringify(research.fundamentals)}
Valuation Multiples & Classification: ${JSON.stringify(research.valuation)}
DCF Model: ${JSON.stringify(research.valuation.dcf)}
Reverse DCF Market Expectations: ${JSON.stringify(research.expectations)}
Opportunity Cost Assessment: ${JSON.stringify(research.opportunityCost)}
3-Dimensional Assessment: ${JSON.stringify(research.threeDimensionalAssessment)}
Momentum & Trend: ${JSON.stringify(research.momentum)}
Risk Metrics: ${JSON.stringify(research.risk)}
Scenario Matrix: ${JSON.stringify(research.scenarios)}
Scores: ${JSON.stringify(research.scores)}
Data Confidence: ${JSON.stringify(research.dataConfidence)}
Quantitative Thesis Breakers: ${JSON.stringify(research.quantitativeThesisBreakers)}
Monitoring KPIs: ${JSON.stringify(research.deterministicKPIs)}
Recent Insider Transactions: ${JSON.stringify(research.recentInsiderTransactions)}

Produce the full structured JSON analysis as specified.`;

    const response = await getClient().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: CIO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed: InvestmentCommitteeAnalysis = JSON.parse(cleaned);
    parsed.symbol = symbol;

    // Cache AI analysis for 2 hours
    cacheSet(aiCacheKey, parsed, 2 * 60 * 60 * 1000);

    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("api_key") || msg.includes("authentication")) {
      return res.status(503).json({ error: "Claude CIO Committee unavailable: set ANTHROPIC_API_KEY on the server." });
    }
    res.status(502).json({ error: `AI Committee analysis failed: ${msg}` });
  }
});
