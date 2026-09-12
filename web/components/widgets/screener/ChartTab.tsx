"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { apiGet, type Candle } from "../../../lib/api";
import { sma } from "../../../lib/indicators";
import { useTerminal } from "../../../store/terminal";

const TIMEFRAMES = ["1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;

export default function ChartTab({ symbol }: { symbol: string }) {
  const theme = useTerminal((s) => s.theme);
  const [range, setRange] = useState<typeof TIMEFRAMES[number]>("1Y");
  const [show50DMA, setShow50DMA] = useState(true);
  const [show200DMA, setShow200DMA] = useState(true);
  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const { data: candles, isLoading } = useQuery({
    queryKey: ["screener_history", symbol, range],
    queryFn: () => apiGet<Candle[]>(`/api/history/${symbol}?range=${range}`),
    refetchInterval: 60_000,
  });

  // Calculate return in current timeframe
  const timeframeReturn = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const start = candles[0].close;
    const end = candles[candles.length - 1].close;
    if (start <= 0) return null;
    return Number((((end - start) / start) * 100).toFixed(2));
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current || !candles || candles.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = theme === "dark";
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { color: isDark ? "#0d0f12" : "#f8fafc" },
        textColor: isDark ? "#8b949e" : "#475569",
        fontSize: 11,
        fontFamily: "var(--font-mono, monospace)",
      },
      grid: {
        vertLines: { color: isDark ? "#1f242c" : "#e2e8f0" },
        horzLines: { color: isDark ? "#1f242c" : "#e2e8f0" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#2d333b" : "#cbd5e1",
      },
      timeScale: {
        borderColor: isDark ? "#2d333b" : "#cbd5e1",
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "#ff9900", labelBackgroundColor: "#ff9900" },
        horzLine: { color: "#ff9900", labelBackgroundColor: "#ff9900" },
      },
    });
    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00c853",
      downColor: "#ff3d00",
      borderVisible: false,
      wickUpColor: "#00c853",
      wickDownColor: "#ff3d00",
    });

    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(candleData);

    // Volume Series
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(0, 200, 83, 0.25)" : "rgba(255, 61, 0, 0.25)",
      }))
    );

    // Moving Averages
    if (show50DMA && candles.length >= 50) {
      const sma50Data = sma(candles, 50);
      const line50 = chart.addSeries(LineSeries, {
        color: "#4fc3f7",
        lineWidth: 1.5 as any,
        title: "50 DMA",
      });
      line50.setData(sma50Data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }

    if (show200DMA && candles.length >= 200) {
      const sma200Data = sma(candles, 200);
      const line200 = chart.addSeries(LineSeries, {
        color: "#ba68c8",
        lineWidth: 2 as any,
        title: "200 DMA",
      });
      line200.setData(sma200Data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, theme, show50DMA, show200DMA]);

  return (
    <div className="space-y-3 p-4">
      {/* Timeframe & Overlay Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-dim)] font-mono uppercase font-bold mr-1">RANGE:</span>
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                range === t
                  ? "bg-[var(--amber)] text-black"
                  : "bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-dim)] hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
          {timeframeReturn !== null && (
            <span
              className={`ml-2 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                timeframeReturn >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {timeframeReturn >= 0 ? "+" : ""}{timeframeReturn}% in {range}
            </span>
          )}
        </div>

        {/* Overlay Toggles */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={show50DMA}
              onChange={(e) => setShow50DMA(e.target.checked)}
              className="accent-[#4fc3f7]"
            />
            <span className="text-[#4fc3f7] font-semibold">50 DMA</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={show200DMA}
              onChange={(e) => setShow200DMA(e.target.checked)}
              className="accent-[#ba68c8]"
            />
            <span className="text-[#ba68c8] font-semibold">200 DMA</span>
          </label>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative border border-[var(--border)] rounded bg-[var(--panel-2)] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <span className="text-[var(--amber)] font-mono text-[12px] animate-pulse">Loading Candlesticks...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-[380px]" />
      </div>
    </div>
  );
}
