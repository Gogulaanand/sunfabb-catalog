import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LocalCartItem } from "@/lib/cart-store";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  formatPrice: (paise: number) => `₹${(paise / 100).toFixed(0)}`,
}));

const updateQuantityMock = vi.fn();
const removeItemMock = vi.fn();

vi.mock("@/lib/cart-store", () => ({
  useCartStore: vi.fn(),
}));

import { useCartStore } from "@/lib/cart-store";
import CartPageGuest from "./CartPageGuest";

const ITEM: LocalCartItem = {
  variantId: "v1",
  quantity: 2,
  productName: "Classic Bedsheet",
  productSlug: "classic-bedsheet",
  variantLabel: "King · White · Cotton",
  pricePaise: 125000,
};

describe("CartPageGuest", () => {
  beforeEach(() => {
    updateQuantityMock.mockClear();
    removeItemMock.mockClear();
  });

  function mountWithItems(items: LocalCartItem[]) {
    vi.mocked(useCartStore).mockReturnValue({
      items,
      updateQuantity: updateQuantityMock,
      removeItem: removeItemMock,
    } as ReturnType<typeof useCartStore>);
    return render(<CartPageGuest />);
  }

  it("shows the empty-cart message when there are no items", () => {
    mountWithItems([]);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop All/i })).toHaveAttribute("href", "/catalog");
  });

  it("renders each item's name, variant label, and formatted price", () => {
    mountWithItems([ITEM]);
    expect(screen.getByText("Classic Bedsheet")).toBeInTheDocument();
    expect(screen.getByText("King · White · Cotton")).toBeInTheDocument();
    expect(screen.getByText("₹1250")).toBeInTheDocument();
  });

  it("renders the order summary with the correct subtotal", () => {
    mountWithItems([ITEM, { ...ITEM, variantId: "v2", quantity: 1 }]);
    // 2×125000 + 1×125000 = 375000 paise = ₹3750
    expect(screen.getByText("₹3750")).toBeInTheDocument();
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
  });

  it("calls updateQuantity(variantId, quantity - 1) when − is clicked", () => {
    mountWithItems([ITEM]);
    fireEvent.click(screen.getByLabelText("Decrease quantity"));
    expect(updateQuantityMock).toHaveBeenCalledWith("v1", 1);
  });

  it("calls updateQuantity(variantId, quantity + 1) when + is clicked", () => {
    mountWithItems([ITEM]);
    fireEvent.click(screen.getByLabelText("Increase quantity"));
    expect(updateQuantityMock).toHaveBeenCalledWith("v1", 3);
  });

  it("calls removeItem when Remove is clicked", () => {
    mountWithItems([ITEM]);
    fireEvent.click(screen.getByText("Remove"));
    expect(removeItemMock).toHaveBeenCalledWith("v1");
  });

  it("links to the login page for checkout", () => {
    mountWithItems([ITEM]);
    expect(
      screen.getByRole("link", { name: /Sign in to Checkout/i }),
    ).toHaveAttribute("href", "/account/login?next=/cart");
  });
});
