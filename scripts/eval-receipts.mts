// Scores the receipt readers on the labelled test set in tests/fixtures.
//
//   npm run eval                 rules only (no key needed)
//   AI_API_KEY=... npm run eval  rules, AI, and AI-with-fallback side by side
//   npm run eval -- --write      also saves the report to docs/receipt-eval.md
//
// On GitHub: Actions -> Receipt reader score -> Run workflow.

import { writeFileSync, appendFileSync } from "node:fs";
import { FIXTURES } from "../tests/fixtures/receipts.mts";
import { parseReceipt } from "../src/lib/receipt-parser.ts";
import { aiConfigFromEnv, readReceiptText } from "../src/lib/ai-receipt.ts";
import { scoreReceipt, summarize, type ReceiptScore, type Summary } from "../src/lib/receipt-eval.ts";

type Run = { label: string; scores: ReceiptScore[]; ms: number[]; fallbacks: number; dropped: number };

const config = aiConfigFromEnv(process.env);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ruleRun: Run = { label: "Rules", scores: [], ms: [], fallbacks: 0, dropped: 0 };
const aiRun: Run = { label: "AI + fallback", scores: [], ms: [], fallbacks: 0, dropped: 0 };

for (const f of FIXTURES) {
  let start = performance.now();
  ruleRun.scores.push(scoreReceipt(f.expected, parseReceipt(f.text, f.today)));
  ruleRun.ms.push(performance.now() - start);

  if (!config) continue;
  start = performance.now();
  const result = await readReceiptText(f.text, f.today, config, parseReceipt);
  aiRun.ms.push(performance.now() - start);
  aiRun.scores.push(scoreReceipt(f.expected, result.receipt));
  aiRun.dropped += result.dropped.length;
  if (result.method === "rules") {
    aiRun.fallbacks++;
    console.log(`  ${f.id}: AI failed (${result.fallbackReason}), used rules`);
  }
  for (const d of result.dropped) console.log(`  ${f.id}: check removed ${d}`);
  await pause(Number(process.env.EVAL_PAUSE_MS ?? 2500)); // stay under the free plan's 30 requests a minute
}

const runs = config ? [ruleRun, aiRun] : [ruleRun];
const sums = runs.map((r) => summarize(r.scores));

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ROWS: [string, (s: Summary) => string][] = [
  ["Receipts fully right", (s) => pct(s.perfect)],
  ["Store", (s) => pct(s.store)],
  ["Purchase date", (s) => pct(s.date)],
  ["Order number", (s) => pct(s.orderNumber)],
  ["Items found that are real (precision)", (s) => pct(s.itemPrecision)],
  ["Real items found (recall)", (s) => pct(s.itemRecall)],
  ["Item F1", (s) => s.itemF1.toFixed(2)],
  ["SKU right, of items found", (s) => pct(s.skuAccuracy)],
];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

const lines = [
  `# Receipt reader score`,
  ``,
  `${FIXTURES.length} labelled receipts from [\`tests/fixtures/receipts.mts\`](../tests/fixtures/receipts.mts).` +
    (config ? ` AI model: \`${config.model}\`.` : ` AI not measured: no \`AI_API_KEY\` was set.`),
  ``,
  `| Measure | ${runs.map((r) => r.label).join(" | ")} |`,
  `| --- | ${runs.map(() => "---").join(" | ")} |`,
  ...ROWS.map(([name, f]) => `| ${name} | ${sums.map(f).join(" | ")} |`),
  `| Median time per receipt | ${runs.map((r) => `${Math.round(median(r.ms))} ms`).join(" | ")} |`,
  ...(config
    ? [
        `| Fell back to rules | – | ${aiRun.fallbacks} of ${FIXTURES.length} |`,
        `| Answers removed by the checks | – | ${aiRun.dropped} |`,
      ]
    : []),
  ``,
  `## Receipt by receipt`,
  ``,
  `| Receipt | What it tests | ${runs.map((r) => r.label).join(" | ")} |`,
  `| --- | --- | ${runs.map(() => ":---:").join(" | ")} |`,
  ...FIXTURES.map(
    (f, i) => `| \`${f.id}\` | ${f.note} | ${runs.map((r) => (r.scores[i].perfect ? "✅" : "❌")).join(" | ")} |`,
  ),
  ``,
  `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run eval\`.`,
];
const report = lines.join("\n") + "\n";

console.log("\n" + report);
if (process.argv.includes("--write")) {
  writeFileSync(new URL("../docs/receipt-eval.md", import.meta.url), report);
  console.log("Saved docs/receipt-eval.md");
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
