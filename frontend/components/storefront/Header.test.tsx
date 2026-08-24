import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isHomeRoute, shouldCompactHeader, Header } from "./Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/cart/cart-icon", () => ({
  default: () => <a href="/cart">Cart</a>,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("shouldCompactHeader", () => {
  it("compacts only after scrolling beyond the upper threshold", () => {
    expect(shouldCompactHeader(40, false)).toBe(false);
    expect(shouldCompactHeader(41, false)).toBe(true);
  });

  it("stays compact while scroll anchoring moves within the threshold gap", () => {
    expect(shouldCompactHeader(24, true)).toBe(true);
    expect(shouldCompactHeader(9, true)).toBe(true);
  });

  it("expands only after returning near the top", () => {
    expect(shouldCompactHeader(8, true)).toBe(false);
    expect(shouldCompactHeader(0, true)).toBe(false);
  });
});

describe("isHomeRoute", () => {
  it("only treats the storefront root as the overlaid home route", () => {
    expect(isHomeRoute("/")).toBe(true);
    expect(isHomeRoute("/catalog")).toBe(false);
    expect(isHomeRoute(null)).toBe(false);
  });
});

describe("Header mobile menu", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_MODE", "TRANSACTIONAL_COMMERCE");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders real navigation routes in the opened menu", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Navigation menu" });
    const menuQueries = within(menu);
    expect(menu).toBeVisible();
    expect(menuQueries.getByRole("link", { name: "Shop" })).toHaveAttribute(
      "href",
      "/catalog",
    );
    expect(
      menuQueries.getByRole("link", { name: "Collections" }),
    ).toHaveAttribute("href", "/catalog?category=bedspreads");
    expect(menuQueries.getByRole("link", { name: "Materials" })).toHaveAttribute(
      "href",
      "/guides",
    );
    expect(menuQueries.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(menuQueries.getByRole("link", { name: "Account" })).toBeVisible();
  });

  it("locks scroll, traps focus, closes on escape, and restores focus", async () => {
    render(<Header />);

    const openButton = screen.getByRole("button", { name: "Open menu" });
    openButton.focus();
    fireEvent.click(openButton);

    const menu = screen.getByRole("dialog", { name: "Navigation menu" });
    const closeButton = within(menu).getByRole("button", { name: "Close menu" });
    const lastFocusable = within(menu).getByRole("link", { name: "Account" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastFocusable).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(openButton).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
  });

  it("uses the Stitch-style translucent strip at the top and graphite surface after scroll", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("fixed", "bg-home-graphite/30", "backdrop-blur-sm", "h-20");

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 60,
    });
    fireEvent.scroll(window);

    expect(header).toHaveClass("fixed", "bg-inverse-surface/95", "h-14");
  });

  it("hides cart and account controls in lead-generation mode", () => {
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_MODE", "CATALOG_LEAD_GEN");
    render(<Header />);

    expect(screen.queryByRole("link", { name: /Cart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      within(screen.getByRole("dialog", { name: "Navigation menu" })).queryByRole(
        "link",
        { name: "Account" },
      ),
    ).not.toBeInTheDocument();
  });
});
