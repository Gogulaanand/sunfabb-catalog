"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-headline-md text-on-surface mb-4">Check your email</h1>
        <p className="text-body-md text-on-surface-variant">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/account/login" className="text-primary hover:underline text-body-sm mt-6 inline-block">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-headline-md text-on-surface mb-4">Reset your password</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Enter your account email and we&apos;ll send you a reset link.
      </p>
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
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary rounded-sm py-2.5 text-label-caps disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
