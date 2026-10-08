"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { difficultyLabel, typeLabel, typePath } from "@/lib/difficulty";
import { formatBytes, formatDuration } from "@/lib/metrics";
import { Notice } from "@/components/Notice";
import { StatCard } from "./StatCard";
import { HBars } from "./Bars";
import { DailyChart } from "./DailyChart";
import { AlertList } from "./AlertList";

const REFRESH_MS = 15000;
const OK_COLOR = "var(--color-primary)";
const FAIL_COLOR = "var(--color-danger)";

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// GET /health is read separately so a 503 can be shown instead of thrown away.
async function readHealth() {
  const started = performance.now();
  try {
    const response = await fetch("/health", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return { ...body, httpStatus: response.status, roundTripMs: Math.round(performance.now() - started) };
  } catch {
    return { status: "unreachable", httpStatus: 0, roundTripMs: null };
  }
}

export function DashboardView() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);
  const [auto, setAuto] = useState(true);
  const [checkedAt, setCheckedAt] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const healthResult = await readHealth();
      if (cancelled) return;
      setHealth(healthResult);
      try {
        const [m, a] = await Promise.all([api.get("/api/metrics"), api.get("/api/alerts")]);
        if (cancelled) return;
        setMetrics(m);
        setAlerts(a);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) setLoadError(error);
      }
      if (!cancelled) setCheckedAt(new Date());
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!auto) return undefined;
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [auto, refresh]);

  async function addSimulated() {
    setBusy("adding");
    try {
      const result = await api.post("/api/simulate", {});
      setNotice({
        tone: "success",
        text: `Added ${result.activities} simulated activities, ${result.generations} generations (${result.failedGenerations} failed) and ${result.pageVisits} page visits.`,
      });
      refresh();
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setBusy(null);
    }
  }

  async function clearSimulated() {
    if (!window.confirm("Remove all simulated activities, generations and page visits? Your real records are kept.")) return;
    setBusy("clearing");
    try {
      const result = await api.delete("/api/simulate");
      setNotice({
        tone: "success",
        text: `Removed ${result.activities} simulated activities, ${result.generations} generation records and ${result.pageVisits} page visits.`,
      });
      refresh();
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setBusy(null);
    }
  }

  const healthy = health?.httpStatus === 200 && health?.status === "ok";
  const sim = metrics?.simulated;
  const simTotal = sim ? sim.activities + sim.generations + sim.pageVisits : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-2" style={{ color: "var(--color-primary)" }}>
            Operations
          </p>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
            System health, usage statistics and alerts for the builder. Every figure is read from the database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Refresh every 15 seconds
          </label>
          <button type="button" className="btn btn-outline" onClick={refresh}>
            Refresh now
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mb-6">
          <Notice tone="error">Could not load the dashboard data. {loadError.message}</Notice>
        </div>
      )}
      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text ?? notice.error?.message}
          </Notice>
        </div>
      )}

      <section aria-labelledby="health-heading" className="mb-10">
        <h2 id="health-heading" className="font-display text-2xl font-semibold mb-4">
          System health
        </h2>
        <div className="card p-5 flex flex-wrap items-start justify-between gap-6" data-testid="health-panel">
          {!health ? (
            <p style={{ color: "var(--color-ink-soft)" }}>Checking health…</p>
          ) : (
            <>
              <div>
                <p
                  className="pill"
                  data-testid="health-status"
                  style={{ color: healthy ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  <span aria-hidden="true">{healthy ? "●" : "▲"}</span>
                  {healthy ? "Healthy" : health.httpStatus === 0 ? "Unreachable" : "Unhealthy"}
                </p>
                <p className="mt-3 text-sm">
                  <code className="font-mono-phoneme">GET /health</code> returned{" "}
                  <strong data-testid="health-http">{health.httpStatus === 200 ? "200 OK" : health.httpStatus || "no response"}</strong>
                </p>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="label">Database</dt>
                  <dd>{health.database?.status ?? "unknown"}</dd>
                </div>
                <div>
                  <dt className="label">Database query</dt>
                  <dd>{health.database?.responseTimeMs != null ? `${health.database.responseTimeMs} ms` : "No data"}</dd>
                </div>
                <div>
                  <dt className="label">Uptime</dt>
                  <dd>{health.uptimeSeconds != null ? formatDuration(health.uptimeSeconds * 1000) : "No data"}</dd>
                </div>
                <div>
                  <dt className="label">Version</dt>
                  <dd>{health.version ?? "No data"}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
        {checkedAt && (
          <p className="text-xs mt-2" style={{ color: "var(--color-ink-soft)" }}>
            Last checked {checkedAt.toLocaleTimeString()}.
          </p>
        )}
      </section>

      <section aria-labelledby="alerts-heading" className="mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="alerts-heading" className="font-display text-2xl font-semibold">
            Alerts
          </h2>
          {alerts && (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }} data-testid="alert-counts">
              {alerts.counts.critical} critical, {alerts.counts.warning} warning, {alerts.counts.info} info
            </p>
          )}
        </div>
        <div aria-live="polite">{alerts ? <AlertList alerts={alerts.alerts} /> : <p>Loading alerts…</p>}</div>
      </section>

      {!metrics ? (
        !loadError && <p style={{ color: "var(--color-ink-soft)" }}>Loading statistics…</p>
      ) : (
        <Statistics metrics={metrics} />
      )}

      <section aria-labelledby="sim-heading" className="card p-5 mt-10">
        <h2 id="sim-heading" className="font-display text-xl font-semibold mb-2">
          Simulated input records
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
          Adds activities, generations (about 1 in 12 fail) and page visits spread over the last 14 days, so the
          dashboard has data to report on. Simulated rows are flagged in the database and can be removed again.
          {metrics && simTotal > 0
            ? ` Currently stored: ${sim.activities} activities, ${sim.generations} generations, ${sim.pageVisits} page visits.`
            : " None are stored right now."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={addSimulated} disabled={Boolean(busy)}>
            {busy === "adding" ? "Adding…" : "Add simulated data"}
          </button>
          <button type="button" className="btn btn-danger" onClick={clearSimulated} disabled={Boolean(busy) || simTotal === 0}>
            {busy === "clearing" ? "Removing…" : "Clear simulated data"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Statistics({ metrics }) {
  const { totals, generation, usage, byType, byDifficulty, topPhonemes, daily } = metrics;
  const top = usage.mostUsedType;

  return (
    <>
      <section aria-labelledby="stats-heading" className="mb-10">
        <h2 id="stats-heading" className="font-display text-2xl font-semibold mb-4">
          Key statistics
        </h2>
        <dl className="stat-grid">
          <StatCard id="word-lists" label="Word lists" value={totals.wordLists} note={`${totals.words} words stored`} />
          <StatCard id="activities-created" label="Activities created" value={totals.activities} note={`${totals.wordle} Wordle, ${totals.wordSearch} Word Search`} />
          <StatCard
            id="most-used-type"
            label="Most-used activity type"
            value={top ? typeLabel(top.type) : "No data"}
            note={top ? `${top.count} ${top.basis}` : "Nothing generated yet"}
          />
          <StatCard
            id="successful-generations"
            label="Successful generations"
            value={generation.success}
            note={`${generation.last24h.success} in the last 24 hours`}
          />
          <StatCard
            id="failed-generations"
            label="Failed generations"
            value={generation.failed}
            note={`${generation.last24h.failed} in the last 24 hours`}
            tone={generation.failed > 0 ? "var(--color-danger)" : undefined}
          />
          <StatCard
            id="success-rate"
            label="Success rate"
            value={generation.successRate === null ? "No data" : `${generation.successRate}%`}
            note={`${generation.total} attempts`}
          />
          <StatCard
            id="avg-time-on-page"
            label="Average time on page"
            value={formatDuration(usage.avgTimeOnPageMs)}
            note={`${usage.pageVisits} page views recorded`}
          />
          <StatCard
            id="generated-output"
            label="Total generated output"
            value={formatBytes(generation.totalBytes)}
            note={`${generation.totalWords} words across all files`}
          />
          <StatCard
            id="avg-generation-time"
            label="Average generation time"
            value={generation.avgDurationMs === null ? "No data" : `${generation.avgDurationMs} ms`}
            note="Server time to build the HTML"
          />
        </dl>
      </section>

      <section aria-labelledby="time-heading" className="mb-10">
        <h2 id="time-heading" className="font-display text-2xl font-semibold mb-4">
          Activity over time
        </h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <DailyChart
              title="Generations per day"
              rows={daily}
              series={[
                { key: "generationsOk", label: "Successful", color: OK_COLOR },
                { key: "generationsFailed", label: "Failed", color: FAIL_COLOR },
              ]}
            />
          </div>
          <div className="card p-5">
            <DailyChart
              title="Activities created per day"
              rows={daily}
              series={[{ key: "activitiesCreated", label: "Activities created", color: OK_COLOR }]}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="usage-heading" className="mb-10">
        <h2 id="usage-heading" className="font-display text-2xl font-semibold mb-4">
          Usage breakdown
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Successful generations by type</h3>
            <HBars
              label="Successful generations by activity type"
              items={byType.map((t) => ({
                label: typeLabel(t.type),
                value: t.generations,
                detail: t.failedGenerations ? `(${t.failedGenerations} failed)` : "",
              }))}
              emptyText="No generations recorded yet."
            />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Activities by difficulty</h3>
            <HBars
              label="Saved activities by difficulty"
              items={byDifficulty.map((d) => ({ label: difficultyLabel(d.difficulty), value: d.count }))}
              emptyText="No activities saved yet."
            />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Most-used phonemes</h3>
            <HBars
              label="Phonemes used in the most words"
              items={topPhonemes.map((p) => ({ label: `/${p.symbol}/ (${p.label})`, value: p.count, detail: p.count === 1 ? "word" : "words" }))}
              emptyText="No words stored yet."
            />
          </div>
        </div>
        <div className="card p-5 mt-6 overflow-x-auto">
          <h3 className="font-semibold mb-3">Time on page</h3>
          {usage.byPage.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              No page views recorded yet. They are recorded as pages are used.
            </p>
          ) : (
            <table className="data-table">
              <caption className="sr-only">Page views and average time on page for each page</caption>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Page views</th>
                  <th scope="col">Average time on page</th>
                </tr>
              </thead>
              <tbody>
                {usage.byPage.map((row) => (
                  <tr key={row.path}>
                    <td className="font-mono-phoneme">{row.path}</td>
                    <td>{row.visits}</td>
                    <td>{formatDuration(row.avgTimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-labelledby="lists-heading" className="mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="lists-heading" className="font-display text-2xl font-semibold">
            Stored word lists and activity configurations
          </h2>
          <Link href="/reports" className="underline font-semibold text-sm" style={{ color: "var(--color-primary)" }}>
            Open full reports
          </Link>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5 overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">Word lists with word and activity counts</caption>
              <thead>
                <tr>
                  <th scope="col">Word list</th>
                  <th scope="col">Words</th>
                  <th scope="col">Avg phonemes</th>
                  <th scope="col">Activities</th>
                </tr>
              </thead>
              <tbody>
                {metrics.wordLists.length === 0 && (
                  <tr>
                    <td colSpan={4}>No word lists yet.</td>
                  </tr>
                )}
                {metrics.wordLists.map((list) => (
                  <tr key={list.id}>
                    <td>
                      <Link href={`/word-lists?list=${list.id}`} className="underline font-semibold">
                        {list.name}
                      </Link>
                    </td>
                    <td>{list.words}</td>
                    <td>{list.avgPhonemesPerWord ?? "No data"}</td>
                    <td>{list.activities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card p-5 overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">Saved activity configurations with generation results</caption>
              <thead>
                <tr>
                  <th scope="col">Activity</th>
                  <th scope="col">Settings</th>
                  <th scope="col">Words</th>
                  <th scope="col">OK / failed</th>
                </tr>
              </thead>
              <tbody>
                {metrics.activities.length === 0 && (
                  <tr>
                    <td colSpan={4}>No activities saved yet.</td>
                  </tr>
                )}
                {metrics.activities.slice(0, 8).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`${typePath(a.type)}?activity=${a.id}`} className="underline font-semibold">
                        {a.name}
                      </Link>
                      <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {typeLabel(a.type)}
                      </span>
                    </td>
                    <td className="text-xs">
                      {difficultyLabel(a.difficulty)}
                      <br />
                      {a.type === "WORDLE" ? `${a.maxGuesses} guesses` : `${a.gridSize}×${a.gridSize} grid`}
                    </td>
                    <td>{a.words}</td>
                    <td>
                      {a.successfulGenerations} / {a.failedGenerations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.activities.length > 8 && (
              <p className="text-xs mt-2" style={{ color: "var(--color-ink-soft)" }}>
                Showing 8 of {metrics.activities.length}. The reports page lists them all.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="font-display text-2xl font-semibold mb-4">
          Recent generations
        </h2>
        <div className="card p-5 overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">The eight most recent generation attempts</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Activity</th>
                <th scope="col">Kind</th>
                <th scope="col">Result</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentGenerations.length === 0 && (
                <tr>
                  <td colSpan={5}>Nothing has been generated yet.</td>
                </tr>
              )}
              {metrics.recentGenerations.map((g) => (
                <tr key={g.id}>
                  <td>{formatDate(g.generatedAt)}</td>
                  <td>
                    {g.activityName ?? "Deleted activity"}
                    <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {g.activityType ? typeLabel(g.activityType) : ""}
                    </span>
                  </td>
                  <td>{g.kind === "VIEW" ? "View" : "Download"}</td>
                  <td>
                    <span style={{ color: g.status === "SUCCESS" ? "var(--color-success)" : "var(--color-danger)", fontWeight: 700 }}>
                      {g.status === "SUCCESS" ? "Success" : "Failed"}
                    </span>
                    {g.errorMessage && (
                      <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {g.errorMessage}
                      </span>
                    )}
                  </td>
                  <td>{g.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
