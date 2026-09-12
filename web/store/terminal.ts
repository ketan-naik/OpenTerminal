"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WidgetType =
  | "quote"
  | "chart"
  | "watchlist"
  | "news"
  | "heatmap"
  | "screener"
  | "screener-dashboard"
  | "crypto"
  | "macro"
  | "options"
  | "portfolio"
  | "ai"
  | "calendar"
  | "insider"
  | "tv"
  | "recap"
  | "research";

export type WidgetInstance = {
  id: string;
  type: WidgetType;
  symbol?: string;
  linked: boolean; // follows the globally active symbol
};

export type LayoutItem = { i: string; x: number; y: number; w: number; h: number };

export type PresetName =
  | "master"
  | "screener"
  | "research"
  | "daytrader"
  | "macro"
  | "options"
  | "crypto"
  | "earnings"
  | "portfolio"
  | "media"
  | "default"
  | "all";

export type PresetMeta = {
  id: PresetName;
  label: string;
  icon: string;
  category: string;
  description: string;
  widgetCount: number;
};

export const PRESET_METAS: PresetMeta[] = [
  {
    id: "master",
    label: "Master Terminal",
    icon: "★",
    category: "Full Board",
    description: "All 17 widgets arranged symmetrically across a master command center",
    widgetCount: 17,
  },
  {
    id: "screener",
    label: "Screener & Fundamentals",
    icon: "🔍",
    category: "Institutional",
    description: "Complete fundamental analysis & stock screening workspace (Screener.in depth with 10Y financials & query engine)",
    widgetCount: 3,
  },
  {
    id: "research",
    label: "Hedge Fund Research",
    icon: "🏛️",
    category: "Institutional",
    description: "Institutional CIO equity research workstation with DCF models, reverse expectations & AI committee",
    widgetCount: 3,
  },
  {
    id: "daytrader",
    label: "Day Trader Pro",
    icon: "📈",
    category: "Equities",
    description: "Candlestick charts, quote snapshots, watchlists, live news & heatmap",
    widgetCount: 5,
  },
  {
    id: "macro",
    label: "Global Macro",
    icon: "🌐",
    category: "Macro & FX",
    description: "Yield curves, central bank rates, gold/oil, FX risk & economic calendar",
    widgetCount: 5,
  },
  {
    id: "options",
    label: "Derivatives & Vol",
    icon: "⚡",
    category: "Options",
    description: "Option chain strike matrix, underlying chart, quote & watchlist",
    widgetCount: 4,
  },
  {
    id: "crypto",
    label: "Crypto & Web3",
    icon: "🪙",
    category: "Crypto",
    description: "Live crypto tickers, Bitcoin charting, crypto news & AI analyst",
    widgetCount: 4,
  },
  {
    id: "earnings",
    label: "Earnings & Value",
    icon: "📑",
    category: "Fundamentals",
    description: "Stock screener, earnings calendar, SEC insider transactions & quote",
    widgetCount: 4,
  },
  {
    id: "portfolio",
    label: "Portfolio & Assets",
    icon: "💼",
    category: "Wealth",
    description: "Paper portfolio tracker, watchlist, market recap & AI analyst",
    widgetCount: 5,
  },
  {
    id: "media",
    label: "Newsroom & TV",
    icon: "📺",
    category: "Broadcast",
    description: "Live financial TV stream, global newsfeed, recap & sector heatmap",
    widgetCount: 4,
  },
];

