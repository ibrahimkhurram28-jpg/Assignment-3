import { created, ok, readJson, withErrorHandling } from "@/lib/server/http";
import { createActivity, listActivities } from "@/lib/services/activityService";

export const dynamic = "force-dynamic";

// GET /api/activities?type=WORDLE|WORD_SEARCH&wordListId=1
export const GET = withErrorHandling(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  return ok(await listActivities(params));
});

// POST /api/activities  { name, type, difficulty, showHints, maxGuesses | gridSize,
//                         allowDiagonal, allowBackwards, title, authorName,
//                         authorNumber, fileName, wordListId, wordIds }
export const POST = withErrorHandling(async (request) => {
  const body = await readJson(request);
  return created(await createActivity(body));
});
