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

  describe("/account/** — ECOMMERCE_ENABLED=true (normal account behaviour)", () => {
    beforeEach(() => {
      vi.stubEnv("ECOMMERCE_ENABLED", "true");
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

  describe("/account/** — ECOMMERCE_ENABLED=false (gate closed)", () => {
    it.each([
      "/account",
      "/account/login",
      "/account/register",
      "/account/dashboard",
      "/account/orders",
    ])("redirects %s to home regardless of cookies", (path) => {
      vi.stubEnv("ECOMMERCE_ENABLED", "false");
      const response = middleware(makeRequest(path, { customer_token: "jwt" }));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/");
    });

    it("also closes the gate when ECOMMERCE_ENABLED is absent", () => {
      vi.stubEnv("ECOMMERCE_ENABLED", "");
      const response = middleware(makeRequest("/account/register"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3001/");
    });
  });

  describe("/admin/** (unchanged — unaffected by ECOMMERCE_ENABLED)", () => {
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
