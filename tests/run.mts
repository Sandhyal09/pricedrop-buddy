// Runs every *.test.mts file in this folder and fails if any of them fails.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".test.mts")).sort();
const failed: string[] = [];

for (const file of files) {
  const run = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", join(dir, file)], {
    encoding: "utf8",
  });
  const ok = run.status === 0;
  if (!ok) failed.push(file);
  console.log(`${ok ? "✓" : "✗"} ${file}`);
  if (!ok) console.log(run.stdout + run.stderr);
}

console.log(`\n${files.length - failed.length} of ${files.length} test files passed.`);
process.exit(failed.length ? 1 : 0);