type TerminalState = {
  theme: "dark" | "light";
  activeSymbol: string;
  activePreset: string;
  widgets: WidgetInstance[];
  layout: LayoutItem[];
  watchlist: string[];
  commandOpen: boolean;
  highlightedWidgetId: string | null;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setActiveSymbol: (s: string) => void;
  setCommandOpen: (open: boolean) => void;
  setHighlightedWidgetId: (id: string | null) => void;
  openSoloWidget: (type: WidgetType, symbol?: string) => void;
  focusOrAddWidget: (type: WidgetType, symbol?: string) => string;
  addWidget: (type: WidgetType, symbol?: string) => void;
  removeWidget: (id: string) => void;
  setWidgetSymbol: (id: string, symbol: string) => void;
  toggleLinked: (id: string) => void;
  setLayout: (layout: LayoutItem[]) => void;
  addToWatchlist: (s: string) => void;
  removeFromWatchlist: (s: string) => void;
  loadPreset: (name: PresetName) => void;
  resetWorkspace: () => void;
};

const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: "w-chart", type: "chart", linked: true },
  { id: "w-quote", type: "quote", linked: true },
  { id: "w-watchlist", type: "watchlist", linked: false },
  { id: "w-macro", type: "macro", linked: false },
  { id: "w-news", type: "news", linked: true },
  { id: "w-options", type: "options", linked: true },
  { id: "w-heatmap", type: "heatmap", linked: false },
  { id: "w-crypto", type: "crypto", linked: false },
  { id: "w-ai", type: "ai", linked: false },
  { id: "w-screener", type: "screener", linked: false },
  { id: "w-calendar", type: "calendar", linked: false },
  { id: "w-portfolio", type: "portfolio", linked: false },
  { id: "w-insider", type: "insider", linked: true },
  { id: "w-tv", type: "tv", linked: false },
  { id: "w-recap", type: "recap", linked: false },
  { id: "w-research", type: "research", linked: true },
  { id: "w-screener-dash", type: "screener-dashboard", linked: true },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  // 1. Primary Command Center: Candlestick Chart (7), Quote (5), Watchlist (5)
  { i: "w-chart", x: 0, y: 0, w: 7, h: 10 },
  { i: "w-quote", x: 7, y: 0, w: 5, h: 5 },
  { i: "w-watchlist", x: 7, y: 5, w: 5, h: 5 },

  // 2. Global Macro Risk Pulse & Real-Time Financial News
  { i: "w-macro", x: 0, y: 10, w: 6, h: 8 },
  { i: "w-news", x: 6, y: 10, w: 6, h: 8 },

  // 3. Option Chain Matrix & Sector Heatmap
  { i: "w-options", x: 0, y: 18, w: 7, h: 8 },
  { i: "w-heatmap", x: 7, y: 18, w: 5, h: 8 },

  // 4. Crypto Market Board & AI Financial Analyst
  { i: "w-crypto", x: 0, y: 26, w: 6, h: 8 },
  { i: "w-ai", x: 6, y: 26, w: 6, h: 8 },

  // 5. Stock Screener & Economic Calendar
  { i: "w-screener", x: 0, y: 34, w: 7, h: 8 },
  { i: "w-calendar", x: 7, y: 34, w: 5, h: 8 },

  // 6. Portfolio Holdings & SEC Insider Transactions
  { i: "w-portfolio", x: 0, y: 42, w: 6, h: 8 },
  { i: "w-insider", x: 6, y: 42, w: 6, h: 8 },

  // 7. Live Financial TV Stream & Market Day Recap
  { i: "w-tv", x: 0, y: 50, w: 6, h: 8 },
  { i: "w-recap", x: 6, y: 50, w: 6, h: 8 },

  // 8. Hedge Fund Research Workstation (Institutional CIO Deep-Dive)
  { i: "w-research", x: 0, y: 58, w: 12, h: 14 },

  // 9. Screener Dashboard Workspace (Screener.in Depth & Stock Screening)
  { i: "w-screener-dash", x: 0, y: 72, w: 12, h: 16 },
];

