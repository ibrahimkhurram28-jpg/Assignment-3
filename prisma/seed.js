// Seeds the phoneme inventory and, on a fresh database, some starter content.
// Safe to run on every start: phonemes are upserted, and sample word lists and
// activities are only created when the database had no phonemes beforehand.
// Assessment 3: a fresh database also gets simulated usage records (flagged
// simulated = true) so the dashboard has data. Set SEED_SIMULATED=false to skip.
import prismaPkg from "@prisma/client";
import { CONSONANTS, VOWELS } from "../lib/phonemes.js";
import { simulateUsage } from "../lib/simulation.js";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const AUTHOR = { authorName: "Ibrahim Khurram", authorNumber: "21561062" };

const STARTER_LISTS = [
  {
    name: "Starter therapy targets",
    description: "Common early targets covering TH, SH, CH and J sounds.",
    words: [
      { english: "thing", phonemes: ["θ", "ɪ", "ŋ"], hint: "Any object at all" },
      { english: "ship", phonemes: ["ʃ", "ɪ", "p"], hint: "It sails on the sea" },
      { english: "chair", phonemes: ["tʃ", "eə"], hint: "You sit on it" },
      { english: "jam", phonemes: ["dʒ", "æ", "m"], hint: "Spread it on toast" },
      { english: "fish", phonemes: ["f", "ɪ", "ʃ"], hint: "It swims" },
      { english: "cat", phonemes: ["k", "æ", "t"], hint: "A pet that purrs" },
    ],
  },
  {
    name: "Diphthongs",
    description: "Two-part vowel sounds, each stored as a single phoneme.",
    words: [
      { english: "day", phonemes: ["d", "eɪ"], hint: "The opposite of night" },
      { english: "boy", phonemes: ["b", "ɔɪ"], hint: "A young man" },
      { english: "cow", phonemes: ["k", "aʊ"], hint: "It says moo" },
      { english: "goat", phonemes: ["g", "oʊ", "t"], hint: "A farm animal with horns" },
      { english: "kite", phonemes: ["k", "aɪ", "t"], hint: "It flies on a string" },
      { english: "hair", phonemes: ["h", "eə"], hint: "It grows on your head" },
    ],
  },
];

async function seedPhonemes() {
  const rows = [
    ...CONSONANTS.map((p, i) => ({ ...p, category: "CONSONANT", sortOrder: i })),
    ...VOWELS.map((p, i) => ({ ...p, category: "VOWEL", sortOrder: i })),
  ];
  for (const row of rows) {
    const data = { label: row.label, example: row.example, category: row.category, sortOrder: row.sortOrder };
    await prisma.phoneme.upsert({
      where: { symbol: row.ipa },
      update: data,
      create: { symbol: row.ipa, ...data },
    });
  }
  return rows.length;
}

async function seedStarterContent() {
  const phonemes = await prisma.phoneme.findMany();
  const idBySymbol = new Map(phonemes.map((p) => [p.symbol, p.id]));
  const created = {};

  for (const list of STARTER_LISTS) {
    const record = await prisma.wordList.create({
      data: {
        name: list.name,
        description: list.description,
        words: {
          create: list.words.map((w) => ({
            english: w.english,
            hint: w.hint,
            phonemes: {
              create: w.phonemes.map((symbol, position) => ({
                position,
                phonemeId: idBySymbol.get(symbol),
              })),
            },
          })),
        },
      },
      include: { words: true },
    });
    created[list.name] = record;
  }

  const starter = created["Starter therapy targets"];
  const wordId = (english) => starter.words.find((w) => w.english === english).id;

  await prisma.activityConfig.create({
    data: {
      name: "Starter Wordle",
      type: "WORDLE",
      difficulty: "MEDIUM",
      showHints: true,
      maxGuesses: 6,
      title: "Phoneme'le: starter words",
      fileName: "phonemele-starter",
      ...AUTHOR,
      wordListId: starter.id,
      words: {
        create: ["cat", "ship", "fish", "jam"].map((english, position) => ({
          wordId: wordId(english),
          position,
        })),
      },
    },
  });

  await prisma.activityConfig.create({
    data: {
      name: "Starter Word Search",
      type: "WORD_SEARCH",
      difficulty: "MEDIUM",
      showHints: true,
      gridSize: 10,
      allowDiagonal: true,
      allowBackwards: false,
      title: "Phoneme Word Search",
      fileName: "phoneme-word-search",
      ...AUTHOR,
      wordListId: starter.id,
      words: {
        create: ["thing", "ship", "chair", "jam", "fish"].map((english, position) => ({
          wordId: wordId(english),
          position,
        })),
      },
    },
  });
}

async function main() {
  const existingPhonemes = await prisma.phoneme.count();
  const total = await seedPhonemes();
  console.log(`Seed: ${total} phonemes ready.`);

  if (existingPhonemes === 0) {
    await seedStarterContent();
    console.log("Seed: starter word lists and activities created.");
    if (process.env.SEED_SIMULATED !== "false") {
      const simulated = await simulateUsage(prisma, { days: 14, newActivities: 6 });
      console.log("Seed: simulated usage records created.", simulated);
    }
  } else {
    console.log("Seed: existing database detected, starter content skipped.");
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
