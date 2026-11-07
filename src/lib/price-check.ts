// Reads a product's current price from its web page, the polite way:
// only the standard machine-readable price that stores publish for search
// engines (schema.org JSON-LD or product meta tags), and only where the
// store's robots.txt allows it. No logins, no tricks to get around blocks.

// ---------- Price extraction ----------

function toPrice(value: unknown): number | null {
  if (typeof value === "number") return value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function isType(node: Record<string, unknown>, type: string): boolean {
  const t = node["@type"];
  return t === type || (Array.isArray(t) && t.includes(type));
}

function priceFromOffers(offers: unknown): number | null {
  const list = Array.isArray(offers) ? offers : [offers];
  const prices: number[] = [];
  for (const o of list) {
    if (!o || typeof o !== "object") continue;
    const offer = o as Record<string, unknown>;
    const p =
      toPrice(offer.price) ??
      toPrice(offer.lowPrice) ??
      toPrice((offer.priceSpecification as Record<string, unknown> | undefined)?.price);
    if (p !== null) prices.push(p);
  }
  return prices.length ? Math.min(...prices) : null;
}

function findProductPrice(node: unknown): number | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const p = findProductPrice(item);
      if (p !== null) return p;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  if (isType(obj, "Product") && obj.offers) {
    const p = priceFromOffers(obj.offers);
    if (p !== null) return p;
  }
  for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) {
    if (obj[key]) {
      const p = findProductPrice(obj[key]);
      if (p !== null) return p;
    }
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Returns the product's current price from the page HTML, or null. */
export function extractPrice(html: string): number | null {
  // 1. JSON-LD blocks (most reliable)
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of scripts) {
    try {
      const p = findProductPrice(JSON.parse(m[1].trim()));
      if (p !== null) return p;
    } catch {
      // ignore broken blocks
    }
  }

  // 2. Meta tags: product:price:amount, og:price:amount, itemprop="price"
  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["'](?:product|og):price:amount["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:product|og):price:amount["']/i,
    /<[^>]+itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /<[^>]+content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
  ];
  for (const pattern of metaPatterns) {
    const m = html.match(pattern);
    if (m) {
      const p = toPrice(decodeEntities(m[1]));
      if (p !== null) return p;
    }
  }
  return null;
}

// ---------- robots.txt ----------

export type RobotsRules = { allow: string[]; disallow: string[] };

/** Rules that apply to our bot: its own group if present, otherwise "*". */
export function parseRobots(text: string, botName: string): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!current) continue;
      if (field === "allow" && value) current.allow.push(value);
      if (field === "disallow" && value) current.disallow.push(value);
    }
  }

  const bot = botName.toLowerCase();
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && bot.includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes("*"));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
  };
}

function ruleMatches(rule: string, path: string): number {
  // Supports "*" wildcards and "$" end anchors. Returns match length or -1.
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const regex = new RegExp(
    "^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""),
  );
  return regex.test(path) ? body.length : -1;
}

/** Longest matching rule wins; Allow wins ties. No rules = allowed. */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  let best = -1;
  let allowed = true;
  for (const r of rules.disallow) {
    const len = ruleMatches(r, path);
    if (len > best) {
      best = len;
      allowed = false;
    }
  }
  for (const r of rules.allow) {
    const len = ruleMatches(r, path);
    if (len >= best && len >= 0) {
      best = len;
      allowed = true;
    }
  }
  return allowed;
}

// ---------- Fetching ----------

export const BOT_NAME = "PriceDropBuddyBot";
export const USER_AGENT = `${BOT_NAME}/1.0 (+https://pricedrop-buddy.vercel.app; checks prices for users' own purchases)`;

export type CheckStatus = "ok" | "not_allowed" | "blocked" | "no_price" | "error";
export type CheckResult = { status: CheckStatus; price: number | null; detail: string };

const robotsCache = new Map<string, RobotsRules | "unreachable">();

async function getRobots(origin: string): Promise<RobotsRules | "unreachable"> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let result: RobotsRules | "unreachable";
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status >= 400 && res.status < 500) {
      result = { allow: [], disallow: [] }; // no robots.txt: everything allowed
    } else if (!res.ok) {
      result = "unreachable";
    } else {
      result = parseRobots(await res.text(), BOT_NAME);
    }
  } catch {
    result = "unreachable";
  }
  robotsCache.set(origin, result);
  return result;
}

/** Checks one product page. Never retries around a block. */
export async function checkPrice(productUrl: string): Promise<CheckResult> {
  let url: URL;
  try {
    url = new URL(productUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    return { status: "error", price: null, detail: "Not a valid web link" };
  }

  const robots = await getRobots(url.origin);
  if (robots === "unreachable") {
    return { status: "blocked", price: null, detail: "Store site didn't respond to robots.txt" };
  }
  if (!isAllowed(robots, url.pathname + url.search)) {
    return { status: "not_allowed", price: null, detail: "The store's robots.txt doesn't allow automated visits to this page" };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 403 || res.status === 429 || res.status === 401) {
      return { status: "blocked", price: null, detail: `The store blocked the visit (HTTP ${res.status})` };
    }
    if (!res.ok) {
      return { status: "error", price: null, detail: `Page returned HTTP ${res.status}` };
    }
    const html = (await res.text()).slice(0, 3_000_000);
    const price = extractPrice(html);
    if (price === null) {
      const challenge = /captcha|access denied|are you a robot|px-captcha|akamai/i.test(html.slice(0, 20_000));
      return challenge
        ? { status: "blocked", price: null, detail: "The store showed a robot check" }
        : { status: "no_price", price: null, detail: "No machine-readable price on the page" };
    }
    return { status: "ok", price, detail: "Price read from the page's product data" };
  } catch (err) {
    return { status: "error", price: null, detail: err instanceof Error ? err.message : "Request failed" };
  }
}
