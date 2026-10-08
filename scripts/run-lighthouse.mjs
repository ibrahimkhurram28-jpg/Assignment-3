// Runs Lighthouse accessibility audits against the running app and saves an
// HTML and a JSON report for each page in lighthouse/reports/.
// Needs Google Chrome installed.
//
//   node scripts/run-lighthouse.mjs
//   node scripts/run-lighthouse.mjs --base http://localhost:3000
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000").replace(/\/$/, "");
const PAGES = [
  ["home", "/"],
  ["dashboard", "/dashboard"],
  ["reports", "/reports"],
  ["wordle", "/wordle"],
  ["wordsearch", "/wordsearch"],
  ["word-lists", "/word-lists"],
  ["activities", "/activities"],
];

const outDir = path.resolve("lighthouse/reports");
mkdirSync(outDir, { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const rows = [];

for (const [name, route] of PAGES) {
  const outBase = path.join(outDir, name);
  console.log(`\nAuditing ${base}${route}`);
  const run = spawnSync(
    npx,
    [
      "--yes", "lighthouse", `${base}${route}`,
      "--only-categories=accessibility",
      "--output=html", "--output=json", `--output-path=${outBase}`,
      "--chrome-flags=--headless=new", "--quiet",
    ],
    { stdio: "inherit", shell: process.platform === "win32" }
  );
  try {
    if (run.status !== 0) throw new Error("lighthouse failed");
    const report = JSON.parse(readFileSync(`${outBase}.report.json`, "utf8"));
    const failed = Object.values(report.audits).filter((a) => a.score === 0 && a.scoreDisplayMode === "binary").map((a) => a.id);
    rows.push({ page: route, score: Math.round(report.categories.accessibility.score * 100), failed });
  } catch {
    rows.push({ page: route, score: "error", failed: [] });
  }
}

console.log("\nAccessibility scores");
for (const r of rows) console.log(`${String(r.score).padStart(5)}  ${r.page}${r.failed.length ? `   failing: ${r.failed.join(", ")}` : ""}`);
console.log(`\nReports saved in ${outDir}`);
