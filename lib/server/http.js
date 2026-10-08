import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" };

// Every successful JSON response is shaped { data: ... }.
export function ok(data, status = 200) {
  return NextResponse.json({ data }, { status, headers: NO_STORE });
}

export function created(data) {
  return ok(data, 201);
}

// Every error response is shaped { error: { code, message, details? } }.
export function errorResponse(status, code, message, details) {
  const error = { code, message };
  if (details && (!Array.isArray(details) || details.length > 0)) error.details = details;
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

function fromPrismaError(err) {
  switch (err.code) {
    case "P2002":
      return errorResponse(409, "CONFLICT", "A record with the same unique value already exists.");
    case "P2003":
      return errorResponse(409, "CONFLICT", "This change refers to a related record that does not exist.");
    case "P2025":
      return errorResponse(404, "NOT_FOUND", "The requested record was not found.");
    default:
      return null;
  }
}

export function toErrorResponse(err) {
  if (err instanceof AppError) {
    return errorResponse(err.status, err.code, err.message, err.details);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const response = fromPrismaError(err);
    if (response) return response;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("[api] database unavailable:", err.message);
    return errorResponse(503, "DATABASE_UNAVAILABLE", "The database is not available. Check DATABASE_URL and run the migrations.");
  }
  console.error("[api] unexpected error:", err);
  return errorResponse(500, "INTERNAL_ERROR", "Something went wrong on the server. Please try again.");
}

// Wraps a route handler so thrown errors become JSON error responses.
export function withErrorHandling(handler) {
  return async function wrapped(request, context) {
    try {
      return await handler(request, context);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) throw new ValidationError("Request body is empty. Send a JSON object.");
  try {
    const body = JSON.parse(text);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new ValidationError("Request body must be a JSON object.");
    }
    return body;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Request body is not valid JSON.");
  }
}

// Like readJson, but an empty body is allowed and returns {}.
export async function readOptionalJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const body = JSON.parse(text);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new ValidationError("Request body must be a JSON object.");
    }
    return body;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Request body is not valid JSON.");
  }
}

// Route params are a Promise in Next.js 15+.
export async function readId(context, name = "id") {
  const params = await context.params;
  const raw = params?.[name];
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError(`"${raw}" is not a valid ${name}. Use a positive whole number.`, [
      { path: name, message: "Must be a positive whole number." },
    ]);
  }
  return id;
}
