import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductRail } from "./product-rail";

describe("ProductRail empty states", () => {
  it("reports a temporary outage separately from a valid empty catalogue", () => {
    const { rerender } = render(
      <ProductRail products={[]} analyticsItems={[]} isUnavailable />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Designs are temporarily unavailable. Please try again shortly.",
    );
    expect(screen.queryByRole("link", { name: /Browse the catalogue/i })).toBeNull();

    rerender(<ProductRail products={[]} analyticsItems={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No current designs are available in this rail yet.",
    );
    expect(screen.getByRole("link", { name: /Browse the catalogue/i })).toHaveAttribute(
      "href",
      "/catalog",
    );
  });
});
