import { describe, expect, it } from "vitest";
import {
  contactErrorMessage,
  contactSubmissionResponseSchema,
} from "./contact-contract";

describe("contact response contract", () => {
  it("accepts the backend submission shape", () => {
    expect(
      contactSubmissionResponseSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        created_at: "2026-08-02T10:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed backend success data", () => {
    expect(
      contactSubmissionResponseSchema.safeParse({ id: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("normalizes validated backend error messages", () => {
    expect(contactErrorMessage({ message: ["Name is required", "Try again"] })).toBe(
      "Name is required Try again",
    );
    expect(contactErrorMessage({ message: "CAPTCHA failed" })).toBe(
      "CAPTCHA failed",
    );
    expect(contactErrorMessage({ secret: "must not leak" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
