import { ok, readId, readJson, withErrorHandling } from "@/lib/server/http";
import { deleteWordList, getWordList, updateWordList } from "@/lib/services/wordListService";

// GET /api/word-lists/:id     -> one list including its words and phonemes
export const GET = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await getWordList(id));
});

// PATCH /api/word-lists/:id   { name?, description? }
export const PATCH = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const body = await readJson(request);
  return ok(await updateWordList(id, body));
});

export const PUT = PATCH;

// DELETE /api/word-lists/:id  -> also removes its words and activities
export const DELETE = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await deleteWordList(id));
});
