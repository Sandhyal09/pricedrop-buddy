import { parseReceipt } from "../src/lib/receipt-parser.ts";

const TODAY = "2026-11-06";
let fail = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// Typical Target-style receipt text as OCR returns it
const target = `TARGET
Expect More. Pay Less.
Store 1234  555-123-4567
11/03/2026 14:22
ELECTRONICS
212-08-1234 INSIGNIA 50IN TV    NF $299.99
HOUSEHOLD
057-12-0001 BAND-AID 30CT  T  $4.49
071-04-2234 DORITOS CHIPS   T $3.79
Circle Offer           -$1.00
SUBTOTAL               $307.27
T = MN TAX 6.875%      $0.57
TOTAL                  $307.84
VISA CHARGE            $307.84
AUTH CODE 123456
REF # 9876-5432-1098`;

const t = parseReceipt(target, TODAY);
check("target store", t.storeId, "target");
check("target date", t.purchaseDate, "2026-11-03");
check("target item count", t.items.length, 3);
check("target first item", t.items[0], { name: "INSIGNIA 50IN TV", sku: "212-08-1234", price: 299.99 });
check("band-aid kept", t.items[1]?.name, "BAND-AID 30CT");
check("chips kept", t.items[2]?.name, "DORITOS CHIPS");
check("target order no", t.orderNumber, "9876-5432-1098");

const bestbuy = `BEST BUY #0451
Order Number: BBY01-806123456789
Date: Oct 28, 2026
6501234  Apple AirPods Pro 2    249.99
5432109  Geek Squad Protection   29.99
Subtotal 279.98
Sales Tax 18.20
Total 298.18
MASTERCARD ************1234`;
const b = parseReceipt(bestbuy, TODAY);
check("bestbuy store", b.storeId, "bestbuy");
check("bestbuy date", b.purchaseDate, "2026-10-28");
check("bestbuy order", b.orderNumber, "BBY01-806123456789");
check("bestbuy items", b.items.map((i) => [i.sku, i.price]), [["6501234", 249.99], ["5432109", 29.99]]);

const costco = `COSTCO WHOLESALE
#1023 Seattle
E  1234567 KS PAPER TWL   23.99 N
E  96716 ORG EGGS 24CT    8.49 N
   0000362745 /1234567     4.00-
SUBTOTAL 28.48
TOTAL 28.48
10/30/26 11:05`;
const c = parseReceipt(costco, TODAY);
check("costco store", c.storeId, "costco");
check("costco 2-digit year", c.purchaseDate, "2026-10-30");
check("costco items", c.items.map((i) => [i.name, i.price]), [["KS PAPER TWL", 23.99], ["ORG EGGS 24CT", 8.49]]);

// Future dates are ignored (e.g. a "return by" date)
const ret = parseReceipt("HOME DEPOT\nRETURN BY 02/01/2027\n11/02/2026\nDEWALT DRILL 1003456789 149.00", TODAY);
check("homedepot store", ret.storeId, "homedepot");
check("skips future return date", ret.purchaseDate, "2026-11-02");
check("homedepot item", ret.items[0], { name: "DEWALT DRILL", sku: "1003456789", price: 149 });

check("empty text", parseReceipt("", TODAY), { storeId: "", purchaseDate: "", orderNumber: "", items: [] });
process.exit(fail);
