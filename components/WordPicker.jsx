"use client";

import Link from "next/link";

// Lets the teacher choose a saved word list and tick the words to use.
// `reasonFor(word)` returns why a word cannot be used with the current settings.
export function WordPicker({
  lists,
  listId,
  onSelectList,
  words,
  selectedIds,
  onToggle,
  onSetSelection,
  reasonFor,
  loading,
  error,
  maxWords,
}) {
  if (!lists.length) {
    return (
      <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
        <p className="mb-2">No word lists yet. Create one to start building activities.</p>
        <Link href="/word-lists" className="btn btn-outline inline-block">
          Create a word list
        </Link>
      </div>
    );
  }

  const usable = words.filter((w) => !reasonFor?.(w));

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <label className="label" htmlFor="wordList">
            Word list
          </label>
          <Link href="/word-lists" className="text-xs underline" style={{ color: "var(--color-primary)" }}>
            Manage lists
          </Link>
        </div>
        <select
          id="wordList"
          className="input"
          value={listId ?? ""}
          onChange={(e) => onSelectList(e.target.value)}
        >
          {listId === null && <option value="">Choose a list</option>}
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.wordCount} word{list.wordCount === 1 ? "" : "s"})
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <legend className="label">
            Words ({selectedIds.length}
            {maxWords ? ` of max ${maxWords}` : ""})
          </legend>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              className="underline"
              onClick={() => onSetSelection(usable.slice(0, maxWords ?? usable.length).map((w) => w.id))}
            >
              Select all
            </button>
            <button type="button" className="underline" onClick={() => onSetSelection([])}>
              Clear
            </button>
          </div>
        </div>

        {loading && <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Loading words…</p>}
        {!loading && words.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            This list has no words.{" "}
            <Link href={`/word-lists?list=${listId}`} className="underline">
              Add some words
            </Link>
          </p>
        )}

        <ul className="word-picker space-y-1">
          {words.map((word) => {
            const reason = reasonFor?.(word);
            const checked = selectedIds.includes(word.id);
            return (
              <li key={word.id}>
                <label
                  className="flex items-start gap-2 text-sm rounded-md px-2 py-1"
                  style={{
                    background: checked ? "var(--color-success-bg)" : "transparent",
                    opacity: reason && !checked ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={Boolean(reason) && !checked}
                    onChange={() => onToggle(word.id)}
                  />
                  <span className="flex-1">
                    <span className="font-semibold">{word.english}</span>{" "}
                    <span className="font-mono-phoneme">/{word.phonemes.join(" ")}/</span>
                    {reason && (
                      <span className="block text-xs" style={{ color: checked ? "var(--color-danger)" : "var(--color-ink-soft)" }}>
                        {reason}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {error && (
          <p className="text-xs mt-1" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}
