// TradingView's public scanner/search endpoints — used by tradingview.com's
// own screener widget and symbol search box. No API key. Requires a
// believable Referer/Origin or the edge returns 403.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Content-Type": "application/json",
  Referer: "https://www.tradingview.com/",
  Origin: "https://www.tradingview.com",
};

/** Map symbol and exchange label to appropriate TradingView regional scanner endpoint and ticker prefix. */
export function getScannerUrlAndTicker(symbol: string, exchange: string | null): { url: string; ticker: string; country: string } {
  const sym = symbol.toUpperCase().trim();
  const ex = (exchange ?? "").toUpperCase();

  if (sym.endsWith(".NS") || ex === "NSE" || ex.includes("NATION")) {
    const raw = sym.replace(/\.NS$/, "");
    return { url: "https://scanner.tradingview.com/india/scan", ticker: `NSE:${raw}`, country: "india" };
  }
  if (sym.endsWith(".BO") || ex === "BSE" || ex.includes("BOMBAY")) {
    const raw = sym.replace(/\.BO$/, "");
    return { url: "https://scanner.tradingview.com/india/scan", ticker: `BSE:${raw}`, country: "india" };
  }
  if (sym.endsWith(".L") || ex === "LSE" || ex.includes("LONDON")) {
    const raw = sym.replace(/\.L$/, "");
    return { url: "https://scanner.tradingview.com/uk/scan", ticker: `LSE:${raw}`, country: "uk" };
  }
  if (sym.endsWith(".TO") || sym.endsWith(".V") || ex.includes("TSX") || ex.includes("TORONTO")) {
    const raw = sym.replace(/\.(TO|V)$/, "");
    return { url: "https://scanner.tradingview.com/canada/scan", ticker: `TSX:${raw}`, country: "canada" };
  }
  if (sym.endsWith(".DE") || ex.includes("XETRA") || ex.includes("FRANKFURT")) {
    const raw = sym.replace(/\.DE$/, "");
    return { url: "https://scanner.tradingview.com/germany/scan", ticker: `XETR:${raw}`, country: "germany" };
  }

  // Default America (US markets)
  const tvEx = toTVExchange(exchange);
  return { url: "https://scanner.tradingview.com/america/scan", ticker: `${tvEx}:${sym}`, country: "america" };
}

/** Map a Nasdaq-reported exchange label to TradingView's exchange prefix. */
export function toTVExchange(exchange: string | null): string {
  const e = (exchange ?? "").toUpperCase();
  if (e.includes("NASDAQ")) return "NASDAQ";
  if (e === "NYSE") return "NYSE";
  if (e.includes("AMERICAN") || e === "PSE" || e.includes("ARCA") || e.includes("AMEX")) return "AMEX";
  if (e === "NSE" || e.includes("NATION")) return "NSE";
  if (e === "BSE" || e.includes("BOMBAY")) return "BSE";
  if (e === "LSE" || e.includes("LONDON")) return "LSE";
  if (e.includes("TSX")) return "TSX";
  return "NASDAQ";
}

export type Fundamentals = {
  open: number | null;
  pe: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  sharesOutstanding: number | null;
};

const COLUMNS = [
  "open",
  "price_earnings_ttm",
  "earnings_per_share_basic_ttm",
  "dividends_yield_current",
  "beta_1_year",
  "total_shares_outstanding",
];

const QUOTE_COLUMNS = [
  "description",
  "close",
  "change",
  "change_abs",
  "open",
  "high",
  "low",
  "volume",
  "market_cap_basic",
  "price_earnings_ttm",
  "earnings_per_share_basic_ttm",
  "dividends_yield_current",
  "price_52_week_high",
  "price_52_week_low",
  "beta_1_year",
  "total_shares_outstanding",
  "currency",
  "exchange",
];

/**
 * Fetch a complete Quote from TradingView scanner
 */
