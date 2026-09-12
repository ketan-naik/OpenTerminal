"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";
import { useTerminal } from "../store/terminal";

type SearchResult = { symbol: string; name: string; exchange: string; type: string };

const POPULAR_TICKERS: SearchResult[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE", type: "ETF" },
  { symbol: "BTCUSDT", name: "Bitcoin / Tether", exchange: "BINANCE", type: "Crypto" },
];

export default function CommandPalette() {
  const open = useTerminal((s) => s.commandOpen);
  const setOpen = useTerminal((s) => s.setCommandOpen);
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const addToWatchlist = useTerminal((s) => s.addToWatchlist);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["search", query],
    queryFn: () => apiGet<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: open && query.trim().length > 0,
    staleTime: 300_000,
  });

  const displayList = query.trim().length > 0 ? searchResults : POPULAR_TICKERS;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setSelected(0), [displayList.length]);

  if (!open) return null;

  const pick = (r: SearchResult, watch = false) => {
    setActiveSymbol(r.symbol);
    if (watch) addToWatchlist(r.symbol);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center pt-20 backdrop-blur-xs select-none"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[600px] bg-[var(--panel)] border border-[var(--amber-dim)] shadow-2xl rounded-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, displayList.length - 1));
              if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
              if (e.key === "Enter" && displayList[selected]) pick(displayList[selected], e.shiftKey);
            }}
            placeholder="Search ticker, company, ETF, crypto (e.g. NVDA, AAPL, MSFT, AVGO)…"
            className="w-full !border-0 !border-b !border-[var(--border)] px-3.5 py-2.5 text-[13px] bg-[var(--panel-2)] outline-none font-mono placeholder:text-[var(--text-dim)]/60"
          />
          <span className="absolute right-3 top-2.5 dim text-[10px] font-mono">
            ESC to close
          </span>
        </div>

        {query.trim().length === 0 && (
          <div className="px-3 py-1.5 bg-[var(--panel-2)]/80 border-b border-[var(--border)] flex items-center justify-between text-[9px] uppercase tracking-wider font-bold dim">
            <span>⚡ Institutional Quick Picks</span>
            <span className="text-[var(--amber)]">Enter = Load · Shift+Enter = Watch</span>
          </div>
        )}

        <div className="max-h-84 overflow-auto">
          {displayList.map((r, i) => (
            <div
              key={r.symbol + i}
              onClick={() => pick(r)}
              className={`px-3.5 py-2 flex items-center gap-3 cursor-pointer text-[12px] font-mono border-b border-[var(--border)]/30 transition-colors ${
                i === selected ? "bg-[var(--amber)]/15 text-[var(--amber)] font-bold" : "hover:bg-[var(--hover-bg)]"
              }`}
            >
              <span className="w-20 font-bold tracking-wide text-[var(--amber)]">{r.symbol}</span>
              <span className="flex-1 truncate text-[var(--text)]">{r.name}</span>
              <span className="dim text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel-2)] border border-[var(--border)]">{r.exchange}</span>
              <span className="dim w-14 text-right text-[10px]">{r.type}</span>
            </div>
          ))}
          {query && displayList.length === 0 && (
            <div className="px-4 py-6 text-center dim text-[12px]">No matching securities found for “{query}”</div>
          )}
        </div>
      </div>
    </div>
  );
}
