"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet } from "../../lib/api";
import { useTerminal, useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { CompanyScreenerDossier } from "../../lib/screenerTypes";
import CompanyHeader from "./screener/CompanyHeader";
import CustomizableRatioBar from "./screener/CustomizableRatioBar";
import SummaryTab from "./screener/SummaryTab";
import AnalysisTab from "./screener/AnalysisTab";
import ChartTab from "./screener/ChartTab";
import PeersTab from "./screener/PeersTab";
import QuartersTab from "./screener/QuartersTab";
import ProfitLossTab from "./screener/ProfitLossTab";
import BalanceSheetTab from "./screener/BalanceSheetTab";
import CashFlowTab from "./screener/CashFlowTab";
import RatiosTab from "./screener/RatiosTab";
import OwnershipTab from "./screener/OwnershipTab";
import DocumentsTab from "./screener/DocumentsTab";
import ScreenerTab from "./screener/ScreenerTab";
import CIOExceptionTab from "./screener/CIOExceptionTab";
import CompareModal from "./screener/CompareModal";

type TabId =
  | "summary"
  | "chart"
  | "analysis"
  | "peers"
  | "quarters"
  | "profitloss"
  | "balancesheet"
  | "cashflow"
  | "ratios"
  | "ownership"
  | "documents"
  | "screener"
  | "cio";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "summary", label: "SUMMARY", icon: "📋" },
  { id: "chart", label: "CHART", icon: "📈" },
  { id: "analysis", label: "PROS & CONS", icon: "🔬" },
  { id: "peers", label: "PEERS", icon: "👥" },
  { id: "quarters", label: "QUARTERS", icon: "📊" },
  { id: "profitloss", label: "P&L (10Y)", icon: "📈" },
  { id: "balancesheet", label: "BALANCE SHEET", icon: "🛡" },
  { id: "cashflow", label: "CASH FLOW", icon: "💵" },
  { id: "ratios", label: "RATIOS", icon: "📐" },
  { id: "ownership", label: "OWNERSHIP", icon: "👥" },
  { id: "documents", label: "DOCUMENTS", icon: "📑" },
  { id: "screener", label: "SCREENER ENGINE", icon: "🔍" },
  { id: "cio", label: "CIO RESEARCH", icon: "🏛️" },
];

export default function ScreenerDashboardWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const addToWatchlist = useTerminal((s) => s.addToWatchlist);
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Fetch complete company fundamental dossier
  const { data: dossier, isLoading, error } = useQuery({
    queryKey: ["screener_dossier", symbol],
    queryFn: () => apiGet<CompanyScreenerDossier>(`/api/screener-dashboard/company/${symbol}`),
    staleTime: 30_000,
  });

  const exportCompanyFinancialsCSV = () => {
    if (!dossier) return;
    const { annualFinancials, profile } = dossier;
    const periods = annualFinancials.periods.map((p) => p.label);
    const header = ["Line Item", ...periods].join(",");
    const rows = annualFinancials.incomeStatement.map((r) => {
      const vals = periods.map((p) => r.values[p] ?? "");
      return [`"${r.label}"`, ...vals].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${profile.symbol}_annual_financials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--panel)] text-[var(--text)] overflow-hidden font-sans">
      {/* 1. Company Top Header */}
      {dossier?.profile ? (
        <CompanyHeader
          profile={dossier.profile}
          onOpenCompare={() => setCompareModalOpen(true)}
          onOpenCIO={() => setActiveTab("cio")}
          onExportCSV={exportCompanyFinancialsCSV}
          onAddToWatchlist={() => addToWatchlist(symbol)}
        />
      ) : (
        <div className="p-3 bg-[var(--panel-2)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[14px] text-[var(--amber)]">{symbol}</span>
            <span className="text-[11px] text-[var(--text-dim)]">Loading fundamental data...</span>
          </div>
        </div>
      )}

      {/* 2. Customizable Key Ratios Bar */}
      {dossier?.keyRatios && (
        <CustomizableRatioBar
          keyRatios={dossier.keyRatios}
          currency={dossier.profile?.currency}
          symbol={symbol}
        />
      )}

      {/* 3. Internal Navigation Tabs Bar */}
      <div className="bg-[var(--panel-2)] border-b border-[var(--border)] flex items-center gap-1 px-2 py-1 overflow-x-auto select-none shrink-0 text-[11px] font-mono">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1 rounded font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === tab.id
                ? "bg-[var(--amber)] text-black shadow-sm"
                : "text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel)]"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Active Section Content */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--panel)]">
        {isLoading && !dossier && (
          <div className="p-8 text-center text-[var(--amber)] font-mono text-[12px] animate-pulse">
            Extracting SEC XBRL filings, multi-period statements, and fundamental metrics for {symbol}...
          </div>
        )}

        {error && !dossier && (
          <div className="p-6 text-center text-rose-400 font-mono text-[12px]">
            Failed to load fundamental dossier for {symbol}. Try refreshing.
          </div>
        )}

        {dossier && (
          <>
            {activeTab === "summary" && (
              <SummaryTab dossier={dossier} onNavigateTab={(tab) => setActiveTab(tab as TabId)} />
            )}
            {activeTab === "chart" && <ChartTab symbol={symbol} />}
            {activeTab === "analysis" && <AnalysisTab dossier={dossier} />}
            {activeTab === "peers" && <PeersTab symbol={symbol} peers={dossier.peers} />}
            {activeTab === "quarters" && (
              <QuartersTab
                financials={dossier.quarterlyFinancials}
                currency={dossier.profile?.currency}
                symbol={symbol}
              />
            )}
            {activeTab === "profitloss" && (
              <ProfitLossTab
                financials={dossier.annualFinancials}
                currency={dossier.profile?.currency}
                symbol={symbol}
              />
            )}
            {activeTab === "balancesheet" && (
              <BalanceSheetTab
                financials={dossier.annualFinancials}
                currency={dossier.profile?.currency}
                symbol={symbol}
              />
            )}
            {activeTab === "cashflow" && (
              <CashFlowTab
                financials={dossier.annualFinancials}
                currency={dossier.profile?.currency}
                symbol={symbol}
              />
            )}
            {activeTab === "ratios" && <RatiosTab dossier={dossier} />}
            {activeTab === "ownership" && <OwnershipTab ownership={dossier.ownership} />}
            {activeTab === "documents" && <DocumentsTab documents={dossier.documents} symbol={symbol} />}
            {activeTab === "screener" && <ScreenerTab />}
            {activeTab === "cio" && <CIOExceptionTab symbol={symbol} />}
          </>
        )}
      </div>

      {/* Side-by-Side Compare Modal */}
      {compareModalOpen && (
        <CompareModal
          currentSymbol={symbol}
          onClose={() => setCompareModalOpen(false)}
          onSelectTicker={(sym) => {
            setActiveSymbol(sym);
            setCompareModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
