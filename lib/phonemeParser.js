// Turns teacher-typed phoneme text into an ordered list of phoneme symbols.
// Shared by the API (authoritative check against the database inventory) and
// the browser (instant feedback while typing).
//
// Accepted input:
//   "k æ t"      space separated
//   "/tʃeə/"     unspaced, with slashes: split using the longest known symbol
//   "t ʃ"        spaces always win, so this stays two phonemes (t + ʃ)
//   "i:"         an ASCII colon is converted to the IPA length mark (iː)

export const MAX_PHONEMES_PER_WORD = 12;
const MAX_INPUT_LENGTH = 120;

export function normalisePhonemeText(raw) {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/[\/\[\],;|]/g, " ")
    .replace(/:/g, "ː")
    .replace(/\u0261/g, "g") // IPA script g -> ASCII g used by the chart
    .replace(/[A-Z]/g, (c) => c.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

function suggestionsFor(char, symbols) {
  return symbols.filter((s) => s.startsWith(char) || s.includes(char)).slice(0, 4);
}

/**
 * @param {string|string[]} input  raw text or an array of symbols
 * @param {string[]} symbols       known phoneme symbols
 * @returns {{ ok: boolean, phonemes: string[], errors: string[], unknown: string[] }}
 */
export function parsePhonemes(input, symbols) {
  const known = [...new Set(symbols)].sort((a, b) => b.length - a.length);
  const errors = [];

  if (!known.length) {
    return {
      ok: false,
      phonemes: [],
      unknown: [],
      errors: ["The phoneme inventory is empty. Run the database seed (npm run db:seed)."],
    };
  }

  let text;
  if (Array.isArray(input)) {
    if (input.some((p) => typeof p !== "string")) {
      return { ok: false, phonemes: [], unknown: [], errors: ["Phonemes must be text symbols."] };
    }
    text = input.map((p) => normalisePhonemeText(p)).join(" ");
  } else if (typeof input === "string") {
    if (input.length > MAX_INPUT_LENGTH) {
      return { ok: false, phonemes: [], unknown: [], errors: [`Phoneme text is too long (max ${MAX_INPUT_LENGTH} characters).`] };
    }
    text = normalisePhonemeText(input);
  } else {
    return { ok: false, phonemes: [], unknown: [], errors: ["Enter the phonemes as text, for example \"k æ t\"."] };
  }

  if (!text) {
    return { ok: false, phonemes: [], unknown: [], errors: ["Enter at least one phoneme, for example \"k æ t\"."] };
  }

  const phonemes = [];
  const unknown = [];
  for (const chunk of text.split(" ")) {
    let i = 0;
    while (i < chunk.length) {
      const match = known.find((symbol) => chunk.startsWith(symbol, i));
      if (match) {
        phonemes.push(match);
        i += match.length;
      } else {
        const char = String.fromCodePoint(chunk.codePointAt(i));
        unknown.push(char);
        i += char.length;
      }
    }
  }

  for (const char of [...new Set(unknown)]) {
    const hints = suggestionsFor(char, known);
    errors.push(
      `"${char}" is not a phoneme in the chart.` +
        (hints.length ? ` Did you mean ${hints.map((h) => `"${h}"`).join(" or ")}?` : " Pick symbols from the phoneme chart.")
    );
  }

  if (phonemes.length > MAX_PHONEMES_PER_WORD) {
    errors.push(`A word can have at most ${MAX_PHONEMES_PER_WORD} phonemes (this one has ${phonemes.length}).`);
  }

  return { ok: errors.length === 0 && phonemes.length > 0, phonemes, unknown, errors };
}
