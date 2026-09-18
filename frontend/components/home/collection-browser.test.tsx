import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionBrowser } from "./collection-browser";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

vi.mock("@/lib/analytics", () => ({
  trackSelectContent: vi.fn(),
  trackWhatsAppClick: vi.fn(),
}));

describe("CollectionBrowser", () => {
  it("labels capability cards as enquiry paths instead of empty catalog routes", () => {
    render(<CollectionBrowser />);

    expect(screen.getByRole("link", { name: /Bedspreads$/ })).toHaveAttribute(
      "href",
      "/catalog?category=bedspreads",
    );

    for (const category of ["Towels", "Table linen", "Napkins"]) {
      const link = screen.getByRole("link", {
        name: `Enquire about ${category}`,
      });
      expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
      expect(link).toHaveTextContent("Enquire about this capability");
      expect(link.getAttribute("href")).not.toContain("/catalog?category=");
    }
  });
});
