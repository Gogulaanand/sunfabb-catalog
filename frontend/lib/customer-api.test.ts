import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const getMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getMock })),
}));

import {
  CustomerApiError,
  register,
  login,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  mergeCart,
  getQuote,
  placeOrder,
  listOrders,
  getOrder,
  verifyPayment,
  type Cart,
  type Quote,
  type Order,
} from "./customer-api";

const SAFE_CUSTOMER = {
  id: "c1",
  email: "jane@example.com",
  full_name: "Jane Doe",
  phone: null,
  email_verified: false,
};

const AUTH_RESULT = {
  access_token: "jwt-token",
  customer: SAFE_CUSTOMER,
};

const ADDRESS = {
  id: "a1",
  customer_id: "c1",
  full_name: "Jane Doe",
  phone: "9876543210",
  line1: "1 MG Road",
  line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
  is_default: true,
  created_at: "2026-06-25T00:00:00.000Z",
  updated_at: "2026-06-25T00:00:00.000Z",
};

const CART_VARIANT = {
  id: "v1",
  size: "King",
  price: 125000,
  stock_quantity: 10,
  sku: "BDS-KG-WHT-CTN",
  is_active: true,
  product: { id: "p1", name: "Sunfabb Classic Bedsheet", slug: "sunfabb-classic-bedsheet" },
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
      variant: CART_VARIANT,
    },
  ],
};

