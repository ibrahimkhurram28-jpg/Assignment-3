import test from "node:test";
import assert from "node:assert/strict";
import { clearSimulatedData, simulateUsage } from "../../lib/simulation.js";

// A tiny in-memory stand-in for the Prisma client, covering only the calls the simulator makes.
function fakePrisma(wordLists) {
  const state = { activities: [], logs: [], visits: [] };
  return {
    state,
    wordList: { findMany: async () => wordLists },
    activityConfig: {
      create: async ({ data }) => {
        const row = { id: state.activities.length + 1, ...data, _count: { words: data.words.create.length } };
        state.activities.push(row);
        return row;
      },
      findMany: async () => state.activities,
      deleteMany: async () => ({ count: state.activities.splice(0).length }),
    },
    generationLog: {
      createMany: async ({ data }) => void state.logs.push(...data),
      deleteMany: async () => ({ count: state.logs.splice(0).length }),
    },
    pageVisit: {
      createMany: async ({ data }) => void state.visits.push(...data),
      deleteMany: async () => ({ count: state.visits.splice(0).length }),
    },
  };
}

function word(id, english, labels) {
  return { id, wordListId: 1, english, phonemes: labels.map((label, position) => ({ position, phoneme: { label } })) };
}

const LISTS = [
  {
    id: 1,
    words: [word(1, "cat", ["K", "A", "T"]), word(2, "ship", ["SH", "I", "P"]), word(3, "fish", ["F", "I", "SH"]), word(4, "jam", ["J", "A", "M"])],
  },
];

test("simulateUsage creates flagged, valid, backdated records", async () => {
  const prisma = fakePrisma(LISTS);
  const now = new Date("2026-10-08T12:00:00Z");
  const result = await simulateUsage(prisma, { days: 14, newActivities: 6, now, seed: 42 });

  assert.equal(result.activities, 6);
  assert.equal(prisma.state.activities.length, 6);
  assert.ok(prisma.state.activities.every((a) => a.simulated === true && a.words.create.length >= 1));
  assert.ok(prisma.state.activities.filter((a) => a.type === "WORD_SEARCH").every((a) => a.gridSize === 15 && a.maxGuesses === null));
  assert.ok(prisma.state.activities.filter((a) => a.type === "WORDLE").every((a) => a.maxGuesses >= 4 && a.gridSize === null));

  assert.ok(result.generations > 0);
  assert.equal(result.generations, prisma.state.logs.length);
  assert.ok(prisma.state.logs.every((l) => l.simulated === true && l.generatedAt <= now));
  assert.ok(prisma.state.logs.filter((l) => l.status === "FAILED").every((l) => l.errorMessage && l.byteSize === 0));
  assert.ok(prisma.state.logs.filter((l) => l.status === "SUCCESS").every((l) => l.byteSize > 0 && l.errorMessage === null));

  assert.ok(result.pageVisits >= 14 * 12);
  assert.ok(prisma.state.visits.every((v) => v.durationMs >= 4000 && v.createdAt <= now && v.path.startsWith("/")));
});

test("simulateUsage is repeatable for the same seed", async () => {
  const now = new Date("2026-10-08T12:00:00Z");
  const a = fakePrisma(LISTS);
  const b = fakePrisma(LISTS);
  await simulateUsage(a, { now, seed: 7 });
  await simulateUsage(b, { now, seed: 7 });
  assert.deepEqual(a.state.logs, b.state.logs);
});

test("simulateUsage refuses to run without any words", async () => {
  const result = await simulateUsage(fakePrisma([{ id: 1, words: [] }]), {});
  assert.match(result.error, /word list/);
});

test("clearSimulatedData reports what it removed", async () => {
  const prisma = fakePrisma(LISTS);
  await simulateUsage(prisma, { seed: 1 });
  const logs = prisma.state.logs.length;
  const removed = await clearSimulatedData(prisma);
  assert.equal(removed.activities, 6);
  assert.equal(removed.generations, logs);
  assert.equal(prisma.state.visits.length, 0);
});
