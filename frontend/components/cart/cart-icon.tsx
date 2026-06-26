"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";

function isLoggedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("customer_logged_in="));
}

export default function CartIcon() {
  const localItems = useCartStore((s) => s.items);
  const [serverCount, setServerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    // Fetch server cart count once on mount for logged-in users.
    fetch("/api/customer/cart")
      .then((r) => (r.ok ? r.json() : null))
      .then((cart: { items: { quantity: number }[] } | null) => {
        if (cart?.items) {
          const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
          setServerCount(count);
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  const count =
    serverCount !== null
      ? serverCount
      : localItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center p-2 -mr-2 text-on-surface hover:text-primary transition-colors"
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-medium px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