describe("customer-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getMock.mockReturnValue({ value: "test-jwt" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    getMock.mockReset();
  });

  it("attaches the Authorization header from the customer_token cookie", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => SAFE_CUSTOMER });
    await me();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-jwt");
  });

  it("omits Authorization when there is no cookie", async () => {
    getMock.mockReturnValue(undefined);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => SAFE_CUSTOMER });
    await me();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws CustomerApiError with the response status and message on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Invalid credentials" }),
    });

    await expect(login({ email: "jane@example.com", password: "wrong-password" })).rejects.toMatchObject({
      status: 401,
      message: "Invalid credentials",
    });
  });

  it("falls back to statusText when the error body isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    const error = (await me().catch((e) => e)) as CustomerApiError;
    expect(error).toBeInstanceOf(CustomerApiError);
    expect(error.status).toBe(500);
  });

  it("parses a valid register/login response", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => AUTH_RESULT });
    const result = await register({ email: "jane@example.com", password: "Password123!" });
    expect(result).toEqual(AUTH_RESULT);
  });

  it("throws when the response is missing a required field (zod boundary validation)", async () => {
    const incomplete: Record<string, unknown> = { ...AUTH_RESULT };
    delete incomplete.access_token;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => incomplete });

    await expect(login({ email: "jane@example.com", password: "Password123!" })).rejects.toThrow();
  });

  it("throws when an address response is missing a required field", async () => {
    const incomplete: Record<string, unknown> = { ...ADDRESS };
    delete incomplete.pincode;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [incomplete] });

    await expect(listAddresses()).rejects.toThrow();
  });

  it("throws when a cart item is missing its variant (zod boundary validation)", async () => {
    const badCart = {
      ...CART,
      items: [{ id: "item-1", cart_id: "cart-1", variant_id: "v1", quantity: 2 }],
    };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => badCart });

    await expect(getCart()).rejects.toThrow();
  });

  it("throws when a cart is missing its items array (zod boundary validation)", async () => {
    const badCart = { id: CART.id, customer_id: CART.customer_id, created_at: CART.created_at, updated_at: CART.updated_at };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => badCart });

    await expect(getCart()).rejects.toThrow();
  });

  it.each([
    ["getCart", () => getCart(), "/me/cart", "GET", CART],
    ["addCartItem", () => addCartItem("v1", 2), "/me/cart/items", "POST", CART],
    ["updateCartItem", () => updateCartItem("item-1", 3), "/me/cart/items/item-1", "PATCH", CART],
    ["removeCartItem", () => removeCartItem("item-1"), "/me/cart/items/item-1", "DELETE", { ok: true }],
    ["mergeCart", () => mergeCart([{ variantId: "v1", quantity: 1 }]), "/me/cart/merge", "POST", CART],
    ["logout", () => logout(), "/auth/customer/logout", "POST", { ok: true }],
    ["verifyEmail", () => verifyEmail("raw-token"), "/auth/customer/verify-email", "POST", { verified: true }],
    ["forgotPassword", () => forgotPassword("jane@example.com"), "/auth/customer/forgot-password", "POST", { ok: true }],
    ["resetPassword", () => resetPassword("raw-token", "NewPassword123!"), "/auth/customer/reset-password", "POST", { ok: true }],
    ["listAddresses", () => listAddresses(), "/me/addresses", "GET", [ADDRESS]],
    [
      "createAddress",
      () =>
        createAddress({
          full_name: "Jane Doe",
          phone: "9876543210",
          line1: "1 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        }),
      "/me/addresses",
      "POST",
      ADDRESS,
    ],
    ["updateAddress", () => updateAddress("a1", { city: "Mumbai" }), "/me/addresses/a1", "PATCH", ADDRESS],
    ["deleteAddress", () => deleteAddress("a1"), "/me/addresses/a1", "DELETE", { ok: true }],
  ] as const)("%s calls %s with method %s", async (_name, fn, path, method, body) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });
    await fn();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(path);
    expect(init.method ?? "GET").toBe(method);
  });

  // --- Checkout & Orders ---

  const QUOTE: Quote = {
    items: [
      {
        variantId: "v1",
        productName: "Classic Bedsheet",
        variantLabel: "King · White · Cotton",
        unitPricePaise: 125000,
        quantity: 2,
        lineTotalPaise: 250000,
      },
    ],
    subtotalPaise: 250000,
    shippingPaise: 0,
    taxPaise: 0,
    totalPaise: 250000,
  };

  const ORDER: Order = {
    id: "o1",
    order_number: "SF-2026-000001",
    status: "PENDING_PAYMENT",
    email: "jane@example.com",
    subtotal_paise: 250000,
    shipping_paise: 0,
    tax_paise: 0,
    discount_paise: 0,
    total_paise: 250000,
    currency: "INR",
    shipping_address: {
      full_name: "Jane Doe",
      phone: "9876543210",
      line1: "1 MG Road",
      line2: null,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      country: "India",
    },
    created_at: "2026-06-27T00:00:00.000Z",
    items: [
      {
        id: "oi1",
        variant_id: "v1",
        product_name: "Classic Bedsheet",
        variant_label: "King · White · Cotton",
        sku: "BDS-KG-WHT-CTN",
        hsn_code: "6304",
        unit_price_paise: 125000,
        quantity: 2,
        line_total_paise: 250000,
      },
    ],
  };

  it("getQuote POSTs to /checkout/quote and parses the priced quote", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => QUOTE });
    const quote = await getQuote();
    expect(quote).toEqual(QUOTE);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/checkout/quote");
    expect(init.method).toBe("POST");
  });

  const RAZORPAY_PAYMENT = {
    key: "rzp_test_key",
    razorpayOrderId: "order_rzp_1",
    amountPaise: 250000,
    currency: "INR",
    orderNumber: "SF-2026-000001",
  };

  it("placeOrder POSTs to /orders and parses the order + Razorpay checkout params (6.4)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ order: ORDER, payment: RAZORPAY_PAYMENT }),
    });
    const result = await placeOrder({ addressId: "a1" });
    expect(result.order).toEqual(ORDER);
    expect(result.payment).toEqual(RAZORPAY_PAYMENT);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/orders");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ addressId: "a1" });
  });

  it("verifyPayment POSTs to /payments/verify and parses the confirmed order (§7.1)", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ORDER });
    const order = await verifyPayment({
      razorpayOrderId: "order_rzp_1",
      razorpayPaymentId: "pay_1",
      razorpaySignature: "sig",
    });
    expect(order).toEqual(ORDER);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/payments/verify");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      razorpayOrderId: "order_rzp_1",
      razorpayPaymentId: "pay_1",
      razorpaySignature: "sig",
    });
  });

  it("verifyPayment surfaces a 400 CustomerApiError on a tampered signature", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid payment signature" }),
    });
    await expect(
      verifyPayment({
        razorpayOrderId: "order_rzp_1",
        razorpayPaymentId: "pay_1",
        razorpaySignature: "tampered",
      }),
    ).rejects.toThrow(CustomerApiError);
  });

  it("listOrders GETs /me/orders with pagination params", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ orders: [ORDER], total: 1, page: 2, limit: 10 }),
    });
    const result = await listOrders({ page: 2, limit: 10 });
    expect(result.total).toBe(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/me/orders?page=2&limit=10");
  });

  it("getOrder GETs /me/orders/:orderNumber", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ORDER });
    const order = await getOrder("SF-2026-000001");
    expect(order.order_number).toBe("SF-2026-000001");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/me/orders/SF-2026-000001");
  });

  it("getOrder surfaces a 404 as CustomerApiError (another customer's order)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Order not found" }),
    });
    await expect(getOrder("SF-2026-999999")).rejects.toMatchObject({ status: 404 });
  });

  it("throws when an order response is missing a required field (zod boundary validation)", async () => {
    const incomplete: Record<string, unknown> = { ...ORDER };
    delete incomplete.total_paise;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => incomplete });
    await expect(getOrder("SF-2026-000001")).rejects.toThrow();
  });
});
