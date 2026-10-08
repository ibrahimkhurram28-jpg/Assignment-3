import { withErrorHandling } from "@/lib/server/http";
import { generationsCsv } from "@/lib/services/reportService";

export const dynamic = "force-dynamic";

// GET /api/reports/generations/csv?status=&type= -> the generation history as a CSV file
export const GET = withErrorHandling(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const csv = await generationsCsv(params);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="generation-report.csv"',
      "Cache-Control": "no-store",
    },
  });
});
