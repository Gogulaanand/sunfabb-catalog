import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const request = new NextRequest(new URL(pathname, "http://localhost:3001"));
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe("middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("transactional mode (normal account behaviour)", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_STOREFRONT_MODE", "TRANSACTIONAL_COMMERCE");
    });

    it("redirects to /account/login when there is no customer_token cookie", () => {
      const response = middleware(makeRequest("/account"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/account/login");
    });

    it("allows the dashboard through when a customer_token cookie is present", () => {
      const response = middleware(makeRequest("/account", { customer_token: "jwt" }));
      expect(response.status).toBe(200);
    });

    it.each([
      "/account/login",
      "/account/register",
      "/account/forgot-password",
      "/account/reset-password",
      "/account/verify-email",
    ])("allows the public auth page %s through with no cookie", (path) => {
      const response = middleware(makeRequest(path));
      expect(response.status).toBe(200);
    });

    it("still protects an unlisted /account subpath with no cookie", () => {
      const response = middleware(makeRequest("/account/orders"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/account/login");
    });
  });

  describe("lead-generation mode (commerce route tree closed)", () => {
    it.each([
      "/account",
      "/account/login",
      "/account/register",
      "/account/dashboard",
      "/account/orders",
      "/cart",
      "/cart/items",
      "/checkout",
    ])("redirects %s to home regardless of cookies", (path) => {
      vi.stubEnv("NEXT_PUBLIC_STOREFRONT_MODE", "CATALOG_LEAD_GEN");
      const response = middleware(makeRequest(path, { customer_token: "jwt" }));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/");
    });

    it("also closes the gate when the mode is absent", () => {
      vi.stubEnv("NEXT_PUBLIC_STOREFRONT_MODE", "");
      const response = middleware(makeRequest("/account/register"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/");
    });
  });

  describe("/admin/** (unchanged — unaffected by storefront mode)", () => {
    it("redirects to /admin/login when there is no admin_token cookie", () => {
      const response = middleware(makeRequest("/admin"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/admin/login");
    });

    it("allows /admin/login through with no cookie", () => {
      const response = middleware(makeRequest("/admin/login"));
      expect(response.status).toBe(200);
    });

    it("allows /admin through when an admin_token cookie is present", () => {
      const response = middleware(makeRequest("/admin", { admin_token: "jwt" }));
      expect(response.status).toBe(200);
    });
  });
});
