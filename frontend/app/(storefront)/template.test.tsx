import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StorefrontTemplate, { ENABLE_PAGE_TRANSITIONS } from "./template";

describe("StorefrontTemplate", () => {
  it("wraps navigated storefront content in the optional transition class", () => {
    render(
      <StorefrontTemplate>
        <span>page content</span>
      </StorefrontTemplate>,
    );

    expect(ENABLE_PAGE_TRANSITIONS).toBe(true);
    expect(screen.getByText("page content").parentElement).toHaveClass(
      "storefront-page-transition",
    );
  });
});