const PRESETS: Record<PresetName, { widgets: WidgetInstance[]; layout: LayoutItem[] }> = {
  master: {
    widgets: DEFAULT_WIDGETS,
    layout: DEFAULT_LAYOUT,
  },
  default: {
    widgets: DEFAULT_WIDGETS,
    layout: DEFAULT_LAYOUT,
  },
  all: {
    widgets: DEFAULT_WIDGETS,
    layout: DEFAULT_LAYOUT,
  },
  screener: {
    widgets: [
      { id: "w-sd-1", type: "screener-dashboard", linked: true },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-chart-1", type: "chart", linked: true },
    ],
    layout: [
      { i: "w-sd-1", x: 0, y: 0, w: 8, h: 16 },
      { i: "w-quote-1", x: 8, y: 0, w: 4, h: 5 },
      { i: "w-chart-1", x: 8, y: 5, w: 4, h: 11 },
    ],
  },
  research: {
    widgets: [
      { id: "w-res-1", type: "research", linked: true },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-chart-1", type: "chart", linked: true },
    ],
    layout: [
      { i: "w-res-1", x: 0, y: 0, w: 8, h: 14 },
      { i: "w-quote-1", x: 8, y: 0, w: 4, h: 5 },
      { i: "w-chart-1", x: 8, y: 5, w: 4, h: 9 },
    ],
  },
  daytrader: {
    widgets: [
      { id: "w-chart-1", type: "chart", linked: true },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-watch-1", type: "watchlist", linked: false },
      { id: "w-news-1", type: "news", linked: true },
      { id: "w-heat-1", type: "heatmap", linked: false },
    ],
    layout: [
      { i: "w-chart-1", x: 0, y: 0, w: 8, h: 11 },
      { i: "w-quote-1", x: 8, y: 0, w: 4, h: 5 },
      { i: "w-watch-1", x: 8, y: 5, w: 4, h: 6 },
      { i: "w-news-1", x: 0, y: 11, w: 6, h: 8 },
      { i: "w-heat-1", x: 6, y: 11, w: 6, h: 8 },
    ],
  },
  macro: {
    widgets: [
      { id: "w-macro-1", type: "macro", linked: false },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-cal-1", type: "calendar", linked: false },
      { id: "w-news-1", type: "news", linked: true },
      { id: "w-heat-1", type: "heatmap", linked: false },
    ],
    layout: [
      { i: "w-macro-1", x: 0, y: 0, w: 7, h: 10 },
      { i: "w-quote-1", x: 7, y: 0, w: 5, h: 5 },
      { i: "w-cal-1", x: 7, y: 5, w: 5, h: 5 },
      { i: "w-news-1", x: 0, y: 10, w: 7, h: 8 },
      { i: "w-heat-1", x: 7, y: 10, w: 5, h: 8 },
    ],
  },
  options: {
    widgets: [
      { id: "w-opt-1", type: "options", linked: true },
      { id: "w-chart-1", type: "chart", linked: true },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-watch-1", type: "watchlist", linked: false },
    ],
    layout: [
      { i: "w-opt-1", x: 0, y: 0, w: 12, h: 9 },
      { i: "w-chart-1", x: 0, y: 9, w: 7, h: 9 },
      { i: "w-quote-1", x: 7, y: 9, w: 5, h: 4 },
      { i: "w-watch-1", x: 7, y: 13, w: 5, h: 5 },
    ],
  },
  crypto: {
    widgets: [
      { id: "w-crypto-1", type: "crypto", linked: false },
      { id: "w-chart-1", type: "chart", symbol: "BTCUSDT", linked: false },
      { id: "w-news-1", type: "news", linked: false },
      { id: "w-ai-1", type: "ai", linked: false },
    ],
    layout: [
      { i: "w-crypto-1", x: 0, y: 0, w: 6, h: 9 },
      { i: "w-chart-1", x: 6, y: 0, w: 6, h: 9 },
      { i: "w-news-1", x: 0, y: 9, w: 6, h: 8 },
      { i: "w-ai-1", x: 6, y: 9, w: 6, h: 8 },
    ],
  },
  earnings: {
    widgets: [
      { id: "w-screen-1", type: "screener", linked: false },
      { id: "w-cal-1", type: "calendar", linked: false },
      { id: "w-insider-1", type: "insider", linked: true },
      { id: "w-quote-1", type: "quote", linked: true },
    ],
    layout: [
      { i: "w-screen-1", x: 0, y: 0, w: 7, h: 9 },
      { i: "w-cal-1", x: 7, y: 0, w: 5, h: 9 },
      { i: "w-insider-1", x: 0, y: 9, w: 6, h: 8 },
      { i: "w-quote-1", x: 6, y: 9, w: 6, h: 8 },
    ],
  },
  portfolio: {
    widgets: [
      { id: "w-port-1", type: "portfolio", linked: false },
      { id: "w-watch-1", type: "watchlist", linked: false },
      { id: "w-quote-1", type: "quote", linked: true },
      { id: "w-ai-1", type: "ai", linked: false },
      { id: "w-recap-1", type: "recap", linked: false },
    ],
    layout: [
      { i: "w-port-1", x: 0, y: 0, w: 7, h: 9 },
      { i: "w-watch-1", x: 7, y: 0, w: 5, h: 5 },
      { i: "w-quote-1", x: 7, y: 5, w: 5, h: 4 },
      { i: "w-ai-1", x: 0, y: 9, w: 6, h: 8 },
      { i: "w-recap-1", x: 6, y: 9, w: 6, h: 8 },
    ],
  },
  media: {
    widgets: [
      { id: "w-tv-1", type: "tv", linked: false },
      { id: "w-news-1", type: "news", linked: true },
      { id: "w-recap-1", type: "recap", linked: false },
      { id: "w-heat-1", type: "heatmap", linked: false },
    ],
    layout: [
      { i: "w-tv-1", x: 0, y: 0, w: 6, h: 10 },
      { i: "w-news-1", x: 6, y: 0, w: 6, h: 10 },
      { i: "w-recap-1", x: 0, y: 10, w: 6, h: 8 },
      { i: "w-heat-1", x: 6, y: 10, w: 6, h: 8 },
    ],
  },
};

