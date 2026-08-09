// One error type for every API failure, plus the code-to-i18n-key mapping.
//
// The server contract lives in money_be/app/errors.py: every 4xx and 5xx returns
// `{"error": {"code", "message", "fields?"}}`. `code` is stable and
// machine-readable; `message` is English server prose and is NOT user-facing, so
// the UI always renders a translated key instead.
//
// Kept free of React so both halves are unit-testable on their own.

export class ApiError extends Error {
  constructor({ code = "INTERNAL", message = "", fields = null, status = 0 } = {}) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

// Every ErrorCode in money_be/app/errors.py, plus a generic fallback. An
// unknown code maps to the fallback rather than leaking the server message.
export const ERROR_KEYS = {
  NOT_FOUND: "error.notFound",
  UNAUTHORIZED: "error.unauthorized",
  VALIDATION: "error.validation",
  BALANCE_EXCEEDED: "error.balanceExceeded",
  UPSTREAM: "error.upstream",
  INTERNAL: "error.internal",
  RATE_LIMITED: "error.rateLimited",
};

export const FALLBACK_ERROR_KEY = "error.generic";

export function errorKey(err) {
  const code = err instanceof ApiError ? err.code : null;
  return ERROR_KEYS[code] ?? FALLBACK_ERROR_KEY;
}

// Build an ApiError from a failed Response. A proxy failure, an HTML error page
// or an empty body yields no envelope, so fall back to INTERNAL.
export async function apiErrorFromResponse(res) {
  let code = "INTERNAL";
  let message = "";
  let fields = null;
  try {
    const body = await res.json();
    const error = body?.error;
    if (error && typeof error.code === "string") {
      code = error.code;
      if (typeof error.message === "string") message = error.message;
      if (Array.isArray(error.fields)) fields = error.fields;
    }
  } catch {
    // No parseable envelope. INTERNAL is the right guess.
  }
  return new ApiError({ code, message, fields, status: res.status });
}
