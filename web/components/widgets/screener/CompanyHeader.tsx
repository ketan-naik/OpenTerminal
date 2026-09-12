"use client";

import { CompanyProfile } from "../../../lib/screenerTypes";
import { getCurrencySymbol } from "../../../lib/api";

export default function CompanyHeader({
  profile,
  onOpenCompare,
  onOpenCIO,
  onExportCSV,
  onAddToWatchlist,
}: {
  profile: CompanyProfile;
  onOpenCompare?: () => void;
  onOpenCIO?: () => void;
  onExportCSV?: () => void;
  onAddToWatchlist?: () => void;
}) {
  const isUp = (profile.dailyChangePercent ?? 0) >= 0;
  const curSym = getCurrencySymbol(profile.currency, profile.symbol);

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    if (Math.abs(val) >= 1e12) return `${curSym}${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `${curSym}${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `${curSym}${(val / 1e6).toFixed(2)}M`;
    return `${curSym}${val.toFixed(2)}`;
  };

  return (
    <div className="p-3 bg-[var(--panel-2)] border-b border-[var(--border)] select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center font-bold text-[14px] text-[var(--amber)] shadow-inner">
            {profile.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] text-[var(--text)] tracking-wide">{profile.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded font-mono font-bold bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30">
                {profile.symbol}
              </span>
              <span className="text-[10px] text-[var(--text-dim)] px-1.5 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)]">
                {profile.exchange}
              </span>
              {profile.securityType !== "EQUITY" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {profile.securityType.replace("_", " ")}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-dim)] flex items-center gap-2 mt-0.5">
              <span>{profile.sector}</span>
              <span>•</span>
              <span>{profile.industry}</span>
              <span>•</span>
              <span>{profile.country} ({profile.currency})</span>
              {profile.website && (
                <>
                  <span>•</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--amber)] hover:underline flex items-center gap-0.5"
                  >
                    <span>Website ↗</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Market Price & Quick Stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="font-mono text-[18px] font-bold text-[var(--text)]">
              {curSym}{profile.currentPrice?.toFixed(2) ?? "—"}
            </div>
            <div className={`text-[11px] font-mono font-semibold flex items-center justify-end gap-1 ${isUp ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
              <span>{isUp ? "▲" : "▼"}</span>
              <span>{profile.dailyChange !== null ? `${profile.dailyChange >= 0 ? "+" : ""}${profile.dailyChange.toFixed(2)}` : ""}</span>
              <span>({profile.dailyChangePercent !== null ? `${profile.dailyChangePercent >= 0 ? "+" : ""}${profile.dailyChangePercent.toFixed(2)}%` : "—"})</span>
            </div>
          </div>

          <div className="h-7 w-px bg-[var(--border)] hidden sm:block" />

          <div className="text-[11px] font-mono hidden md:block">
            <div className="text-[var(--text-dim)] text-[10px]">MARKET CAP</div>
            <div className="font-bold text-[var(--text)]">{formatCurrency(profile.marketCap)}</div>
          </div>

          <div className="text-[11px] font-mono hidden lg:block">
            <div className="text-[var(--text-dim)] text-[10px]">52W RANGE</div>
            <div className="font-semibold text-[var(--text)]">
              {curSym}{profile.week52Low?.toFixed(2) ?? "—"} – {curSym}{profile.week52High?.toFixed(2) ?? "—"}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onAddToWatchlist && (
              <button
                onClick={onAddToWatchlist}
                className="term-btn !px-2 !py-1 text-[11px] flex items-center gap-1"
                title="Add ticker to watchlist"
              >
                <span>★</span>
                <span>WATCH</span>
              </button>
            )}
            {onOpenCompare && (
              <button
                onClick={onOpenCompare}
                className="term-btn !px-2 !py-1 text-[11px] flex items-center gap-1"
                title="Compare with peers"
              >
                <span>⚖</span>
                <span>COMPARE</span>
              </button>
            )}
            {onOpenCIO && (
              <button
                onClick={onOpenCIO}
                className="term-btn !px-2 !py-1 text-[11px] text-[var(--amber)] border-[var(--amber)]/40 hover:bg-[var(--amber)]/10 flex items-center gap-1 font-bold"
                title="View $1B Hedge Fund CIO Research Dossier"
              >
                <span>🏛️</span>
                <span>CIO DOSSIER</span>
              </button>
            )}
            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="term-btn !px-2 !py-1 text-[11px] flex items-center gap-1"
                title="Export company financials to CSV"
              >
                <span>📥</span>
                <span>CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
