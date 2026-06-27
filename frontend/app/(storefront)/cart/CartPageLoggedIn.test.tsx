import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Cart } from "@/lib/customer-api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  formatPrice: (paise: number) => `₹${(paise / 100).toFixed(0)}`,
}));

import CartPageLoggedIn from "./CartPageLoggedIn";

const VARIANT = {
  id: "v1",
  size: "King",
  price: 125000,
  stock_quantity: 10,
  sku: "BDS-KG-WHT-CTN",
  is_active: true,
  product: { id: "p1", name: "Classic Bedsheet", slug: "classic-bedsheet" },
  material: { name: "Cotton" },
  color: { name: "White", hex_code: "#FFFFFF" },
};

const CART: Cart = {
  id: "cart-1",
  customer_id: "c1",
  created_at: "2026-06-25T00:00:00.000Z",
  updated_at: "2026-06-25T00:00:00.000Z",
  items: [
    {
      id: "item-1",
      cart_id: "cart-1",
      variant_id: "v1",
      quantity: 2,
      variant: VARIANT,
    },
  ],
};

const EMPTY_CART: Cart = { ...CART, items: [] };

describe("CartPageLoggedIn", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("shows the empty-cart message when there are no items", () => {
    render(<CartPageLoggedIn initialCart={EMPTY_CART} />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("renders item name, variant label, and formatted price", () => {
    render(<CartPageLoggedIn initialCart={CART} />);
    expect(screen.getByText("Classic Bedsheet")).toBeInTheDocument();
    expect(screen.getByText("King · White · Cotton")).toBeInTheDocument();
    // Per-unit price displayed in item row
    expect(screen.getAllByText("₹1250")[0]).toBeInTheDocument();
  });

  it("renders the order subtotal", () => {
    render(<CartPageLoggedIn initialCart={CART} />);
    // ₹2500 appears twice: once as the line-item total and once in Order Summary
    expect(screen.getAllByText("₹2500")).toHaveLength(2);
  });

  it("shows an out-of-stock label when stock_quantity is 0", () => {
    const outOfStock: Cart = {
      ...CART,
      items: [{ ...CART.items[0], variant: { ...VARIANT, stock_quantity: 0 } }],
    };
    render(<CartPageLoggedIn initialCart={outOfStock} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("PATCHes the item and updates the displayed quantity on + click", async () => {
    const updated: Cart = {
      ...CART,
      items: [{ ...CART.items[0], quantity: 3 }],
    };
    fetchMock.mockResolvedValue({ ok: true, json: async () => updated });

    render(<CartPageLoggedIn initialCart={CART} />);
    fireEvent.click(screen.getByLabelText("Increase quantity"));

    await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customer/cart/items/item-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("DELETEs the item and removes it from the list on Remove click", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<CartPageLoggedIn initialCart={CART} />);
    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => expect(screen.getByText("Your cart is empty")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customer/cart/items/item-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("links Proceed to Checkout to /checkout (Phase 6.3)", () => {
    render(<CartPageLoggedIn initialCart={CART} />);
    const link = screen.getByRole("link", { name: /Proceed to Checkout/i });
    expect(link).toHaveAttribute("href", "/checkout");
  });
});
