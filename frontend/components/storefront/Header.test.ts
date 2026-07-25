import { describe, expect, it } from "vitest";
import { shouldCompactHeader } from "./Header";

describe("shouldCompactHeader", () => {
  it("compacts only after scrolling beyond the upper threshold", () => {
    expect(shouldCompactHeader(40, false)).toBe(false);
    expect(shouldCompactHeader(41, false)).toBe(true);
  });

  it("stays compact while scroll anchoring moves within the threshold gap", () => {
    expect(shouldCompactHeader(24, true)).toBe(true);
    expect(shouldCompactHeader(9, true)).toBe(true);
  });

  it("expands only after returning near the top", () => {
    expect(shouldCompactHeader(8, true)).toBe(false);
    expect(shouldCompactHeader(0, true)).toBe(false);
  });
});
