import { cleanPhone, formatPhone } from "../src/lib/phone.ts";
const cases: [string, string | null | false][] = [["", null], ["(555) 123-4567", "5551234567"], ["+1 555 123 4567", "+15551234567"], ["12", false], ["+91 98765 43210", "+919876543210"], ["1234567890123456", false]];
let ok = 0;
for (const [i, e] of cases) { const r = cleanPhone(i); if (r === e) ok++; else console.log("FAIL", i, r, e); }
for (const [i, e] of [["5551234567", "(555) 123-4567"], ["+15551234567", "(555) 123-4567"], ["+919876543210", "+919876543210"], [null, ""]] as const) { const r = formatPhone(i); if (r === e) ok++; else console.log("FAIL", i, r, e); }
console.log(ok, "pass");
process.exit(ok === 10 ? 0 : 1);
