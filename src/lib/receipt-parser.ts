// Turns the text read from a receipt photo into store, date, order number
// and item lines. These are simple rules, not AI, so they won't be perfect:
// the user always reviews and fixes the result before saving.

import type { StoreId } from "./stores";

export type ParsedItem = {
  name: string;
  sku: string;
  price: number;
};

export type ParsedReceipt = {
  storeId: StoreId | "";
  purchaseDate: string; // "YYYY-MM-DD" or ""
  orderNumber: string;
  items: ParsedItem[];
};

const STORE_PATTERNS: [StoreId, RegExp][] = [
  ["bestbuy", /best\s*buy|bestbuy/i],
  ["homedepot", /home\s*depot|homedepot/i],
  ["costco", /costco|wholesale\s+corp/i],
  ["target", /\btarget\b|target\.com/i],
];

// Lines with these words are totals, taxes or payments, not items.
const NOT_AN_ITEM =
  /\b(sub\s*-?\s*total|total|tax|change|cash|visa|master\s*card|mastercard|amex|discover|debit|credit|balance|tender|payment|paid|auth|approved|refund|savings|you saved|discount|coupon|rewards?|card\s*#|acct|account|items?\s+sold|number of items|instant savings|redcard|circle\s+(?:offer|reward|earnings))\b/i;

const PRICE_AT_END = /(-?)\$?\s?(\d{1,5}[.,]\d{2})\s*[-A-Z*]{0,3}\s*$/;

// Item numbers: Target DPCI (123-45-6789), or a plain 5–14 digit code.
const SKU_PATTERNS = [/\b\d{3}-\d{2}-\d{4}\b/, /\b\d{5,14}\b/];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function findDate(text: string, today: string): string {
  const candidates: string[] = [];

  for (const m of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g)) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    candidates.push(validDate(y, Number(m[1]), Number(m[2])));
  }
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    candidates.push(validDate(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  for (const m of text.matchAll(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  )) {
    candidates.push(
      validDate(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2])),
    );
  }

  // The first real date that isn't in the future.
  return candidates.find((d) => d && d <= today) ?? "";
}

export function findStore(text: string): StoreId | "" {
  for (const [id, pattern] of STORE_PATTERNS) {
    if (pattern.test(text)) return id;
  }
  return "";
}

export function findOrderNumber(text: string): string {
  const m = text.match(
    /\b(?:order|receipt|ref|trans(?:action)?|invoice)\s*(?:number|no\.?|#|id)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})/i,
  );
  return m ? m[1] : "";
}

export function parseItemLine(line: string): ParsedItem | null {
  const priceMatch = line.match(PRICE_AT_END);
  if (!priceMatch) return null;
  if (priceMatch[1] === "-") return null; // discounts and returns
  if (NOT_AN_ITEM.test(line)) return null;

  const price = Number(priceMatch[2].replace(",", "."));
  if (!(price > 0)) return null;

  let rest = line.slice(0, priceMatch.index).trim();

  let sku = "";
  for (const pattern of SKU_PATTERNS) {
    const s = rest.match(pattern);
    if (s) {
      sku = s[0];
      rest = (rest.slice(0, s.index) + " " + rest.slice(s.index! + s[0].length)).trim();
      break;
    }
  }

  const name = rest
    .replace(/^\d+\s*@\s*/, "") // "2 @ " quantity prefix
    .replace(/^[A-Z]\s+(?=\S{2})/, "") // leading tax flag like Costco's "E"
    .replace(/\s+[A-Z]{1,2}$/, "") // trailing tax flags like "T" or "NF"
    .replace(/[\t|]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Need at least a few letters to count as a product name.
  if ((name.match(/[a-z]/gi) ?? []).length < 3) return null;

  return { name, sku, price };
}

export function parseReceipt(text: string, today: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  for (const line of lines) {
    const item = parseItemLine(line);
    if (item) items.push(item);
  }

  return {
    storeId: findStore(text),
    purchaseDate: findDate(text, today),
    orderNumber: findOrderNumber(text),
    items: items.slice(0, 60),
  };
}
