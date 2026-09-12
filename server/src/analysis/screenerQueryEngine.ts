/**
 * Stock Screener Query Engine: Lexer, Parser & AST Evaluator.
 * Parses expressions like:
 *   Market Cap > 10B AND ROIC > 15 AND Debt / Equity < 1 AND P/E < 30
 * and executes deterministic filtering against the equity universe.
 */

import { findMetric, METRIC_REGISTRY } from "./metricRegistry.js";
import { ScreenerRow, ScreenerPrebuilt } from "./screenerTypes.js";

export type TokenType = "IDENTIFIER" | "OPERATOR" | "NUMBER" | "AND" | "OR" | "LPAREN" | "RPAREN";

export type Token = {
  type: TokenType;
  value: string;
  position: number;
};

export type ASTNode =
  | {
      type: "LOGICAL";
      operator: "AND" | "OR";
      left: ASTNode;
      right: ASTNode;
    }
  | {
      type: "COMPARISON";
      metricId: string;
      fieldKey: string;
      operator: ">" | "<" | ">=" | "<=" | "=" | "!=";
      targetValue: number;
      rawMetricName: string;
    };

/**
 * Tokenize a screener query string.
 */
export function tokenizeQuery(query: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = query.length;

  while (i < len) {
    const char = query[i];

    // Skip whitespace & commas
    if (/\s|,/.test(char)) {
      i++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(", position: i });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")", position: i });
      i++;
      continue;
    }

    // Comparison Operators (>=, <=, !=, >, <, =)
    if (char === ">" || char === "<" || char === "!" || char === "=") {
      let op = char;
      if (i + 1 < len && query[i + 1] === "=") {
        op += "=";
        i++;
      }
      tokens.push({ type: "OPERATOR", value: op, position: i });
      i++;
      continue;
    }

    // Numbers with optional suffixes (10B, 500M, 2.5K, 15%, -5)
    if (/[0-9]/.test(char) || (char === "-" && i + 1 < len && /[0-9]/.test(query[i + 1]))) {
      let numStr = char;
      i++;
      while (i < len && /[0-9.\-_]/i.test(query[i])) {
        numStr += query[i];
        i++;
      }
      // Check for multiplier suffix: B, M, K, T, %
      if (i < len && /[b|m|k|t|%]/i.test(query[i])) {
        numStr += query[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr, position: i });
      continue;
    }

    // Keywords or Identifiers (AND, OR, ROIC, Market Cap, Debt / Equity, etc.)
    let idStr = "";
    const startPos = i;
    while (i < len && !/[()><!=,\n]/i.test(query[i])) {
      idStr += query[i];
      i++;
      const peekUpper = idStr.trim().toUpperCase();
      if (peekUpper === "AND" || peekUpper === "OR") {
        // check word boundary
        if (i >= len || /\s|\(/.test(query[i])) {
          break;
        }
      }
    }

    const trimmed = idStr.trim();
    if (!trimmed) continue;

    if (trimmed.toUpperCase() === "AND") {
      tokens.push({ type: "AND", value: "AND", position: startPos });
    } else if (trimmed.toUpperCase() === "OR") {
      tokens.push({ type: "OR", value: "OR", position: startPos });
    } else {
      tokens.push({ type: "IDENTIFIER", value: trimmed, position: startPos });
    }
  }

  return tokens;
}

/**
 * Parses numeric strings with multipliers (e.g. 10B -> 10000000000, 15% -> 15).
 */
export function parseNumericValue(raw: string): number {
  const clean = raw.trim().toUpperCase();
  if (clean.endsWith("T")) return parseFloat(clean.slice(0, -1)) * 1e12;
  if (clean.endsWith("B")) return parseFloat(clean.slice(0, -1)) * 1e9;
  if (clean.endsWith("M")) return parseFloat(clean.slice(0, -1)) * 1e6;
  if (clean.endsWith("K")) return parseFloat(clean.slice(0, -1)) * 1e3;
  if (clean.endsWith("%")) return parseFloat(clean.slice(0, -1));
  return parseFloat(clean);
}

/**
 * Recursive-descent parser building the AST from token stream.
 */
export class ScreenerParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    if (this.tokens.length === 0) {
      throw new Error("Query is empty. Enter at least one metric condition (e.g. ROIC > 15).");
    }
    const node = this.parseExpression();
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected extra token '${this.peek().value}' at position ${this.peek().position}`);
    }
    return node;
  }

  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let expr = this.parseAnd();

    while (this.match("OR")) {
      const right = this.parseAnd();
      expr = {
        type: "LOGICAL",
        operator: "OR",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseAnd(): ASTNode {
    let expr = this.parsePrimary();

    while (this.match("AND") || (!this.isAtEnd() && this.peek().type !== "OR" && this.peek().type !== "RPAREN")) {
      // Implicit AND if user skipped explicit AND between clauses
      const right = this.parsePrimary();
      expr = {
        type: "LOGICAL",
        operator: "AND",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    if (this.match("LPAREN")) {
      const expr = this.parseExpression();
      this.consume("RPAREN", "Expected closing ')' after expression");
      return expr;
    }

    // Comparison: <IDENTIFIER> <OPERATOR> <NUMBER>
    const idToken = this.consume("IDENTIFIER", "Expected metric name (e.g. Market Cap, ROIC, P/E)");
    const metric = findMetric(idToken.value);
    if (!metric) {
      throw new Error(
        `Unknown metric '${idToken.value}'. Supported examples: ROIC, P/E, Market Cap, Debt / Equity, FCF Yield.`
      );
    }

    const opToken = this.consume("OPERATOR", `Expected comparison operator (>, <, >=, <=, =) after '${idToken.value}'`);
    const numToken = this.consume("NUMBER", `Expected numeric target value after '${opToken.value}'`);
    const val = parseNumericValue(numToken.value);
    if (isNaN(val)) {
      throw new Error(`Invalid numeric value '${numToken.value}'`);
    }

    return {
      type: "COMPARISON",
      metricId: metric.id,
      fieldKey: metric.fieldKey,
      operator: opToken.value as any,
      targetValue: val,
      rawMetricName: idToken.value,
    };
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, errMsg: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${errMsg} at token '${this.peek()?.value ?? "END"}'`);
  }
}

