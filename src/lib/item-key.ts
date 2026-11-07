// Gives each product a stable "item key" so purchases of the same product
// at the same store can be matched across shoppers (Community Price Radar).
// Example: "target:85978622" for https://www.target.com/p/.../-/A-85978622

/** Item number from a store's product link, or null if we can't tell. */
export function keyFromUrl(storeId: string, url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const path = decodeURIComponent(u.pathname);

  if (host.endsWith("target.com")) {
    const m = path.match(/\/A-(\d{6,10})\b/);
    return m ? `target:${m[1]}` : null;
  }
  if (host.endsWith("bestbuy.com")) {
    const fromQuery = u.searchParams.get("skuId");
    if (fromQuery && /^\d{6,9}$/.test(fromQuery)) return `bestbuy:${fromQuery}`;
    const m = path.match(/\/sku\/(\d{6,9})\b/) ?? path.match(/\/(\d{6,9})\.p\b/);
    return m ? `bestbuy:${m[1]}` : null;
  }
  if (host.endsWith("homedepot.com")) {
    const m = path.match(/\/p\/(?:.*\/)?(\d{9})\b/);
    return m ? `homedepot:${m[1]}` : null;
  }
  if (host.endsWith("costco.com")) {
    const m = path.match(/\.product\.(\d{6,12})\.html/) ?? path.match(/\/p\/.*\/(\d{6,12})$/);
    return m ? `costco:${m[1]}` : null;
  }
  // Other stores: match on the exact page (host + path).
  if (storeId === "other") return `web:${host}${path.replace(/\/$/, "")}`.toLowerCase();
  return null;
}

/** Item number printed on the receipt (SKU), normalized. */
export function keyFromSku(storeId: string, sku: string | null | undefined): string | null {
  if (!sku || storeId === "other") return null;
  const digits = sku.replace(/\D/g, "");
  if (digits.length < 5) return null;
  // Best Buy prints the same SKU on receipts as in its links.
  if (storeId === "bestbuy") return `bestbuy:${digits}`;
  return `${storeId}:sku:${digits}`;
}

/** Prefer the link (most precise), fall back to the receipt SKU. */
export function itemKey(
  storeId: string,
  productUrl: string | null | undefined,
  sku: string | null | undefined,
): string | null {
  return keyFromUrl(storeId, productUrl) ?? keyFromSku(storeId, sku);
}
