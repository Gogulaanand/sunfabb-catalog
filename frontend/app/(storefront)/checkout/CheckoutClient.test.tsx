import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { useEffect } from "react";
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

// The real next/script fetches an external file in a browser; jsdom has none,
// so this stand-in fires onLoad on mount — equivalent to "the Razorpay SDK is
// available" for every test unless a test overrides window.Razorpay itself.
function MockScript({ onLoad }: { onLoad?: () => void }) {
  useEffect(() => {
    onLoad?.();
  }, [onLoad]);
  return null;
}
vi.mock("next/script", () => ({ default: MockScript }));

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

const PLACE_ORDER_RESPONSE = {
  order: { order_number: "SF-2026-000007" },
  payment: {
    key: "rzp_test_key",
    razorpayOrderId: "order_rzp_1",
    amountPaise: 899800,
    currency: "INR",
    orderNumber: "SF-2026-000007",
  },
};

describe("CheckoutClient", () => {
  const fetchMock = vi.fn();
  let capturedRazorpayOptions: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
    modal?: { ondismiss?: () => void };
  } | null;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    capturedRazorpayOptions = null;
    class MockRazorpay {
      open = vi.fn();
      constructor(options: typeof capturedRazorpayOptions) {
        capturedRazorpayOptions = options;
      }
    }
    vi.stubGlobal("Razorpay", MockRazorpay);
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

  it("places the order, opens Razorpay Checkout with the server-issued amount/order id", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => PLACE_ORDER_RESPONSE });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() => expect(capturedRazorpayOptions).not.toBeNull());
    expect(capturedRazorpayOptions).toMatchObject({
      key: "rzp_test_key",
      amount: 899800,
      currency: "INR",
      order_id: "order_rzp_1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customer/orders",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ addressId: "addr-default" });
    // Cart clears once the order exists, before Checkout even opens.
    expect(clearCart).toHaveBeenCalled();
  });

  it("confirms payment and redirects to the order on Checkout success", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/customer/orders") {
        return Promise.resolve({ ok: true, json: async () => PLACE_ORDER_RESPONSE });
      }
      if (url === "/api/customer/payments/verify") {
        return Promise.resolve({ ok: true, json: async () => ({ status: "PAID" }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));
    await waitFor(() => expect(capturedRazorpayOptions).not.toBeNull());

    await act(async () => {
      capturedRazorpayOptions!.handler({
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_rzp_1",
        razorpay_signature: "sig",
      });
    });

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/account/orders/SF-2026-000007"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/customer/payments/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          razorpayOrderId: "order_rzp_1",
          razorpayPaymentId: "pay_1",
          razorpaySignature: "sig",
        }),
      }),
    );
  });

  it("still redirects to the order if the optimistic verify call fails (webhook remains source of truth)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/customer/orders") {
        return Promise.resolve({ ok: true, json: async () => PLACE_ORDER_RESPONSE });
      }
      if (url === "/api/customer/payments/verify") {
        return Promise.resolve({ ok: false, json: async () => ({ message: "Invalid payment signature" }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));
    await waitFor(() => expect(capturedRazorpayOptions).not.toBeNull());

    await act(async () => {
      capturedRazorpayOptions!.handler({
        razorpay_payment_id: "pay_1",
        razorpay_order_id: "order_rzp_1",
        razorpay_signature: "sig",
      });
    });

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/account/orders/SF-2026-000007"),
    );
  });

  it("shows an error and does not redirect when the Checkout modal is dismissed", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => PLACE_ORDER_RESPONSE });

    render(<CheckoutClient quote={QUOTE} addresses={[ADDRESS]} />);
    fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));
    await waitFor(() => expect(capturedRazorpayOptions).not.toBeNull());

    act(() => {
      capturedRazorpayOptions!.modal?.ondismiss?.();
    });

    await waitFor(() =>
      expect(screen.getByText(/Payment was not completed/i)).toBeInTheDocument(),
    );
    expect(push).not.toHaveBeenCalled();
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
