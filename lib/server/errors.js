// Application errors carry an HTTP status and a stable code so route
// handlers can turn them into consistent JSON error responses.

export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", details } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Some fields are invalid.", details) {
    super(message, { status: 400, code: "VALIDATION_ERROR", details });
    this.name = "ValidationError";
  }
}

export class UnprocessableError extends AppError {
  constructor(message, details) {
    super(message, { status: 422, code: "UNPROCESSABLE", details });
    this.name = "UnprocessableError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Record", id) {
    const suffix = id !== undefined ? ` with id ${id}` : "";
    super(`${resource}${suffix} was not found.`, { status: 404, code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message, details) {
    super(message, { status: 409, code: "CONFLICT", details });
    this.name = "ConflictError";
  }
}
