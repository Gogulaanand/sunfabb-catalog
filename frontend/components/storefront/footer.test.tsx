import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./footer";
import { SITE } from "@/lib/site-config";

describe("Footer", () => {
  it("links every trust route", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "About Sunfabb" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "Shipping" })).toHaveAttribute(
      "href",
      "/shipping-policy",
    );
    expect(screen.getByRole("link", { name: "Returns" })).toHaveAttribute(
      "href",
      "/returns-policy",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy-policy",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
  });

  it("always keeps the verified contact route available", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("does not render placeholder or unavailable social/contact controls", () => {
    render(<Footer />);

    expect(screen.queryByText(/XXXXX|\.\.\./)).not.toBeInTheDocument();
    if (SITE.socialProfiles.length === 0) {
      expect(screen.queryByRole("heading", { name: "Follow" })).toBeNull();
    }
    if (!SITE.phone.display) {
      expect(screen.queryByLabelText(/Call us at/)).toBeNull();
    }
    if (!SITE.whatsapp.number) {
      expect(screen.queryByLabelText(/Chat with us on WhatsApp/)).toBeNull();
    }
  });
});
