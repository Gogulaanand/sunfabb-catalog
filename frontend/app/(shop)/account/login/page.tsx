"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccountLoginPage() {
  const router = useRouter();
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

      router.push("/account");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-headline-md text-on-surface mb-8">Log in</h1>
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
    </div>
  );
}
