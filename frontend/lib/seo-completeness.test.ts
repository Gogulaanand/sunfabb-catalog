import { describe, expect, it } from "vitest";
import { getSeoGaps, isSeoComplete } from "./seo-completeness";

const complete = {
  description: "A cotton bedspread woven in Karur.",
  care_instructions: "Cold wash, dry in shade.",
  _count: { images: 3 },
  images_missing_alt_text: 0,
};

describe("getSeoGaps", () => {
  it("reports no gaps for a fully populated product", () => {
    expect(getSeoGaps(complete)).toEqual([]);
    expect(isSeoComplete(complete)).toBe(true);
  });

  it("flags a null description", () => {
    expect(getSeoGaps({ ...complete, description: null })).toEqual([
      "description",
    ]);
  });

  it("flags a whitespace-only description", () => {
    expect(getSeoGaps({ ...complete, description: "   " })).toEqual([
      "description",
    ]);
  });

  it("flags missing care instructions", () => {
    expect(getSeoGaps({ ...complete, care_instructions: null })).toEqual([
      "care_instructions",
    ]);
  });

  it("flags images missing alt text", () => {
    expect(getSeoGaps({ ...complete, images_missing_alt_text: 2 })).toEqual([
      "alt_text",
    ]);
  });

  it("reports 'no images' instead of 'missing alt text' when there are none", () => {
    const gaps = getSeoGaps({
      ...complete,
      _count: { images: 0 },
      images_missing_alt_text: 0,
    });
    expect(gaps).toEqual(["images"]);
    expect(gaps).not.toContain("alt_text");
  });

  it("accumulates every gap", () => {
    expect(
      getSeoGaps({
        description: null,
        care_instructions: "",
        _count: { images: 2 },
        images_missing_alt_text: 1,
      }),
    ).toEqual(["description", "care_instructions", "alt_text"]);
  });

  it("marks a product with any gap as incomplete", () => {
    expect(isSeoComplete({ ...complete, description: null })).toBe(false);
  });
});
