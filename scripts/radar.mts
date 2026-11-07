// Community Price Radar. Runs every hour on GitHub Actions
// (see .github/workflows/radar.yml). Looks at price reports from the last
// 48 hours (shoppers' one-tap checks and the price robot), finds other
// shoppers who bought the same item and are still inside their claim
// window, and emails them once per new lower price.
//
// Needs: SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
// Set DRY_RUN=true to print matches and emails without saving or sending.

import { claimDeadline, daysLeft, todayString } from "../src/lib/stores.ts";
import { dryRun, emailFor, send, siteUrl, supabase } from "./common.mts";
import {
  buildRadarEmail,
  matchRadar,
  type PurchaseForReminder,
  type RadarItem,
} from "./reminders-core.mts";

type Row = PurchaseForReminder & { item_key: string | null; community_alerted_price: number | null };

const today = todayString();
console.log(`Price Radar run for ${today}${dryRun ? " (dry run: nothing saved or sent)" : ""}`);

const since = new Date(Date.now() - 48 * 3600_000).toISOString();
const { data: reports, error: reportError } = await supabase
  .from("price_reports")
  .select("item_key, price, source, reported_at, reporter_id")
  .gte("reported_at", since)
  .limit(10000);
if (reportError) {
  console.error("Could not read price reports:", reportError.message);
  process.exit(1);
}

const keys = [...new Set((reports ?? []).map((r) => r.item_key))];
console.log(`${reports?.length ?? 0} report(s) in the last 48 hours, for ${keys.length} item(s).`);
if (keys.length === 0) process.exit(0);

const rows: Row[] = [];
for (let i = 0; i < keys.length; i += 200) {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, user_id, store_id, store_name, product_name, product_url, price_paid, purchase_date, window_days, status, reminded_3d, reminded_1d, last_price, last_checked_at, last_check_status, item_key, community_alerted_price",
    )
    .eq("status", "tracking")
    .in("item_key", keys.slice(i, i + 200));
  if (error) {
    console.error("Could not read purchases:", error.message);
    process.exit(1);
  }
  rows.push(...((data ?? []) as Row[]));
}

const withDeadlines = rows.map((p) => {
  const deadline = claimDeadline(p.purchase_date, p.window_days);
  return { ...p, deadline, days: daysLeft(deadline, today) };
});

const matches = matchRadar(withDeadlines, reports ?? []);
const byUser = new Map<string, RadarItem[]>();
for (const m of matches) {
  const list = byUser.get(m.user_id) ?? [];
  list.push(m);
  byUser.set(m.user_id, list);
}
console.log(`${matches.length} match(es) for ${byUser.size} shopper(s).`);

let failed = 0;
for (const [userId, items] of byUser) {
  const email = await emailFor(userId);
  if (!email) continue;
  const ok = await send(email, buildRadarEmail(items, siteUrl));
  if (dryRun) continue;
  if (!ok) {
    failed++;
    continue; // not marked, so the next run tries again
  }
  for (const i of items) {
    await supabase.from("purchases").update({ community_alerted_price: i.spottedPrice }).eq("id", i.id);
  }
}

console.log("Done.");
if (failed > 0) process.exit(1);
