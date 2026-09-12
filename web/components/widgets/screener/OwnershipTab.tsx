"use client";

import { OwnershipData } from "../../../lib/screenerTypes";

export default function OwnershipTab({ ownership }: { ownership: OwnershipData }) {
  const { institutionalPercent, insiderPercent, publicPercent, topInstitutionalHolders, recentInsiderTransactions, indianShareholding } = ownership;

  return (
    <div className="space-y-4 p-4">
      {/* 1. Ownership Breakdown Bar */}
      <div className="p-3.5 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>👥</span>
            <span>Shareholding Structure & Institutional Concentration</span>
          </h3>
          <span className="text-[10px] text-[var(--text-dim)] font-mono">SEC Form 13F & Form 4 Filings</span>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="h-4 rounded overflow-hidden flex bg-[var(--panel)] border border-[var(--border)]">
          <div
            style={{ width: `${institutionalPercent ?? 60}%` }}
            className="bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold font-mono truncate"
            title={`Institutional: ${institutionalPercent ?? 60}%`}
          >
            Institutions ({institutionalPercent ?? 60}%)
          </div>
          <div
            style={{ width: `${insiderPercent ?? 5}%` }}
            className="bg-amber-500 flex items-center justify-center text-[9px] text-black font-bold font-mono truncate"
            title={`Insiders / Management: ${insiderPercent ?? 5}%`}
          >
            Insiders ({insiderPercent ?? 5}%)
          </div>
          <div
            style={{ width: `${publicPercent ?? 35}%` }}
            className="bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold font-mono truncate"
            title={`Public Retail: ${publicPercent ?? 35}%`}
          >
            Public ({publicPercent ?? 35}%)
          </div>
        </div>

        {/* Indian Shareholding Specific Grid */}
        {indianShareholding && (
          <div className="p-2.5 bg-[var(--panel)] rounded border border-[var(--border)] grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[9px] text-[var(--text-dim)]">PROMOTER</span>
              <div className="font-bold text-[var(--amber)]">{indianShareholding.promoter}%</div>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-dim)]">FII (Foreign)</span>
              <div className="font-bold text-blue-400">{indianShareholding.fii}%</div>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-dim)]">DII (Domestic)</span>
              <div className="font-bold text-emerald-400">{indianShareholding.dii}%</div>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-dim)]">PUBLIC RETAIL</span>
              <div className="font-bold text-[var(--text)]">{indianShareholding.public}%</div>
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-dim)]">PLEDGED SHARES</span>
              <div className="font-bold text-rose-400">{indianShareholding.pledgedSharesPercent}%</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Institutional Holders Table */}
      <div className="border border-[var(--border)] rounded bg-[var(--panel-2)] overflow-hidden">
        <div className="px-3 py-2 bg-[var(--panel)] border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-bold text-[11px] text-[var(--text)] uppercase tracking-wider">Top Institutional Asset Managers</span>
          <span className="text-[10px] text-[var(--text-dim)] font-mono">13F Source Data</span>
        </div>
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5">Institutional Investor</th>
              <th className="p-2.5 text-right">Shares Held</th>
              <th className="p-2.5 text-right">% Portfolio Stake</th>
              <th className="p-2.5 text-right">Position Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {topInstitutionalHolders.map((holder, idx) => (
              <tr key={idx} className="hover:bg-[var(--panel)] transition-colors">
                <td className="p-2.5 font-bold text-[var(--text)]">{holder.name}</td>
                <td className="p-2.5 text-right text-[var(--text-dim)]">{Math.round(holder.shares).toLocaleString()}</td>
                <td className="p-2.5 text-right text-blue-400 font-bold">{holder.percent}%</td>
                <td className="p-2.5 text-right text-[var(--text)]">
                  {holder.value >= 1e9 ? `$${(holder.value / 1e9).toFixed(2)}B` : `$${(holder.value / 1e6).toFixed(2)}M`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Recent SEC Form 4 Insider Transactions */}
      <div className="border border-[var(--border)] rounded bg-[var(--panel-2)] overflow-hidden">
        <div className="px-3 py-2 bg-[var(--panel)] border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-bold text-[11px] text-[var(--text)] uppercase tracking-wider">Recent Open-Market Insider Transactions</span>
          <span className="text-[10px] text-[var(--text-dim)] font-mono">SEC Form 4 Feed</span>
        </div>
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5">Date</th>
              <th className="p-2.5">Insider Name & Title</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5 text-right">Shares</th>
              <th className="p-2.5 text-right">Price</th>
              <th className="p-2.5 text-right">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {recentInsiderTransactions.map((tx, idx) => {
              const isBuy = tx.transactionCode === "P";

              return (
                <tr key={idx} className="hover:bg-[var(--panel)] transition-colors">
                  <td className="p-2.5 text-[var(--text-dim)] whitespace-nowrap">{tx.transactionDate}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-[var(--text)]">{tx.ownerName}</div>
                    <div className="text-[10px] text-[var(--text-dim)]">{tx.ownerTitle || "Director / 10% Owner"}</div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isBuy
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isBuy ? "BUY" : "SELL"} ({tx.transactionCode})
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-[var(--text)]">{tx.shares ? tx.shares.toLocaleString() : "—"}</td>
                  <td className="p-2.5 text-right text-[var(--text)]">{tx.pricePerShare ? `$${tx.pricePerShare.toFixed(2)}` : "—"}</td>
                  <td className="p-2.5 text-right font-bold text-[var(--text)]">
                    {tx.value ? `$${(tx.value / 1e6).toFixed(2)}M` : "—"}
                  </td>
                </tr>
              );
            })}
            {recentInsiderTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-[var(--text-dim)] italic">
                  No recent open-market Form 4 insider transactions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
