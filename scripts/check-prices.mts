// Runs every 6 hours on GitHub Actions (see .github/workflows/prices.yml).
// Checks the price of every purchase still inside its claim window, where
// the store allows automated checks. Saves each price, and emails the user
// right away when a price drops below what they paid.
//
// Needs: SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
// Set DRY_RUN=true to check prices and print emails without saving or sending.

import { claimDeadline, daysLeft, todayString } from "../src/lib/stores.ts";
import { checkPrice, type CheckResult } from "../src/lib/price-check.ts";
import { dryRun, emailFor, send, siteUrl, supabase } from "./common.mts";
import { buildDropEmail, type DropItem, type PurchaseForReminder } from "./reminders-core.mts";

type Row = PurchaseForReminder & { drop_alerted_price: number | null };

const MIN_HOURS_BETWEEN_CHECKS = 5;
const MAX_CHECKS_PER_RUN = 300;
const PAUSE_MS = 3000; // between visits, to be polite

const today = todayString();
console.log(`Price check run for ${today}${dryRun ? " (dry run: nothing saved or sent)" : ""}`);

const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
const { data, error } = await supabase
  .from("purchases")
  .select(
    "id, user_id, store_id, store_name, product_name, product_url, price_paid, purchase_date, window_days, status, reminded_3d, reminded_1d, last_price, last_checked_at, last_check_status, drop_alerted_price",
  )
  .eq("status", "tracking")
  .not("product_url", "is", null)
  .gte("purchase_date", since)
  .limit(5000);

if (error) {
  console.error("Could not read purchases:", error.message);
  process.exit(1);
}

const cutoff = Date.now() - MIN_HOURS_BETWEEN_CHECKS * 3600_000;
const toCheck = ((data ?? []) as Row[])
  .map((p) => {
    const deadline = claimDeadline(p.purchase_date, p.window_days);
    return { ...p, deadline, days: daysLeft(deadline, today) };
  })
  .filter((p) => p.days >= 0)
  .filter((p) => !p.last_checked_at || Date.parse(p.last_checked_at) < cutoff)
  .sort((a, b) => a.days - b.days) // closest deadlines first
  .slice(0, MAX_CHECKS_PER_RUN);

console.log(`${toCheck.length} purchase(s) to check.`);

// If a store blocks us once in this run, don't keep knocking.
const blockedHosts = new Map<string, CheckResult>();
const drops = new Map<string, DropItem[]>();
const tally: Record<string, number> = {};

for (const p of toCheck) {
  let host = "invalid-link";
  try {
    host = new URL(p.product_url!).hostname;
  } catch {
    // checkPrice reports the bad link below
  }
  let result = blockedHosts.get(host);
  if (!result) {
    result = await checkPrice(p.product_url!);
    if (result.status === "blocked" || result.status === "not_allowed") blockedHosts.set(host, result);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  tally[`${host} ${result.status}`] = (tally[`${host} ${result.status}`] ?? 0) + 1;

  const paid = Number(p.price_paid);
  const isDrop = result.status === "ok" && result.price !== null && result.price < paid;
  const lowerThanLastAlert = p.drop_alerted_price === null || (result.price ?? Infinity) < Number(p.drop_alerted_price);

  if (!dryRun) {
    const update: Record<string, unknown> = {
      last_checked_at: new Date().toISOString(),
      last_check_status: result.status,
      last_check_source: "auto",
    };
    if (result.price !== null) update.last_price = result.price;
    await supabase.from("purchases").update(update).eq("id", p.id);
    await supabase.from("price_checks").insert({
      purchase_id: p.id,
      user_id: p.user_id,
      price: result.price,
      status: result.status,
      source: "auto",
    });
  }

  if (isDrop && lowerThanLastAlert) {
    const list = drops.get(p.user_id) ?? [];
    list.push({ ...p, newPrice: result.price! });
    drops.set(p.user_id, list);
  }
}

console.log("Results:", tally);
console.log(`${[...drops.values()].flat().length} new price drop(s) for ${drops.size} user(s).`);

let failed = 0;
for (const [userId, items] of drops) {
  const email = await emailFor(userId);
  if (!email) continue;
  const ok = await send(email, buildDropEmail(items, siteUrl));
  if (dryRun) continue;
  if (!ok) {
    failed++;
    continue; // not marked, so the next run alerts again
  }
  for (const i of items) {
    await supabase.from("purchases").update({ drop_alerted_price: i.newPrice }).eq("id", i.id);
  }
}

console.log("Done.");
if (failed > 0) process.exit(1);
