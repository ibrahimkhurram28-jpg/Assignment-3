"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fetchActivityFile } from "@/lib/apiClient";
import { downloadBlob } from "@/lib/download";
import { ACTIVITY_TYPES, difficultyLabel, typeLabel, typePath } from "@/lib/difficulty";
import { ErrorDetails, Notice } from "@/components/Notice";

const FILTERS = [{ value: "", label: "All" }, ...ACTIVITY_TYPES];

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ActivitiesPage() {
  const [filter, setFilter] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const query = filter ? `?type=${filter}` : "";
        const rows = await api.get(`/api/activities${query}`);
        if (!cancelled) setActivities(rows);
      } catch (error) {
        if (!cancelled) setNotice({ tone: "error", error });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filter, refreshKey]);

  async function download(activity) {
    setBusyId(activity.id);
    try {
      const { blob, fileName } = await fetchActivityFile(activity.id);
      downloadBlob(fileName, blob);
      setNotice({ tone: "success", text: `Downloaded ${fileName}.` });
      setRefreshKey((n) => n + 1);
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(activity) {
    if (!window.confirm(`Delete "${activity.name}"? The word list and its words are kept.`)) return;
    setBusyId(activity.id);
    try {
      await api.delete(`/api/activities/${activity.id}`);
      setNotice({ tone: "success", text: `Deleted "${activity.name}".` });
      setRefreshKey((n) => n + 1);
    } catch (error) {
      setNotice({ tone: "error", error });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-2" style={{ color: "var(--color-primary)" }}>
            Library
          </p>
          <h1 className="font-display text-3xl font-semibold">Saved activities</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
            Every Wordle and Word Search configuration saved in the database. Open one to edit it,
            or generate a fresh HTML file from the stored settings and words.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/wordle" className="btn btn-primary">
            New Wordle
          </Link>
          <Link href="/wordsearch" className="btn btn-outline">
            New Word Search
          </Link>
        </div>
      </header>

      <div className="flex gap-2 mb-5" role="group" aria-label="Filter by type">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="btn btn-sm"
            style={
              filter === f.value
                ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                : { background: "transparent", border: "1px solid var(--color-border)" }
            }
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-5">
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text ?? notice.error?.message}
            <ErrorDetails error={notice.error} />
          </Notice>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--color-ink-soft)" }}>Loading activities…</p>
      ) : activities.length === 0 ? (
        <div className="card p-6">
          <p style={{ color: "var(--color-ink-soft)" }}>
            No saved {filter ? typeLabel(filter) : ""} activities yet. Build one and press Save activity.
          </p>
        </div>
      ) : (
        <div className="card p-2 sm:p-4 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Type</th>
                <th scope="col">Word list</th>
                <th scope="col">Settings</th>
                <th scope="col">Last generated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`${typePath(a.type)}?activity=${a.id}`} className="font-semibold underline">
                      {a.name}
                    </Link>
                    <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      Updated {formatDate(a.updatedAt)}
                    </span>
                  </td>
                  <td>{typeLabel(a.type)}</td>
                  <td>
                    {a.wordList ? (
                      <Link href={`/word-lists?list=${a.wordList.id}`} className="underline">
                        {a.wordList.name}
                      </Link>
                    ) : (
                      "None"
                    )}
                    <span className="block text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      {a.wordCount} word{a.wordCount === 1 ? "" : "s"} selected
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                    {difficultyLabel(a.difficulty)}
                    <br />
                    {a.type === "WORDLE"
                      ? `${a.maxGuesses} guesses`
                      : `${a.gridSize}×${a.gridSize}${a.allowDiagonal ? ", diagonal" : ""}${a.allowBackwards ? ", backwards" : ""}`}
                    <br />
                    Hints {a.showHints ? "on" : "off"}
                  </td>
                  <td className="text-xs">
                    {formatDate(a.lastGeneratedAt)}
                    <span className="block" style={{ color: "var(--color-ink-soft)" }}>
                      {a.generationCount} generation{a.generationCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`${typePath(a.type)}?activity=${a.id}`} className="btn btn-outline btn-sm mr-2">
                      Edit
                    </Link>
                    <a
                      href={`/api/activities/${a.id}/generate?view=inline`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm mr-2"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm mr-2"
                      onClick={() => download(a)}
                      disabled={busyId === a.id || a.wordCount === 0}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => remove(a)}
                      disabled={busyId === a.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
