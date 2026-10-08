import test from "node:test";
import assert from "node:assert/strict";
import { findActivityProblems } from "../../lib/activityChecks.js";

test("a valid Word Search has no problems", () => {
  const problems = findActivityProblems({
    type: "WORD_SEARCH",
    gridSize: 8,
    words: [
      { english: "cat", phonemeCount: 3, spelling: "CAT" },
      { english: "ship", phonemeCount: 3, spelling: "SHIP" },
    ],
  });
  assert.deepEqual(problems, []);
});

test("Word Search flags words that do not fit and duplicate spellings", () => {
  const problems = findActivityProblems({
    type: "WORD_SEARCH",
    gridSize: 8,
    words: [
      { english: "chair", phonemeCount: 2, spelling: "CHAIR" },
      { english: "elephantine", phonemeCount: 9, spelling: "ELEFANTINE" },
      { english: "chare", phonemeCount: 2, spelling: "CHAIR" },
    ],
  });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /does not fit/);
  assert.match(problems[1], /both spell CHAIR/);
});

test("Wordle flags words outside 2 to 8 phonemes", () => {
  const problems = findActivityProblems({
    type: "WORDLE",
    gridSize: null,
    words: [
      { english: "a", phonemeCount: 1, spelling: "A" },
      { english: "cat", phonemeCount: 3, spelling: "CAT" },
    ],
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Wordle needs 2 to 8/);
});
