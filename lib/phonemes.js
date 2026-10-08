// Phoneme reference data for the builder.
// Each entry maps an IPA symbol to a plain-letter "label" (what a student
// should hear/read it as) and a short example word, used for hover hints
// throughout the app and embedded into generated HTML output.

export const CONSONANTS = [
  { ipa: "p", label: "P", example: "pen" },
  { ipa: "b", label: "B", example: "bat" },
  { ipa: "t", label: "T", example: "top" },
  { ipa: "d", label: "D", example: "dog" },
  { ipa: "k", label: "K", example: "cat" },
  { ipa: "g", label: "G", example: "go" },
  { ipa: "m", label: "M", example: "map" },
  { ipa: "n", label: "N", example: "net" },
  { ipa: "ŋ", label: "NG", example: "sing" },
  { ipa: "f", label: "F", example: "fan" },
  { ipa: "v", label: "V", example: "van" },
  { ipa: "θ", label: "TH", example: "thin" },
  { ipa: "ð", label: "TH", example: "this" },
  { ipa: "s", label: "S", example: "sun" },
  { ipa: "z", label: "Z", example: "zoo" },
  { ipa: "ʃ", label: "SH", example: "ship" },
  { ipa: "ʒ", label: "ZH", example: "vision" },
  { ipa: "h", label: "H", example: "hat" },
  { ipa: "tʃ", label: "CH", example: "chip" },
  { ipa: "dʒ", label: "J", example: "jam" },
  { ipa: "l", label: "L", example: "leg" },
  { ipa: "r", label: "R", example: "run" },
  { ipa: "j", label: "Y", example: "yes" },
  { ipa: "w", label: "W", example: "win" },
];

export const VOWELS = [
  { ipa: "iː", label: "EE", example: "see" },
  { ipa: "ɪ", label: "I", example: "sit" },
  { ipa: "e", label: "E", example: "bed" },
  { ipa: "æ", label: "A", example: "cat" },
  { ipa: "ɑː", label: "AH", example: "car" },
  { ipa: "ɒ", label: "O", example: "dog" },
  { ipa: "ɔː", label: "AW", example: "saw" },
  { ipa: "ʊ", label: "OO", example: "book" },
  { ipa: "uː", label: "OO", example: "food" },
  { ipa: "ʌ", label: "U", example: "cup" },
  { ipa: "ɜː", label: "ER", example: "bird" },
  { ipa: "ə", label: "UH", example: "about" },
  { ipa: "eɪ", label: "AY", example: "day" },
  { ipa: "aɪ", label: "IGH", example: "my" },
  { ipa: "ɔɪ", label: "OY", example: "boy" },
  { ipa: "aʊ", label: "OW", example: "cow" },
  { ipa: "oʊ", label: "OH", example: "go" },
  { ipa: "ɪə", label: "EAR", example: "ear" },
  { ipa: "eə", label: "AIR", example: "hair" },
];

export const ALL_PHONEMES = [...CONSONANTS, ...VOWELS];

export const PHONEME_MAP = Object.fromEntries(
  ALL_PHONEMES.map((p) => [p.ipa, p])
);

export function phonemeInfo(ipa) {
  return PHONEME_MAP[ipa.trim()] || { ipa, label: ipa, example: "" };
}

// Splits a space-separated phoneme string like "k æ t" into an array
// of trimmed, non-empty phoneme tokens: ["k", "æ", "t"]
export function splitPhonemeWord(str) {
  return (str || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Spells out a phoneme sequence using each phoneme's plain-letter label,
// e.g. ["tʃ", "eə"] -> "CHAIR"
export function spellFromPhonemes(phonemeArray) {
  return phonemeArray.map((p) => phonemeInfo(p).label).join("").toUpperCase();
}

// Fixed starter word list for the Word Search activity (Assessment 1).
// Chosen to cover a spread of common therapy targets (TH, SH, CH, J, digraphs).
export const WORD_SEARCH_WORDS = [
  { phonemes: ["θ", "ɪ", "ŋ"], english: "thing" },
  { phonemes: ["ʃ", "ɪ", "p"], english: "ship" },
  { phonemes: ["tʃ", "eə"], english: "chair" },
  { phonemes: ["dʒ", "æ", "m"], english: "jam" },
  { phonemes: ["f", "ɪ", "ʃ"], english: "fish" },
];
