import { prisma } from "@/lib/server/prisma";
import { created, readJson, withErrorHandling } from "@/lib/server/http";
import { pageVisitSchema, validate } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// POST /api/metrics/page-view  { path, durationMs }
// Sent by the browser (navigator.sendBeacon) when a visitor leaves or hides a page.
export const POST = withErrorHandling(async (request) => {
  const data = validate(pageVisitSchema, await readJson(request));
  const visit = await prisma.pageVisit.create({ data });
  return created({ id: visit.id });
});
