"use client";

import { useRouter } from "next/navigation";

export function AccountNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/customer/logout", { method: "POST" });
    router.push("/account/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="font-display text-headline-md text-on-surface">My Account</h1>
      <button
        onClick={handleLogout}
        className="text-label-caps text-on-surface-variant border border-outline-variant rounded-sm px-4 py-2 hover:border-primary hover:text-primary transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
