import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildItemListSchemaData, ItemListSchema } from "./ItemListSchema";

const items = [
  { name: "Royal Cotton Bedspread", slug: "royal-cotton-bedspread" },
  { name: "Classic Towel Set", slug: "classic-towel-set" },
];

describe("buildItemListSchemaData", () => {
  it("numbers items starting from 1", () => {
    const data = buildItemListSchemaData(items, "https://sunfabb.com");
    const list = data.itemListElement as Array<Record<string, unknown>>;
    expect(list[0].position).toBe(1);
    expect(list[1].position).toBe(2);
  });

  it("builds the correct catalog URL for each product", () => {
    const data = buildItemListSchemaData(items, "https://sunfabb.com");
    const list = data.itemListElement as Array<Record<string, unknown>>;
    expect(list[0].url).toBe(
      "https://sunfabb.com/catalog/royal-cotton-bedspread",
    );
    expect(list[1].url).toBe("https://sunfabb.com/catalog/classic-towel-set");
  });

  it("sets @type to ItemList", () => {
    const data = buildItemListSchemaData(items, "https://sunfabb.com");
    expect(data["@type"]).toBe("ItemList");
  });

  it("handles an empty items array", () => {
    const data = buildItemListSchemaData([], "https://sunfabb.com");
    expect(data.itemListElement).toHaveLength(0);
  });
});

describe("ItemListSchema", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(
      <ItemListSchema items={items} siteUrl="https://sunfabb.com" />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("renders parseable JSON-LD with all items", () => {
    const { container } = render(
      <ItemListSchema items={items} siteUrl="https://sunfabb.com" />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.textContent!);
    expect(parsed["@type"]).toBe("ItemList");
    expect(parsed.itemListElement).toHaveLength(2);
  });
});
