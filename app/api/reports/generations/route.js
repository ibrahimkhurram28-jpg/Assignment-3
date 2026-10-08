import { ok, withErrorHandling } from "@/lib/server/http";
import { listGenerations } from "@/lib/services/reportService";

export const dynamic = "force-dynamic";

// GET /api/reports/generations?status=SUCCESS|FAILED&type=WORDLE|WORD_SEARCH&page=1&pageSize=25
export const GET = withErrorHandling(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  return ok(await listGenerations(params));
});
