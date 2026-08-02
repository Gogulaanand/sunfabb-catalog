import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactPage from "./page";

vi.mock("@/components/storefront/contact-form", () => ({
  default: () => <form aria-label="Contact form" />,
}));

describe("contact page", () => {
  it("keeps the enquiry route available without rendering unverified channels", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Contact Us" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Contact form" })).toBeInTheDocument();
    expect(screen.queryByText("Reach us directly")).not.toBeInTheDocument();
    expect(screen.queryByText(/XXXXX|\.\.\./)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open in Google Maps/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Call us/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Email us/i })).not.toBeInTheDocument();
    expect(
      document.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });
});
