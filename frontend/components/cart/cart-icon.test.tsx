import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { LocalCartItem } from "@/lib/cart-store";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const selectorMock = vi.fn();
vi.mock("@/lib/cart-store", () => ({
  useCartStore: (selector: (s: { items: LocalCartItem[] }) => unknown) => selectorMock(selector),
}));

import CartIcon from "./cart-icon";

const makeItem = (variantId: string, quantity: number): LocalCartItem => ({
  variantId,
  quantity,
  productName: "Test",
  productSlug: "test",
  variantLabel: "King · White · Cotton",
  pricePaise: 100000,
});

describe("CartIcon", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    // default: guest with empty local cart
    selectorMock.mockImplementation((sel: (s: { items: LocalCartItem[] }) => unknown) =>
      sel({ items: [] }),
    );
    Object.defineProperty(document, "cookie", {
      value: "",
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    selectorMock.mockReset();
  });

  it("renders a link to /cart", () => {
    render(<CartIcon />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/cart");
  });

  it("shows no badge when the local cart is empty", () => {
    render(<CartIcon />);
    // badge span only renders when count > 0
    expect(screen.queryByText(/^\d/)).toBeNull();
  });

  it("shows the summed quantity from the local store for a guest", () => {
    selectorMock.mockImplementation((sel: (s: { items: LocalCartItem[] }) => unknown) =>
      sel({ items: [makeItem("v1", 3), makeItem("v2", 2)] }),
    );
    render(<CartIcon />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it('caps the badge at "99+" when count exceeds 99', () => {
    selectorMock.mockImplementation((sel: (s: { items: LocalCartItem[] }) => unknown) =>
      sel({ items: [makeItem("v1", 100)] }),
    );
    render(<CartIcon />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("fetches the server count for a logged-in user and displays it", async () => {
    Object.defineProperty(document, "cookie", {
      value: "customer_logged_in=1",
      configurable: true,
      writable: true,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ quantity: 4 }, { quantity: 1 }] }),
    });

    render(<CartIcon />);

    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/customer/cart");
  });

  it("falls back to local count when the server fetch fails", async () => {
    Object.defineProperty(document, "cookie", {
      value: "customer_logged_in=1",
      configurable: true,
      writable: true,
    });
    selectorMock.mockImplementation((sel: (s: { items: LocalCartItem[] }) => unknown) =>
      sel({ items: [makeItem("v1", 2)] }),
    );
    fetchMock.mockRejectedValue(new Error("network error"));

    render(<CartIcon />);

    // server count never resolves — local count (2) is shown
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });
});
