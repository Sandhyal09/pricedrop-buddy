// =============================================================
//  STORE RULES — the one file to edit when a store changes its policy.
//  windowDays = how many days after purchase the store refunds a price drop.
//  Recheck these every few months: stores change their rules.
// =============================================================

export type StoreId = "bestbuy" | "target" | "homedepot" | "costco" | "other";

export type StoreRule = {
  id: StoreId;
  name: string;
  windowDays: number | null; // null = the user types their own window
  howToClaim: string;
  note: string;
};

export const STORES: StoreRule[] = [
  {
    id: "bestbuy",
    name: "Best Buy",
    windowDays: 15,
    howToClaim: "Use Best Buy's online chat or visit a store with your receipt.",
    note: "Longer windows for paid My Best Buy members. Marketplace, clearance and open-box items are excluded.",
  },
  {
    id: "target",
    name: "Target",
    windowDays: 14,
    howToClaim: "Use Target's online chat or visit Guest Services with your receipt.",
    note: "Matches Target's own lower price only, not other stores.",
  },
  {
    id: "homedepot",
    name: "Home Depot",
    windowDays: 30,
    howToClaim: "Visit the store's customer service desk with your receipt.",
    note: "Identical, in-stock items only.",
  },
  {
    id: "costco",
    name: "Costco",
    windowDays: 30,
    howToClaim: "Visit the membership or returns counter with your receipt.",
    note: "Warehouse prices can differ from Costco.com.",
  },
  {
    id: "other",
    name: "Other store",
    windowDays: null,
    howToClaim: "Check the store's price adjustment policy.",
    note: "Type the store's refund window yourself.",
  },
];

export function getStore(id: string): StoreRule {
  return STORES.find((s) => s.id === id) ?? STORES[STORES.length - 1];
}

// ----- Date helpers (dates are plain "YYYY-MM-DD" strings) -----

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in US Eastern time, as "YYYY-MM-DD". */
export function todayString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Last day the user can claim: purchase date + window days. */
export function claimDeadline(purchaseDate: string, windowDays: number): string {
  return fromUtcMs(toUtcMs(purchaseDate) + windowDays * DAY_MS);
}

/** Days from today until the deadline (0 = last day, negative = closed). */
export function daysLeft(deadline: string, today: string = todayString()): number {
  return Math.round((toUtcMs(deadline) - toUtcMs(today)) / DAY_MS);
}

export type Urgency = "open" | "soon" | "closed";

export function urgency(days: number): Urgency {
  if (days < 0) return "closed";
  if (days <= 3) return "soon";
  return "open";
}

export function formatDate(date: string): string {
  return new Date(toUtcMs(date)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
