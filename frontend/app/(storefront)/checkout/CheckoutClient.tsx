"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import type { Quote, Address } from "@/lib/customer-api";

// Card/UPI data is entered inside Razorpay's own hosted iframe and never
// touches this app or our server — that's what keeps us at PCI-DSS SAQ-A
// (§7.1). We only ever see the three opaque callback fields below.
interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

interface PlaceOrderResponse {
  order: { order_number: string };
  payment: {
    key: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    orderNumber: string;
  };
}

interface Props {
  quote: Quote;
  addresses: Address[];
}

export default function CheckoutClient({ quote, addresses }: Props) {
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);

  const defaultAddress = addresses.find((a) => a.is_default);
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress?.id ?? addresses[0]?.id ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  const hasAddress = addresses.length > 0;

  async function confirmPayment(
    response: RazorpaySuccessResponse,
    orderNumber: string,
  ) {
    try {
      // Optimistic UX only — the webhook is the source of truth (§7.1). Whether
      // or not this call succeeds, the order already exists; send the customer
      // to its detail page either way rather than stranding them on checkout.
      await fetch("/api/customer/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });
    } finally {
      router.push(`/account/orders/${orderNumber}`);
      router.refresh();
      setSubmitting(false);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddressId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to place order" }));
        setError(body.message ?? "Failed to place order");
        setSubmitting(false);
        return;
      }

      const { order, payment } = (await res.json()) as PlaceOrderResponse;

      // The server cleared the server cart inside the order transaction; reset
      // any lingering local guest cart state too — the order exists now
      // regardless of what happens in Checkout below.
      clearCart();

      if (!window.Razorpay) {
        setError("Payment could not start. Please refresh and try again.");
        setSubmitting(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: payment.key,
        amount: payment.amountPaise,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: "Sunfabb",
        description: `Order ${payment.orderNumber}`,
        handler: (response) => {
          void confirmPayment(response, order.order_number);
        },
        modal: {
          // No retry-payment flow exists yet (6.9) — a dismissed/declined
          // checkout leaves this order PENDING_PAYMENT indefinitely, so don't
          // promise a capability that isn't built.
          ondismiss: () => {
            setSubmitting(false);
            setError(
              "Payment was not completed. To try again, please place a new order.",
            );
          },
        },
      });
      razorpay.open();
    } catch {
      setError("Something went wrong placing your order. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
      />
      <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
        <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-10">
          Checkout
        </h1>

        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Left: shipping address + line items */}
          <div className="lg:col-span-2">
            <section className="mb-10">
              <h2 className="text-title-md text-on-surface font-medium mb-4">
                Shipping address
              </h2>
              {!hasAddress ? (
                <div className="border border-outline-variant rounded-sm p-4">
                  <p className="text-body-md text-on-surface-variant mb-4">
                    You don&apos;t have a saved address yet. Add one to place your order.
                  </p>
                  <Link
                    href="/account"
                    className="inline-block bg-primary text-on-primary text-label-caps px-6 py-2.5 rounded hover:opacity-90 transition-opacity"
                  >
                    Add an address
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {addresses.map((address) => (
                    <li key={address.id}>
                      <label className="flex gap-3 border border-outline-variant rounded-sm p-4 cursor-pointer hover:border-primary transition-colors has-[:checked]:border-primary">
                        <input
                          type="radio"
                          name="shipping-address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => setSelectedAddressId(address.id)}
                          className="mt-1"
                        />
                        <span className="text-body-sm text-on-surface-variant">
                          <span className="text-on-surface font-medium">
                            {address.full_name}
                          </span>
                          {address.is_default && (
                            <span className="ml-2 text-label-caps text-primary">Default</span>
                          )}
                          <br />
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}
                          <br />
                          {address.city}, {address.state} {address.pincode}
                          <br />
                          {address.phone}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-title-md text-on-surface font-medium mb-4">Items</h2>
              <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                {quote.items.map((item) => (
                  <li key={item.variantId} className="py-4 flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-title-sm text-on-surface">{item.productName}</p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        {item.variantLabel}
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        {formatPrice(item.unitPricePaise)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-body-md text-on-surface font-medium whitespace-nowrap">
                      {formatPrice(item.lineTotalPaise)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right: order summary + place order */}
          <div className="mt-10 lg:mt-0">
            <div className="bg-surface-container-low rounded-lg p-6 space-y-4">
              <h2 className="text-title-md text-on-surface font-medium">Order Summary</h2>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Subtotal</span>
                <span className="text-on-surface font-medium">
                  {formatPrice(quote.subtotalPaise)}
                </span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Shipping</span>
                <span className="text-on-surface font-medium">
                  {quote.shippingPaise === 0 ? "Free" : formatPrice(quote.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Taxes</span>
                <span className="text-on-surface font-medium">
                  {quote.taxPaise === 0 ? "—" : formatPrice(quote.taxPaise)}
                </span>
              </div>
              <div className="flex justify-between text-title-sm text-on-surface font-medium pt-4 border-t border-outline-variant">
                <span>Total</span>
                <span>{formatPrice(quote.totalPaise)}</span>
              </div>

              {error && <p className="text-body-sm text-error">{error}</p>}

              <button
                onClick={handlePlaceOrder}
                disabled={submitting || !hasAddress || !selectedAddressId || !razorpayReady}
                className="block w-full text-center bg-primary text-on-primary text-label-caps py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Placing order…" : "Place Order"}
              </button>
              <p className="text-body-sm text-on-surface-variant text-center">
                You&apos;ll complete payment on the next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