const SIZE_BY_TYPE: Record<WidgetType, { w: number; h: number }> = {
  quote: { w: 5, h: 5 },
  chart: { w: 7, h: 10 },
  watchlist: { w: 4, h: 5 },
  news: { w: 5, h: 6 },
  heatmap: { w: 7, h: 8 },
  screener: { w: 12, h: 8 },
  "screener-dashboard": { w: 12, h: 14 },
  crypto: { w: 6, h: 8 },
  macro: { w: 6, h: 8 },
  options: { w: 12, h: 8 },
  portfolio: { w: 7, h: 7 },
  ai: { w: 5, h: 8 },
  calendar: { w: 12, h: 9 },
  insider: { w: 7, h: 7 },
  tv: { w: 6, h: 9 },
  recap: { w: 5, h: 9 },
  research: { w: 12, h: 14 },
};

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      activeSymbol: "AAPL",
      activePreset: "master",
      widgets: DEFAULT_WIDGETS,
      layout: DEFAULT_LAYOUT,
      watchlist: ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY"],
      commandOpen: false,
      highlightedWidgetId: null,
      toggleTheme: () => set((st) => ({ theme: st.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),
      setActiveSymbol: (s) => set({ activeSymbol: s.toUpperCase() }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      setHighlightedWidgetId: (id) => set({ highlightedWidgetId: id }),
      openSoloWidget: (type, symbol) => {
        const id = `w-${type}`;
        const widget: WidgetInstance = { id, type, symbol, linked: !symbol };
        // Full width 12 cols, tall comfortable height (e.g. 26-32 rows) for reading
        const h = type === "screener-dashboard" || type === "research" ? 32 : type === "chart" ? 24 : 22;
        const layout: LayoutItem[] = [{ i: id, x: 0, y: 0, w: 12, h }];
        set({
          widgets: [widget],
          layout,
          activePreset: `solo-${type}`,
          highlightedWidgetId: id,
        });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => {
            set((curr) => (curr.highlightedWidgetId === id ? { highlightedWidgetId: null } : {}));
          }, 2000);
        }
      },
      focusOrAddWidget: (type, symbol) => {
        const st = get();
        const existing = st.widgets.find((w) => w.type === type);
        if (existing) {
          set({ highlightedWidgetId: existing.id });
          if (typeof window !== "undefined") {
            setTimeout(() => {
              const el = document.getElementById(`widget-container-${existing.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
              }
            }, 50);
            setTimeout(() => {
              set((curr) => (curr.highlightedWidgetId === existing.id ? { highlightedWidgetId: null } : {}));
            }, 2000);
          }
          return existing.id;
        }

        const id = `w-${type}-${Date.now()}`;
        const size = SIZE_BY_TYPE[type] || { w: 6, h: 8 };
        const maxY = st.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
        set({
          widgets: [...st.widgets, { id, type, symbol, linked: !symbol }],
          layout: [...st.layout, { i: id, x: 0, y: maxY, ...size }],
          highlightedWidgetId: id,
          activePreset: "custom",
        });
        if (typeof window !== "undefined") {
          setTimeout(() => {
            const el = document.getElementById(`widget-container-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }
          }, 100);
          setTimeout(() => {
            set((curr) => (curr.highlightedWidgetId === id ? { highlightedWidgetId: null } : {}));
          }, 2000);
        }
        return id;
      },
      addWidget: (type, symbol) =>
        set((st) => {
          const id = `w-${type}-${Date.now()}`;
          const size = SIZE_BY_TYPE[type];
          const maxY = st.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
          return {
            widgets: [...st.widgets, { id, type, symbol, linked: !symbol }],
            layout: [...st.layout, { i: id, x: 0, y: maxY, ...size }],
            activePreset: "custom",
          };
        }),
      removeWidget: (id) =>
        set((st) => ({
          widgets: st.widgets.filter((w) => w.id !== id),
          layout: st.layout.filter((l) => l.i !== id),
          activePreset: "custom",
        })),
      setWidgetSymbol: (id, symbol) =>
        set((st) => ({
          widgets: st.widgets.map((w) => (w.id === id ? { ...w, symbol: symbol.toUpperCase(), linked: false } : w)),
        })),
      toggleLinked: (id) =>
        set((st) => ({
          widgets: st.widgets.map((w) => (w.id === id ? { ...w, linked: !w.linked } : w)),
        })),
      setLayout: (layout) =>
        set((st) => {
          if (
            st.layout.length === layout.length &&
            st.layout.every((a, idx) => {
              const b = layout[idx];
              return b && a.i === b.i && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
            })
          ) {
            return st;
          }
          return { layout };
        }),
      addToWatchlist: (s) =>
        set((st) => ({
          watchlist: st.watchlist.includes(s.toUpperCase()) ? st.watchlist : [...st.watchlist, s.toUpperCase()],
        })),
      removeFromWatchlist: (s) => set((st) => ({ watchlist: st.watchlist.filter((x) => x !== s) })),
      loadPreset: (name) => {
        const preset = PRESETS[name];
        if (preset) {
          set({ activePreset: name, widgets: preset.widgets, layout: preset.layout });
        }
      },
      resetWorkspace: () => set({ activePreset: "master", widgets: DEFAULT_WIDGETS, layout: DEFAULT_LAYOUT }),
    }),
    {
      name: "openterminal-workspace",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!version || version < 2 || !persistedState?.widgets || persistedState.widgets.length < 10) {
          return {
            ...persistedState,
            widgets: DEFAULT_WIDGETS,
            layout: DEFAULT_LAYOUT,
          };
        }
        return persistedState;
      },
    }
  )
);

/** Symbol a widget should display: its own, or the active one when linked. */
export function useWidgetSymbol(widget: WidgetInstance): string {
  const active = useTerminal((s) => s.activeSymbol);
  return widget.linked ? active : widget.symbol ?? active;
}
