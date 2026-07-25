import { describe, expect, it } from "vitest";
import { getAllGuides, getGuideBySlug, formatGuideDate } from "./guides";

describe("guide registry", () => {
  it("exposes every published guide", () => {
    expect(getAllGuides()).toHaveLength(4);
  });

  it("validates frontmatter on every guide", () => {
    // Importing the module is what runs the zod parse — reaching this
    // assertion at all means no guide has malformed frontmatter.
    for (const guide of getAllGuides()) {
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.description.length).toBeGreaterThan(0);
      expect(guide.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guide.category.length).toBeGreaterThan(0);
    }
  });

  it("compiles each guide to a renderable component", () => {
    for (const guide of getAllGuides()) {
      expect(typeof guide.Component).toBe("function");
    }
  });

  it("sorts guides newest first", () => {
    const dates = getAllGuides().map((guide) => guide.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("gives every guide a unique slug", () => {
    const slugs = getAllGuides().map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("points relatedCategorySlug at a real catalog category slug", () => {
    const known = ["bedspreads", "towels", "napkins", "table-linen"];
    for (const guide of getAllGuides()) {
      if (guide.relatedCategorySlug !== null) {
        expect(known).toContain(guide.relatedCategorySlug);
      }
    }
  });
});

describe("getGuideBySlug", () => {
  it("finds a guide by slug", () => {
    const guide = getGuideBySlug("towel-gsm-explained");
    expect(guide?.category).toBe("Towels");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getGuideBySlug("not-a-guide")).toBeUndefined();
  });
});

describe("formatGuideDate", () => {
  it("formats an ISO date for display", () => {
    expect(formatGuideDate("2026-07-24")).toBe("24 July 2026");
  });

  it("does not shift the day across timezones", () => {
    // Parsing "2026-01-01" as local time in a positive-offset zone would
    // render 31 December. The formatter pins everything to UTC.
    expect(formatGuideDate("2026-01-01")).toBe("1 January 2026");
  });
});
