// Difficulty presets. Picking a difficulty in the builder fills in these
// settings, and the teacher can still fine-tune them afterwards.

export const DIFFICULTIES = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export const ACTIVITY_TYPES = [
  { value: "WORDLE", label: "Wordle", path: "/wordle" },
  { value: "WORD_SEARCH", label: "Word Search", path: "/wordsearch" },
];

export const PRESETS = {
  WORDLE: {
    EASY: { maxGuesses: 8, showHints: true },
    MEDIUM: { maxGuesses: 6, showHints: true },
    HARD: { maxGuesses: 4, showHints: false },
  },
  WORD_SEARCH: {
    EASY: { gridSize: 8, allowDiagonal: false, allowBackwards: false, showHints: true },
    MEDIUM: { gridSize: 10, allowDiagonal: true, allowBackwards: false, showHints: true },
    HARD: { gridSize: 13, allowDiagonal: true, allowBackwards: true, showHints: false },
  },
};

export const LIMITS = {
  maxGuesses: { min: 1, max: 10 },
  gridSize: { min: 8, max: 15 },
  wordleWords: { min: 1, max: 20 },
  wordleWordPhonemes: { min: 2, max: 8 },
  wordSearchWords: { min: 1, max: 15 },
};

export function presetFor(type, difficulty) {
  return PRESETS[type]?.[difficulty] ?? PRESETS[type]?.MEDIUM ?? {};
}

export function typeLabel(type) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function typePath(type) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.path ?? "/";
}

export function difficultyLabel(value) {
  return DIFFICULTIES.find((d) => d.value === value)?.label ?? value;
}
