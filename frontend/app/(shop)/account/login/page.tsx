"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Login failed" }));
        setError(body.message ?? "Invalid credentials");
        return;
      }

      // Merge local anonymous cart items into the server cart, then clear local store.
      if (cartItems.length > 0) {
        const mergeItems = cartItems.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        }));
        await fetch("/api/customer/cart/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: mergeItems }),
        }).catch(() => {/* non-fatal — server cart still accessible */});
        clearCart();
      }

      const next = searchParams.get("next") ?? "/account";
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-md text-on-surface bg-surface focus:outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-md text-on-surface bg-surface focus:outline-none focus:border-primary"
          />
        </label>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary rounded-sm py-2.5 text-label-caps disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-body-sm text-on-surface-variant">
        <Link href="/account/forgot-password" className="hover:text-primary transition-colors">
          Forgot password?
        </Link>
        <p>
          New here?{" "}
          <Link href="/account/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}

export default function AccountLoginPage() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-headline-md text-on-surface mb-8">Log in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
