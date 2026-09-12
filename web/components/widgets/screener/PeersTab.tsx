"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, getCurrencySymbol } from "../../../lib/api";
import { PeerCompany } from "../../../lib/screenerTypes";
import { useTerminal } from "../../../store/terminal";

export default function PeersTab({
  symbol,
  peers = [],
}: {
  symbol: string;
  peers?: PeerCompany[];
}) {
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const [customTicker, setCustomTicker] = useState("");
  const [sortKey, setSortKey] = useState<keyof PeerCompany>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: serverPeers } = useQuery({
    queryKey: ["screener_peers", symbol],
    queryFn: () => apiGet<PeerCompany[]>(`/api/screener-dashboard/peers/${symbol}`),
    initialData: peers,
  });

  const list = serverPeers || peers;

  const handleSort = (key: keyof PeerCompany) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedList = [...list].sort((a, b) => {
    const av = (a[sortKey] as number | null) ?? -Infinity;
    const bv = (b[sortKey] as number | null) ?? -Infinity;
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
  });

  const formatMcap = (val: number | null | undefined, peerSymbol?: string) => {
    if (!val) return "—";
    const curSym = getCurrencySymbol(undefined, peerSymbol);
    if (val >= 1e12) return `${curSym}${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `${curSym}${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${curSym}${(val / 1e6).toFixed(2)}M`;
    return `${curSym}${val.toFixed(2)}`;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Search & Peer Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded">
        <div>
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>👥</span>
            <span>Industry & Sector Peer Comparison Matrix</span>
          </h3>
          <p className="text-[11px] text-[var(--text-dim)]">
            Compare valuation, ROIC, margin strength, and balance sheet leverage side-by-side.
          </p>
        </div>

        {/* Add Custom Peer Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customTicker.trim()) {
                setActiveSymbol(customTicker.trim());
                setCustomTicker("");
              }
            }}
            placeholder="Add ticker to compare..."
            className="term-input !text-[11px] !py-1 w-44"
          />
          <button
            onClick={() => {
              if (customTicker.trim()) {
                setActiveSymbol(customTicker.trim());
                setCustomTicker("");
              }
            }}
            className="term-btn !text-[11px] !py-1 font-bold"
          >
            + ADD
          </button>
        </div>
      </div>

      {/* Peer Comparison Table */}
      <div className="border border-[var(--border)] rounded overflow-x-auto bg-[var(--panel-2)]">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5 sticky left-0 bg-[var(--panel)] z-10">Company</th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("currentPrice")}>
                Price {sortKey === "currentPrice" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("marketCap")}>
                Market Cap {sortKey === "marketCap" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("pe")}>
                P/E {sortKey === "pe" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("ps")}>
                P/S {sortKey === "ps" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("pb")}>
                P/B {sortKey === "pb" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("evEbitda")}>
                EV/EBITDA {sortKey === "evEbitda" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white text-emerald-400" onClick={() => handleSort("roic")}>
                ROIC % {sortKey === "roic" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("roe")}>
                ROE % {sortKey === "roe" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("operatingMargin")}>
                Oper Margin {sortKey === "operatingMargin" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("revenueGrowthYoY")}>
                Rev Growth {sortKey === "revenueGrowthYoY" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("debtToEquity")}>
                D/E {sortKey === "debtToEquity" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("fcfYield")}>
                FCF Yield {sortKey === "fcfYield" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("dividendYield")}>
                Div Yield {sortKey === "dividendYield" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedList.map((p) => {
              const isCurrent = p.symbol.toUpperCase() === symbol.toUpperCase();

              return (
                <tr
                  key={p.symbol}
                  className={`hover:bg-[var(--panel)] transition-colors cursor-pointer ${
                    isCurrent ? "bg-[var(--amber)]/10 font-bold border-l-2 border-l-[var(--amber)]" : ""
                  }`}
                  onClick={() => setActiveSymbol(p.symbol)}
                  title="Click to view full Screener dashboard for this company"
                >
                  <td className="p-2.5 sticky left-0 bg-[var(--panel-2)] z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[var(--amber)]">{p.symbol}</span>
                      <span className="text-[10px] text-[var(--text-dim)] truncate max-w-[120px]">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--amber)] text-black font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-right text-[var(--text)] font-semibold">
                    {p.currentPrice !== null && p.currentPrice !== undefined
                      ? `${getCurrencySymbol(undefined, p.symbol)}${p.currentPrice.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="p-2.5 text-right text-[var(--text)]">{formatMcap(p.marketCap, p.symbol)}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.pe ? `${p.pe.toFixed(1)}x` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.ps ? `${p.ps.toFixed(1)}x` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.pb ? `${p.pb.toFixed(1)}x` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.evEbitda ? `${p.evEbitda.toFixed(1)}x` : "—"}</td>
                  <td className="p-2.5 text-right font-bold text-[var(--up)]">{p.roic ? `${p.roic.toFixed(1)}%` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.roe ? `${p.roe.toFixed(1)}%` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.operatingMargin ? `${p.operatingMargin.toFixed(1)}%` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">
                    {p.revenueGrowthYoY !== null && p.revenueGrowthYoY !== undefined
                      ? `${p.revenueGrowthYoY >= 0 ? "+" : ""}${p.revenueGrowthYoY.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.debtToEquity ? `${p.debtToEquity.toFixed(2)}x` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.fcfYield ? `${p.fcfYield.toFixed(1)}%` : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{p.dividendYield ? `${p.dividendYield.toFixed(2)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
