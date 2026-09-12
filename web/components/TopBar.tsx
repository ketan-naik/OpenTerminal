"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { useTerminal } from "../store/terminal";

type Status = {
  ok: boolean;
  providers: Array<{ name: string; ok: number; failed: number; lastLatencyMs: number | null }>;
  ai: boolean;
};

/** User Location & 12-hour AM/PM Clock */
function UserLocationClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [tzInfo, setTzInfo] = useState<{ city: string; abbr: string; fullTz: string }>({
    city: "Local",
    abbr: "",
    fullTz: "",
  });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
      const parts = tz.split("/");
      const rawCity = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, " ") : tz;
      const d = new Date();
      const abbr =
        Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
          .formatToParts(d)
          .find((p) => p.type === "timeZoneName")?.value || "";

      setTzInfo({ city: rawCity, abbr, fullTz: tz });
    } catch {
      // fallback
    }

    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--panel)] border border-[var(--border)] text-[11px] font-mono shadow-sm shrink-0"
      title={`Terminal Local Location: ${tzInfo.fullTz}`}
    >
      <span className="text-[var(--amber)] animate-pulse">📍</span>
      <span className="font-semibold text-[var(--text)]">{tzInfo.city}</span>
      <span className="text-[var(--amber)] font-bold">{timeStr}</span>
      {tzInfo.abbr && <span className="dim text-[9px] uppercase font-bold tracking-wider">{tzInfo.abbr}</span>}
    </div>
  );
}

/** Global Financial Center Clock in AM/PM */
function MarketClock({
  tz,
  label,
  openRange,
}: {
  tz: string;
  label: string;
  openRange?: [number, number]; // [startMin, endMin] in local market time
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;

  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const day = local.getDay();
  const mins = local.getHours() * 60 + local.getMinutes();
  const isOpen = openRange ? day >= 1 && day <= 5 && mins >= openRange[0] && mins < openRange[1] : true;

  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <span className="dim flex items-center gap-1 shrink-0 text-[10px]" title={`${label} (${tz})`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOpen ? "bg-[var(--up)] shadow-[0_0_4px_var(--up)] ring-1 ring-[var(--up)]" : "bg-[var(--text-dim)]/40"
        }`}
      />
      <span className="font-semibold">{label}</span>
      <span className="text-[var(--text)] font-mono">{timeStr}</span>
    </span>
  );
}

function marketStateNY(): { label: string; open: boolean } {
  const ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay();
  const mins = ny.getHours() * 60 + ny.getMinutes();
  const open = day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 09:30–16:00
  return { label: open ? "NYSE OPEN" : "NYSE CLOSED", open };
}

export default function TopBar() {
  const theme = useTerminal((s) => s.theme);
  const toggleTheme = useTerminal((s) => s.toggleTheme);
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => apiGet<Status>("/api/status"),
    refetchInterval: 30_000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Keyboard shortcut listener: Shift+R or F5 to refresh all queries
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r" && !e.shiftKey) {
        // let standard browser reload work if needed, or handle custom
        return;
      }
      if ((e.shiftKey && e.key.toLowerCase() === "r") || e.key === "F5") {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queryClient]);

  const market = marketStateNY();
  const healthy = status?.providers.filter((p) => p.ok > 0) ?? [];

  return (
    <header className="flex items-center gap-3 px-3 h-8 bg-[var(--panel-2)] border-b border-[var(--border)] text-[11px] shrink-0 select-none overflow-x-auto">
      {/* Brand & Market Status */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="amber font-bold tracking-widest text-[12px]">OPENTERMINAL</span>
        <span
          className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${
            market.open
              ? "bg-emerald-500/10 text-[var(--up)] border-[var(--up)]/40"
              : "bg-rose-500/10 text-[var(--down)] border-[var(--down)]/40"
          }`}
        >
          {market.label}
        </span>
      </div>

      {/* User Location & Live 12h AM/PM Clock */}
      <UserLocationClock />

      {/* Financial Hub AM/PM Clocks */}
      <div className="hidden md:flex items-center gap-2.5 border-l border-[var(--border)] pl-2.5 shrink-0">
        <MarketClock tz="America/New_York" label="NY" openRange={[570, 960]} />
        <MarketClock tz="Europe/London" label="LDN" openRange={[480, 990]} />
        <MarketClock tz="Asia/Kolkata" label="BOM" openRange={[555, 930]} />
        <MarketClock tz="Asia/Tokyo" label="TYO" openRange={[540, 930]} />
      </div>

      {/* Quick Search Trigger */}
      <button
        className="term-btn flex-1 min-w-[160px] max-w-sm text-left dim flex items-center justify-between !py-1 !px-2.5"
        onClick={() => setCommandOpen(true)}
      >
        <span className="truncate">
          <span className="text-[var(--amber)] font-bold">{activeSymbol}</span> · Search any ticker…
        </span>
        <kbd className="text-[9px] px-1 rounded bg-[var(--panel)] border border-[var(--border)] font-mono text-[var(--text-dim)]">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls: Refresh All, Feeds, AI, Theme Switcher */}
      <div className="flex items-center gap-2.5 ml-auto shrink-0">
        {/* Manual Refresh Button */}
        <button
          onClick={handleRefresh}
          className={`term-btn !px-2 !py-0.5 flex items-center gap-1 font-bold text-[10px] ${
            isRefreshing ? "text-[var(--amber)] border-[var(--amber)] bg-[var(--amber)]/10" : ""
          }`}
          title="Refresh All Dashboard Widgets & Feeds (Shift+R)"
        >
          <span className={`text-[12px] inline-block ${isRefreshing ? "animate-spin" : ""}`}>⟳</span>
          <span>{isRefreshing ? "REFRESHING…" : "REFRESH"}</span>
        </button>

        <span className="dim text-[10px] hidden lg:inline">
          feeds:{" "}
          {healthy.length > 0
            ? healthy.map((p) => `${p.name} ${p.lastLatencyMs ?? "—"}ms`).join(" · ")
            : "connecting…"}
        </span>

        <span
          className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
            status?.ai
              ? "text-[var(--up)] border-[var(--up)]/30 bg-[var(--up)]/5"
              : "text-[var(--text-dim)] border-[var(--border)]"
          }`}
          title={status?.ai ? "AI Committee Assistant Active" : "AI Committee Assistant Inactive"}
        >
          <span>AI</span>
          <span className={`w-1.5 h-1.5 rounded-full ${status?.ai ? "bg-[var(--up)]" : "bg-[var(--text-dim)]"}`} />
        </span>

        <button
          onClick={toggleTheme}
          className="term-btn !px-2 !py-0.5 flex items-center gap-1 font-bold text-[10px]"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? "☀ LIGHT" : "☾ DARK"}
        </button>
      </div>
    </header>
  );
}
