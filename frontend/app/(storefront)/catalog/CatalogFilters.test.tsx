import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CatalogFilters from "./CatalogFilters";
import { CatalogTransitionProvider } from "./CatalogTransitionContext";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(""),
}));

const categories = [
  { id: "cat-1", name: "Bedspreads", slug: "bedspreads", description: null, image_url: null },
];
const materials = [{ id: "mat-1", name: "Cotton" }];
const colors = [{ id: "col-1", name: "Indigo", hex_code: "#3F51B5" }];

function renderFilters() {
  return render(
    <CatalogTransitionProvider>
      <CatalogFilters categories={categories} materials={materials} colors={colors} />
    </CatalogTransitionProvider>
  );
}

describe("CatalogFilters", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders every category as a checkbox option in the desktop sidebar", () => {
    renderFilters();
    // Mobile drawer is closed by default; only the desktop sidebar is in the DOM.
    expect(screen.getAllByText("Bedspreads")).toHaveLength(1);
  });

  it("navigates to the catalog with the category slug and resets page on selection", () => {
    renderFilters();
    const checkbox = screen.getByLabelText("Bedspreads");
    fireEvent.click(checkbox);

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("category=bedspreads"));
    expect(pushMock).toHaveBeenCalledWith(expect.not.stringContaining("page="));
  });
});
