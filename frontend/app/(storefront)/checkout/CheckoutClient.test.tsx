import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Quote, Address } from "@/lib/customer-api";

const push = vi.fn();
const refresh = vi.fn();
const clearCart = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/api", () => ({
  formatPrice: (paise: number) => `₹${(paise / 100).toFixed(0)}`,
}));

vi.mock("@/lib/cart-store", () => ({
  useCartStore: (selector: (s: { clearCart: () => void }) => unknown) => selector({ clearCart }),
}));

import CheckoutClient from "./CheckoutClient";

const QUOTE: Quote = {
  items: [
    {
      variantId: "v1",
      productName: "Heritage Linen Bedspread",
      variantLabel: "Queen · White · Linen",
      unitPricePaise: 449900,
      quantity: 2,
      lineTotalPaise: 899800,
    },
  ],
  subtotalPaise: 899800,
  shippingPaise: 0,
  taxPaise: 0,
  totalPaise: 899800,
};

const ADDRESS: Address = {
  id: "addr-default",
  customer_id: "c1",
  full_name: "Jane Doe",
  phone: "9876543210",
  line1: "12 MG Road",
  line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
  is_default: true,
  created_at: "2026-06-27T00:00:00.000Z",
  updated_at: "2026-06-27T00:00:00.000Z",
};

describe("CheckoutClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    push.mockReset();
    clearCart.mockReset();
  });

  it("renders the line item, product, and total", () => {
    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    expect(screen.getByText("Heritage Linen Bedspread")).toBeInTheDocument();
    expect(screen.getByText("Queen · White · Linen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeEnabled();
  });

  it("places the order with the default address, clears the cart, and redirects to the order", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ order_number: "SF-2026-000007" }),
    });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/account/orders/SF-2026-000007"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customer/orders",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ addressId: "addr-default" });
    expect(clearCart).toHaveBeenCalled();
  });

  it("surfaces a server error and does not redirect", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Insufficient stock for SKU-1" }),
    });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(screen.getByText("Insufficient stock for SKU-1")).toBeInTheDocument(),
    );
    expect(push).not.toHaveBeenCalled();
    expect(clearCart).not.toHaveBeenCalled();
  });

  it("with no saved address, disables Place Order and prompts to add one", () => {
    render(<CheckoutClient quote={QUOTE} addresses={[]} />);
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Add an address/i })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("preselects the default address when several exist", () => {
    const second: Address = { ...ADDRESS, id: "addr-2", is_default: false, full_name: "Work" };
    render(<CheckoutClient quote={QUOTE} addresses={[second, ADDRESS]} />);
    // The default address's radio is the checked one.
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    const checked = radios.find((r) => r.checked);
    expect(checked?.value).toBe("addr-default");
  });
});
