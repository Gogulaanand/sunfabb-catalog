"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Minimal runtime type declaration for the Cloudflare Turnstile browser API.
// This avoids an `as` cast (CLAUDE.md rule 11) while keeping the dep-free approach.
interface TurnstileInstance {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

export default function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function renderWidget() {
    if (
      !containerRef.current ||
      mountedRef.current ||
      !window.turnstile ||
      !siteKey
    )
      return;

    mountedRef.current = true;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }

  useEffect(() => {
    // If the script already loaded (e.g. fast navigation), render immediately.
    if (window.turnstile) {
      renderWidget();
    } else {
      // Otherwise wire the onload callback the script will invoke.
      window.onTurnstileLoad = renderWidget;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      mountedRef.current = false;
      widgetIdRef.current = null;
    };
    // onToken identity is stable per render; deps intentionally omit it to avoid re-mounting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siteKey) {
    return (
      <div
        role="alert"
        style={{
          padding: "0.75rem 1rem",
          border: "2px solid #f87171",
          borderRadius: "0.375rem",
          color: "#b91c1c",
          backgroundColor: "#fef2f2",
          fontSize: "0.875rem",
        }}
      >
        <strong>Dev error:</strong> NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
        Add it to <code>.env.local</code>.
      </div>
    );
  }

  return (
    <>
      <Script src={SCRIPT_URL} strategy="lazyOnload" />
      <div ref={containerRef} />
    </>
  );
}

// Expose reset so the contact form can call it after a failed submission.
// Tokens are single-use; failing to reset means the next submit is always 403.
export function useTurnstileReset() {
  return function reset(widgetId: string | null) {
    if (widgetId && window.turnstile) {
      // Re-render the widget to get a fresh token.
      window.turnstile.remove(widgetId);
    }
  };
}
