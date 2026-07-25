import { beforeEach, describe, expect, it, vi } from "vitest";

const sendGAEvent = vi.hoisted(() => vi.fn());
vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

// The module reads NEXT_PUBLIC_GA_MEASUREMENT_ID at import time, so it is set
// before the import rather than inside a test.
vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");

const {
  paiseToRupees,
  toGaItem,
  trackViewItemList,
  trackViewItem,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
} = await import("./analytics");

const item = {
  item_id: "SKU-BED-001",
  item_name: "Royal Bedspread",
  price_paise: 125000,
  item_category: "Bedspreads",
  item_variant: "Queen / Indigo",
};

beforeEach(() => {
  sendGAEvent.mockClear();
  sessionStorage.clear();
});

function lastEvent() {
  const call = sendGAEvent.mock.calls.at(-1)!;
  return { name: call[1], params: call[2] as Record<string, unknown> };
}

describe("paiseToRupees", () => {
  it("converts paise to rupees", () => {
    expect(paiseToRupees(125000)).toBe(1250);
    expect(paiseToRupees(99)).toBe(0.99);
    expect(paiseToRupees(0)).toBe(0);
  });
});

describe("toGaItem", () => {
  it("converts price to rupees and defaults quantity to 1", () => {
    expect(toGaItem(item)).toEqual({
      item_id: "SKU-BED-001",
      item_name: "Royal Bedspread",
      price: 1250,
      quantity: 1,
      item_category: "Bedspreads",
      item_variant: "Queen / Indigo",
    });
  });

  it("omits optional fields rather than sending undefined", () => {
    const gaItem = toGaItem({
      item_id: "x",
      item_name: "y",
      price_paise: 100,
    });
    expect("item_category" in gaItem).toBe(false);
    expect("index" in gaItem).toBe(false);
  });
});

describe("trackViewItemList", () => {
  it("sends the list name and items", () => {
    trackViewItemList([item], "Catalog", "catalog");
    const { name, params } = lastEvent();
    expect(name).toBe("view_item_list");
    expect(params.item_list_name).toBe("Catalog");
    expect(params.item_list_id).toBe("catalog");
    expect(params.items).toHaveLength(1);
  });

  it("sends nothing for an empty list", () => {
    trackViewItemList([], "Catalog");
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});

describe("trackViewItem", () => {
  it("sends currency and value in rupees", () => {
    trackViewItem(item);
    const { name, params } = lastEvent();
    expect(name).toBe("view_item");
    expect(params.currency).toBe("INR");
    expect(params.value).toBe(1250);
  });
});

describe("trackAddToCart", () => {
  it("multiplies value by quantity", () => {
    trackAddToCart({ ...item, quantity: 3 });
    const { name, params } = lastEvent();
    expect(name).toBe("add_to_cart");
    expect(params.value).toBe(3750);
  });
});

describe("trackBeginCheckout", () => {
  it("sums the value across items and quantities", () => {
    trackBeginCheckout([
      { ...item, quantity: 2 },
      { item_id: "SKU-TWL-002", item_name: "Towel", price_paise: 50000 },
    ]);
    const { name, params } = lastEvent();
    expect(name).toBe("begin_checkout");
    expect(params.value).toBe(3000);
    expect(params.items).toHaveLength(2);
  });

  it("sends nothing for an empty cart", () => {
    trackBeginCheckout([]);
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});

describe("trackPurchase", () => {
  const purchase = {
    orderNumber: "SF-2026-0001",
    totalPaise: 250000,
    items: [{ ...item, quantity: 2 }],
  };

  it("sends transaction_id, value and items", () => {
    expect(trackPurchase(purchase)).toBe(true);
    const { name, params } = lastEvent();
    expect(name).toBe("purchase");
    expect(params.transaction_id).toBe("SF-2026-0001");
    expect(params.currency).toBe("INR");
    expect(params.value).toBe(2500);
    expect(params.items).toHaveLength(1);
  });

  it("includes shipping and tax when supplied", () => {
    trackPurchase({ ...purchase, shippingPaise: 9900, taxPaise: 12500 });
    const { params } = lastEvent();
    expect(params.shipping).toBe(99);
    expect(params.tax).toBe(125);
  });

  it("omits shipping and tax when not supplied", () => {
    trackPurchase(purchase);
    const { params } = lastEvent();
    expect("shipping" in params).toBe(false);
    expect("tax" in params).toBe(false);
  });

  it("fires only once per order number", () => {
    expect(trackPurchase(purchase)).toBe(true);
    expect(trackPurchase(purchase)).toBe(false);
    expect(sendGAEvent).toHaveBeenCalledTimes(1);
  });

  it("still fires for a different order number", () => {
    trackPurchase(purchase);
    expect(trackPurchase({ ...purchase, orderNumber: "SF-2026-0002" })).toBe(
      true,
    );
    expect(sendGAEvent).toHaveBeenCalledTimes(2);
  });

  it("still sends when sessionStorage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(trackPurchase(purchase)).toBe(true);
    expect(sendGAEvent).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("without a measurement ID", () => {
  it("no-ops instead of warning", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const fresh = await import("./analytics");
    fresh.trackViewItem(item);
    expect(sendGAEvent).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
  });
});
