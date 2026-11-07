import { pickDue, groupByUser, buildEmail, priceNote, buildDropEmail, type PurchaseForReminder } from "../scripts/reminders-core.mts";

let fail = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

const base: PurchaseForReminder = {
  id: "x", user_id: "u1", store_id: "target", store_name: "Target",
  product_name: "Test TV", product_url: "https://example.com/tv",
  price_paid: 299.99, purchase_date: "2026-11-03", window_days: 14,
  status: "tracking", reminded_3d: false, reminded_1d: false,
  last_price: null, last_checked_at: null, last_check_status: null,
};
const mk = (o: Partial<PurchaseForReminder>) => ({ ...base, ...o });
// Target window 14 days. Deadline = purchase + 14.
const today = "2026-11-06";
const list = [
  mk({ id: "a", purchase_date: "2026-10-26" }),                       // deadline 11-09 -> 3 days -> 3d
  mk({ id: "b", purchase_date: "2026-10-25" }),                       // deadline 11-08 -> 2 days -> 3d (catch-up)
  mk({ id: "c", purchase_date: "2026-10-23" }),                       // deadline 11-06 -> 0 days -> 1d
  mk({ id: "d", purchase_date: "2026-10-24", reminded_1d: true }),    // 1 day, already sent -> none
  mk({ id: "e", purchase_date: "2026-10-26", reminded_3d: true }),    // 3 days, already sent -> none
  mk({ id: "f", purchase_date: "2026-10-22" }),                       // closed yesterday -> none
  mk({ id: "g", purchase_date: "2026-11-03" }),                       // 11 days -> none
  mk({ id: "h", purchase_date: "2026-10-23", status: "claimed" }),   // claimed -> none
  mk({ id: "i", purchase_date: "2026-10-24", user_id: "u2" }),        // 1 day -> 1d for u2
];
const due = pickDue(list, today);
check("due ids", due.map((d) => d.id + ":" + d.kind).sort(), ["a:3d", "b:3d", "c:1d", "i:1d"]);

const groups = groupByUser(due);
check("users", [...groups.keys()].sort(), ["u1", "u2"]);
check("u1 sorted soonest first", groups.get("u1")!.map((d) => d.id), ["c", "b", "a"]);

const one = buildEmail(groups.get("u2")!, "https://pricedrop-buddy.vercel.app");
check("single last-chance subject", one.subject, "Last chance: claim any price drop on Test TV");
check("text has deadline", one.text.includes("Claim by Nov 7, 2026: 1 day left."), true);
const many = buildEmail(groups.get("u1")!, "https://pricedrop-buddy.vercel.app");
check("multi subject", many.subject, "3 purchases have refund deadlines coming up");
check("html escapes names", buildEmail([{ ...due[0], product_name: "<b>x</b>" }], "https://s").html.includes("&lt;b&gt;x&lt;/b&gt;"), true);
check("today wording", many.text.includes("today is the last day"), true);

check("note unknown", priceNote(base).kind, "unknown");
check("note drop", priceNote({ ...base, last_price: 259.99, last_checked_at: "2026-11-07T12:00:00Z", last_check_status: "ok" }).text, "Price dropped to $259.99 (checked Nov 7). You can claim $40.00.");
check("note same", priceNote({ ...base, last_price: 299.99, last_checked_at: "2026-11-07T12:00:00Z", last_check_status: "ok" }).text, "Last checked Nov 7: $299.99, no drop yet.");
check("note user no-drop", priceNote({ ...base, last_checked_at: "2026-11-07T12:00:00Z", last_check_status: "no_drop" }).kind, "same");
const emailWithDrop = buildEmail([{ ...due[0], last_price: 250, last_checked_at: "2026-11-07T12:00:00Z", last_check_status: "ok" }], "https://s");
check("reminder shows drop", emailWithDrop.text.includes("You can claim $49.99."), true);
const drop = buildDropEmail([{ ...base, deadline: "2026-11-17", days: 10, newPrice: 259.99 }], "https://s");
check("drop subject", drop.subject, "Price drop: claim $40.00 on Test TV");
check("drop text", drop.text.includes("You paid $299.99. Now $259.99. Claim $40.00."), true);
process.exit(fail);
