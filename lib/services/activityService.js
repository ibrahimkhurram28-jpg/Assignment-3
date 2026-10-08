import { prisma } from "@/lib/server/prisma";
import { NotFoundError, UnprocessableError, ValidationError } from "@/lib/server/errors";
import { activityQuerySchema, activitySchema, validate } from "@/lib/validation/schemas";
import { LIMITS } from "@/lib/difficulty";
import { serializeActivity, WORD_INCLUDE } from "./serializers";

const SUMMARY_INCLUDE = {
  wordList: { select: { id: true, name: true } },
  words: { orderBy: { position: "asc" }, select: { wordId: true, position: true } },
  generations: { where: { status: "SUCCESS" }, orderBy: { generatedAt: "desc" }, take: 1 },
  _count: { select: { generations: { where: { status: "SUCCESS" } } } },
};

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  words: { orderBy: { position: "asc" }, include: { word: { include: WORD_INCLUDE } } },
};

// Editable fields sent back by the builder. Used to merge PATCH requests.
const EDITABLE_FIELDS = [
  "name", "type", "difficulty", "showHints", "maxGuesses", "gridSize", "allowDiagonal",
  "allowBackwards", "title", "authorName", "authorNumber", "fileName", "wordListId",
];

function spell(word) {
  return word.phonemes.map((wp) => wp.phoneme.label).join("").toUpperCase();
}

/**
 * Checks the rules that need the database: the list exists, every selected
 * word belongs to it, and each word suits the chosen activity type.
 */
async function assertWordsFitActivity(data) {
  const list = await prisma.wordList.findUnique({ where: { id: data.wordListId } });
  if (!list) {
    throw new UnprocessableError(`Word list ${data.wordListId} does not exist.`, [
      { path: "wordListId", message: "Choose an existing word list." },
    ]);
  }

  const words = await prisma.word.findMany({
    where: { id: { in: data.wordIds } },
    include: WORD_INCLUDE,
  });
  const byId = new Map(words.map((w) => [w.id, w]));
  const problems = [];

  for (const wordId of data.wordIds) {
    const word = byId.get(wordId);
    if (!word) {
      problems.push({ path: "wordIds", message: `Word ${wordId} does not exist.` });
      continue;
    }
    if (word.wordListId !== data.wordListId) {
      problems.push({ path: "wordIds", message: `"${word.english}" belongs to a different word list.` });
      continue;
    }
    const count = word.phonemes.length;
    if (data.type === "WORDLE") {
      const { min, max } = LIMITS.wordleWordPhonemes;
      if (count < min || count > max) {
        problems.push({
          path: "wordIds",
          message: `"${word.english}" has ${count} phoneme${count === 1 ? "" : "s"}. Wordle words need ${min} to ${max}.`,
        });
      }
    }
    if (data.type === "WORD_SEARCH") {
      const letters = spell(word);
      if (letters.length > data.gridSize) {
        problems.push({
          path: "wordIds",
          message: `"${word.english}" is spelled ${letters} (${letters.length} letters), which does not fit a ${data.gridSize}x${data.gridSize} grid.`,
        });
      }
    }
  }

  if (data.type === "WORD_SEARCH" && problems.length === 0) {
    const seen = new Map();
    for (const wordId of data.wordIds) {
      const word = byId.get(wordId);
      const letters = spell(word);
      if (seen.has(letters)) {
        problems.push({
          path: "wordIds",
          message: `"${seen.get(letters)}" and "${word.english}" both spell ${letters}, so students could not tell them apart. Keep only one.`,
        });
      }
      seen.set(letters, word.english);
    }
  }

  if (problems.length) {
    throw new UnprocessableError(problems[0].message, problems);
  }
}

function toRecord(data) {
  const { wordIds, ...fields } = data;
  return {
    fields,
    wordRows: wordIds.map((wordId, position) => ({ wordId, position })),
  };
}

export async function listActivities(query = {}) {
  const filters = validate(activityQuerySchema, query);
  const where = {};
  if (filters.type) where.type = filters.type;
  if (filters.wordListId) where.wordListId = filters.wordListId;
  const rows = await prisma.activityConfig.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: SUMMARY_INCLUDE,
  });
  return rows.map(serializeActivity);
}

export async function findActivityRecord(id) {
  const activity = await prisma.activityConfig.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!activity) throw new NotFoundError("Activity", id);
  return activity;
}

export async function getActivity(id) {
  return serializeActivity(await findActivityRecord(id));
}

export async function createActivity(input) {
  const data = validate(activitySchema, input);
  await assertWordsFitActivity(data);
  const { fields, wordRows } = toRecord(data);
  const activity = await prisma.activityConfig.create({
    data: { ...fields, words: { create: wordRows } },
    include: DETAIL_INCLUDE,
  });
  return serializeActivity(activity);
}

/**
 * PUT sends every field. PATCH sends only what changed, so it is merged with
 * the stored record first and the result is validated as a whole.
 */
export async function updateActivity(id, input, { partial = false } = {}) {
  const existing = await prisma.activityConfig.findUnique({
    where: { id },
    include: { words: { orderBy: { position: "asc" } } },
  });
  if (!existing) throw new NotFoundError("Activity", id);

  let candidate = input;
  if (partial) {
    if (Object.keys(input).length === 0) {
      throw new ValidationError("Send at least one field to update.");
    }
    const current = Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, existing[key]]));
    current.wordIds = existing.words.map((w) => w.wordId);
    candidate = { ...current, ...input };
  }

  const data = validate(activitySchema, candidate);
  await assertWordsFitActivity(data);
  const { fields, wordRows } = toRecord(data);

  const activity = await prisma.activityConfig.update({
    where: { id },
    data: { ...fields, words: { deleteMany: {}, create: wordRows } },
    include: DETAIL_INCLUDE,
  });
  return serializeActivity(activity);
}

export async function deleteActivity(id) {
  const existing = await prisma.activityConfig.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Activity", id);
  await prisma.activityConfig.delete({ where: { id } });
  return { id, deleted: true };
}
