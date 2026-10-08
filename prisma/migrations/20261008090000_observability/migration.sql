-- Assessment 3: observability fields, page visits and simulated-data flags.

-- AlterTable
ALTER TABLE "ActivityConfig" ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GenerationLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "GenerationLog" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'DOWNLOAD';
ALTER TABLE "GenerationLog" ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GenerationLog" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "GenerationLog" ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PageVisit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GenerationLog_generatedAt_idx" ON "GenerationLog"("generatedAt");

-- CreateIndex
CREATE INDEX "GenerationLog_status_idx" ON "GenerationLog"("status");

-- CreateIndex
CREATE INDEX "PageVisit_path_idx" ON "PageVisit"("path");

-- CreateIndex
CREATE INDEX "PageVisit_createdAt_idx" ON "PageVisit"("createdAt");
