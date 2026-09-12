"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, fmt, fmtBig, pctClass, getCurrencySymbol, type Quote } from "../../lib/api";
import { useTerminal, useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import Flash from "../Flash";

type ShortVolume = { date: string; shortVolume: number; shortExemptVolume: number; totalVolume: number; shortVolumePercent: number };

export default function QuoteWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const focusOrAddWidget = useTerminal((s) => s.focusOrAddWidget);
  const { data, error } = useQuery({
    queryKey: ["quote", symbol],
    queryFn: async () => (await apiGet<Quote[]>(`/api/quotes?symbols=${symbol}`))[0],
    refetchInterval: 3_000,
  });
  // FINRA's Reg SHO file only updates once a day (next-morning), so no point polling it fast.
  const { data: shortVol } = useQuery({
    queryKey: ["short-volume", symbol],
    queryFn: () => apiGet<ShortVolume | null>(`/api/short-volume/${symbol}`),
    staleTime: 3_600_000,
  });

  if (error) return <div className="p-2 down">Error: {(error as Error).message}</div>;
  if (!data) return <div className="p-2 dim">Loading {symbol}…</div>;

  const curSym = getCurrencySymbol(data.currency, symbol);

  const rows: Array<[string, string, string?]> = [
    ["Open", fmt(data.open)],
    ["High", fmt(data.high)],
    ["Low", fmt(data.low)],
    ["Prev Close", fmt(data.previousClose)],
    ["Bid", fmt(data.bid)],
    ["Ask", fmt(data.ask)],
    ["Volume", fmtBig(data.volume)],
    ["Avg Vol 3M", fmtBig(data.avgVolume)],
    ...(shortVol ? ([["Short Vol %", fmt(shortVol.shortVolumePercent, 1) + "%"]] as Array<[string, string]>) : []),
    ["Mkt Cap", `${curSym}${fmtBig(data.marketCap)}`],
    ["P/E (ttm)", fmt(data.pe)],
    ["EPS (ttm)", fmt(data.eps)],
    ["Div Yield", data.dividendYield !== null ? fmt(data.dividendYield * 100) + "%" : "—"],
    ["52W High", `${curSym}${fmt(data.week52High)}`],
    ["52W Low", `${curSym}${fmt(data.week52Low)}`],
    ["Beta", fmt(data.beta)],
    ["Shares Out", fmtBig(data.sharesOutstanding)],
  ];

  // 52W range relative position
  const rangePos =
    data.price && data.week52Low && data.week52High && data.week52High > data.week52Low
      ? Math.max(0, Math.min(100, ((data.price - data.week52Low) / (data.week52High - data.week52Low)) * 100))
      : null;

  return (
    <div className="p-2 select-none flex flex-col h-full justify-between">
      <div>
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <Flash value={data.price} className="text-xl font-bold font-mono tracking-tight">
            {curSym}{fmt(data.price)}
          </Flash>
          <Flash value={data.changePercent} className={`${pctClass(data.changePercent)} text-sm font-mono font-semibold`}>
            {data.change !== null && data.change >= 0 ? "+" : ""}
            {fmt(data.change)} ({fmt(data.changePercent)}%)
          </Flash>
          <button
            onClick={() => focusOrAddWidget("research", symbol)}
            className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--amber)]/15 text-[var(--amber)] border border-[var(--amber)]/40 hover:bg-[var(--amber)] hover:text-black transition-colors"
            title={`Open Hedge Fund CIO Research Workstation for ${symbol}`}
          >
            🏛️ CIO Research
          </button>
        </div>

        <div className="flex items-center justify-between dim text-[10px] mb-2 truncate">
          <span className="truncate font-medium text-[var(--text)]">{data.name}</span>
          <span className="shrink-0 pl-1">
            {data.exchange ?? ""} · {data.currency ?? ""}
          </span>
        </div>

        {/* 52W Range Visual Bar */}
        {rangePos !== null && (
          <div className="mb-2 p-1.5 rounded bg-[var(--panel-2)]/60 border border-[var(--border)] text-[9px]">
            <div className="flex justify-between dim mb-0.5">
              <span>52W L: {curSym}{fmt(data.week52Low)}</span>
              <span className="text-[var(--amber)] font-bold">{fmt(rangePos, 0)}% of 52W Range</span>
              <span>52W H: {curSym}{fmt(data.week52High)}</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[var(--down)] via-[var(--amber)] to-[var(--up)] rounded-full"
                style={{ width: `${rangePos}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 text-[10px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-[var(--table-border)] py-0.5">
              <span className="dim">{label}</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
