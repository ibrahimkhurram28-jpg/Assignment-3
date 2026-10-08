"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { difficultyLabel, typeLabel, typePath } from "@/lib/difficulty";
import { formatBytes } from "@/lib/metrics";
import { Notice } from "@/components/Notice";

const PAGE_SIZE = 15;

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ReportsView() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <p className="label mb-2" style={{ color: "var(--color-primary)" }}>
          Reporting
        </p>
        <h1 className="font-display text-3xl font-semibold">Reports</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
          Summaries of the stored word lists and activity configurations, and the full generation history with
          filters and CSV export.
        </p>
      </header>
      <Suspense fallback={<p>Loading reports…</p>}>
        <Reports />
      </Suspense>
    </div>
  );
}

function Reports() {
  const searchParams = useSearchParams();
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/metrics")
      .then((data) => !cancelled && setMetrics(data))
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      {error && <Notice tone="error">{error.message}</Notice>}

      <section aria-labelledby="lists-report-heading">
        <h2 id="lists-report-heading" className="font-display text-2xl font-semibold mb-4">
          Word lists
        </h2>
        <div className="card p-5 overflow-x-auto">
          {!metrics ? (
            <p>Loading…</p>
          ) : (
            <table className="data-table">
              <caption className="sr-only">Every word list with its size and use</caption>
              <thead>
                <tr>
                  <th scope="col">Word list</th>
                  <th scope="col">Description</th>
                  <th scope="col">Words</th>
                  <th scope="col">Avg phonemes per word</th>
                  <th scope="col">Activities</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {metrics.wordLists.length === 0 && (
                  <tr>
                    <td colSpan={6}>No word lists yet.</td>
                  </tr>
                )}
                {metrics.wordLists.map((list) => (
                  <tr key={list.id}>
                    <td>
                      <Link href={`/word-lists?list=${list.id}`} className="underline font-semibold">
                        {list.name}
                      </Link>
                    </td>
                    <td>{list.description || "None"}</td>
                    <td>{list.words}</td>
                    <td>{list.avgPhonemesPerWord ?? "No data"}</td>
                    <td>{list.activities}</td>
                    <td>{formatDate(list.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-labelledby="activities-report-heading">
        <h2 id="activities-report-heading" className="font-display text-2xl font-semibold mb-4">
          Activity configurations
        </h2>
        <div className="card p-5 overflow-x-auto">
          {!metrics ? (
            <p>Loading…</p>
          ) : (
            <table className="data-table">
              <caption className="sr-only">Every saved activity configuration with its generation results</caption>
              <thead>
                <tr>
                  <th scope="col">Activity</th>
                  <th scope="col">Type</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Settings</th>
                  <th scope="col">Word list</th>
                  <th scope="col">Words</th>
                  <th scope="col">Successful</th>
                  <th scope="col">Failed</th>
                  <th scope="col">Last generated</th>
                </tr>
              </thead>
              <tbody>
                {metrics.activities.length === 0 && (
                  <tr>
                    <td colSpan={9}>No activities saved yet.</td>
                  </tr>
                )}
                {metrics.activities.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`${typePath(a.type)}?activity=${a.id}`} className="underline font-semibold">
                        {a.name}
                      </Link>
                    </td>
                    <td>{typeLabel(a.type)}</td>
                    <td>{difficultyLabel(a.difficulty)}</td>
                    <td className="text-xs">
                      {a.type === "WORDLE"
                        ? `${a.maxGuesses} guesses`
                        : `${a.gridSize}×${a.gridSize}${a.allowDiagonal ? ", diagonal" : ""}${a.allowBackwards ? ", backwards" : ""}`}
                      <br />
                      Hints {a.showHints ? "on" : "off"}
                    </td>
                    <td>{a.wordList?.name ?? "None"}</td>
                    <td>{a.words}</td>
                    <td>{a.successfulGenerations}</td>
                    <td>{a.failedGenerations}</td>
                    <td>{formatDate(a.lastGeneratedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <GenerationHistory initialStatus={searchParams.get("status") ?? ""} />
    </div>
  );
}

function GenerationHistory({ initialStatus }) {
  const [status, setStatus] = useState(["SUCCESS", "FAILED"].includes(initialStatus) ? initialStatus : "");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const query = new URLSearchParams({ ...(status && { status }), ...(type && { type }) });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    api
      .get(`/api/reports/generations?${params}`)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [status, type, page]);

  return (
    <section aria-labelledby="history-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <h2 id="history-heading" className="font-display text-2xl font-semibold">
          Generation history
        </h2>
        <a href={`/api/reports/generations/csv?${query}`} className="btn btn-outline btn-sm" download>
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="label block mb-1" htmlFor="statusFilter">
            Result
          </label>
          <select
            id="statusFilter"
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All results</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div>
          <label className="label block mb-1" htmlFor="typeFilter">
            Activity type
          </label>
          <select
            id="typeFilter"
            className="input"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="WORDLE">Wordle</option>
            <option value="WORD_SEARCH">Word Search</option>
          </select>
        </div>
      </div>

      {error && <Notice tone="error">{error.message}</Notice>}

      <div className="card p-5 overflow-x-auto">
        {!data ? (
          <p>Loading…</p>
        ) : (
          <>
            <table className="data-table">
              <caption className="sr-only">Generation attempts, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Activity</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Result</th>
                  <th scope="col">Words</th>
                  <th scope="col">Size</th>
                  <th scope="col">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7}>No generations match these filters.</td>
                  </tr>
                )}
                {data.rows.map((g) => (
                  <tr key={g.id}>
                    <td>{formatDate(g.generatedAt)}</td>
                    <td>
                      {g.activityName ?? "Deleted activity"}
                      <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {g.activityType ? typeLabel(g.activityType) : ""}
                        {g.simulated ? " (simulated)" : ""}
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
                    <td>{g.wordCount}</td>
                    <td>{g.byteSize ? formatBytes(g.byteSize) : "None"}</td>
                    <td>{g.durationMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
              <p aria-live="polite">
                {data.total} result{data.total === 1 ? "" : "s"}. Page {data.page} of {data.pages}.
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>
                  Previous
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage((p) => p + 1)} disabled={data.page >= data.pages}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
