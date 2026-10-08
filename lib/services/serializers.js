// Converts Prisma records into the JSON shapes returned by the API.

export const WORD_INCLUDE = {
  phonemes: { orderBy: { position: "asc" }, include: { phoneme: true } },
  _count: { select: { activities: true } },
};

export function serializePhoneme(p) {
  return { id: p.id, symbol: p.symbol, label: p.label, example: p.example, category: p.category };
}

export function serializeWord(word) {
  const details = (word.phonemes ?? []).map((wp) => wp.phoneme);
  return {
    id: word.id,
    english: word.english,
    hint: word.hint,
    wordListId: word.wordListId,
    phonemes: details.map((p) => p.symbol),
    phonemeDetails: details.map((p) => ({ symbol: p.symbol, label: p.label, example: p.example })),
    spelling: details.map((p) => p.label).join("").toUpperCase(),
    activityCount: word._count?.activities ?? 0,
    createdAt: word.createdAt,
    updatedAt: word.updatedAt,
  };
}

export function serializeWordList(list) {
  const result = {
    id: list.id,
    name: list.name,
    description: list.description,
    wordCount: list._count?.words ?? list.words?.length ?? 0,
    activityCount: list._count?.activities ?? 0,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
  if (Array.isArray(list.words)) {
    result.words = list.words.map(serializeWord);
  }
  return result;
}

export function serializeActivity(activity) {
  const links = activity.words ?? [];
  const lastGeneration = activity.generations?.[0] ?? null;
  const result = {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    difficulty: activity.difficulty,
    showHints: activity.showHints,
    maxGuesses: activity.maxGuesses,
    gridSize: activity.gridSize,
    allowDiagonal: activity.allowDiagonal,
    allowBackwards: activity.allowBackwards,
    title: activity.title,
    authorName: activity.authorName,
    authorNumber: activity.authorNumber,
    fileName: activity.fileName,
    wordListId: activity.wordListId,
    wordList: activity.wordList ? { id: activity.wordList.id, name: activity.wordList.name } : null,
    wordIds: links.map((link) => link.wordId),
    wordCount: links.length,
    generationCount: activity._count?.generations ?? 0,
    lastGeneratedAt: lastGeneration?.generatedAt ?? null,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
  if (links.every((link) => link.word)) {
    result.words = links.map((link) => serializeWord(link.word));
  }
  return result;
}
