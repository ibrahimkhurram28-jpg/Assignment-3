import { prisma } from "@/lib/server/prisma";
import { ConflictError, NotFoundError } from "@/lib/server/errors";
import { validate, wordListCreateSchema, wordListUpdateSchema } from "@/lib/validation/schemas";
import { serializeWordList, WORD_INCLUDE } from "./serializers";

const COUNTS = { _count: { select: { words: true, activities: true } } };

async function assertNameAvailable(name, exceptId) {
  const existing = await prisma.wordList.findUnique({ where: { name } });
  if (existing && existing.id !== exceptId) {
    throw new ConflictError(`A word list called "${name}" already exists. Choose a different name.`, [
      { path: "name", message: "This name is already in use." },
    ]);
  }
}

export async function listWordLists() {
  const lists = await prisma.wordList.findMany({ orderBy: { name: "asc" }, include: COUNTS });
  return lists.map(serializeWordList);
}

export async function getWordList(id) {
  const list = await prisma.wordList.findUnique({
    where: { id },
    include: {
      ...COUNTS,
      words: { orderBy: { english: "asc" }, include: WORD_INCLUDE },
    },
  });
  if (!list) throw new NotFoundError("Word list", id);
  return serializeWordList(list);
}

export async function createWordList(input) {
  const data = validate(wordListCreateSchema, input);
  await assertNameAvailable(data.name);
  const list = await prisma.wordList.create({ data, include: COUNTS });
  return serializeWordList(list);
}

export async function updateWordList(id, input) {
  const data = validate(wordListUpdateSchema, input);
  const existing = await prisma.wordList.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Word list", id);
  if (data.name) await assertNameAvailable(data.name, id);
  const list = await prisma.wordList.update({ where: { id }, data, include: COUNTS });
  return serializeWordList(list);
}

export async function deleteWordList(id) {
  const existing = await prisma.wordList.findUnique({ where: { id }, include: COUNTS });
  if (!existing) throw new NotFoundError("Word list", id);
  await prisma.wordList.delete({ where: { id } });
  return {
    id,
    deleted: true,
    removedWords: existing._count.words,
    removedActivities: existing._count.activities,
  };
}
