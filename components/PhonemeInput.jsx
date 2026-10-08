"use client";

import { useId, useState } from "react";
import { ALL_PHONEMES, phonemeInfo, spellFromPhonemes } from "@/lib/phonemes";
import { parsePhonemes } from "@/lib/phonemeParser";
import { PhonemeChart } from "./PhonemeChart";
import { FieldError } from "./Notice";

const SYMBOLS = ALL_PHONEMES.map((p) => p.ipa);

// Text input for a phoneme word with instant feedback. The server checks the
// same rules again before saving.
export function PhonemeInput({ value, onChange, error, label = "Phonemes", showChart = true }) {
  const id = useId();
  const [chartOpen, setChartOpen] = useState(false);
  const parsed = value.trim() ? parsePhonemes(value, SYMBOLS) : null;
  const localError = parsed && !parsed.ok ? parsed.errors[0] : null;

  function append(ipa) {
    onChange(value.trim() ? `${value.trim()} ${ipa}` : ipa);
  }

  return (
    <div>
      <label className="label block mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input font-mono-phoneme"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. tʃ eə"
        aria-invalid={Boolean(error || localError)}
        aria-describedby={`${id}-help`}
        autoComplete="off"
        spellCheck={false}
      />
      <p id={`${id}-help`} className="text-xs mt-1" style={{ color: "var(--color-ink-soft)" }}>
        Separate phonemes with spaces, or tap symbols from the chart.
      </p>
      {parsed?.ok && (
        <div className="flex flex-wrap items-center gap-1 mt-2" aria-label="Parsed phonemes">
          {parsed.phonemes.map((p, i) => (
            <span key={i} className="chip" title={`${phonemeInfo(p).label} (as in ${phonemeInfo(p).example})`}>
              /{p}/
            </span>
          ))}
          <span className="text-xs ml-1" style={{ color: "var(--color-ink-soft)" }}>
            {parsed.phonemes.length} phoneme{parsed.phonemes.length === 1 ? "" : "s"}, spelled{" "}
            {spellFromPhonemes(parsed.phonemes)}
          </span>
        </div>
      )}
      <FieldError message={error || localError} />
      {showChart && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs font-semibold underline"
            style={{ color: "var(--color-primary)" }}
            onClick={() => setChartOpen((v) => !v)}
            aria-expanded={chartOpen}
          >
            {chartOpen ? "Hide phoneme chart" : "Show phoneme chart"}
          </button>
          {chartOpen && (
            <div className="mt-2">
              <PhonemeChart onPick={append} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
