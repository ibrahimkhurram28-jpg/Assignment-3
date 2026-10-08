import { prisma } from "@/lib/server/prisma";
import { ConflictError, NotFoundError } from "@/lib/server/errors";
import { validate, wordCreateSchema, wordUpdateSchema } from "@/lib/validation/schemas";
import { resolvePhonemes } from "./phonemeService";
import { serializeWord, WORD_INCLUDE } from "./serializers";

async function assertEnglishAvailable(wordListId, english, exceptId) {
  const existing = await prisma.word.findUnique({
    where: { wordListId_english: { wordListId, english } },
  });
  if (existing && existing.id !== exceptId) {
    throw new ConflictError(`"${english}" is already in this word list.`, [
      { path: "english", message: "This word is already in the list." },
    ]);
  }
}

function phonemeRows(phonemes) {
  return phonemes.map((p, position) => ({ position, phonemeId: p.id }));
}

export async function listWords(wordListId) {
  const list = await prisma.wordList.findUnique({ where: { id: wordListId } });
  if (!list) throw new NotFoundError("Word list", wordListId);
  const words = await prisma.word.findMany({
    where: { wordListId },
    orderBy: { english: "asc" },
    include: WORD_INCLUDE,
  });
  return words.map(serializeWord);
}

export async function getWord(id) {
  const word = await prisma.word.findUnique({ where: { id }, include: WORD_INCLUDE });
  if (!word) throw new NotFoundError("Word", id);
  return serializeWord(word);
}

export async function createWord(wordListId, input) {
  const data = validate(wordCreateSchema, input);
  const list = await prisma.wordList.findUnique({ where: { id: wordListId } });
  if (!list) throw new NotFoundError("Word list", wordListId);

  const phonemes = await resolvePhonemes(data.phonemes);
  await assertEnglishAvailable(wordListId, data.english);

  const word = await prisma.word.create({
    data: {
      english: data.english,
      hint: data.hint,
      wordListId,
      phonemes: { create: phonemeRows(phonemes) },
    },
    include: WORD_INCLUDE,
  });
  await touchList(wordListId);
  return serializeWord(word);
}

export async function updateWord(id, input) {
  const data = validate(wordUpdateSchema, input);
  const existing = await prisma.word.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Word", id);

  const update = {};
  if (data.english !== undefined) {
    await assertEnglishAvailable(existing.wordListId, data.english, id);
    update.english = data.english;
  }
  if (data.hint !== undefined) update.hint = data.hint;
  if (data.phonemes !== undefined) {
    const phonemes = await resolvePhonemes(data.phonemes);
    // Replace the ordered phoneme rows in one write.
    update.phonemes = { deleteMany: {}, create: phonemeRows(phonemes) };
  }

  const word = await prisma.word.update({ where: { id }, data: update, include: WORD_INCLUDE });
  await touchList(existing.wordListId);
  return serializeWord(word);
}

export async function deleteWord(id) {
  const existing = await prisma.word.findUnique({
    where: { id },
    include: { _count: { select: { activities: true } } },
  });
  if (!existing) throw new NotFoundError("Word", id);
  await prisma.word.delete({ where: { id } });
  await touchList(existing.wordListId);
  return { id, deleted: true, removedFromActivities: existing._count.activities };
}

async function touchList(wordListId) {
  await prisma.wordList.update({ where: { id: wordListId }, data: { updatedAt: new Date() } });
}
