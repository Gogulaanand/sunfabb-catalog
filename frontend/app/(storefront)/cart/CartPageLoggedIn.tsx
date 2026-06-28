"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/api";
import type { Cart } from "@/lib/customer-api";

interface Props {
  initialCart: Cart;
}

export default function CartPageLoggedIn({ initialCart }: Props) {
  const [cart, setCart] = useState<Cart>(initialCart);
  const [busy, setBusy] = useState<string | null>(null); // itemId being mutated

  async function handleUpdateQuantity(itemId: string, quantity: number) {
    setBusy(itemId);
    try {
      const res = await fetch(`/api/customer/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) setCart(await res.json());
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(itemId: string) {
    setBusy(itemId);
    try {
      const res = await fetch(`/api/customer/cart/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setCart((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== itemId),
        }));
      }
    } finally {
      setBusy(null);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 text-center">
        <p className="font-display text-headline-md-mobile text-on-surface mb-4">Your cart is empty</p>
        <p className="text-body-md text-on-surface-variant mb-8">Browse our collection and add something you love.</p>
        <Link
          href="/catalog"
          className="inline-block bg-primary text-on-primary text-label-caps px-8 py-3 rounded hover:opacity-90 transition-opacity"
        >
          Shop All
        </Link>
      </div>
    );
  }

  const total = cart.items.reduce((sum, i) => sum + i.variant.price * i.quantity, 0);

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-10">
        Your Cart
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Item list */}
        <ul className="lg:col-span-2 divide-y divide-outline-variant">
          {cart.items.map((item) => {
            const { variant } = item;
            const label = [variant.size, variant.color.name, variant.material.name]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={item.id} className="py-6 flex gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/catalog/${variant.product.slug}`}
                    className="text-title-sm text-on-surface hover:text-primary transition-colors"
                  >
                    {variant.product.name}
                  </Link>
                  <p className="text-body-sm text-on-surface-variant mt-1">{label}</p>
                  {variant.stock_quantity === 0 && (
                    <p className="text-body-sm text-error mt-1">Out of stock</p>
                  )}
                  <p className="text-body-md text-on-surface font-medium mt-2">
                    {formatPrice(variant.price)}
                  </p>

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={busy === item.id || item.quantity <= 1}
                      className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary transition-colors disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-body-md text-on-surface w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={busy === item.id}
                      className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary transition-colors disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={busy === item.id}
                      className="ml-4 text-body-sm text-outline hover:text-error transition-colors disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <p className="text-body-md text-on-surface font-medium whitespace-nowrap">
                  {formatPrice(variant.price * item.quantity)}
                </p>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <div className="mt-10 lg:mt-0">
          <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
            <h2 className="text-title-md text-on-surface font-medium">Order Summary</h2>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Subtotal</span>
              <span className="text-on-surface font-medium">{formatPrice(total)}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Shipping and taxes calculated at checkout.
            </p>
            <div className="pt-4 border-t border-outline-variant">
              {/* Checkout available in Phase 6.3 */}
              <button
                disabled
                className="block w-full text-center bg-primary text-on-primary text-label-caps py-3 rounded opacity-50 cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
              <p className="text-body-sm text-on-surface-variant text-center mt-3">
                Checkout coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
