"use client";

import { useMemo, useState } from "react";
import { buildWordSearch } from "@/lib/wordSearchGrid";
import { spellFromPhonemes } from "@/lib/phonemes";

function straightPath(a, b) {
  const dr = Math.sign(b.r - a.r);
  const dc = Math.sign(b.c - a.c);
  if (a.r !== b.r && a.c !== b.c && Math.abs(b.r - a.r) !== Math.abs(b.c - a.c)) return null;
  const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
  return Array.from({ length: len }, (_, i) => ({ r: a.r + dr * i, c: a.c + dc * i }));
}

export function WordSearchPreview({ words, size, allowDiagonal, allowBackwards = true, showHints = true }) {
  const wordsKey = words.map((w) => w.phonemes.join(" ")).join("|");
  const puzzle = useMemo(() => {
    const entries = words.map((w) => ({
      word: spellFromPhonemes(w.phonemes),
      meta: w,
    }));
    return buildWordSearch(entries, { size, allowDiagonal, allowBackwards });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, size, allowDiagonal, allowBackwards]);

  const [selectStart, setSelectStart] = useState(null);
  const [found, setFound] = useState(new Set());
  const [foundCells, setFoundCells] = useState(new Set());

  function handleClick(r, c) {
    if (!selectStart) {
      setSelectStart({ r, c });
      return;
    }
    const path = straightPath(selectStart, { r, c });
    setSelectStart(null);
    if (!path) return;
    const letters = path.map((p) => puzzle.grid[p.r][p.c]).join("");
    const reversed = letters.split("").reverse().join("");
    const match = puzzle.placements.find(
      (p) => !found.has(p.word) && (p.word === letters || p.word === reversed)
    );
    if (match) {
      setFound((prev) => new Set(prev).add(match.word));
      setFoundCells((prev) => {
        const next = new Set(prev);
        path.forEach((p) => next.add(`${p.r}-${p.c}`));
        return next;
      });
    }
  }

  return (
    <div className="flex flex-wrap gap-8 items-start">
      <table
        className="border-collapse rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <tbody>
          {puzzle.grid.map((row, r) => (
            <tr key={r}>
              {row.map((letter, c) => {
                const key = `${r}-${c}`;
                const isFound = foundCells.has(key);
                const isSelected = selectStart && selectStart.r === r && selectStart.c === c;
                return (
                  <td
                    key={c}
                    onClick={() => handleClick(r, c)}
                    className="w-8 h-8 text-center align-middle font-mono-phoneme font-bold cursor-pointer select-none"
                    style={{
                      border: "1px solid var(--color-border)",
                      background: isFound ? "var(--color-success)" : isSelected ? "var(--color-accent)" : "var(--color-surface)",
                      color: isFound || isSelected ? "#fff" : "var(--color-ink)",
                    }}
                  >
                    {letter}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="min-w-52 space-y-2">
        <p className="label">Find these words</p>
        {puzzle.placements.map((p, i) => (
          <div
            key={`${p.word}-${i}`}
            className="card px-3 py-2 text-sm group relative"
            style={{ opacity: found.has(p.word) ? 0.55 : 1 }}
          >
            <div className="font-mono-phoneme">/{p.meta.phonemes.join(" ")}/</div>
            {showHints && p.meta.hint && !found.has(p.word) && (
              <div className="mt-1 text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {p.meta.hint}
              </div>
            )}
            {(showHints || found.has(p.word)) && (
              <div
                className="mt-1 text-xs"
                style={{ color: found.has(p.word) ? "var(--color-success)" : "var(--color-ink-soft)" }}
              >
                {found.has(p.word) ? p.meta.english : `hover: ${p.word.split("").join("-")}`}
              </div>
            )}
            {p.failed && (
              <div className="text-xs mt-1" style={{ color: "var(--color-danger)" }}>
                Couldn&apos;t fit. Try a larger grid size.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
