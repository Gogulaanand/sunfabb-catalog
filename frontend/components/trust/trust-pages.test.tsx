import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "@/app/(storefront)/about/page";
import ShippingPolicyPage from "@/app/(storefront)/shipping-policy/page";
import ReturnsPolicyPage from "@/app/(storefront)/returns-policy/page";
import PrivacyPolicyPage from "@/app/(storefront)/privacy-policy/page";
import TermsPage from "@/app/(storefront)/terms/page";
import { TrustPageSection } from "./TrustPage";

vi.mock("@/components/motion", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("trust pages", () => {
  const pages = [
    ["AboutPage", AboutPage, "Home textiles for Indian homes"],
    ["ShippingPolicyPage", ShippingPolicyPage, "Shipping information"],
    ["ReturnsPolicyPage", ReturnsPolicyPage, "Returns information"],
    ["PrivacyPolicyPage", PrivacyPolicyPage, "Privacy information"],
    ["TermsPage", TermsPage, "Terms information"],
  ] as const;

  it.each(pages)("%s renders its page heading", (_name, Page, heading) => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact Sunfabb" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("provides a shared section presentation", () => {
    render(
      <TrustPageSection title="Confirmed facts">
        <p>India and INR catalog context.</p>
      </TrustPageSection>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Confirmed facts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("India and INR catalog context."),
    ).toBeInTheDocument();
  });
});