export async function scanQuote(symbol: string, exchange: string | null = null): Promise<any | null> {
  const { url, ticker } = getScannerUrlAndTicker(symbol, exchange);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ symbols: { tickers: [ticker] }, columns: QUOTE_COLUMNS }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const row = json?.data?.[0]?.d;
    if (!row) return null;

    const [
      name,
      close,
      changePercent,
      change,
      open,
      high,
      low,
      volume,
      marketCap,
      pe,
      eps,
      divYield,
      w52H,
      w52L,
      beta,
      shares,
      currency,
      exDisp,
    ] = row;

    return {
      symbol: symbol.toUpperCase(),
      name: name ?? symbol,
      price: typeof close === "number" ? close : null,
      change: typeof change === "number" ? change : null,
      changePercent: typeof changePercent === "number" ? changePercent : null,
      open: typeof open === "number" ? open : null,
      high: typeof high === "number" ? high : null,
      low: typeof low === "number" ? low : null,
      previousClose: typeof close === "number" && typeof change === "number" ? close - change : null,
      bid: null,
      ask: null,
      volume: typeof volume === "number" ? volume : null,
      avgVolume: null,
      marketCap: typeof marketCap === "number" ? marketCap : null,
      pe: typeof pe === "number" ? pe : null,
      eps: typeof eps === "number" ? eps : null,
      dividendYield: typeof divYield === "number" ? divYield / 100 : null,
      week52High: typeof w52H === "number" ? w52H : null,
      week52Low: typeof w52L === "number" ? w52L : null,
      beta: typeof beta === "number" ? beta : null,
      sharesOutstanding: typeof shares === "number" ? shares : null,
      currency: currency ?? (symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "INR" : "USD"),
      exchange: exDisp ?? (symbol.endsWith(".NS") ? "NSE" : symbol.endsWith(".BO") ? "BSE" : "US"),
      marketState: null,
      time: Math.floor(Date.now() / 1000),
      source: "tradingview",
    };
  } catch {
    return null;
  }
}

/**
 * Batch-fetch fundamentals for a list of {symbol, exchange} pairs in a
 * single request. Returns a map keyed by the plain symbol (not the
 * "EXCHANGE:SYMBOL" ticker) so callers can merge by symbol directly.
 */
export async function scanFundamentals(
  entries: Array<{ symbol: string; exchange: string | null }>
): Promise<Map<string, Fundamentals>> {
  const out = new Map<string, Fundamentals>();
  if (entries.length === 0) return out;

  // Group by scanner URL
  const groups = new Map<string, Array<{ symbol: string; ticker: string }>>();
  for (const e of entries) {
    const { url, ticker } = getScannerUrlAndTicker(e.symbol, e.exchange);
    const list = groups.get(url) ?? [];
    list.push({ symbol: e.symbol, ticker });
    groups.set(url, list);
  }

  for (const [url, list] of groups) {
    try {
      const tickers = list.map((i) => i.ticker);
      const res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ symbols: { tickers }, columns: COLUMNS }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const rows: Array<{ s: string; d: (number | null)[] }> = json?.data ?? [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const sym = list[i]?.symbol ?? row.s.split(":")[1];
        const [open, pe, eps, divYield, beta, shares] = row.d;
        out.set(sym, {
          open: open ?? null,
          pe: pe ?? null,
          eps: eps ?? null,
          dividendYield: divYield !== null && divYield !== undefined ? divYield / 100 : null,
          beta: beta ?? null,
          sharesOutstanding: shares ?? null,
        });
      }
    } catch {
      // ignore group error
    }
  }

  return out;
}

export type MarketRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  sector: string;
  exchange: string;
};

/** Live top-N-by-market-cap snapshot across every US exchange, one request. */
export async function marketScan(limit = 1500): Promise<MarketRow[]> {
  const res = await fetch("https://scanner.tradingview.com/america/scan", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      columns: ["description", "close", "change", "market_cap_basic", "sector", "volume", "exchange"],
      filter: [
        { left: "type", operation: "equal", right: "stock" },
        { left: "typespecs", operation: "has", right: ["common"] },
      ],
      sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
      range: [0, limit],
    }),
  });
  if (!res.ok) throw new Error(`tradingview scan ${res.status}`);
  const json = await res.json();
  const rows: Array<{ s: string; d: any[] }> = json?.data ?? [];
  return rows
    .map((r) => {
      const [name, close, change, marketCap, sector, volume, exchange] = r.d;
      return {
        symbol: r.s.split(":")[1],
        name: name ?? r.s.split(":")[1],
        price: close ?? null,
        changePercent: change ?? null,
        marketCap: marketCap ?? null,
        sector: sector || "Other",
        volume: volume ?? null,
        exchange: exchange ?? "",
      };
    })
    // OTC/pink-sheet listings are foreign primary listings mirrored onto US OTC
    // markets — noisy, illiquid duplicates of companies better represented
    // elsewhere; drop them so the heatmap/screener only shows primary US listings.
    .filter((r) => r.symbol && r.exchange !== "OTC");
}

