import { ok, readJson, withErrorHandling } from "@/lib/server/http";
import { resolvePhonemes } from "@/lib/services/phonemeService";

// POST /api/phonemes/parse  { "text": "tʃeə" }
// Checks phoneme text against the database without saving anything.
export const POST = withErrorHandling(async (request) => {
  const body = await readJson(request);
  const phonemes = await resolvePhonemes(body.text ?? body.phonemes);
  return ok({
    phonemes: phonemes.map((p) => p.symbol),
    spelling: phonemes.map((p) => p.label).join("").toUpperCase(),
  });
});
