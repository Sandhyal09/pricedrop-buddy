import { claimDeadline, daysLeft, urgency, todayString, formatDate } from "../src/lib/stores.ts";
const cases: [string, number, string, string, number][] = [
  // purchase, window, today, expected deadline, expected days left
  ["2026-11-03", 14, "2026-11-06", "2026-11-17", 11],   // Target example from the checklist
  ["2026-10-25", 15, "2026-11-06", "2026-11-09", 3],
  ["2026-10-01", 30, "2026-11-06", "2026-10-31", -6],
  ["2026-02-15", 14, "2026-02-28", "2026-03-01", 1],    // month boundary
  ["2026-10-25", 14, "2026-11-08", "2026-11-08", 0],    // across DST change (Nov 1)
];
let fail = 0;
for (const [p, w, t, d, n] of cases) {
  const dl = claimDeadline(p, w), left = daysLeft(dl, t);
  const ok = dl === d && left === n;
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", p, w, "->", dl, left, urgency(left));
}
console.log("today (Eastern):", todayString(), "| format:", formatDate("2026-11-17"));
process.exit(fail);
