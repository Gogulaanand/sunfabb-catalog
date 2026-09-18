import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableLinenSplit } from "./table-linen-split";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

vi.mock("@/lib/analytics", () => ({
  trackSelectContent: vi.fn(),
  trackWhatsAppClick: vi.fn(),
}));

describe("TableLinenSplit", () => {
  it("hands the unpopulated table-linen capability to WhatsApp", () => {
    render(<TableLinenSplit />);

    const link = screen.getByRole("link", {
      name: "Enquire about table linen",
    });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
      "Table linen capability",
    );
    expect(link.getAttribute("href")).not.toContain(
      "/catalog?category=table-linen",
    );
  });
});
