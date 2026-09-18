import { render, screen } from "@testing-library/react";
import type { HTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { HeroSection } from "./hero-section";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

vi.mock("motion/react", () => ({
  motion: {
    h1: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackSelectContent: vi.fn(),
  trackWhatsAppClick: vi.fn(),
}));

describe("HeroSection", () => {
  it("keeps populated collections browsable and capability links enquiry-led", () => {
    render(<HeroSection />);

    expect(screen.getByRole("link", { name: "Bedspreads" })).toHaveAttribute(
      "href",
      "/catalog?category=bedspreads",
    );

    for (const category of ["Towels", "Table linen", "Napkins"]) {
      const link = screen.getByRole("link", {
        name: `Enquire about ${category}`,
      });
      expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
      expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(
        `${category} capability`,
      );
      expect(link.getAttribute("href")).not.toContain("/catalog?category=");
    }
  });
});
