import { created, ok, readJson, withErrorHandling } from "@/lib/server/http";
import { createWordList, listWordLists } from "@/lib/services/wordListService";

export const dynamic = "force-dynamic";

// GET /api/word-lists   -> all word lists with word and activity counts
export const GET = withErrorHandling(async () => ok(await listWordLists()));

// POST /api/word-lists  { name, description? }
export const POST = withErrorHandling(async (request) => {
  const body = await readJson(request);
  return created(await createWordList(body));
});
