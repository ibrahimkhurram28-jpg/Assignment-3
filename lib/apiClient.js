// Small fetch wrapper used by the frontend to call the backend API.
// Successful responses return the `data` field. Failures throw ApiError with
// the server's message and any field-level details.

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", details = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // { english: "This word is already in the list.", ... }
  fieldErrors() {
    const out = {};
    for (const d of this.details ?? []) {
      const key = String(d.path ?? "").split(".")[0] || "form";
      if (!out[key]) out[key] = d.message;
    }
    return out;
  }
}

async function send(path, { method = "GET", body } = {}) {
  try {
    return await fetch(path, {
      method,
      cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check that the app is still running.");
  }
}

async function failure(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON error body, fall back to the status text below.
  }
  const error = payload?.error ?? {};
  return new ApiError(error.message || `Request failed with status ${response.status}.`, {
    status: response.status,
    code: error.code || "HTTP_ERROR",
    details: error.details || [],
  });
}

export async function apiRequest(path, options) {
  const response = await send(path, options);
  if (!response.ok) throw await failure(response);
  const payload = await response.json();
  return payload.data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
};

// Downloads the server-generated HTML for a saved activity.
export async function fetchActivityFile(activityId) {
  const response = await send(`/api/activities/${activityId}/generate`);
  if (!response.ok) throw await failure(response);
  const blob = await response.blob();
  const fileName = response.headers.get("X-File-Name") || `activity-${activityId}.html`;
  return { blob, fileName };
}
