"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCartItem {
  variantId: string;
  quantity: number;
  // Snapshot captured at add-time — for display in the guest /cart view only.
  // These are NEVER sent to the checkout; the server re-reads prices from
  // ProductVariant (D34 / C1).
  productName: string;
  productSlug: string;
  variantLabel: string; // e.g. "King · Indigo · 100% Cotton"
  pricePaise: number;
  imageUrl?: string;
}

interface CartStore {
  items: LocalCartItem[];
  addItem: (item: LocalCartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      updateQuantity: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity } : i,
            ),
          };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: "sunfabb-cart" },
  ),
);
