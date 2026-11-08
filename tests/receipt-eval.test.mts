import { sameName, scoreReceipt, summarize } from "../src/lib/receipt-eval.ts";
import { FIXTURES } from "./fixtures/receipts.mts";

let fail = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

check("same name, different case", sameName("DEWALT 20V DRILL KIT", "Dewalt 20v drill kit"), true);
check("same name, small OCR noise", sameName("UP&UP PAPER TOWEL 6PK", "UP UP PAPER TOWEL 6PK"), true);
check("one missing word still counts", sameName("BOSE QUIETCOMFORT ULTRA EARBUDS 2ND GEN BLACK", "BOSE QUIETCOMFORT ULTRA EARBUDS 2ND GEN"), true);
check("half a wrapped name doesn't count", sameName("BOSE QUIETCOMFORT ULTRA EARBUDS 2ND GEN BLACK", "EARBUDS 2ND GEN BLACK"), false);
check("different product", sameName("HDMI CABLE 6FT", "SAMSUNG 65IN QLED TV"), false);
check("one shared word isn't enough", sameName("ORGANIC BANANAS", "ORGANIC MILK GALLON"), false);

const want = { storeId: "target", purchaseDate: "2026-11-02", orderNumber: "A-1", items: [
  { name: "TV", sku: "111", price: 10 }, { name: "LAMP", sku: "", price: 5 } ] };
const s = scoreReceipt(want, { storeId: "target", purchaseDate: "2026-11-02", orderNumber: "a-1", items: [
  { name: "TV", sku: "999", price: 10 }, { name: "BAG FEE", sku: "", price: 0.1 } ] });
check("counts", [s.itemsRight, s.itemsExtra, s.itemsMissed, s.skuRight], [1, 1, 1, 0]);
check("order number ignores case", s.orderNumber, true);
check("not perfect", s.perfect, false);
check("wrong price isn't a match", scoreReceipt(want, { ...want, items: [{ name: "TV", sku: "111", price: 11 }] }).itemsRight, 0);
check("'' and 'other' are the same store", scoreReceipt({ ...want, storeId: "" }, { ...want, storeId: "other" }).store, true);

const perfect = summarize(FIXTURES.map((f) => scoreReceipt(f.expected, f.expected)));
check("correct answers score 100%", [perfect.perfect, perfect.itemF1, perfect.skuAccuracy], [1, 1, 1]);
check("test set has 30 receipts", FIXTURES.length, 30);
check("ids are unique", new Set(FIXTURES.map((f) => f.id)).size, FIXTURES.length);

const empty = summarize([]);
check("empty summary is safe", [empty.receipts, empty.itemF1], [0, 1]);

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
