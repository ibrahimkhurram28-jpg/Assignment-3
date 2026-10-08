"use client";

import { useState } from "react";
import { PhonemeChart } from "./PhonemeChart";

function scoreGuess(guess, answer) {
  const result = Array(guess.length).fill("absent");
  const ansCopy = [...answer];
  guess.forEach((g, i) => {
    if (g === answer[i]) {
      result[i] = "correct";
      ansCopy[i] = null;
    }
  });
  guess.forEach((g, i) => {
    if (result[i] === "correct") return;
    const idx = ansCopy.indexOf(g);
    if (idx !== -1) {
      result[i] = "present";
      ansCopy[idx] = null;
    }
  });
  return result;
}

const TILE_COLORS = {
  correct: { background: "var(--color-success)", borderColor: "var(--color-success)", color: "#fff" },
  present: { background: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#fff" },
  absent: { background: "var(--color-muted)", borderColor: "var(--color-muted)", color: "#fff" },
};

export function WordlePreview({ answer, englishWord, hint = "", numGuesses, showHints }) {
  const wordLen = answer.length;
  const [rows, setRows] = useState([]);
  const [clueVisible, setClueVisible] = useState(false);
  const [current, setCurrent] = useState([]);
  const [status, setStatus] = useState("playing");

  const won = status === "won";
  const lost = status === "lost";

  function pick(ipa) {
    if (status !== "playing" || current.length >= wordLen) return;
    setCurrent((c) => [...c, ipa]);
  }

  function backspace() {
    if (status !== "playing") return;
    setCurrent((c) => c.slice(0, -1));
  }

  function submit() {
    if (status !== "playing" || current.length !== wordLen) return;
    const result = scoreGuess(current, answer);
    const nextRows = [...rows, { guess: current, result }];
    setRows(nextRows);
    setCurrent([]);
    if (result.every((r) => r === "correct")) {
      setStatus("won");
    } else if (nextRows.length >= numGuesses) {
      setStatus("lost");
    }
  }

  const emptyRowsCount = Math.max(0, numGuesses - rows.length - (status === "playing" ? 1 : 0));

  if (wordLen === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
        Select at least one word to preview the game.
      </p>
    );
  }

  return (
    <div>
      {showHints && hint && (
        <p className="text-sm mb-3" style={{ color: "var(--color-ink-soft)" }}>
          {clueVisible ? (
            <>Clue: {hint}</>
          ) : (
            <button
              type="button"
              className="underline"
              style={{ color: "var(--color-primary)" }}
              onClick={() => setClueVisible(true)}
            >
              Show clue
            </button>
          )}
        </p>
      )}
      <div className="flex flex-col gap-2 mb-4" role="grid" aria-label="Wordle preview grid">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.guess.map((p, c) => (
              <div
                key={c}
                className="w-12 h-12 flex items-center justify-center rounded-md border-2 font-mono-phoneme font-semibold"
                style={TILE_COLORS[row.result[c]]}
              >
                {p}
              </div>
            ))}
          </div>
        ))}
        {status === "playing" && (
          <div className="flex gap-2">
            {Array.from({ length: wordLen }).map((_, c) => (
              <div
                key={c}
                className="w-12 h-12 flex items-center justify-center rounded-md border-2 font-mono-phoneme font-semibold"
                style={{ borderColor: "var(--color-border)" }}
              >
                {current[c] || ""}
              </div>
            ))}
          </div>
        )}
        {Array.from({ length: emptyRowsCount }).map((_, r) => (
          <div key={r} className="flex gap-2">
            {Array.from({ length: wordLen }).map((_, c) => (
              <div
                key={c}
                className="w-12 h-12 rounded-md border-2 opacity-50"
                style={{ borderColor: "var(--color-border)" }}
              />
            ))}
          </div>
        ))}
      </div>

      <p
        className="min-h-6 mb-3 text-sm font-semibold"
        style={{ color: won ? "var(--color-success)" : lost ? "var(--color-danger)" : "var(--color-ink-soft)" }}
        role="status"
      >
        {won && `Correct! /${answer.join(" ")}/ = "${englishWord || "?"}"`}
        {lost && `Out of guesses. The word was /${answer.join(" ")}/ = "${englishWord || "?"}"`}
        {!won && !lost && `Guess ${rows.length + 1} of ${numGuesses}`}
      </p>

      <div className="flex gap-2 mb-4">
        <button type="button" className="btn btn-outline" onClick={backspace}>
          ⌫ Remove
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Enter ↵
        </button>
      </div>

      <PhonemeChart onPick={pick} showHints={showHints} />
    </div>
  );
}
