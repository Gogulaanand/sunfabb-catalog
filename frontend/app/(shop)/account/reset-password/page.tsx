"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { submitPasswordReset } from "./actions";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitPasswordReset(token, password);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-headline-md text-on-surface mb-4">Invalid reset link</h1>
        <p className="text-body-md text-on-surface-variant">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link href="/account/forgot-password" className="text-primary hover:underline text-body-sm mt-6 inline-block">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-headline-md text-on-surface mb-4">Password reset</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          Your password has been updated. You can now log in.
        </p>
        <Link href="/account/login" className="text-primary hover:underline text-body-sm">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-headline-md text-on-surface mb-8">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">New password</span>
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
          {submitting ? "Saving…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
