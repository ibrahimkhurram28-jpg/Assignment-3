-- CreateTable
CREATE TABLE "Phoneme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "WordList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "english" TEXT NOT NULL,
    "hint" TEXT,
    "wordListId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WordPhoneme" (
    "wordId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "phonemeId" INTEGER NOT NULL,

    PRIMARY KEY ("wordId", "position"),
    CONSTRAINT "WordPhoneme_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WordPhoneme_phonemeId_fkey" FOREIGN KEY ("phonemeId") REFERENCES "Phoneme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "showHints" BOOLEAN NOT NULL DEFAULT true,
    "maxGuesses" INTEGER,
    "gridSize" INTEGER,
    "allowDiagonal" BOOLEAN,
    "allowBackwards" BOOLEAN,
    "title" TEXT NOT NULL,
    "authorName" TEXT,
    "authorNumber" TEXT,
    "fileName" TEXT,
    "wordListId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityConfig_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityWord" (
    "activityId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("activityId", "wordId"),
    CONSTRAINT "ActivityWord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ActivityConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerationLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ActivityConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_symbol_key" ON "Phoneme"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "WordList_name_key" ON "WordList"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Word_wordListId_english_key" ON "Word"("wordListId", "english");

-- CreateIndex
CREATE INDEX "WordPhoneme_phonemeId_idx" ON "WordPhoneme"("phonemeId");

-- CreateIndex
CREATE INDEX "ActivityConfig_type_idx" ON "ActivityConfig"("type");

-- CreateIndex
CREATE INDEX "ActivityConfig_wordListId_idx" ON "ActivityConfig"("wordListId");

-- CreateIndex
CREATE INDEX "ActivityWord_wordId_idx" ON "ActivityWord"("wordId");

-- CreateIndex
CREATE INDEX "GenerationLog_activityId_idx" ON "GenerationLog"("activityId");

