import { describe, it, expect } from "vitest";
import { whatsappLink, SITE, telLink, mailtoLink } from "./site-config";

describe("whatsappLink", () => {
  it("returns a wa.me URL with the configured number", () => {
    const link = whatsappLink();
    expect(link).toMatch(/^https:\/\/wa\.me\//);
    expect(link).toContain(SITE.whatsapp.number);
  });

  it("URL-encodes the default message", () => {
    const link = whatsappLink();
    // Spaces become %20 (encodeURIComponent)
    expect(link).toContain("%20");
    expect(link).not.toContain(" ");
  });

  it("URL-encodes a custom message with special characters", () => {
    const link = whatsappLink("Hello? I need 50 towels & napkins!");
    expect(link).not.toContain(" ");
    expect(link).toContain("text=");
  });

  it("accepts an emoji in the custom message without throwing", () => {
    expect(() => whatsappLink("Hi 👋 Sunfabb")).not.toThrow();
  });

  it("custom message overrides the default", () => {
    const custom = "Custom enquiry message here.";
    const link = whatsappLink(custom);
    expect(link).toContain(encodeURIComponent(custom));
    expect(link).not.toContain(
      encodeURIComponent(SITE.whatsapp.defaultMessage)
    );
  });

  // Skipped while number is a placeholder (contains 'X'). This test enforces
  // the wa.me format constraint once real values are supplied.
  it.skipIf(SITE.whatsapp.number.includes("X"))(
    "number contains only digits (wa.me format — no + or spaces)",
    () => {
      expect(SITE.whatsapp.number).toMatch(/^\d+$/);
    }
  );
});

describe("telLink", () => {
  it("starts with tel:", () => {
    expect(telLink).toMatch(/^tel:/);
  });
});

describe("mailtoLink", () => {
  it("starts with mailto:", () => {
    expect(mailtoLink).toMatch(/^mailto:/);
  });
});
