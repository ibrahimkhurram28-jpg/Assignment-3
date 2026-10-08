import { created, ok, readOptionalJson, withErrorHandling } from "@/lib/server/http";
import { addSimulatedData, removeSimulatedData } from "@/lib/services/simulationService";

export const dynamic = "force-dynamic";

// POST /api/simulate  { days?, newActivities? } -> adds simulated activities, generations and page visits
export const POST = withErrorHandling(async (request) => {
  const body = await readOptionalJson(request);
  return created(await addSimulatedData(body));
});

// DELETE /api/simulate -> removes everything the simulator created (real records are kept)
export const DELETE = withErrorHandling(async () => ok(await removeSimulatedData()));
