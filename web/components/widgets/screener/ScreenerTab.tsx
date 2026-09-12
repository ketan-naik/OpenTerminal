"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";
import { executeScreenerQuery, PREBUILT_SCREENS } from "../../../lib/screenerQueryEngine";
import { findMetric, formatMetricValue, METRIC_REGISTRY } from "../../../lib/metricRegistry";
import { ScreenerRow } from "../../../lib/screenerTypes";
import { useTerminal } from "../../../store/terminal";

const DEFAULT_SCREENER_COLUMNS = [
  "symbol",
  "name",
  "price",
  "marketCap",
  "pe",
  "roic",
  "roe",
  "grossMargin",
  "operatingMargin",
  "revenueGrowthYoY",
  "debtToEquity",
  "fcfYield",
  "return1Y",
];

export default function ScreenerTab() {
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const [queryText, setQueryText] = useState("ROIC > 18 AND Revenue Growth > 10 AND Debt / Equity < 0.8 AND FCF Margin > 12");
  const [nlPrompt, setNlPrompt] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [columns, setColumns] = useState<string[]>(DEFAULT_SCREENER_COLUMNS);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Fetch complete universe for fast local/server query execution
  const { data: universe = [], isLoading } = useQuery({
    queryKey: ["screener_universe_full"],
    queryFn: () => apiGet<ScreenerRow[]>("/api/screener-dashboard/screener-universe"),
    staleTime: 60_000,
  });

  // Execute query against the universe
  const { results, error } = executeScreenerQuery(queryText, universe);

  // Sorting
  const sortedResults = [...results].sort((a, b) => {
    const av = (a as any)[sortKey] ?? -Infinity;
    const bv = (b as any)[sortKey] ?? -Infinity;
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
  });

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const pageItems = sortedResults.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const loadPrebuilt = (query: string) => {
    setQueryText(query);
    setPage(1);
  };

  const handleNlTranslate = async () => {
    if (!nlPrompt.trim()) return;
    setIsTranslating(true);
    try {
      const res = await apiPost<{ prompt: string; generatedQuery: string }>("/api/screener-dashboard/nl-query", {
        prompt: nlPrompt,
      });
      if (res?.generatedQuery) {
        setQueryText(res.generatedQuery);
        setPage(1);
      }
    } catch {}
    setIsTranslating(false);
  };

  const exportCSV = () => {
    if (sortedResults.length === 0) return;
    const header = columns.join(",");
    const rows = sortedResults.map((r) =>
      columns.map((c) => `"${(r as any)[c] ?? ""}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `openterminal_screen_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 p-4">
      {/* 1. Prebuilt Screens Carousel Bar */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-1">
            <span>⚡ PREBUILT INSTITUTIONAL SCREENS</span>
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {PREBUILT_SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => loadPrebuilt(s.query)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap border transition-all ${
                queryText === s.query
                  ? "bg-[var(--amber)] text-black font-bold border-[var(--amber)] shadow-md"
                  : "bg-[var(--panel)] border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--amber)]/40"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Natural Language AI Query Input */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded flex items-center gap-2">
        <span className="text-[var(--amber)] text-[14px]">✨</span>
        <input
          type="text"
          value={nlPrompt}
          onChange={(e) => setNlPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNlTranslate()}
          placeholder="Natural Language AI Screen: e.g. 'Find high ROIC compounders with low leverage and double-digit revenue growth'..."
          className="term-input flex-1 !text-[12px] !py-1"
        />
        <button
          onClick={handleNlTranslate}
          disabled={isTranslating}
          className="term-btn !text-[11px] !py-1 text-[var(--amber)] border-[var(--amber)]/40 hover:bg-[var(--amber)]/10 font-bold"
        >
          {isTranslating ? "TRANSLATING..." : "TRANSLATE & RUN"}
        </button>
      </div>

      {/* 3. Query Editor */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-wider flex items-center gap-1.5">
            <span>💻</span>
            <span>Query Expression Editor</span>
          </span>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-dim)] font-mono">
            <span>Operators: &gt;, &lt;, &gt;=, &lt;=, =, AND, OR, ()</span>
          </div>
        </div>

        <textarea
          value={queryText}
          onChange={(e) => {
            setQueryText(e.target.value);
            setPage(1);
          }}
          rows={2}
          className="term-input w-full font-mono text-[12px] p-2 bg-[var(--panel)] leading-relaxed resize-none"
          placeholder="Enter query syntax: e.g. ROIC > 15 AND Market Cap > 10B AND Debt / Equity < 1"
        />

        {error && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/40 rounded text-rose-400 text-[11px] font-mono flex items-center gap-2">
            <span>⚠ SYNTAX ERROR:</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 4. Results Bar & Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[13px] text-[var(--text)] font-mono">
            {sortedResults.length} MATCHING COMPANIES
          </span>
          <span className="text-[10px] text-[var(--text-dim)] font-mono">
            (out of {universe.length} universe)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setColumnModalOpen(true)}
            className="term-btn !text-[11px] !py-1 flex items-center gap-1"
          >
            <span>⚙ COLUMNS ({columns.length})</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={sortedResults.length === 0}
            className="term-btn !text-[11px] !py-1 flex items-center gap-1"
          >
            <span>📥 EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* 5. Results Table */}
      <div className="border border-[var(--border)] rounded overflow-x-auto bg-[var(--panel-2)]">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              {columns.map((cKey) => {
                const def = findMetric(cKey);
                const title = def?.shortName ?? (cKey === "symbol" ? "Ticker" : cKey === "name" ? "Company" : cKey);

                return (
                  <th
                    key={cKey}
                    onClick={() => handleSort(cKey)}
                    className={`p-2.5 whitespace-nowrap cursor-pointer hover:text-white ${
                      cKey === "symbol" ? "sticky left-0 bg-[var(--panel)] z-10" : "text-right"
                    }`}
                  >
                    {title} {sortKey === cKey && (sortDir === "asc" ? "▲" : "▼")}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {pageItems.map((row) => (
              <tr
                key={row.symbol}
                onClick={() => setActiveSymbol(row.symbol)}
                className="hover:bg-[var(--panel)] transition-colors cursor-pointer"
                title="Click to view complete Screener dashboard for this stock"
              >
                {columns.map((cKey) => {
                  const def = findMetric(cKey);
                  const rawVal = (row as any)[cKey];
                  const formatted = def
                    ? formatMetricValue(rawVal, def.format, def.unit)
                    : rawVal !== null && rawVal !== undefined
                    ? String(rawVal)
                    : "—";

                  if (cKey === "symbol") {
                    return (
                      <td key={cKey} className="p-2.5 sticky left-0 bg-[var(--panel-2)] z-10 font-bold text-[var(--amber)]">
                        {row.symbol}
                      </td>
                    );
                  }

                  if (cKey === "name") {
                    return (
                      <td key={cKey} className="p-2.5 text-[var(--text)] truncate max-w-[140px]">
                        {row.name}
                      </td>
                    );
                  }

                  return (
                    <td key={cKey} className="p-2.5 text-right whitespace-nowrap text-[var(--text)]">
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-[var(--text-dim)] italic">
                  {isLoading ? "Loading 1,500+ security screening universe..." : "No companies match the current query criteria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-dim)] pt-2">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="term-btn !px-2.5 !py-0.5"
            >
              ◀ PREV
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="term-btn !px-2.5 !py-0.5"
            >
              NEXT ▶
            </button>
          </div>
        </div>
      )}

      {/* Column Customizer Modal */}
      {columnModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg w-full max-w-xl shadow-2xl p-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
              <h3 className="font-bold text-[13px] text-[var(--amber)]">Customize Screener Table Columns</h3>
              <button onClick={() => setColumnModalOpen(false)} className="text-[var(--text-dim)] hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2 text-[11px]">
              {METRIC_REGISTRY.map((m) => {
                const checked = columns.includes(m.fieldKey) || columns.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 rounded border border-[var(--border)] bg-[var(--panel-2)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const targetKey = m.fieldKey || m.id;
                        if (columns.includes(targetKey)) {
                          setColumns(columns.filter((c) => c !== targetKey));
                        } else {
                          setColumns([...columns, targetKey]);
                        }
                      }}
                      className="accent-[var(--amber)]"
                    />
                    <span className="truncate">{m.displayName}</span>
                  </label>
                );
              })}
            </div>
            <div className="pt-3 border-t border-[var(--border)] mt-3 flex justify-end">
              <button
                onClick={() => setColumnModalOpen(false)}
                className="term-btn !px-4 !py-1 bg-[var(--amber)] text-black font-bold"
              >
                SAVE COLUMNS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
