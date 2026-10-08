// Word search grid builder. Places each word along a randomly chosen
// direction, checks every position before giving up on a word, then fills
// the remaining cells with random filler letters.

const DIRECTIONS = {
  horizontal: [
    [0, 1],
    [0, -1],
  ],
  vertical: [
    [1, 0],
    [-1, 0],
  ],
  diagonal: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

// A direction reads "forwards" when it runs left to right, or straight down.
function isForwards([dr, dc]) {
  return dc > 0 || (dc === 0 && dr > 0);
}

function directionsFor(allowDiagonal, allowBackwards = true) {
  const dirs = allowDiagonal
    ? [...DIRECTIONS.horizontal, ...DIRECTIONS.vertical, ...DIRECTIONS.diagonal]
    : [...DIRECTIONS.horizontal, ...DIRECTIONS.vertical];
  return allowBackwards ? dirs : dirs.filter(isForwards);
}

function randInt(n) {
  return Math.floor(Math.random() * n);
}

function fits(grid, letters, row, col, dr, dc, size) {
  const endRow = row + dr * (letters.length - 1);
  const endCol = col + dc * (letters.length - 1);
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;
  for (let i = 0; i < letters.length; i++) {
    const existing = grid[row + dr * i][col + dc * i];
    if (existing && existing !== letters[i]) return false;
  }
  return true;
}

// Fast path: try random positions first so puzzles vary between downloads.
function findRandomSpot(grid, letters, dirs, size) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const [dr, dc] = dirs[randInt(dirs.length)];
    const row = randInt(size);
    const col = randInt(size);
    if (fits(grid, letters, row, col, dr, dc, size)) return { row, col, dr, dc };
  }
  return null;
}

// Fallback: check every cell and direction before giving up on a word.
function findAnySpot(grid, letters, dirs, size) {
  const options = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dr, dc] of dirs) {
        if (fits(grid, letters, row, col, dr, dc, size)) options.push({ row, col, dr, dc });
      }
    }
  }
  return options.length ? options[randInt(options.length)] : null;
}

export function buildWordSearch(words, { size = 10, allowDiagonal = true, allowBackwards = true } = {}) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = [];

  const dirs = directionsFor(allowDiagonal, allowBackwards);
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

  for (const entry of sorted) {
    const letters = entry.word.split("");
    const spot = findRandomSpot(grid, letters, dirs, size) ?? findAnySpot(grid, letters, dirs, size);

    if (spot) {
      const { row, col, dr, dc } = spot;
      for (let i = 0; i < letters.length; i++) {
        grid[row + dr * i][col + dc * i] = letters[i];
      }
      placements.push({ word: entry.word, meta: entry.meta, row, col, dr, dc });
    } else {
      // Grid too small or too crowded. The caller shows a "try a larger
      // grid" message for failed words.
      placements.push({ word: entry.word, meta: entry.meta, row: null, col: null, dr: 0, dc: 0, failed: true });
    }
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = alphabet[randInt(alphabet.length)];
    }
  }

  return { grid, placements, size };
}
