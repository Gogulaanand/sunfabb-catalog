"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/api";

export default function CartPageGuest() {
  const { items, updateQuantity, removeItem } = useCartStore();

  if (items.length === 0) {
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

  const total = items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-10">
        Your Cart
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Item list */}
        <ul className="lg:col-span-2 divide-y divide-outline-variant">
          {items.map((item) => (
            <li key={item.variantId} className="py-6 flex gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/catalog/${item.productSlug}`}
                  className="text-title-sm text-on-surface hover:text-primary transition-colors"
                >
                  {item.productName}
                </Link>
                <p className="text-body-sm text-on-surface-variant mt-1">{item.variantLabel}</p>
                <p className="text-body-md text-on-surface font-medium mt-2">
                  {formatPrice(item.pricePaise)}
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-body-md text-on-surface w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="ml-4 text-body-sm text-outline hover:text-error transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
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
              <Link
                href="/account/login?next=/cart"
                className="block w-full text-center bg-primary text-on-primary text-label-caps py-3 rounded hover:opacity-90 transition-opacity"
              >
                Sign in to Checkout
              </Link>
              <p className="text-body-sm text-on-surface-variant text-center mt-3">
                You need an account to place an order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
