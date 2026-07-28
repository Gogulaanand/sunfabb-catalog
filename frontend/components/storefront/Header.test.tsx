import { fireEvent, render, screen, within } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { shouldCompactHeader, Header } from "./Header";

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

describe("Header mobile menu", () => {
  it("renders navigation links in the opened menu", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Navigation menu" });
    const menuQueries = within(menu);
    expect(menu).toBeVisible();
    expect(menuQueries.getByRole("link", { name: "Bedspreads" })).toBeVisible();
    expect(menuQueries.getByRole("link", { name: "All Products" })).toBeVisible();
    expect(menuQueries.getByRole("link", { name: "Account" })).toBeVisible();
  });
});
