// Scores a receipt reader's answer against the correct answer.
// Used by `npm run eval` and its unit tests. No imports, so plain Node can run it.

export type ReceiptAnswer = {
  storeId: string;
  purchaseDate: string;
  orderNumber: string;
  items: { name: string; sku: string; price: number }[];
};

export type ReceiptScore = {
  store: boolean;
  date: boolean;
  orderNumber: boolean;
  /** Items found that are right (price and name both match). */
  itemsRight: number;
  /** Items found that shouldn't be there. */
  itemsExtra: number;
  /** Real items that were missed. */
  itemsMissed: number;
  /** Of the items found, how many also have the right SKU. */
  skuRight: number;
  /** Every field and every item exactly right. */
  perfect: boolean;
};

const OTHER = new Set(["", "other"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** True when two item names describe the same product, allowing small OCR differences. */
export function sameName(expected: string, actual: string): boolean {
  const e = words(expected);
  const a = new Set(words(actual));
  if (e.length === 0) return a.size === 0;
  const shared = e.filter((w) => a.has(w)).length;
  return shared / e.length >= 0.6 && shared / Math.max(a.size, 1) >= 0.4;
}

function sameStore(expected: string, actual: string): boolean {
  if (OTHER.has(expected)) return OTHER.has(actual);
  return expected === actual;
}

function sameOrder(expected: string, actual: string): boolean {
  const n = (s: string) => s.toUpperCase().replace(/\s+/g, "");
  return n(expected) === n(actual);
}

function sameSku(expected: string, actual: string): boolean {
  const n = (s: string) => s.replace(/\D/g, "");
  return n(expected) === n(actual);
}

export function scoreReceipt(expected: ReceiptAnswer, actual: ReceiptAnswer): ReceiptScore {
  const unused = [...actual.items];
  let itemsRight = 0;
  let skuRight = 0;

  for (const want of expected.items) {
    const i = unused.findIndex(
      (got) => Math.abs(got.price - want.price) < 0.005 && sameName(want.name, got.name),
    );
    if (i === -1) continue;
    itemsRight++;
    if (sameSku(want.sku, unused[i].sku)) skuRight++;
    unused.splice(i, 1);
  }

  const score = {
    store: sameStore(expected.storeId, actual.storeId),
    date: expected.purchaseDate === actual.purchaseDate,
    orderNumber: sameOrder(expected.orderNumber, actual.orderNumber),
    itemsRight,
    itemsExtra: unused.length,
    itemsMissed: expected.items.length - itemsRight,
    skuRight,
  };
  return {
    ...score,
    perfect:
      score.store &&
      score.date &&
      score.orderNumber &&
      score.itemsExtra === 0 &&
      score.itemsMissed === 0 &&
      skuRight === itemsRight,
  };
}

export type Summary = {
  receipts: number;
  perfect: number;
  store: number;
  date: number;
  orderNumber: number;
  /** Share of found items that are right. */
  itemPrecision: number;
  /** Share of real items that were found. */
  itemRecall: number;
  itemF1: number;
  skuAccuracy: number;
};

export function summarize(scores: ReceiptScore[]): Summary {
  const sum = (f: (s: ReceiptScore) => number) => scores.reduce((t, s) => t + f(s), 0);
  const share = (f: (s: ReceiptScore) => boolean) =>
    scores.length ? scores.filter(f).length / scores.length : 0;

  const right = sum((s) => s.itemsRight);
  const found = right + sum((s) => s.itemsExtra);
  const real = right + sum((s) => s.itemsMissed);
  const precision = found ? right / found : 1;
  const recall = real ? right / real : 1;

  return {
    receipts: scores.length,
    perfect: share((s) => s.perfect),
    store: share((s) => s.store),
    date: share((s) => s.date),
    orderNumber: share((s) => s.orderNumber),
    itemPrecision: precision,
    itemRecall: recall,
    itemF1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    skuAccuracy: right ? sum((s) => s.skuRight) / right : 1,
  };
}
