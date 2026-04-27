import type { FlowDefinition, BasePriceCondition, BasePriceRule } from "@opensoftware/openflow-core";

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  maxAmount?: number; // present when the matched rule has a maxPrice
}

export interface PriceResult {
  total: number;       // min total (or exact total when no range)
  maxTotal?: number;   // max total — only set when a range rule matched
  breakdown: PriceBreakdownItem[];
}

/**
 * Evaluates a math expression where identifiers are resolved from `answers`.
 * Supports: +, -, *, /, ^ (power), parentheses, and functions:
 *   cbrt, sqrt, abs, round, floor, ceil, pow, log, log10, min, max
 * Simple field reference (e.g. "Länge") also works as before.
 */
function evaluateFormula(expr: string, answers: Record<string, unknown>): number {
  let pos = 0;
  const s = expr.trim();

  const peek = () => s.charAt(pos);
  const advance = () => s.charAt(pos++);
  const skipWs = () => { while (pos < s.length && s.charAt(pos) === " ") pos++; };
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isIdentStart = (c: string) => /[a-zA-ZÀ-öø-ÿ_]/.test(c);
  const isIdentCont  = (c: string) => /[a-zA-ZÀ-öø-ÿ0-9_]/.test(c);

  function parseExpr(): number {
    let left = parseTerm(); skipWs();
    while (peek() === "+" || peek() === "-") {
      const op = advance(); skipWs();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
      skipWs();
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePow(); skipWs();
    while (peek() === "*" || peek() === "/") {
      const op = advance(); skipWs();
      const right = parsePow();
      left = op === "*" ? left * right : left / right;
      skipWs();
    }
    return left;
  }

  function parsePow(): number {
    let base = parseUnary(); skipWs();
    while (peek() === "^") {
      advance(); skipWs();
      base = Math.pow(base, parseUnary()); skipWs();
    }
    return base;
  }

  function parseUnary(): number {
    skipWs();
    if (peek() === "-") { advance(); return -parseAtom(); }
    if (peek() === "+") { advance(); return  parseAtom(); }
    return parseAtom();
  }

  function parseArgs(): number[] {
    const args: number[] = [];
    skipWs();
    if (peek() !== "(") return args;
    advance(); skipWs();
    while (peek() !== ")" && pos < s.length) {
      args.push(parseExpr()); skipWs();
      if (peek() === ",") { advance(); skipWs(); }
    }
    if (peek() === ")") advance();
    return args;
  }

  function parseAtom(): number {
    skipWs();
    if (peek() === "(") {
      advance();
      const val = parseExpr();
      skipWs(); if (peek() === ")") advance();
      return val;
    }
    if (isDigit(peek()) || peek() === ".") {
      const start = pos;
      while (pos < s.length && (isDigit(s.charAt(pos)) || s.charAt(pos) === ".")) pos++;
      return parseFloat(s.slice(start, pos));
    }
    if (isIdentStart(peek())) {
      const start = pos;
      while (pos < s.length && isIdentCont(s.charAt(pos))) pos++;
      const id = s.slice(start, pos);
      skipWs();
      if (peek() === "(") {
        const args = parseArgs();
        switch (id.toLowerCase()) {
          case "cbrt":  return Math.cbrt(args[0] ?? 0);
          case "sqrt":  return Math.sqrt(args[0] ?? 0);
          case "abs":   return Math.abs(args[0] ?? 0);
          case "round": return Math.round(args[0] ?? 0);
          case "floor": return Math.floor(args[0] ?? 0);
          case "ceil":  return Math.ceil(args[0] ?? 0);
          case "pow":   return Math.pow(args[0] ?? 0, args[1] ?? 2);
          case "log":   return Math.log(args[0] ?? 0);
          case "log10": return Math.log10(args[0] ?? 0);
          case "min":   return args.length ? Math.min(...args) : NaN;
          case "max":   return args.length ? Math.max(...args) : NaN;
          default:      return NaN;
        }
      }
      // Field reference
      const raw = answers[id];
      if (raw === undefined || raw === null || raw === "") return NaN;
      return parseFloat(String(raw));
    }
    return NaN;
  }

  try { return parseExpr(); } catch { return NaN; }
}

function evalCondition(cond: BasePriceCondition, answers: Record<string, unknown>): boolean {
  const num = evaluateFormula(cond.fieldKey, answers);
  if (isNaN(num)) return false;
  switch (cond.operator) {
    case "<":  return num < cond.value;
    case ">":  return num > cond.value;
    case "<=": return num <= cond.value;
    case ">=": return num >= cond.value;
    case "=":  return num === cond.value;
    case "!=": return num !== cond.value;
    default:   return false;
  }
}

function evalRule(rule: BasePriceRule, answers: Record<string, unknown>): boolean {
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map((c) => evalCondition(c, answers));
  return rule.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Pure function — computes the current total price from flow answers.
 * Reads `price` fields from component configs; no side-effects.
 */
export function calculatePrice(
  answers: Record<string, unknown>,
  flowDefinition: FlowDefinition | null,
): PriceResult {
  if (!flowDefinition) return { total: 0, breakdown: [] };

  const pricing = flowDefinition.settings?.pricingConfig;
  if (!pricing?.enabled) return { total: 0, breakdown: [] };

  const breakdown: PriceBreakdownItem[] = [];
  let basePriceMin = 0;
  let basePriceMax: number | undefined;

  const rules = pricing.basePriceRules ?? [];
  if (rules.length > 0) {
    // First matching rule wins
    for (const rule of rules) {
      if (evalRule(rule, answers)) {
        basePriceMin = rule.price;
        const hasRange = rule.maxPrice !== undefined && rule.maxPrice > rule.price;
        if (hasRange) basePriceMax = rule.maxPrice;
        if (rule.price > 0 || hasRange) {
          breakdown.push({
            label: rule.label ?? "Grundpreis",
            amount: rule.price,
            maxAmount: hasRange ? rule.maxPrice : undefined,
          });
        }
        break;
      }
    }
  } else if (pricing.basePrice && pricing.basePrice > 0) {
    basePriceMin = pricing.basePrice;
    breakdown.push({ label: "Grundpreis", amount: pricing.basePrice });
  }

  // Track min and max totals separately so component ranges propagate correctly.
  let totalMin = basePriceMin;
  let totalMax = basePriceMax ?? basePriceMin;
  let hasComponentRange = false;

  /** Apply a single price contribution (with optional range and +/– modifier). */
  function addContrib(
    label: string,
    price: number,
    maxPrice: number | undefined,
    modifier: "add" | "subtract" | undefined,
  ) {
    if (!price && !maxPrice) return;
    const isSubtract = modifier === "subtract";
    // signed absolute values → keep Von ≤ Bis regardless of sign
    const cMin = isSubtract ? -(maxPrice ?? price) : price;
    const cMax = isSubtract ? -price : (maxPrice ?? price);
    totalMin += cMin;
    totalMax += cMax;
    if (cMin !== cMax) hasComponentRange = true;
    breakdown.push({
      label,
      amount: cMin,
      maxAmount: cMin !== cMax ? cMax : undefined,
    });
  }

  for (const step of flowDefinition.steps) {
    for (const comp of step.components) {
      const answer = answers[comp.fieldKey];
      if (answer === undefined || answer === null || answer === "") continue;

      const config = comp.config as Record<string, unknown>;

      switch (comp.componentType) {
        case "card-selector": {
          const cards = (config.cards as Array<{ key: string; title: string; price?: number; maxPrice?: number; priceModifier?: "add" | "subtract" }>) ?? [];
          const selected = Array.isArray(answer) ? (answer as string[]) : [answer as string];
          for (const key of selected) {
            const card = cards.find((c) => c.key === key);
            if (card?.price) addContrib(card.title, card.price, card.maxPrice, card.priceModifier);
          }
          break;
        }

        case "image-choice": {
          const options = (config.options as Array<{ value: string; label: string; price?: number; maxPrice?: number; priceModifier?: "add" | "subtract" }>) ?? [];
          const selected = Array.isArray(answer) ? (answer as string[]) : [answer as string];
          for (const val of selected) {
            const opt = options.find((o) => o.value === val);
            if (opt?.price) addContrib(opt.label, opt.price, opt.maxPrice, opt.priceModifier);
          }
          break;
        }

        case "radio-group":
        case "dropdown": {
          const optionPrices = (config.optionPrices as Record<string, number>) ?? {};
          const optionMaxPrices = (config.optionMaxPrices as Record<string, number>) ?? {};
          const optionPriceModifiers = (config.optionPriceModifiers as Record<string, "add" | "subtract">) ?? {};
          const options = (config.options as Array<{ value: string; label: string }>) ?? [];
          const val = answer as string;
          const price = optionPrices[val];
          if (price) {
            const opt = options.find((o) => o.value === val);
            addContrib(opt?.label ?? val, price, optionMaxPrices[val], optionPriceModifiers[val]);
          }
          break;
        }

        case "checkbox-group": {
          const optionPrices = (config.optionPrices as Record<string, number>) ?? {};
          const optionMaxPrices = (config.optionMaxPrices as Record<string, number>) ?? {};
          const optionPriceModifiers = (config.optionPriceModifiers as Record<string, "add" | "subtract">) ?? {};
          const options = (config.options as Array<{ value: string; label: string }>) ?? [];
          const selected = Array.isArray(answer) ? (answer as string[]) : [];
          for (const val of selected) {
            const price = optionPrices[val];
            if (price) {
              const opt = options.find((o) => o.value === val);
              addContrib(opt?.label ?? val, price, optionMaxPrices[val], optionPriceModifiers[val]);
            }
          }
          break;
        }

        case "pricing-card": {
          const cards = (config.cards as Array<{ key: string; title: string; price?: string }>) ?? [];
          const selectedKey = answer as string;
          const card = cards.find((c) => c.key === selectedKey);
          if (card?.price) {
            const priceNum = parseFloat(card.price.replace(/[^0-9.,]/g, "").replace(",", "."));
            if (!isNaN(priceNum) && priceNum > 0) addContrib(card.title, priceNum, undefined, undefined);
          }
          break;
        }

        default:
          break;
      }
    }
  }

  const hasRange = (basePriceMax !== undefined && basePriceMax !== basePriceMin) || hasComponentRange;
  return { total: totalMin, maxTotal: hasRange ? totalMax : undefined, breakdown };
}

/** Format a numeric price with currency symbol. */
export function formatPrice(amount: number, currencySymbol = "€"): string {
  return `${currencySymbol} ${amount.toFixed(2).replace(".", ",")}`;
}

/** Format a price range "€ 42,00 – € 85,00". */
export function formatPriceRange(min: number, max: number, currencySymbol = "€"): string {
  return `${formatPrice(min, currencySymbol)} – ${formatPrice(max, currencySymbol)}`;
}
