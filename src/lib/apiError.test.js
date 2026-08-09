import { describe, it, expect } from "vitest";
import {
  ApiError,
  apiErrorFromResponse,
  errorKey,
  ERROR_KEYS,
  FALLBACK_ERROR_KEY,
} from "./apiError.js";

// Minimal stand-in for a fetch Response: only status and json() are read.
function res(status, body) {
  return {
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("Unexpected end of JSON input");
      return body;
    },
  };
}

describe("apiErrorFromResponse", () => {
  it("parses a well-formed envelope", async () => {
    const err = await apiErrorFromResponse(
      res(422, { error: { code: "BALANCE_EXCEEDED", message: "Payment exceeds remaining balance." } })
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("BALANCE_EXCEEDED");
    expect(err.message).toBe("Payment exceeds remaining balance.");
    expect(err.status).toBe(422);
    expect(err.fields).toBeNull();
  });

  it("keeps the field list on a validation failure", async () => {
    const fields = [{ field: "amount", message: "Input should be greater than 0" }];
    const err = await apiErrorFromResponse(
      res(422, { error: { code: "VALIDATION", message: "Request validation failed", fields } })
    );
    expect(err.code).toBe("VALIDATION");
    expect(err.fields).toEqual(fields);
  });

  it("falls back to INTERNAL on an empty body", async () => {
    const err = await apiErrorFromResponse(res(502, undefined));
    expect(err.code).toBe("INTERNAL");
    expect(err.status).toBe(502);
  });

  it("falls back to INTERNAL on a body with no envelope", async () => {
    const err = await apiErrorFromResponse(res(500, { detail: "Internal Server Error" }));
    expect(err.code).toBe("INTERNAL");
  });

  it("ignores a non-array fields value", async () => {
    const err = await apiErrorFromResponse(
      res(422, { error: { code: "VALIDATION", message: "x", fields: "amount" } })
    );
    expect(err.fields).toBeNull();
  });
});

describe("errorKey", () => {
  it("maps every server code to its own key", () => {
    for (const [code, key] of Object.entries(ERROR_KEYS)) {
      expect(errorKey(new ApiError({ code }))).toBe(key);
    }
  });

  it("maps an unknown code to the fallback", () => {
    expect(errorKey(new ApiError({ code: "TEAPOT" }))).toBe(FALLBACK_ERROR_KEY);
  });

  it("maps a plain Error to the fallback", () => {
    expect(errorKey(new TypeError("Failed to fetch"))).toBe(FALLBACK_ERROR_KEY);
  });

  it("maps a missing error to the fallback", () => {
    expect(errorKey(undefined)).toBe(FALLBACK_ERROR_KEY);
  });

  it("never returns a key that is missing from a catalog", async () => {
    const es = (await import("../i18n/es.json")).default;
    const en = (await import("../i18n/en.json")).default;
    for (const key of [...Object.values(ERROR_KEYS), FALLBACK_ERROR_KEY]) {
      expect(es[key], `es.json is missing ${key}`).toBeTruthy();
      expect(en[key], `en.json is missing ${key}`).toBeTruthy();
    }
  });
});
