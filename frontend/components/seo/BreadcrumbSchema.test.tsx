import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildBreadcrumbSchemaData, BreadcrumbSchema } from "./BreadcrumbSchema";

const threeItems = [
  { name: "Home", url: "https://sunfabb.com" },
  { name: "Bedspreads", url: "https://sunfabb.com/catalog?category=bedspreads" },
  { name: "Royal Cotton Bedspread" },
];

describe("buildBreadcrumbSchemaData", () => {
  it("numbers items starting from 1", () => {
    const data = buildBreadcrumbSchemaData(threeItems);
    const list = data.itemListElement as Array<Record<string, unknown>>;
    expect(list[0].position).toBe(1);
    expect(list[1].position).toBe(2);
    expect(list[2].position).toBe(3);
  });

  it("includes item URL when provided", () => {
    const data = buildBreadcrumbSchemaData(threeItems);
    const list = data.itemListElement as Array<Record<string, unknown>>;
    expect(list[0].item).toBe("https://sunfabb.com");
    expect(list[1].item).toBe(
      "https://sunfabb.com/catalog?category=bedspreads",
    );
  });

  it("omits item property when URL is not provided", () => {
    const data = buildBreadcrumbSchemaData(threeItems);
    const list = data.itemListElement as Array<Record<string, unknown>>;
    expect("item" in list[2]).toBe(false);
  });

  it("sets @type to BreadcrumbList", () => {
    const data = buildBreadcrumbSchemaData(threeItems);
    expect(data["@type"]).toBe("BreadcrumbList");
  });
});

describe("BreadcrumbSchema", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(<BreadcrumbSchema items={threeItems} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("renders parseable JSON-LD with the correct item count", () => {
    const { container } = render(<BreadcrumbSchema items={threeItems} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.textContent!);
    expect(parsed.itemListElement).toHaveLength(3);
  });
});
