import { describe, expect, it } from "vitest";
import { FAQ_SECTIONS, FAQ_ENTRIES } from "./faq-content";

describe("FAQ content", () => {
  it("flattens every section entry into FAQ_ENTRIES", () => {
    const fromSections = FAQ_SECTIONS.reduce(
      (count, section) => count + section.entries.length,
      0,
    );
    expect(FAQ_ENTRIES).toHaveLength(fromSections);
  });

  it("gives every entry a question and a substantive answer", () => {
    for (const entry of FAQ_ENTRIES) {
      expect(entry.question.trim().endsWith("?")).toBe(true);
      // Google ignores FAQ entries with thin answers; 40 chars is a floor,
      // not a target.
      expect(entry.answer.trim().length).toBeGreaterThan(40);
    }
  });

  it("has no duplicate questions", () => {
    const questions = FAQ_ENTRIES.map((entry) => entry.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("omits policy questions until the owner supplies the inputs", () => {
    // Guard rail for the Wave 1 scope decision: shipping, returns and payment
    // answers must not be invented. Delete this test when the real policy
    // copy lands.
    const text = FAQ_ENTRIES.map(
      (entry) => `${entry.question} ${entry.answer}`,
    )
      .join(" ")
      .toLowerCase();
    for (const term of ["refund", "return window", "delivery time", "cod"]) {
      expect(text).not.toContain(term);
    }
  });
});
