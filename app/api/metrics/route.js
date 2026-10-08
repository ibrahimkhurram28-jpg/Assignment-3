import { ok, withErrorHandling } from "@/lib/server/http";
import { getDashboardMetrics } from "@/lib/services/metricsService";

export const dynamic = "force-dynamic";

// GET /api/metrics -> every statistic shown on the dashboard, read from the database
export const GET = withErrorHandling(async () => ok(await getDashboardMetrics()));
