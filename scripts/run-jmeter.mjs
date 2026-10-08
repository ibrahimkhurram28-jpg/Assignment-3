// Runs the JMeter load test at several staged user levels and writes a
// summary table. JMeter must be installed and on PATH (or pass --jmeter).
//
//   node scripts/run-jmeter.mjs
//   node scripts/run-jmeter.mjs --stages 1,10,100 --host localhost --port 3000
//   node scripts/run-jmeter.mjs --jmeter "C:\apache-jmeter-5.6.3\bin\jmeter.bat"
//
// Output: jmeter/results/<users>-users/{results.jtl, report/index.html}
//         jmeter/results/summary.md
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
    return pairs;
  }, [])
);

const RAMP_UP = { 1: 1, 10: 5, 100: 20, 1000: 60, 10000: 120 };
const stages = (args.stages || "1,10,100,1000,10000").split(",").map((n) => Number(n.trim())).filter(Boolean);
const host = args.host || "localhost";
const port = args.port || "3000";
const jmeter = args.jmeter || "jmeter";
const plan = path.resolve("jmeter/phoneme-builder-load.jmx");
const resultsRoot = path.resolve("jmeter/results");
mkdirSync(resultsRoot, { recursive: true });

// Reads one CSV line, handling quoted cells.
function splitCsv(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(cell); cell = ""; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

function summarise(jtlPath) {
  const lines = readFileSync(jtlPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  const col = (name) => header.indexOf(name);
  const rows = lines.slice(1).map(splitCsv);
  const elapsed = rows.map((r) => Number(r[col("elapsed")])).sort((a, b) => a - b);
  const failures = rows.filter((r) => r[col("success")] !== "true").length;
  const stamps = rows.map((r) => Number(r[col("timeStamp")]));
  const seconds = Math.max(1, (Math.max(...stamps) - Math.min(...stamps)) / 1000);
  const pct = (p) => elapsed[Math.min(elapsed.length - 1, Math.floor(elapsed.length * p))] ?? 0;
  return {
    samples: rows.length,
    errorRate: rows.length ? (failures / rows.length) * 100 : 0,
    avg: elapsed.length ? elapsed.reduce((a, b) => a + b, 0) / elapsed.length : 0,
    p95: pct(0.95),
    max: elapsed[elapsed.length - 1] ?? 0,
    throughput: rows.length / seconds,
  };
}

const summary = [];
for (const users of stages) {
  const dir = path.join(resultsRoot, `${users}-users`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const jtl = path.join(dir, "results.jtl");
  const rampup = RAMP_UP[users] ?? Math.max(1, Math.round(users / 10));

  console.log(`\n=== ${users} users (ramp-up ${rampup}s) against http://${host}:${port} ===`);
  const run = spawnSync(
    jmeter,
    [
      "-n", "-t", plan,
      `-Jusers=${users}`, `-Jrampup=${rampup}`, "-Jloops=1", `-Jhost=${host}`, `-Jport=${port}`,
      "-Jjmeter.save.saveservice.output_format=csv",
      "-l", jtl, "-e", "-o", path.join(dir, "report"),
    ],
    { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, JVM_ARGS: process.env.JVM_ARGS || "-Xms1g -Xmx4g" } }
  );
  if (run.error || run.status !== 0 || !existsSync(jtl)) {
    console.error(`JMeter did not complete for ${users} users. Is JMeter installed and on PATH?`);
    summary.push({ users, failed: true });
    continue;
  }
  summary.push({ users, rampup, ...summarise(jtl) });
}

const lines = [
  "# JMeter results",
  "",
  `Target: http://${host}:${port}. Workflow per user: create list, add word, save Wordle, list activities, view and download the generated file, read metrics and /health, delete the list.`,
  "",
  "| Users | Ramp-up (s) | Samples | Error rate | Avg (ms) | 95th percentile (ms) | Max (ms) | Throughput (req/s) |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...summary.map((s) =>
    s.failed
      ? `| ${s.users} | | not completed | | | | | |`
      : `| ${s.users} | ${s.rampup} | ${s.samples} | ${s.errorRate.toFixed(2)}% | ${s.avg.toFixed(0)} | ${s.p95} | ${s.max} | ${s.throughput.toFixed(1)} |`
  ),
  "",
];
writeFileSync(path.join(resultsRoot, "summary.md"), lines.join("\n"));
console.log(`\n${lines.join("\n")}`);
