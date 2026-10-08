// Simulated input records for the dashboard (Assessment 3).
// Creates backdated activities, generation logs (including some failures) and
// page visits so the dashboard has meaningful data to report on. Everything it
// creates has `simulated = true`, so it can be removed again with
// clearSimulatedData without touching real records.
//
// This file takes the Prisma client as an argument and uses only relative
// imports, so both the API route and prisma/seed.js can call it.

const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK = 500;

const PAGES = [
  ["/", 3],
  ["/wordle", 5],
  ["/wordsearch", 4],
  ["/word-lists", 4],
  ["/activities", 3],
  ["/dashboard", 2],
  ["/reports", 1],
];

const FAILURE_MESSAGES = [
  "This activity has no words left. Edit it and select at least one word before downloading.",
  "A selected word no longer fits the grid size.",
  "The HTML file could not be built from the stored settings.",
];

// Small seeded random number generator so a simulation can be repeated.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function chunks(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

export async function simulateUsage(prisma, options = {}) {
  const { days = 14, newActivities = 6, now = new Date(), seed = Date.now() } = options;
  const random = mulberry32(seed);
  const int = (n) => Math.floor(random() * n);
  const pick = (list) => list[int(list.length)];
  const shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const lists = await prisma.wordList.findMany({
    include: {
      words: { include: { phonemes: { orderBy: { position: "asc" }, include: { phoneme: true } } } },
    },
  });
  const usableWords = lists
    .flatMap((list) => list.words)
    .map((w) => ({
      id: w.id,
      wordListId: w.wordListId,
      count: w.phonemes.length,
      spelling: w.phonemes.map((p) => p.phoneme.label).join("").toUpperCase(),
    }));
  if (usableWords.length === 0) {
    return { error: "Create a word list with at least one word before adding simulated data." };
  }

  const windowStart = startOfUtcDay(now) - (days - 1) * DAY_MS;
  const created = { activities: 0, generations: 0, failedGenerations: 0, pageVisits: 0 };

  // 1. Simulated activity configurations, created at random times in the window.
  for (let i = 0; i < newActivities; i += 1) {
    const type = i % 2 === 0 ? "WORDLE" : "WORD_SEARCH";
    const fits = (w) => (type === "WORDLE" ? w.count >= 2 && w.count <= 8 : w.spelling.length <= 15);
    const candidates = lists.filter((l) => usableWords.some((w) => w.wordListId === l.id && fits(w)));
    if (candidates.length === 0) continue;
    const list = pick(candidates);

    const chosen = [];
    const spellings = new Set();
    for (const word of shuffle(usableWords.filter((w) => w.wordListId === list.id && fits(w)))) {
      if (type === "WORD_SEARCH" && spellings.has(word.spelling)) continue;
      spellings.add(word.spelling);
      chosen.push(word);
      if (chosen.length >= 3 + int(3)) break;
    }

    const difficulty = pick(["EASY", "MEDIUM", "HARD"]);
    const label = type === "WORDLE" ? "Wordle" : "Word Search";
    const createdAt = new Date(windowStart + int(days) * DAY_MS + int(DAY_MS));
    await prisma.activityConfig.create({
      data: {
        name: `Simulated ${label} ${i + 1}`,
        type,
        difficulty,
        showHints: difficulty !== "HARD",
        maxGuesses: type === "WORDLE" ? { EASY: 8, MEDIUM: 6, HARD: 4 }[difficulty] : null,
        gridSize: type === "WORD_SEARCH" ? 15 : null,
        allowDiagonal: type === "WORD_SEARCH" ? difficulty !== "EASY" : null,
        allowBackwards: type === "WORD_SEARCH" ? difficulty === "HARD" : null,
        title: `Simulated ${label} ${i + 1}`,
        authorName: "Simulated data",
        fileName: `simulated-${type.toLowerCase().replace("_", "-")}-${i + 1}`,
        wordListId: list.id,
        simulated: true,
        createdAt: createdAt > now ? now : createdAt,
        words: { create: chosen.map((w, position) => ({ wordId: w.id, position })) },
      },
    });
    created.activities += 1;
  }

  // 2. Generation logs for every activity (real and simulated), a few per day.
  const activities = await prisma.activityConfig.findMany({
    select: { id: true, fileName: true, createdAt: true, _count: { select: { words: true } } },
  });
  const logs = [];
  for (let d = 0; d < days; d += 1) {
    const dayStart = windowStart + d * DAY_MS;
    const available = activities.filter((a) => a.createdAt.getTime() <= dayStart + DAY_MS);
    if (available.length === 0) continue;
    const count = 3 + int(10);
    for (let k = 0; k < count; k += 1) {
      const activity = pick(available);
      let at = Math.max(dayStart + int(DAY_MS), activity.createdAt.getTime() + 60000);
      if (at > now.getTime()) at = now.getTime() - int(3600000);
      if (at < activity.createdAt.getTime()) continue;
      const failed = random() < 0.08;
      logs.push({
        activityId: activity.id,
        fileName: failed ? "" : `${activity.fileName || "activity"}.html`,
        wordCount: failed ? 0 : Math.max(1, activity._count.words),
        byteSize: failed ? 0 : 14000 + int(9000),
        generatedAt: new Date(at),
        status: failed ? "FAILED" : "SUCCESS",
        kind: random() < 0.3 ? "VIEW" : "DOWNLOAD",
        durationMs: failed ? 5 + int(60) : 8 + int(90),
        errorMessage: failed ? pick(FAILURE_MESSAGES) : null,
        simulated: true,
      });
    }
  }
  for (const part of chunks(logs)) await prisma.generationLog.createMany({ data: part });
  created.generations = logs.length;
  created.failedGenerations = logs.filter((l) => l.status === "FAILED").length;

  // 3. Page visits with a time on page between a few seconds and a few minutes.
  const totalWeight = PAGES.reduce((sum, [, w]) => sum + w, 0);
  const pickPage = () => {
    let roll = random() * totalWeight;
    for (const [path, weight] of PAGES) {
      roll -= weight;
      if (roll <= 0) return path;
    }
    return "/";
  };
  const visits = [];
  for (let d = 0; d < days; d += 1) {
    const dayStart = windowStart + d * DAY_MS;
    const count = 12 + int(24);
    for (let k = 0; k < count; k += 1) {
      const at = Math.min(dayStart + int(DAY_MS), now.getTime());
      visits.push({
        path: pickPage(),
        durationMs: 4000 + Math.round(random() ** 2 * 200000),
        simulated: true,
        createdAt: new Date(at),
      });
    }
  }
  for (const part of chunks(visits)) await prisma.pageVisit.createMany({ data: part });
  created.pageVisits = visits.length;

  return created;
}

export async function clearSimulatedData(prisma) {
  // Deleting a simulated activity also removes its words links and logs (cascade).
  const activities = await prisma.activityConfig.deleteMany({ where: { simulated: true } });
  const generations = await prisma.generationLog.deleteMany({ where: { simulated: true } });
  const pageVisits = await prisma.pageVisit.deleteMany({ where: { simulated: true } });
  return {
    activities: activities.count,
    generations: generations.count,
    pageVisits: pageVisits.count,
  };
}
