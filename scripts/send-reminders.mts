// Runs once a day on GitHub Actions (see .github/workflows/reminders.yml).
// Finds purchases whose claim window is about to close, emails each user
// once (with the latest price status), and remembers what was sent.
//
// Needs: SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
// Set DRY_RUN=true to print what would be sent without sending anything.

import { todayString } from "../src/lib/stores.ts";
import { dryRun, emailFor, send, siteUrl, supabase } from "./common.mts";
import {
  buildEmail,
  groupByUser,
  pickDue,
  type PurchaseForReminder,
} from "./reminders-core.mts";

const today = todayString();
console.log(`Reminder run for ${today}${dryRun ? " (dry run: nothing will be sent)" : ""}`);

const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
const { data, error } = await supabase
  .from("purchases")
  .select(
    "id, user_id, store_id, store_name, product_name, product_url, price_paid, purchase_date, window_days, status, reminded_3d, reminded_1d, last_price, last_checked_at, last_check_status",
  )
  .eq("status", "tracking")
  .gte("purchase_date", since)
  .limit(5000);

if (error) {
  console.error("Could not read purchases:", error.message);
  process.exit(1);
}

const due = pickDue((data ?? []) as PurchaseForReminder[], today);
const byUser = groupByUser(due);
console.log(`${due.length} reminder(s) due for ${byUser.size} user(s).`);

let sent = 0;
let failed = 0;
for (const [userId, items] of byUser) {
  const email = await emailFor(userId);
  if (!email) {
    console.warn(`Skipping a user with no confirmed email (${items.length} item(s)).`);
    continue;
  }
  const ok = await send(email, buildEmail(items, siteUrl));
  if (dryRun) continue;
  if (!ok) {
    failed++;
    continue; // not marked as sent, so tomorrow's run tries again
  }
  for (const kind of ["3d", "1d"] as const) {
    const ids = items.filter((i) => i.kind === kind).map((i) => i.id);
    if (ids.length === 0) continue;
    const column = kind === "3d" ? "reminded_3d" : "reminded_1d";
    const { error: markError } = await supabase.from("purchases").update({ [column]: true }).in("id", ids);
    if (markError) console.error("Could not mark reminders as sent:", markError.message);
  }
  sent++;
}

console.log(`\nDone. Emails sent: ${sent}. Failed: ${failed}.`);
if (failed > 0) process.exit(1);
