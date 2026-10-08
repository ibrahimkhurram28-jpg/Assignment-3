import { ok, readId, readJson, withErrorHandling } from "@/lib/server/http";
import { deleteWord, getWord, updateWord } from "@/lib/services/wordService";

// GET /api/words/:id
export const GET = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await getWord(id));
});

// PATCH /api/words/:id  { english?, phonemes?, hint? }
export const PATCH = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const body = await readJson(request);
  return ok(await updateWord(id, body));
});

export const PUT = PATCH;

// DELETE /api/words/:id
export const DELETE = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await deleteWord(id));
});
