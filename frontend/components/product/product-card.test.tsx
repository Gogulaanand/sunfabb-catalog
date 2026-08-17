import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const trackSelectItem = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackSelectItem }));

const { ProductCard } = await import("./product-card");

describe("ProductCard analytics", () => {
  it("reports the selected item and list before navigation", async () => {
    const item = {
      item_id: "product-1",
      item_name: "Bedspread Design 4195",
      price_paise: 149900,
      index: 1,
    };

    render(
      <ProductCard
        slug="bedspread-design-4195"
        name="Bedspread Design 4195"
        analytics={{
          item,
          listName: "Homepage designs",
          listId: "homepage-designs",
        }}
      />,
    );

    await userEvent.click(
      screen.getByRole("link", { name: /Bedspread Design 4195/i }),
    );
    expect(trackSelectItem).toHaveBeenCalledWith(
      item,
      "Homepage designs",
      "homepage-designs",
    );
  });
});
