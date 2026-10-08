import test from "node:test";
import assert from "node:assert/strict";
import { average, buildDailySeries, formatBytes, formatDuration, mostUsed, percent } from "../../lib/metrics.js";

test("buildDailySeries returns one row per day, oldest first, with counts", () => {
  const now = new Date("2026-10-08T10:00:00Z");
  const rows = buildDailySeries(3, now, {
    created: [new Date("2026-10-08T01:00:00Z"), new Date("2026-10-06T23:00:00Z"), new Date("2026-09-01T00:00:00Z")],
    ok: [new Date("2026-10-07T12:00:00Z")],
  });
  assert.deepEqual(rows.map((r) => r.date), ["2026-10-06", "2026-10-07", "2026-10-08"]);
  assert.deepEqual(rows.map((r) => r.created), [1, 0, 1]);
  assert.deepEqual(rows.map((r) => r.ok), [0, 1, 0]);
});

test("average ignores bad values and returns null for no data", () => {
  assert.equal(average([]), null);
  assert.equal(average([1000, 2000, null, undefined]), 1500);
});

test("percent handles an empty total", () => {
  assert.equal(percent(0, 0), null);
  assert.equal(percent(9, 10), 90);
});

test("formatDuration and formatBytes are readable", () => {
  assert.equal(formatDuration(null), "No data");
  assert.equal(formatDuration(850), "850 ms");
  assert.equal(formatDuration(12300), "12.3 s");
  assert.equal(formatDuration(125000), "2 min 05 s");
  assert.equal(formatBytes(0), "0 KB");
  assert.equal(formatBytes(2048), "2.0 KB");
});

test("mostUsed picks the highest count and ignores zeros", () => {
  assert.equal(mostUsed({ WORDLE: 0, WORD_SEARCH: 0 }), null);
  assert.deepEqual(mostUsed({ WORDLE: 4, WORD_SEARCH: 7 }), { type: "WORD_SEARCH", count: 7 });
});
