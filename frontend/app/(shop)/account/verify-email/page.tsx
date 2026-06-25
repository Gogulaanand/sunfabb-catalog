"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmEmailVerification } from "./actions";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStatus />
    </Suspense>
  );
}

function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    token ? "pending" : "error",
  );
  const [error, setError] = useState<string | null>(
    token ? null : "This verification link is missing its token.",
  );

  useEffect(() => {
    if (!token) return;

    let active = true;
    confirmEmailVerification(token).then((result) => {
      if (!active) return;
      if ("error" in result) {
        setStatus("error");
        setError(result.error);
      } else {
        setStatus("success");
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-headline-md text-on-surface mb-4">Verify your email</h1>
      {status === "pending" && <p className="text-body-md text-on-surface-variant">Verifying…</p>}
      {status === "success" && (
        <>
          <p className="text-body-md text-on-surface-variant mb-6">
            Your email address has been verified.
          </p>
          <Link href="/account" className="text-primary hover:underline text-body-sm">
            Go to your account
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-body-sm text-error mb-6">{error}</p>
          <Link href="/account" className="text-primary hover:underline text-body-sm">
            Go to your account
          </Link>
        </>
      )}
    </div>
  );
}
