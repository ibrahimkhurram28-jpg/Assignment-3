// Pure helpers for the dashboard statistics. No database access here, so they
// can be unit tested on their own.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Builds one row per day for the last `days` days (oldest first, today last).
 * `series` maps a column name to a list of dates, for example
 * { created: [Date, Date], ok: [Date] }.
 */
export function buildDailySeries(days, now, series) {
  const today = startOfUtcDay(now).getTime();
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(today - i * DAY_MS));
    const row = { date: key };
    for (const name of Object.keys(series)) row[name] = 0;
    index.set(key, row);
    rows.push(row);
  }
  for (const [name, dates] of Object.entries(series)) {
    for (const value of dates) {
      const row = index.get(dayKey(value));
      if (row) row[name] += 1;
    }
  }
  return rows;
}

export function average(values) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((sum, v) => sum + v, 0) / nums.length);
}

// Returns a whole-number percentage, or null when there is nothing to divide.
export function percent(part, total) {
  if (!total) return null;
  return Math.round((part / total) * 100);
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "No data";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Picks the activity type with the highest count. `counts` looks like
 * { WORDLE: 4, WORD_SEARCH: 7 }. Returns null when every count is zero.
 */
export function mostUsed(counts) {
  let best = null;
  for (const [type, count] of Object.entries(counts)) {
    if (count > 0 && (best === null || count > best.count)) best = { type, count };
  }
  return best;
}
