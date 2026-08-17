import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const trackSelectContent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackSelectContent }));

const { TrackedContentLink } = await import("./tracked-content-link");

describe("TrackedContentLink", () => {
  it("reports the CTA source and keeps the destination", async () => {
    render(
      <TrackedContentLink
        href="/catalog"
        contentType="homepage_cta"
        contentId="hero_shop_collection"
        linkLocation="hero"
      >
        Explore designs
      </TrackedContentLink>,
    );

    const link = screen.getByRole("link", { name: "Explore designs" });
    expect(link).toHaveAttribute("href", "/catalog");
    await userEvent.click(link);
    expect(trackSelectContent).toHaveBeenCalledWith({
      contentType: "homepage_cta",
      contentId: "hero_shop_collection",
      linkLocation: "hero",
    });
  });
});