/**
 * Evaluate a stock row against an AST node.
 */
export function evaluateAST(node: ASTNode, row: ScreenerRow): boolean {
  if (node.type === "LOGICAL") {
    if (node.operator === "AND") {
      return evaluateAST(node.left, row) && evaluateAST(node.right, row);
    } else {
      return evaluateAST(node.left, row) || evaluateAST(node.right, row);
    }
  }

  // Comparison
  const rowVal = (row as any)[node.fieldKey];
  if (rowVal === null || rowVal === undefined || isNaN(rowVal)) {
    return false; // Missing data fails filter condition
  }

  const numVal = Number(rowVal);
  const target = node.targetValue;

  switch (node.operator) {
    case ">":
      return numVal > target;
    case "<":
      return numVal < target;
    case ">=":
      return numVal >= target;
    case "<=":
      return numVal <= target;
    case "=":
      return Math.abs(numVal - target) < 0.001;
    case "!=":
      return Math.abs(numVal - target) >= 0.001;
    default:
      return false;
  }
}

/**
 * Execute a screener query string against an array of stocks.
 */
export function executeScreenerQuery(
  query: string,
  universe: ScreenerRow[]
): {
  results: ScreenerRow[];
  ast: ASTNode | null;
  error: string | null;
} {
  if (!query || !query.trim()) {
    return { results: universe, ast: null, error: null };
  }

  try {
    const tokens = tokenizeQuery(query);
    const parser = new ScreenerParser(tokens);
    const ast = parser.parse();
    const results = universe.filter((r) => evaluateAST(ast, r));
    return { results, ast, error: null };
  } catch (err: any) {
    return { results: [], ast: null, error: err?.message || String(err) };
  }
}

/**
 * Prebuilt Institutional Screener Screens.
 */
export const PREBUILT_SCREENS: ScreenerPrebuilt[] = [
  {
    id: "quality-compounders",
    name: "Quality Compounders",
    category: "Quality",
    description: "High ROIC, consistent revenue growth, conservative leverage, and strong FCF conversion.",
    query: "ROIC > 18 AND Revenue Growth > 10 AND Debt / Equity < 0.8 AND FCF Margin > 12",
    defaultColumns: ["symbol", "name", "price", "marketCap", "roic", "revenueGrowthYoY", "debtToEquity", "fcfMargin", "pe"],
  },
  {
    id: "garp",
    name: "Growth at Reasonable Price (GARP)",
    category: "Growth & Value",
    description: "Double-digit revenue and EPS growth with low PEG and sustainable valuation.",
    query: "Revenue Growth > 15 AND EPS Growth > 12 AND PEG < 2.2 AND ROIC > 14 AND P/E < 35",
    defaultColumns: ["symbol", "name", "price", "marketCap", "pe", "peg", "revenueGrowthYoY", "epsGrowthYoY", "roic"],
  },
  {
    id: "high-fcf-yield",
    name: "Cash Flow Machines (FCF Yield)",
    category: "Value",
    description: "Companies generating superior Free Cash Flow yield with modest debt.",
    query: "FCF Yield > 5 AND FCF Margin > 15 AND Debt / Equity < 1.2",
    defaultColumns: ["symbol", "name", "price", "marketCap", "fcfYield", "fcfMargin", "freeCashFlow", "debtToEquity", "pe"],
  },
  {
    id: "momentum-fundamentals",
    name: "Momentum + Strong Fundamentals",
    category: "Momentum",
    description: "Uptrending stocks above 50 & 200 DMA with solid ROIC and double-digit growth.",
    query: "Price vs 200 DMA > 0 AND Price vs 50 DMA > 0 AND ROIC > 15 AND Revenue Growth > 10",
    defaultColumns: ["symbol", "name", "price", "marketCap", "return1Y", "priceVs50DMA", "priceVs200DMA", "roic", "revenueGrowthYoY"],
  },
  {
    id: "buffett-quality-on-sale",
    name: "Buffett Quality on Sale",
    category: "Deep Value",
    description: "High ROE with below-average valuation multiples and fortress balance sheets.",
    query: "ROE > 15 AND Price / Book < 3.5 AND Debt / Equity < 0.7 AND P/E < 22",
    defaultColumns: ["symbol", "name", "price", "marketCap", "roe", "pb", "pe", "debtToEquity", "dividendYield"],
  },
  {
    id: "low-debt-compounders",
    name: "Net Cash Balance Sheet Leaders",
    category: "Financial Health",
    description: "Companies with negative net debt (more cash than debt) and current ratio > 1.8.",
    query: "Net Debt < 0 AND Current Ratio > 1.8 AND ROIC > 15",
    defaultColumns: ["symbol", "name", "price", "marketCap", "netDebt", "currentRatio", "roic", "fcfYield"],
  },
];