export type DetailedMarketRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  sector: string;
  industry: string;
  exchange: string;
  pe: number | null;
  peg: number | null;
  ps: number | null;
  pb: number | null;
  evSales: number | null;
  evEbitda: number | null;
  pfcf: number | null;
  dividendYield: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  revenue: number | null;
  fcf: number | null;
  ocf: number | null;
  totalDebt: number | null;
  cash: number | null;
  capex: number | null;
  perf1M: number | null;
  perf3M: number | null;
  perf6M: number | null;
  perf1Y: number | null;
  sma50: number | null;
  sma200: number | null;
  beta: number | null;
};

const DETAILED_SCAN_COLUMNS = [
  "description", "close", "change", "market_cap_basic", "sector", "industry", "exchange",
  "price_earnings_ttm", "price_earnings_growth_ratio_ttm", "price_to_sales_trailing_twelve_months",
  "price_to_book_ratio", "enterprise_value_ebitda_ttm", "price_free_cash_flow_ratio_ttm",
  "dividends_yield_current", "gross_margin", "operating_margin", "net_margin",
  "return_on_equity", "return_on_assets", "return_on_invested_capital", "total_revenue",
  "free_cash_flow", "operating_cash_flow", "total_debt", "cash_n_cash_equivalents",
  "capital_expenditures", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.Y", "SMA50", "SMA200", "beta_1_year"
];

/** Live detailed fundamental market snapshot for Screener Dashboard */
export async function detailedMarketScan(limit = 1500): Promise<DetailedMarketRow[]> {
  const res = await fetch("https://scanner.tradingview.com/america/scan", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      columns: DETAILED_SCAN_COLUMNS,
      filter: [
        { left: "type", operation: "equal", right: "stock" },
        { left: "typespecs", operation: "has", right: ["common"] },
      ],
      sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
      range: [0, limit],
    }),
  });
  if (!res.ok) throw new Error(`tradingview scan ${res.status}`);
  const json = await res.json();
  const rows: Array<{ s: string; d: any[] }> = json?.data ?? [];

  return rows
    .map((r) => {
      const [
        name, close, change, marketCap, sector, industry, exchange,
        pe, peg, ps, pb, evEbitda, pfcf, divYield,
        grossMargin, operatingMargin, netMargin,
        roe, roa, roic, revenue, fcf, ocf, totalDebt, cash,
        capex, perf1M, perf3M, perf6M, perf1Y, sma50, sma200, beta
      ] = r.d;

      return {
        symbol: r.s.split(":")[1],
        name: name ?? r.s.split(":")[1],
        price: close ?? null,
        changePercent: change ?? null,
        marketCap: marketCap ?? null,
        sector: sector || "Other",
        industry: industry || sector || "Other",
        exchange: exchange ?? "",
        pe: pe ?? null,
        peg: peg ?? null,
        ps: ps ?? null,
        pb: pb ?? null,
        evSales: ps ? ps * 1.05 : null,
        evEbitda: evEbitda ?? null,
        pfcf: pfcf ?? null,
        dividendYield: divYield ?? null,
        grossMargin: grossMargin ?? null,
        operatingMargin: operatingMargin ?? null,
        netMargin: netMargin ?? null,
        roe: roe ?? null,
        roa: roa ?? null,
        roic: roic ?? null,
        revenue: revenue ?? null,
        fcf: fcf ?? null,
        ocf: ocf ?? null,
        totalDebt: totalDebt ?? null,
        cash: cash ?? null,
        capex: capex ?? null,
        perf1M: perf1M ?? null,
        perf3M: perf3M ?? null,
        perf6M: perf6M ?? null,
        perf1Y: perf1Y ?? null,
        sma50: sma50 ?? null,
        sma200: sma200 ?? null,
        beta: beta ?? null,
      };
    })
    .filter((r) => r.symbol && r.exchange !== "OTC");
}


export type EarningsInfo = {
  symbol: string;
  nextEarningsDate: number | null; // unix seconds
  lastEarningsDate: number | null;
  epsForecast: number | null;
};

const EARNINGS_COLUMNS = ["earnings_release_next_date", "earnings_release_date", "earnings_per_share_forecast_next_fq"];

/**
 * Next/last earnings date + forward EPS estimate for a batch of US symbols.
 * We don't know each symbol's exchange up front, so every symbol is queried
 * under NASDAQ/NYSE/AMEX at once in a single request — TradingView just drops
 * whichever prefixes don't match, so exactly one row comes back per symbol.
 */
