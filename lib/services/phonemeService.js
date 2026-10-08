import { prisma } from "@/lib/server/prisma";
import { parsePhonemes } from "@/lib/phonemeParser";
import { ValidationError } from "@/lib/server/errors";
import { serializePhoneme } from "./serializers";

export async function listPhonemes() {
  const rows = await prisma.phoneme.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map(serializePhoneme);
}

/**
 * Parses teacher input against the phoneme table and returns the matching
 * phoneme rows in order. Throws a ValidationError with clear messages when
 * the input is missing, malformed or uses unknown symbols.
 */
export async function resolvePhonemes(input, db = prisma) {
  const rows = await db.phoneme.findMany();
  const bySymbol = new Map(rows.map((p) => [p.symbol, p]));
  const result = parsePhonemes(input, [...bySymbol.keys()]);

  if (!result.ok) {
    const message = result.errors[0] ?? "The phonemes could not be read.";
    throw new ValidationError(
      message,
      result.errors.map((m) => ({ path: "phonemes", message: m }))
    );
  }
  return result.phonemes.map((symbol) => bySymbol.get(symbol));
}
