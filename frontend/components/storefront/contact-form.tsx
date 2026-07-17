"use client";

import { useRef, useState } from "react";
import TurnstileWidget from "./turnstile-widget";
import { whatsappLink } from "@/lib/site-config";

interface SubmitResult {
  id: string;
  created_at: string;
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to trigger a widget re-key after a failed submit (single-use token).
  const widgetKeyRef = useRef(0);
  const [widgetKey, setWidgetKey] = useState(0);

  function resetTurnstile() {
    widgetKeyRef.current += 1;
    setWidgetKey(widgetKeyRef.current);
    setToken(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined, message, turnstile_token: token }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as SubmitResult;
        setSuccess(data);
      } else if (res.status === 429) {
        setError("Too many requests. Please wait a minute and try again.");
        resetTurnstile();
      } else if (res.status === 403) {
        setError("CAPTCHA verification failed. Please try again.");
        resetTurnstile();
      } else {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = typeof body.message === "string" ? body.message : "Something went wrong. Please try again.";
        setError(msg);
        resetTurnstile();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 bg-surface-container-low rounded-lg border border-outline-variant">
        <p className="font-display text-xl text-primary mb-2">Thank you!</p>
        <p className="text-body-sm text-on-surface-variant">
          We&apos;ve received your enquiry and will get back to you soon.
          You can also reach us directly on{" "}
          <a href={whatsappLink()} className="text-primary underline">
            WhatsApp
          </a>{" "}
          for a faster response.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "block text-label-caps text-on-surface-variant mb-1";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="cf-name" className={labelClass}>
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="cf-name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="cf-phone" className={labelClass}>
          Phone <span aria-hidden="true">*</span>
        </label>
        <input
          id="cf-phone"
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="+91 98765 43210"
        />
      </div>

      <div>
        <label htmlFor="cf-email" className={labelClass}>
          Email <span className="text-outline font-normal">(optional)</span>
        </label>
        <input
          id="cf-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="cf-message" className={labelClass}>
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="cf-message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
          placeholder="Tell us about your enquiry — product type, quantity, customisation needs, etc."
        />
        <p className="mt-1 text-body-sm text-outline text-right">
          {message.length}/2000
        </p>
      </div>

      {/* Honeypot — hidden from humans, filled by bots, rejected by backend @MaxLength(0) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          height: 0,
          overflow: "hidden",
        }}
      >
        <label htmlFor="cf-company">Company</label>
        <input
          id="cf-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <TurnstileWidget key={widgetKey} onToken={setToken} />

      <button
        type="submit"
        disabled={!token || submitting}
        className="w-full rounded-md bg-primary px-4 py-3 text-label-caps text-on-primary transition-opacity disabled:opacity-50 hover:opacity-90"
      >
        {submitting ? "Sending…" : "Send Enquiry"}
      </button>
    </form>
  );
}
