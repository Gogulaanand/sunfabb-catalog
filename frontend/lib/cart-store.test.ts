import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "./cart-store";

const ITEM = {
  variantId: "v1",
  quantity: 2,
  productName: "Classic Bedsheet",
  productSlug: "classic-bedsheet",
  variantLabel: "King · White · Cotton",
  pricePaise: 125000,
};

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("addItem inserts a new item", () => {
    useCartStore.getState().addItem(ITEM);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject(ITEM);
  });

  it("addItem increments quantity when the same variantId already exists", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().addItem({ ...ITEM, quantity: 3 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("updateQuantity changes the quantity of an existing item", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().updateQuantity("v1", 7);
    expect(useCartStore.getState().items[0].quantity).toBe(7);
  });

  it("updateQuantity removes the item when quantity is 0", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().updateQuantity("v1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("updateQuantity removes the item when quantity is negative", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().updateQuantity("v1", -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removeItem deletes the matching item", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().addItem({ ...ITEM, variantId: "v2", quantity: 1 });
    useCartStore.getState().removeItem("v1");
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].variantId).toBe("v2");
  });

  it("clearCart empties the store", () => {
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().addItem({ ...ITEM, variantId: "v2", quantity: 1 });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
