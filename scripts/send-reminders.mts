// Runs once a day on GitHub Actions (see .github/workflows/reminders.yml).
// Finds purchases whose claim window is about to close, emails each user
// once, and remembers what was sent so nobody gets the same reminder twice.
//
// Needs these environment variables (stored as GitHub Secrets):
//   SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, SITE_URL
// Set DRY_RUN=true to print what would be sent without sending anything.

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { todayString } from "../src/lib/stores.ts";
import {
  buildEmail,
  groupByUser,
  pickDue,
  type PurchaseForReminder,
} from "./reminders-core.mts";

function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it in GitHub → Settings → Secrets and variables → Actions.`);
    process.exit(1);
  }
  return value;
}

const dryRun = process.env.DRY_RUN === "true";
const supabaseUrl = need("SUPABASE_URL");
const secretKey = need("SUPABASE_SECRET_KEY");
const siteUrl = (process.env.SITE_URL?.trim() || "https://pricedrop-buddy.vercel.app").replace(/\/$/, "");
const gmailUser = dryRun ? process.env.GMAIL_USER ?? "" : need("GMAIL_USER");
const gmailPass = dryRun ? "" : need("GMAIL_APP_PASSWORD");

// The secret key can read every user's purchases, so it only ever lives
// in GitHub Secrets and is never sent to the website.
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = todayString();
console.log(`Reminder run for ${today}${dryRun ? " (dry run: nothing will be sent)" : ""}`);

// Only purchases bought in the last 400 days can still have an open window.
const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
const { data, error } = await supabase
  .from("purchases")
  .select(
    "id, user_id, store_id, store_name, product_name, product_url, price_paid, purchase_date, window_days, status, reminded_3d, reminded_1d",
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
if (byUser.size === 0) process.exit(0);

const mailer = dryRun
  ? null
  : nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

let sent = 0;
let failed = 0;

for (const [userId, items] of byUser) {
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userError || !email || !userData.user.email_confirmed_at) {
    console.warn(`Skipping a user with no confirmed email (${items.length} item(s)).`);
    continue;
  }

  const message = buildEmail(items, siteUrl);

  if (dryRun) {
    console.log(`\n--- Would email a user (${items.length} item(s)) ---`);
    console.log(`Subject: ${message.subject}\n`);
    console.log(message.text);
    continue;
  }

  try {
    await mailer!.sendMail({
      from: `"PriceDrop Buddy" <${gmailUser}>`,
      to: email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    failed++;
    console.error("Sending failed:", err instanceof Error ? err.message : err);
    continue; // not marked as sent, so tomorrow's run tries again
  }

  for (const kind of ["3d", "1d"] as const) {
    const ids = items.filter((i) => i.kind === kind).map((i) => i.id);
    if (ids.length === 0) continue;
    const column = kind === "3d" ? "reminded_3d" : "reminded_1d";
    const { error: markError } = await supabase
      .from("purchases")
      .update({ [column]: true })
      .in("id", ids);
    if (markError) console.error("Could not mark reminders as sent:", markError.message);
  }
  sent++;
}

console.log(`\nDone. Emails sent: ${sent}. Failed: ${failed}.`);
if (failed > 0) process.exit(1);
