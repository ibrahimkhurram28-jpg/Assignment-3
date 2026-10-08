import { created, ok, readId, readJson, withErrorHandling } from "@/lib/server/http";
import { createWord, listWords } from "@/lib/services/wordService";

// GET /api/word-lists/:id/words   -> words in a list
export const GET = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await listWords(id));
});

// POST /api/word-lists/:id/words  { english, phonemes, hint? }
// phonemes can be "k æ t", "kæt" or ["k", "æ", "t"]
export const POST = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const body = await readJson(request);
  return created(await createWord(id, body));
});
