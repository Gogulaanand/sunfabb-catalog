import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStorefrontMode,
  isTransactionalCommerceEnabled,
  STOREFRONT_MODES,
} from "./storefront-mode";

describe("storefront mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults non-production environments to lead generation", () => {
    expect(getStorefrontMode({ NODE_ENV: "test" })).toBe(
      STOREFRONT_MODES.LEAD_GENERATION,
    );
  });

  it("requires an explicit valid mode in production", () => {
    expect(() => getStorefrontMode({ NODE_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_STOREFRONT_MODE must be set",
    );
    expect(() =>
      getStorefrontMode({
        NODE_ENV: "production",
        NEXT_PUBLIC_STOREFRONT_MODE: "invalid",
      }),
    ).toThrow("NEXT_PUBLIC_STOREFRONT_MODE must be CATALOG_LEAD_GEN");
  });

  it("enables commerce only for the explicit transactional value", () => {
    expect(
      isTransactionalCommerceEnabled({
        NODE_ENV: "test",
        NEXT_PUBLIC_STOREFRONT_MODE: STOREFRONT_MODES.TRANSACTIONAL,
      }),
    ).toBe(true);
    expect(
      isTransactionalCommerceEnabled({
        NODE_ENV: "test",
        NEXT_PUBLIC_STOREFRONT_MODE: STOREFRONT_MODES.LEAD_GENERATION,
      }),
    ).toBe(false);
  });
});
