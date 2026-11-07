import { matchRadar, buildRadarEmail } from "../scripts/reminders-core.mts";
let fail = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};
const base = {
  id: "p", user_id: "u1", store_id: "target", store_name: "Target", product_name: "AirPods Pro 2",
  product_url: "https://www.target.com/p/-/A-85978622", price_paid: 249.99, purchase_date: "2026-11-01",
  window_days: 14, status: "tracking", reminded_3d: false, reminded_1d: false, last_price: null,
  last_checked_at: null, last_check_status: null, item_key: "target:85978622", community_alerted_price: null,
  deadline: "2026-11-15", days: 8,
};
const mk = (o: object) => ({ ...base, ...o });
const reports = [
  { item_key: "target:85978622", price: 199.99, source: "user" as const, reported_at: "2026-11-07T10:00:00Z", reporter_id: "u2" },
  { item_key: "target:85978622", price: 189.99, source: "user" as const, reported_at: "2026-11-07T11:00:00Z", reporter_id: "u1" },
  { item_key: "costco:1", price: 20, source: "auto" as const, reported_at: "2026-11-07T11:00:00Z", reporter_id: null },
];
const purchases = [
  mk({ id: "a" }),                                             // u1: own 189.99 report ignored -> 199.99 from u2
  mk({ id: "b", user_id: "u3" }),                              // u3: best is 189.99
  mk({ id: "c", user_id: "u4", price_paid: 179.99 }),          // paid less than reports -> none
  mk({ id: "d", user_id: "u5", community_alerted_price: 189.99 }), // already alerted at 189.99 -> none
  mk({ id: "e", user_id: "u6", days: -1 }),                    // window closed -> none
  mk({ id: "f", user_id: "u7", status: "claimed" }),           // claimed -> none
  mk({ id: "g", user_id: "u8", item_key: "costco:1", store_id: "costco", store_name: "Costco", price_paid: 23.99 }),
  mk({ id: "h", user_id: "u9", community_alerted_price: 199.99 }), // alerted at 199.99, now 189.99 lower -> alert
];
const m = matchRadar(purchases as never[], reports);
check("matches", m.map((x) => `${x.id}:${x.spottedPrice}`), ["a:199.99", "b:189.99", "g:20", "h:189.99"]);
const email = buildRadarEmail([m[1]], "https://s", Date.parse("2026-11-07T14:00:00Z"));
check("subject", email.subject, "Price Radar: AirPods Pro 2 spotted for $189.99");
check("text who/when", email.text.includes("A PriceDrop Buddy shopper saw $189.99 3 hours ago. You paid $249.99: up to $60.00 back."), true);
const robot = buildRadarEmail([m[2]], "https://s", Date.parse("2026-11-07T11:20:00Z"));
check("robot wording", robot.text.includes("Our price checker saw $20.00 less than an hour ago."), true);
process.exit(fail);
