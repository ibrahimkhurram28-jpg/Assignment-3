"use client";

import { Suspense, useState } from "react";
import { useActivityBuilder } from "@/hooks/useActivityBuilder";
import { LIMITS } from "@/lib/difficulty";
import { WordPicker } from "@/components/WordPicker";
import { ActivityDetailsFields, OutputFields, SaveBar } from "@/components/ActivityControls";
import { FieldError } from "@/components/Notice";
import { WordlePreview } from "@/components/WordlePreview";

const DEFAULTS = {
  name: "",
  difficulty: "MEDIUM",
  showHints: true,
  maxGuesses: 6,
  title: "Phoneme'le",
  authorName: "Ibrahim Khurram",
  authorNumber: "21561062",
  fileName: "",
};

function wordleReason(word) {
  const { min, max } = LIMITS.wordleWordPhonemes;
  const n = word.phonemes.length;
  return n < min || n > max ? `Has ${n} phoneme${n === 1 ? "" : "s"}. Wordle needs ${min} to ${max}.` : null;
}

export default function WordlePage() {
  return (
    <Suspense fallback={<PageShell><p>Loading builder…</p></PageShell>}>
      <WordleBuilder />
    </Suspense>
  );
}

function PageShell({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <p className="label mb-2" style={{ color: "var(--color-primary)" }}>
          Builder
        </p>
        <h1 className="font-display text-3xl font-semibold">Wordle activity</h1>
        <p className="mt-2" style={{ color: "var(--color-ink-soft)" }}>
          Choose target words from a saved word list. Students guess each word phoneme by phoneme,
          with Wordle-style colour feedback, then move on to the next word.
        </p>
      </header>
      {children}
    </div>
  );
}

function WordleBuilder() {
  const builder = useActivityBuilder("WORDLE", DEFAULTS, wordleReason);
  const { settings, update, selectedWords, fieldErrors, loading } = builder;
  const [previewId, setPreviewId] = useState(null);

  const previewWord = selectedWords.find((w) => w.id === previewId) ?? selectedWords[0] ?? null;
  const answer = previewWord?.phonemes ?? [];

  if (loading) {
    return (
      <PageShell>
        <p style={{ color: "var(--color-ink-soft)" }}>Loading word lists…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="grid lg:grid-cols-[24rem_1fr] gap-8">
        <form
          className="card p-5 space-y-5 h-fit"
          onSubmit={(e) => {
            e.preventDefault();
            builder.save();
          }}
          aria-label="Wordle activity settings"
        >
          <ActivityDetailsFields builder={builder} />

          <WordPicker
            lists={builder.lists}
            listId={builder.listId}
            onSelectList={builder.selectList}
            words={builder.words}
            selectedIds={builder.wordIds}
            onToggle={builder.toggleWord}
            onSetSelection={builder.setSelection}
            reasonFor={wordleReason}
            loading={builder.wordsLoading}
            error={fieldErrors.wordIds || fieldErrors.wordListId}
            maxWords={LIMITS.wordleWords.max}
          />

          <div>
            <label className="label block mb-1" htmlFor="numGuesses">
              Number of guesses
            </label>
            <input
              id="numGuesses"
              type="number"
              min={LIMITS.maxGuesses.min}
              max={LIMITS.maxGuesses.max}
              className="input"
              value={settings.maxGuesses ?? ""}
              onChange={(e) => update("maxGuesses", e.target.value === "" ? null : Number(e.target.value))}
              aria-invalid={Boolean(fieldErrors.maxGuesses)}
            />
            <FieldError message={fieldErrors.maxGuesses} />
          </div>

          <fieldset>
            <legend className="label mb-1">Show hints</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="hints" checked={settings.showHints} onChange={() => update("showHints", true)} />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="hints" checked={!settings.showHints} onChange={() => update("showHints", false)} />
                No
              </label>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>
              Hints show letter labels on the phoneme keys and a clue button for each word.
            </p>
          </fieldset>

          <OutputFields builder={builder} />

          <SaveBar builder={builder} canGenerate={selectedWords.length > 0} />
        </form>

        <section className="card p-5 sm:p-8" aria-label="Live preview">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Preview</h2>
            {selectedWords.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <span style={{ color: "var(--color-ink-soft)" }}>Previewing</span>
                <select
                  className="input w-auto"
                  value={previewWord?.id ?? ""}
                  onChange={(e) => setPreviewId(Number(e.target.value))}
                >
                  {selectedWords.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.english}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {selectedWords.length > 1 && (
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
              The downloaded file plays all {selectedWords.length} words in a random order.
            </p>
          )}
          <WordlePreview
            key={`${previewWord?.id ?? "none"}-${settings.maxGuesses}`}
            answer={answer}
            englishWord={previewWord?.english ?? ""}
            hint={previewWord?.hint ?? ""}
            numGuesses={Math.max(1, Number(settings.maxGuesses) || 1)}
            showHints={settings.showHints}
          />
        </section>
      </div>
    </PageShell>
  );
}