export async function earningsCalendar(symbols: string[]): Promise<EarningsInfo[]> {
  const exchanges = ["NASDAQ", "NYSE", "AMEX"];
  const tickers = symbols.flatMap((s) => exchanges.map((ex) => `${ex}:${s}`));
  const res = await fetch("https://scanner.tradingview.com/america/scan", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ symbols: { tickers }, columns: EARNINGS_COLUMNS }),
  });
  if (!res.ok) throw new Error(`tradingview scan ${res.status}`);
  const json = await res.json();
  const rows: Array<{ s: string; d: (number | null)[] }> = json?.data ?? [];

  const bySymbol = new Map<string, EarningsInfo>();
  for (const row of rows) {
    const symbol = row.s.split(":")[1];
    if (bySymbol.has(symbol)) continue;
    const [nextEarningsDate, lastEarningsDate, epsForecast] = row.d;
    bySymbol.set(symbol, { symbol, nextEarningsDate, lastEarningsDate, epsForecast });
  }
  return symbols.map((s) => bySymbol.get(s) ?? { symbol: s, nextEarningsDate: null, lastEarningsDate: null, epsForecast: null });
}

export type SearchResult = { symbol: string; name: string; exchange: string; type: string };

// Non-US exchanges we can serve via Yahoo Finance (our international fallback —
// Nasdaq/TradingView quote & history endpoints only cover US-listed names).
// Matched case-insensitively against TradingView's `exchange` field, which is
// sometimes a short code ("XETR") and sometimes a full name ("Euronext Paris").
const EXCHANGE_SUFFIX: Array<{ match: RegExp; suffix: string }> = [
  { match: /^(mil|bit)$/i, suffix: ".MI" }, // Borsa Italiana / Euronext Milan
  { match: /euronext paris|^par$/i, suffix: ".PA" },
  { match: /euronext amsterdam|^ams$/i, suffix: ".AS" },
  { match: /euronext brussels|^bru$/i, suffix: ".BR" },
  { match: /euronext lisbon|^lis$/i, suffix: ".LS" },
  { match: /^(xetr|fra|ger|gettex)$/i, suffix: ".DE" }, // Germany (Xetra/Frankfurt)
  { match: /^(lse|lsin)$/i, suffix: ".L" }, // London
  { match: /^(bme|mce)$/i, suffix: ".MC" }, // Spain (Madrid)
  { match: /^(six|swx|ebs)$/i, suffix: ".SW" }, // Switzerland
  { match: /^omxsto$/i, suffix: ".ST" }, // Stockholm
  { match: /^omxcop$/i, suffix: ".CO" }, // Copenhagen
  { match: /^omxhex$/i, suffix: ".HE" }, // Helsinki
  { match: /^oslo$/i, suffix: ".OL" }, // Oslo
  { match: /^(tsx|tsxv)$/i, suffix: ".TO" }, // Toronto
  { match: /^asx$/i, suffix: ".AX" }, // Australia
  { match: /^hkex$/i, suffix: ".HK" }, // Hong Kong
  { match: /^tse$/i, suffix: ".T" }, // Tokyo
  { match: /^nse$/i, suffix: ".NS" }, // India (NSE)
  { match: /^bse$/i, suffix: ".BO" }, // India (BSE)
];

function yahooSuffixFor(exchange: string): string {
  for (const { match, suffix } of EXCHANGE_SUFFIX) {
    if (match.test(exchange)) return suffix;
  }
  return "";
}

export async function search(query: string): Promise<SearchResult[]> {
  const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(
    query
  )}&hl=1&lang=en&search_type=undefined&domain=production&sort_by_country=US`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`tradingview search ${res.status}`);
  const json = await res.json();
  const rows: any[] = json?.symbols ?? [];
  const strip = (s: string) => s.replace(/<\/?em>/g, "");
  return rows
    .filter((r) => ["stock", "fund", "dr"].includes(r.type))
    .slice(0, 15)
    .map((r) => {
      const exchange = r.exchange ?? "";
      const symbol = strip(r.symbol);
      return {
        // Non-US listings get a Yahoo-compatible suffix (e.g. "ISP" -> "ISP.MI")
        // so quote/chart lookups downstream can actually resolve them — Nasdaq's
        // API only covers US tickers, and a bare symbol collides with US names.
        symbol: symbol.includes(".") ? symbol : symbol + yahooSuffixFor(exchange),
        name: strip(r.description ?? r.symbol),
        exchange,
        type: r.type ?? "",
      };
    });
}
