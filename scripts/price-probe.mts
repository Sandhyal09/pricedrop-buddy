// One-off test: can we read prices from each store, politely, from GitHub's
// servers? Usage: node scripts/price-probe.mts "<url1>,<url2>,..."
import { checkPrice } from "../src/lib/price-check.ts";

const urls = (process.argv[2] ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

for (const url of urls) {
  const host = new URL(url).hostname;
  const started = Date.now();
  const r = await checkPrice(url);
  console.log(
    `${host.padEnd(22)} ${r.status.padEnd(12)} ${r.price !== null ? "$" + r.price.toFixed(2) : "-".padEnd(8)}  ${r.detail} (${Date.now() - started} ms)`,
  );
  await new Promise((res) => setTimeout(res, 3000));
}
