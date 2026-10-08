// Checks a stored activity for data that would stop it generating. The same
// rules are applied when an activity is saved; they are checked again here
// because words can be edited later (for example a phoneme is changed).
import { LIMITS } from "./difficulty.js";

/**
 * @param {{ type: string, gridSize: number|null, words: { english: string, phonemeCount: number, spelling: string }[] }} activity
 * @returns {string[]} one message per problem
 */
export function findActivityProblems(activity) {
  const problems = [];
  const seen = new Map();
  for (const word of activity.words) {
    if (activity.type === "WORDLE") {
      const { min, max } = LIMITS.wordleWordPhonemes;
      if (word.phonemeCount < min || word.phonemeCount > max) {
        problems.push(`"${word.english}" has ${word.phonemeCount} phonemes. Wordle needs ${min} to ${max}.`);
      }
    } else {
      if (activity.gridSize && word.spelling.length > activity.gridSize) {
        problems.push(`"${word.english}" (${word.spelling.length} letters) does not fit a ${activity.gridSize}x${activity.gridSize} grid.`);
      }
      if (seen.has(word.spelling)) {
        problems.push(`"${seen.get(word.spelling)}" and "${word.english}" both spell ${word.spelling}.`);
      }
      seen.set(word.spelling, word.english);
    }
  }
  return problems;
}
