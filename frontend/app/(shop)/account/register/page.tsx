"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccountRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined,
          phone: phone || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Registration failed" }));
        setError(body.message ?? "Registration failed");
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
      <h1 className="font-display text-headline-md text-on-surface mb-8">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-md text-on-surface bg-surface focus:outline-none focus:border-primary"
          />
        </label>
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
          <span className="text-label-caps text-on-surface-variant">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-md text-on-surface bg-surface focus:outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-md text-on-surface bg-surface focus:outline-none focus:border-primary"
          />
        </label>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary rounded-sm py-2.5 text-label-caps disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-body-sm text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/account/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
