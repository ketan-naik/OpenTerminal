/**
 * Quantitative Momentum Engine
 * Calculates multi-horizon price returns, moving averages, trend classification, and RSI.
 */

import { type Candle } from "../providers/yahoo.js";

export type MomentumAnalysis = {
  return1Week: number | null;
  return1Month: number | null;
  return3Month: number | null;
  return6Month: number | null;
  return12Month: number | null;
  returnYTD: number | null;
  sma50: number | null;
  sma200: number | null;
  distance50DMA: number | null; // e.g. +4.2%
  distance200DMA: number | null; // e.g. +18.5%
  distance52WHigh: number | null; // e.g. -6.3%
  distance52WLow: number | null; // e.g. +45.2%
  rsi14: number | null;
  trendClassification: "Strong Uptrend" | "Uptrend" | "Neutral" | "Downtrend" | "Strong Downtrend";
  momentumScore: number; // 0 - 100
};

export function analyzeMomentum(
  candles: Candle[],
  fallbackQuote?: {
    week52High?: number | null;
    week52Low?: number | null;
    price?: number | null;
    perfW?: number | null;
    perf1M?: number | null;
    perf3M?: number | null;
    perf6M?: number | null;
    perfY?: number | null;
    perfYTD?: number | null;
    sma50?: number | null;
    sma200?: number | null;
  }
): MomentumAnalysis {
  if (!candles || candles.length < 5) {
    const price = fallbackQuote?.price ?? null;
    const sma50 = fallbackQuote?.sma50 ?? null;
    const sma200 = fallbackQuote?.sma200 ?? null;
    const week52High = fallbackQuote?.week52High ?? null;
    const week52Low = fallbackQuote?.week52Low ?? null;

    const distance50DMA = price && sma50 ? Number((((price - sma50) / sma50) * 100).toFixed(2)) : null;
    const distance200DMA = price && sma200 ? Number((((price - sma200) / sma200) * 100).toFixed(2)) : null;
    const distance52WHigh = price && week52High ? Number((((price - week52High) / week52High) * 100).toFixed(2)) : null;
    const distance52WLow = price && week52Low ? Number((((price - week52Low) / week52Low) * 100).toFixed(2)) : null;

    let trend: MomentumAnalysis["trendClassification"] = "Neutral";
    if (distance50DMA !== null && distance200DMA !== null) {
      if (distance50DMA > 0 && distance200DMA > 5) trend = distance50DMA > 5 ? "Strong Uptrend" : "Uptrend";
      else if (distance50DMA < 0 && distance200DMA < -5) trend = distance50DMA < -5 ? "Strong Downtrend" : "Downtrend";
    }

    let score = 50;
    if (trend === "Strong Uptrend") score = 85;
    else if (trend === "Uptrend") score = 70;
    else if (trend === "Downtrend") score = 35;
    else if (trend === "Strong Downtrend") score = 20;

    return {
      return1Week: fallbackQuote?.perfW !== undefined ? fallbackQuote.perfW : null,
      return1Month: fallbackQuote?.perf1M !== undefined ? fallbackQuote.perf1M : null,
      return3Month: fallbackQuote?.perf3M !== undefined ? fallbackQuote.perf3M : null,
      return6Month: fallbackQuote?.perf6M !== undefined ? fallbackQuote.perf6M : null,
      return12Month: fallbackQuote?.perfY !== undefined ? fallbackQuote.perfY : null,
      returnYTD: fallbackQuote?.perfYTD !== undefined ? fallbackQuote.perfYTD : null,
      sma50,
      sma200,
      distance50DMA,
      distance200DMA,
      distance52WHigh,
      distance52WLow,
      rsi14: null,
      trendClassification: trend,
      momentumScore: score,
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const len = closes.length;

  const getReturn = (daysAgo: number): number | null => {
    if (len <= daysAgo) return null;
    const past = closes[len - 1 - daysAgo];
    return past > 0 ? Number((((currentPrice - past) / past) * 100).toFixed(2)) : null;
  };

  const return1Week = getReturn(5);
  const return1Month = getReturn(21);
  const return3Month = getReturn(63);
  const return6Month = getReturn(126);
  const return12Month = getReturn(252) ?? getReturn(len - 1);

  // YTD return (from Jan 1 of current year)
  let returnYTD: number | null = null;
  const currentYear = new Date().getFullYear();
  const firstCandleOfYearIdx = candles.findIndex((c) => new Date(c.time * 1000).getFullYear() === currentYear);
  if (firstCandleOfYearIdx >= 0 && firstCandleOfYearIdx < len) {
    const janOpen = candles[firstCandleOfYearIdx].open;
    returnYTD = janOpen > 0 ? Number((((currentPrice - janOpen) / janOpen) * 100).toFixed(2)) : null;
  }

  // SMAs
  const getSMA = (period: number): number | null => {
    if (len < period) return null;
    const slice = closes.slice(len - period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / period).toFixed(2));
  };

  const sma50 = getSMA(50);
  const sma200 = getSMA(200);

  const distance50DMA = sma50 ? Number((((currentPrice - sma50) / sma50) * 100).toFixed(2)) : null;
  const distance200DMA = sma200 ? Number((((currentPrice - sma200) / sma200) * 100).toFixed(2)) : null;

  // 52W High / Low
  const past252 = closes.slice(Math.max(0, len - 252));
  const high52W = fallbackQuote?.week52High ?? Math.max(...past252);
  const low52W = fallbackQuote?.week52Low ?? Math.min(...past252);

  const distance52WHigh = high52W > 0 ? Number((((currentPrice - high52W) / high52W) * 100).toFixed(2)) : null;
  const distance52WLow = low52W > 0 ? Number((((currentPrice - low52W) / low52W) * 100).toFixed(2)) : null;

  // RSI 14
  let rsi14: number | null = null;
  if (len >= 15) {
    let gains = 0;
    let losses = 0;
    for (let i = len - 14; i < len; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) rsi14 = 100;
    else {
      const rs = avgGain / avgLoss;
      rsi14 = Number((100 - 100 / (1 + rs)).toFixed(1));
    }
  }

  // Trend Classification
  let trendClassification: MomentumAnalysis["trendClassification"] = "Neutral";
  if (distance50DMA !== null && distance200DMA !== null) {
    if (distance50DMA > 3 && distance200DMA > 8) {
      trendClassification = "Strong Uptrend";
    } else if (distance50DMA > 0 && distance200DMA > 0) {
      trendClassification = "Uptrend";
    } else if (distance50DMA < -3 && distance200DMA < -8) {
      trendClassification = "Strong Downtrend";
    } else if (distance50DMA < 0 && distance200DMA < 0) {
      trendClassification = "Downtrend";
    }
  } else if (return3Month !== null) {
    if (return3Month > 15) trendClassification = "Strong Uptrend";
    else if (return3Month > 5) trendClassification = "Uptrend";
    else if (return3Month < -15) trendClassification = "Strong Downtrend";
    else if (return3Month < -5) trendClassification = "Downtrend";
  }

  // Momentum Score (0 - 100)
  let score = 50;
  if (return3Month !== null) score += Math.max(-20, Math.min(20, return3Month * 0.8));
  if (return6Month !== null) score += Math.max(-15, Math.min(15, return6Month * 0.4));
  if (distance200DMA !== null) score += Math.max(-10, Math.min(10, distance200DMA * 0.5));
  if (rsi14 !== null) {
    if (rsi14 >= 50 && rsi14 <= 70) score += 5; // Bullish momentum zone
    else if (rsi14 > 80) score -= 5; // Overbought risk
    else if (rsi14 < 30) score -= 5; // Severely broken momentum
  }
  const momentumScore = Math.max(10, Math.min(95, Math.round(score)));

  return {
    return1Week,
    return1Month,
    return3Month,
    return6Month,
    return12Month,
    returnYTD,
    sma50,
    sma200,
    distance50DMA,
    distance200DMA,
    distance52WHigh,
    distance52WLow,
    rsi14,
    trendClassification,
    momentumScore,
  };
}
