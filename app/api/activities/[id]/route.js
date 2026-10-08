import { ok, readId, readJson, withErrorHandling } from "@/lib/server/http";
import { deleteActivity, getActivity, updateActivity } from "@/lib/services/activityService";

// GET /api/activities/:id    -> settings plus the selected words
export const GET = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await getActivity(id));
});

// PUT /api/activities/:id    -> replace every setting
export const PUT = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const body = await readJson(request);
  return ok(await updateActivity(id, body));
});

// PATCH /api/activities/:id  -> change only the fields sent
export const PATCH = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const body = await readJson(request);
  return ok(await updateActivity(id, body, { partial: true }));
});

// DELETE /api/activities/:id
export const DELETE = withErrorHandling(async (_request, context) => {
  const id = await readId(context);
  return ok(await deleteActivity(id));
});
