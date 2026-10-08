import { ok, withErrorHandling } from "@/lib/server/http";
import { getAlerts } from "@/lib/services/alertService";

export const dynamic = "force-dynamic";

// GET /api/alerts -> failed generations, empty word lists, empty or invalid activities
export const GET = withErrorHandling(async () => ok(await getAlerts()));
