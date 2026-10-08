import { PrismaClient } from "@prisma/client";

// Reuse one PrismaClient across hot reloads in development so we do not
// open a new SQLite connection every time a file changes.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__phonemePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__phonemePrisma = prisma;
}
