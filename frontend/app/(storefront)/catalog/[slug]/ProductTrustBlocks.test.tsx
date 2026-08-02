import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  getProductTrustContent,
  ProductTrustBlocks,
  type ProductTrustContent,
} from "./ProductTrustBlocks";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

const configuredContent: ProductTrustContent = {
  dispatchExpectation: "Configured dispatch expectation.",
  deliveryRegion: "Configured delivery coverage.",
  returnsSummary: "Configured returns summary.",
  paymentPosture: "Configured payment posture.",
  businessContact: "Configured business contact.",
};

describe("ProductTrustBlocks", () => {
  it.each([
    ["dispatch expectation", "dispatchExpectation", "Configured dispatch expectation."],
    ["delivery region", "deliveryRegion", "Configured delivery coverage."],
    ["returns summary", "returnsSummary", "Configured returns summary."],
    ["payment posture", "paymentPosture", "Configured payment posture."],
    ["business contact", "businessContact", "Configured business contact."],
  ] as const)("renders a configured %s block", (_name, key, value) => {
    render(<ProductTrustBlocks content={{ [key]: value }} />);

    expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("renders all five configured blocks without changing their copy", () => {
    render(<ProductTrustBlocks content={configuredContent} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    for (const value of Object.values(configuredContent)) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: configuredContent.businessContact })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("omits every block when owner inputs are absent or placeholders", () => {
    render(
      <ProductTrustBlocks
        content={{
          dispatchExpectation: "",
          deliveryRegion: "   ",
          returnsSummary: "TBD",
          paymentPosture: "...",
          businessContact: "N/A",
        }}
      />,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("Good to know")).not.toBeInTheDocument();
  });

  it("defaults to the real contact route and omits unavailable policy claims in lead-gen mode", () => {
    vi.stubEnv("ECOMMERCE_ENABLED", "false");

    render(<ProductTrustBlocks />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Contact Sunfabb about this product." })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.queryByText(/Dispatch expectation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delivery region/)).not.toBeInTheDocument();
    expect(screen.queryByText("Returns summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment posture")).not.toBeInTheDocument();
  });

  it("adds payment posture only when checkout is explicitly enabled", () => {
    vi.stubEnv("ECOMMERCE_ENABLED", "true");

    expect(getProductTrustContent()).toEqual({
      paymentPosture: "Online payment is available at checkout.",
      businessContact: "Contact Sunfabb about this product.",
    });
  });
});
