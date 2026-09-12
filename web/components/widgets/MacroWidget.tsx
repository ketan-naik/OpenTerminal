"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, fmt, pctClass } from "../../lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useTerminal } from "../../store/terminal";
import Flash from "../Flash";

type CentralBank = {
  bank: string;
  country: string;
  rate: number;
  range: string;
  note: string;
};

type MacroItem = {
  symbol: string;
  label: string;
  category: string;
  price: number | null;
  changePercent: number | null;
};

type MacroData = {
  yields: Array<{ tenor: string; value: number | null }>;
  spread2y10y: number | null;
  vix: number | null;
  centralBanks: CentralBank[];
  indexes: MacroItem[];
  commodities: MacroItem[];
  fx: MacroItem[];
  ai: MacroItem[];
};

export default function MacroWidget() {
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const [tab, setTab] = useState<"yields" | "commodities" | "fx" | "ai" | "banks">("yields");

  const { data, error } = useQuery({
    queryKey: ["macro"],
    queryFn: () => apiGet<MacroData>("/api/macro"),
    refetchInterval: 10_000,
  });

  if (error) return <div className="p-2 down">Error: {(error as Error).message}</div>;
  if (!data) return <div className="p-2 dim">Loading macro intelligence…</div>;

  const isInverted = data.spread2y10y !== null && data.spread2y10y < 0;

  return (
    <div className="flex flex-col h-full text-[11px]">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 border-b border-[var(--border)] bg-[var(--panel-2)] shrink-0 overflow-x-auto">
        <button
          className={`term-btn !px-1.5 !py-0.5 text-[10px] ${tab === "yields" ? "active" : ""}`}
          onClick={() => setTab("yields")}
        >
          YIELDS & CURVE
        </button>
        <button
          className={`term-btn !px-1.5 !py-0.5 text-[10px] ${tab === "banks" ? "active" : ""}`}
          onClick={() => setTab("banks")}
        >
          CENTRAL BANKS
        </button>
        <button
          className={`term-btn !px-1.5 !py-0.5 text-[10px] ${tab === "commodities" ? "active" : ""}`}
          onClick={() => setTab("commodities")}
        >
          GOLD & OIL
        </button>
        <button
          className={`term-btn !px-1.5 !py-0.5 text-[10px] ${tab === "fx" ? "active" : ""}`}
          onClick={() => setTab("fx")}
        >
          FX & YEN
        </button>
        <button
          className={`term-btn !px-1.5 !py-0.5 text-[10px] ${tab === "ai" ? "active" : ""}`}
          onClick={() => setTab("ai")}
        >
          AI & MEGACAPS
        </button>
      </div>

      {/* Top Risk Barometers */}
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--panel)] border-b border-[var(--table-border)] text-[10px] shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="dim">2Y-10Y SPREAD:</span>
          <span className={isInverted ? "down font-bold" : "up font-bold"}>
            {data.spread2y10y !== null ? `${data.spread2y10y > 0 ? "+" : ""}${data.spread2y10y}%` : "—"}
          </span>
          <span className={`px-1 py-0.2 rounded text-[9px] ${isInverted ? "bg-[var(--down)]/20 down" : "bg-[var(--up)]/20 up"}`}>
            {isInverted ? "INVERTED" : "NORMAL"}
          </span>
        </span>
        {data.vix !== null && (
          <span
            className="cursor-pointer hover:text-[var(--amber)] flex items-center gap-1"
            onClick={() => setActiveSymbol("^VIX")}
            title="CBOE Volatility Index (Equity Fear Barometer)"
          >
            <span className="dim">VIX:</span>
            <Flash value={data.vix} className="amber font-bold">{fmt(data.vix, 2)}</Flash>
          </span>
        )}
      </div>

      {/* Content based on selected tab */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "yields" && (
          <div>
            <div className="h-24 px-1 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.yields} margin={{ top: 4, right: 12, bottom: 0, left: -22 }}>
                  <XAxis dataKey="tenor" stroke="var(--text-dim)" fontSize={9} />
                  <YAxis stroke="var(--text-dim)" fontSize={9} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 10 }}
                    labelStyle={{ color: "var(--text-dim)" }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--amber)" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Index / Benchmark</th><th>Last</th><th>Chg%</th></tr>
              </thead>
              <tbody>
                {data.indexes.map((q) => (
                  <tr key={q.symbol} onClick={() => setActiveSymbol(q.symbol)}>
                    <td>{q.label}</td>
                    <td><Flash value={q.price}>{fmt(q.price)}</Flash></td>
                    <td className={pctClass(q.changePercent)}>
                      <Flash value={q.changePercent}>{fmt(q.changePercent)}%</Flash>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "banks" && (
          <div className="p-1 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              {data.centralBanks.map((cb) => (
                <div key={cb.bank} className="p-1.5 bg-[var(--panel-2)] border border-[var(--border)] rounded">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-[var(--amber)]">{cb.bank}</span>
                    <span className="text-[12px] font-bold text-[var(--text)]">{cb.range}</span>
                  </div>
                  <div className="dim text-[9px] truncate">{cb.country} · {cb.note}</div>
                </div>
              ))}
            </div>
            <div className="p-1.5 bg-[var(--panel-2)] border border-[var(--border)] rounded text-[10px] space-y-0.5">
              <div className="font-bold text-[var(--text)]">💡 Macro Impact Notes</div>
              <div className="dim">• <span className="text-[var(--text)]">BoJ Rate Hikes</span>: Strengthens JPY and triggers global Yen carry-trade unwinds across tech & equities.</div>
              <div className="dim">• <span className="text-[var(--text)]">Fed Funds & 10Y Yield</span>: High yields increase discount rates, compressing high-valuation tech multiples.</div>
            </div>
          </div>
        )}

        {tab === "commodities" && (
          <table className="data-table">
            <thead>
              <tr><th>Commodity & Energy</th><th>Last</th><th>Chg%</th></tr>
            </thead>
            <tbody>
              {data.commodities.map((q) => (
                <tr key={q.symbol} onClick={() => setActiveSymbol(q.symbol)}>
                  <td>{q.label}</td>
                  <td><Flash value={q.price}>{fmt(q.price)}</Flash></td>
                  <td className={pctClass(q.changePercent)}>
                    <Flash value={q.changePercent}>{fmt(q.changePercent)}%</Flash>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "fx" && (
          <div>
            <div className="px-2 py-1 dim text-[10px] border-b border-[var(--table-border)]">
              Currency & FX Risk Barometers (Includes JPY Carry Meter)
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Currency / Index</th><th>Last</th><th>Chg%</th></tr>
              </thead>
              <tbody>
                {data.fx.map((q) => (
                  <tr key={q.symbol} onClick={() => setActiveSymbol(q.symbol)}>
                    <td>{q.label}</td>
                    <td><Flash value={q.price}>{fmt(q.price)}</Flash></td>
                    <td className={pctClass(q.changePercent)}>
                      <Flash value={q.changePercent}>{fmt(q.changePercent)}%</Flash>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "ai" && (
          <div>
            <div className="px-2 py-1 dim text-[10px] border-b border-[var(--table-border)]">
              AI & Tech Megacap Market Drivers (Click to load chart)
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Company</th><th>Price</th><th>Chg%</th></tr>
              </thead>
              <tbody>
                {data.ai.map((q) => (
                  <tr key={q.symbol} onClick={() => setActiveSymbol(q.symbol)}>
                    <td>{q.label}</td>
                    <td><Flash value={q.price}>{fmt(q.price)}</Flash></td>
                    <td className={pctClass(q.changePercent)}>
                      <Flash value={q.changePercent}>{fmt(q.changePercent)}%</Flash>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
