"use client";

import { Suspense } from "react";
import { useActivityBuilder } from "@/hooks/useActivityBuilder";
import { LIMITS } from "@/lib/difficulty";
import { WordPicker } from "@/components/WordPicker";
import { ActivityDetailsFields, OutputFields, SaveBar } from "@/components/ActivityControls";
import { FieldError } from "@/components/Notice";
import { WordSearchPreview } from "@/components/WordSearchPreview";

const SIZE_PRESETS = [
  { value: 8, label: "Small (8×8)" },
  { value: 10, label: "Medium (10×10)" },
  { value: 13, label: "Large (13×13)" },
  { value: 15, label: "Extra large (15×15)" },
];

const DEFAULTS = {
  name: "",
  difficulty: "MEDIUM",
  showHints: true,
  gridSize: 10,
  allowDiagonal: true,
  allowBackwards: false,
  title: "Phoneme Word Search",
  authorName: "Ibrahim Khurram",
  authorNumber: "21561062",
  fileName: "",
};

function reasonForSize(size) {
  return (word) =>
    word.spelling.length > size
      ? `Spelled ${word.spelling} (${word.spelling.length} letters), too long for a ${size}×${size} grid.`
      : null;
}

export default function WordSearchPage() {
  return (
    <Suspense fallback={<PageShell><p>Loading builder…</p></PageShell>}>
      <WordSearchBuilder />
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
        <h1 className="font-display text-3xl font-semibold">Word Search activity</h1>
        <p className="mt-2" style={{ color: "var(--color-ink-soft)" }}>
          Words chosen from a saved word list are hidden in the grid. Students match the phonetic
          clue to the hidden word, and can hover a clue for the letter hint.
        </p>
      </header>
      {children}
    </div>
  );
}

function WordSearchBuilder() {
  const builder = useActivityBuilder("WORD_SEARCH", DEFAULTS, (word, s) => reasonForSize(s.gridSize)(word));
  const { settings, update, selectedWords, fieldErrors, loading } = builder;
  const reasonFor = reasonForSize(settings.gridSize ?? 10);

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
          aria-label="Word Search activity settings"
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
            reasonFor={reasonFor}
            loading={builder.wordsLoading}
            error={fieldErrors.wordIds || fieldErrors.wordListId}
            maxWords={LIMITS.wordSearchWords.max}
          />

          <fieldset>
            <legend className="label mb-1">Grid size</legend>
            <div className="flex flex-col gap-2 text-sm">
              {SIZE_PRESETS.map((preset) => (
                <label key={preset.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="size"
                    checked={settings.gridSize === preset.value}
                    onChange={() => update("gridSize", preset.value)}
                  />
                  {preset.label}
                </label>
              ))}
            </div>
            <FieldError message={fieldErrors.gridSize} />
          </fieldset>

          <fieldset>
            <legend className="label mb-1">Directions</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(settings.allowDiagonal)}
                onChange={(e) => update("allowDiagonal", e.target.checked)}
              />
              Allow diagonal placements
            </label>
            <label className="flex items-center gap-2 text-sm mt-1">
              <input
                type="checkbox"
                checked={Boolean(settings.allowBackwards)}
                onChange={(e) => update("allowBackwards", e.target.checked)}
              />
              Allow backwards words
            </label>
          </fieldset>

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
              Hints show each word&apos;s clue and letter spelling next to the grid.
            </p>
          </fieldset>

          <OutputFields builder={builder} />

          <SaveBar builder={builder} canGenerate={selectedWords.length > 0} />
        </form>

        <section className="card p-5 sm:p-8 overflow-x-auto" aria-label="Live preview">
          <h2 className="font-semibold mb-4">Preview</h2>
          {selectedWords.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Select at least one word to preview the puzzle.
            </p>
          ) : (
            <WordSearchPreview
              key={`${settings.gridSize}-${settings.allowDiagonal}-${settings.allowBackwards}-${builder.wordIds.join(",")}`}
              words={selectedWords.map((w) => ({ phonemes: w.phonemes, english: w.english, hint: w.hint }))}
              size={settings.gridSize ?? 10}
              allowDiagonal={Boolean(settings.allowDiagonal)}
              allowBackwards={Boolean(settings.allowBackwards)}
              showHints={settings.showHints}
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}
