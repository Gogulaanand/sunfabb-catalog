import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category, Color, Material } from "@/lib/api";
import { ShoppingFacetAccordion } from "./shopping-facet-accordion";

vi.mock("@/lib/analytics", () => ({
  trackSelectContent: vi.fn(),
}));

const categories: Category[] = [
  {
    id: "category-bedroom",
    name: "Bedroom",
    slug: "bedroom",
    description: null,
    image_url: null,
  },
];
const materials: Material[] = [{ id: "material-cotton", name: "Cotton" }];
const colors: Color[] = [
  { id: "color-indigo", name: "Indigo", hex_code: "#234" },
  { id: "color-natural", name: "Natural", hex_code: null },
];

function renderAccordion(overrides?: {
  categories?: Category[];
  materials?: Material[];
  colors?: Color[];
}) {
  return render(
    <ShoppingFacetAccordion
      categories={overrides?.categories ?? categories}
      materials={overrides?.materials ?? materials}
      colors={overrides?.colors ?? colors}
    />,
  );
}

describe("ShoppingFacetAccordion", () => {
  it("starts with Room open and keeps one panel open at a time", () => {
    renderAccordion();

    const room = screen.getByRole("button", { name: "Room" });
    const material = screen.getByRole("button", { name: "Material" });
    const colour = screen.getByRole("button", { name: "Colour" });

    expect(room).toHaveAttribute("aria-expanded", "true");
    expect(room).toHaveAttribute(
      "aria-controls",
      "shopping-facet-room-panel",
    );
    expect(room).toHaveAttribute("type", "button");
    expect(material).toHaveAttribute("aria-expanded", "false");
    expect(colour).toHaveAttribute("aria-expanded", "false");

    const roomPanel = screen.getByRole("region", { name: "Room" });
    const materialPanel = document.getElementById(
      "shopping-facet-material-panel",
    );
    const colourPanel = document.getElementById(
      "shopping-facet-colour-panel",
    );
    expect(roomPanel).toHaveAttribute(
      "aria-labelledby",
      "shopping-facet-room-trigger",
    );
    expect(roomPanel).not.toHaveAttribute("hidden");
    expect(materialPanel).toHaveAttribute(
      "aria-labelledby",
      "shopping-facet-material-trigger",
    );
    expect(materialPanel).toHaveProperty("hidden", true);
    expect(colourPanel).toHaveProperty("hidden", true);

    fireEvent.click(material);
    expect(room).toHaveAttribute("aria-expanded", "false");
    expect(material).toHaveAttribute("aria-expanded", "true");
    expect(colour).toHaveAttribute("aria-expanded", "false");
    expect(roomPanel).toHaveProperty("hidden", true);
    expect(materialPanel).toHaveProperty("hidden", false);

    fireEvent.click(material);
    expect(material).toHaveAttribute("aria-expanded", "false");
    expect(materialPanel).toHaveProperty("hidden", true);
  });

  it("supports native keyboard activation and focus-visible responsive affordances", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const room = screen.getByRole("button", { name: "Room" });
    const material = screen.getByRole("button", { name: "Material" });
    const categoryLink = screen.getByRole("link", { name: "Bedroom" });

    expect(room).toHaveClass("min-h-14", "focus-visible:ring-2");
    expect(categoryLink).toHaveClass("min-h-9", "focus-visible:ring-2");
    expect(categoryLink.parentElement).toHaveClass("flex-wrap");

    material.focus();
    await user.keyboard("{Enter}");
    expect(material).toHaveAttribute("aria-expanded", "true");
    expect(room).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("[Space]");
    expect(material).toHaveAttribute("aria-expanded", "false");
  });

  it("uses filter-specific links, swatches, and unique analytics ids", () => {
    const { container } = renderAccordion();

    expect(screen.getByRole("link", { name: "Bedroom" })).toHaveAttribute(
      "href",
      "/catalog?category=bedroom",
    );

    fireEvent.click(screen.getByRole("button", { name: "Material" }));
    expect(screen.getByRole("link", { name: "Cotton" })).toHaveAttribute(
      "href",
      "/catalog?material=material-cotton",
    );

    fireEvent.click(screen.getByRole("button", { name: "Colour" }));
    const indigo = screen.getByRole("link", { name: "Indigo" });
    expect(indigo).toHaveAttribute("href", "/catalog?color=color-indigo");
    expect(
      within(indigo).getByText("Indigo").previousElementSibling,
    ).toHaveStyle("background-color: #234");
    expect(
      within(indigo).getByText("Indigo").previousElementSibling,
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      screen
        .getByRole("link", { name: "Natural" })
        .querySelector("[aria-hidden='true']"),
    ).toBeNull();

    const analyticsIds = Array.from(
      container.querySelectorAll("a[data-analytics-id]"),
    ).map((link) => link.getAttribute("data-analytics-id"));
    expect(analyticsIds).toEqual([
      "shopping-facet-room-category-bedroom",
      "shopping-facet-material-material-cotton",
      "shopping-facet-colour-color-indigo",
      "shopping-facet-colour-color-natural",
    ]);
    expect(analyticsIds.every(Boolean)).toBe(true);
    expect(new Set(analyticsIds).size).toBe(analyticsIds.length);
  });

  it("encodes each authoritative facet value under its matching query key", () => {
    renderAccordion({
      categories: [
        {
          id: "category-special",
          name: "Bed & Bath",
          slug: "bed & bath",
          description: null,
          image_url: null,
        },
      ],
      materials: [{ id: "material/cotton", name: "Cotton" }],
      colors: [{ id: "color&indigo", name: "Indigo", hex_code: "#234" }],
    });

    expect(screen.getByRole("link", { name: "Bed & Bath" })).toHaveAttribute(
      "href",
      "/catalog?category=bed%20%26%20bath",
    );

    fireEvent.click(screen.getByRole("button", { name: "Material" }));
    expect(screen.getByRole("link", { name: "Cotton" })).toHaveAttribute(
      "href",
      "/catalog?material=material%2Fcotton",
    );

    fireEvent.click(screen.getByRole("button", { name: "Colour" }));
    expect(screen.getByRole("link", { name: "Indigo" })).toHaveAttribute(
      "href",
      "/catalog?color=color%26indigo",
    );
  });

  it("keeps triggers as buttons and falls back to the catalog when a facet is empty", () => {
    renderAccordion({ categories: [], materials: [], colors: [] });

    const room = screen.getByRole("button", { name: "Room" });
    expect(room.tagName).toBe("BUTTON");
    expect(room).not.toHaveAttribute("href");
    expect(screen.getByRole("link", { name: "Browse the full catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    );

    const material = screen.getByRole("button", { name: "Material" });
    expect(material.tagName).toBe("BUTTON");
    fireEvent.click(material);
    expect(screen.getByRole("link", { name: "Browse the full catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    );

    const colour = screen.getByRole("button", { name: "Colour" });
    expect(colour.tagName).toBe("BUTTON");
    fireEvent.click(colour);
    expect(screen.getByRole("link", { name: "Browse the full catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    );
  });
});
