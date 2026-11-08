import { aiConfigFromEnv, checkAnswer, readReceiptText, readWithAi, type AiConfig } from "../src/lib/ai-receipt.ts";
import { parseReceipt } from "../src/lib/receipt-parser.ts";
import { FIXTURES } from "./fixtures/receipts.mts";

const TODAY = "2026-11-08";
let fail = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const text = `TARGET
11/02/2026
212-08-1234 INSIGNIA TV $279.99
REC# 2-4471-0213
TOTAL $299.11`;

// --- the checks keep what the text supports and drop what it doesn't ---
const c = checkAnswer(
  {
    storeId: "target",
    purchaseDate: "2026-11-02",
    orderNumber: "2-4471-0213",
    items: [
      { name: "INSIGNIA TV", sku: "212-08-1234", price: 279.99 },
      { name: "MADE UP SPEAKER", sku: "", price: 49.99 },
      { name: "INSIGNIA TV", sku: "999-99-9999", price: 279.99 },
    ],
  },
  text,
  TODAY,
)!;
check("real item kept", c.receipt.items[0], { name: "INSIGNIA TV", sku: "212-08-1234", price: 279.99 });
check("invented price dropped", c.receipt.items.length, 2);
check("invented SKU cleared", c.receipt.items[1].sku, "");
check("order number kept", c.receipt.orderNumber, "2-4471-0213");
check("reasons recorded", c.dropped.length, 2);

const bad = checkAnswer(
  { storeId: "walmart", purchaseDate: "2027-01-01", orderNumber: "XYZ-123456", items: "nope" },
  text,
  TODAY,
)!;
check("unknown store becomes empty", bad.receipt.storeId, "");
check("future date removed", bad.receipt.purchaseDate, "");
check("invented order number removed", bad.receipt.orderNumber, "");
check("non-list items ignored", bad.receipt.items, []);
check("'none' store becomes empty", checkAnswer({ storeId: "none", items: [] }, text, TODAY)!.receipt.storeId, "");
check("impossible date removed", checkAnswer({ purchaseDate: "2026-02-30", items: [] }, text, TODAY)!.receipt.purchaseDate, "");
check("very old date removed", checkAnswer({ purchaseDate: "2019-03-14", items: [] }, "x 2019-03-14", TODAY)!.receipt.purchaseDate, "");
check("non-object rejected", checkAnswer("hello", text, TODAY), null);

// The checks must never throw away a correct answer.
let keptAll = true;
for (const f of FIXTURES) {
  const k = checkAnswer({ ...f.expected, storeId: f.expected.storeId || "none" }, f.text, f.today)!;
  if (k.dropped.length || JSON.stringify(k.receipt) !== JSON.stringify(f.expected)) {
    keptAll = false;
    console.log("   dropped from", f.id, k.dropped);
  }
}
check("checks keep every correct answer in the test set", keptAll, true);

// --- talking to the model (with a fake API) ---
type Seen = { body?: Record<string, any>; auth?: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
function fakeApi(status: number, content: string, seen: Seen = {}) {
  return (async (_url: string, init: RequestInit) => {
    seen.body = JSON.parse(String(init.body));
    seen.auth = (init.headers as Record<string, string>).Authorization;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
  }) as unknown as typeof fetch;
}
const answer = JSON.stringify({ storeId: "target", purchaseDate: "2026-11-02", orderNumber: "", items: [{ name: "INSIGNIA TV", sku: "", price: 279.99 }] });
const base: AiConfig = { apiKey: "test-key", baseUrl: "https://api.example.com/v1", model: "openai/gpt-oss-20b", timeoutMs: 1000 };

const seen: Seen = {};
const ok = await readWithAi(text, TODAY, { ...base, fetchImpl: fakeApi(200, answer, seen) });
check("good reply accepted", ok.ok && ok.checked.receipt.items.length, 1);
check("strict JSON schema requested", seen.body!.response_format.json_schema.strict, true);
check("temperature 0", seen.body!.temperature, 0);
check("today given to the model", seen.body!.messages[0].content.includes(TODAY), true);
check("key sent as bearer token", seen.auth, "Bearer test-key");

const limited = await readWithAi(text, TODAY, { ...base, fetchImpl: fakeApi(429, "") });
check("rate limit reported", !limited.ok && limited.error.startsWith("rate limited"), true);
const garbage = await readWithAi(text, TODAY, { ...base, fetchImpl: fakeApi(200, "not json") });
check("bad JSON reported", !garbage.ok && garbage.error, "the reply wasn't valid JSON");
const timeout = await readWithAi(text, TODAY, {
  ...base,
  fetchImpl: (async () => { const e = new Error("t"); e.name = "TimeoutError"; throw e; }) as unknown as typeof fetch,
});
check("timeout reported", !timeout.ok && timeout.error, "timed out");

// --- falling back to the rules ---
const off = await readReceiptText(text, TODAY, null, parseReceipt);
check("AI off uses rules", off.method, "rules");
const fallback = await readReceiptText(text, TODAY, { ...base, fetchImpl: fakeApi(500, "") }, parseReceipt);
check("AI error falls back to rules", [fallback.method, fallback.receipt.items.length > 0, !!fallback.fallbackReason], ["rules", true, true]);
const smart = await readReceiptText(text, TODAY, { ...base, fetchImpl: fakeApi(200, answer) }, parseReceipt);
check("AI used when it works", smart.method, "ai");

// --- settings from the environment ---
check("no key means AI off", aiConfigFromEnv({}), null);
const cfg = aiConfigFromEnv({ AI_API_KEY: " k ", AI_BASE_URL: "https://x.test/v1/" })!;
check("defaults and trimming", [cfg.apiKey, cfg.baseUrl, cfg.model], ["k", "https://x.test/v1", "openai/gpt-oss-20b"]);

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
