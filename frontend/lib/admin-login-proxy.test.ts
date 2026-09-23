import { describe, expect, it } from "vitest";
import {
  ADMIN_LOGIN_CLIENT_IP_HEADER,
  ADMIN_LOGIN_PROXY_SECRET_HEADER,
  getAdminLoginProxyHeaders,
  getAdminLoginProxySecret,
} from "./admin-login-proxy";

const SECRET = "a-secure-test-secret-with-32-bytes-minimum";

describe("admin login proxy configuration", () => {
  it("fails fast when the Vercel production deployment has no shared secret", () => {
    expect(() =>
      getAdminLoginProxySecret({ VERCEL_ENV: "production" }),
    ).toThrow(
      "ADMIN_LOGIN_PROXY_SECRET must be set",
    );
  });

  it("allows preview builds without the production proxy secret", () => {
    expect(
      getAdminLoginProxySecret({ VERCEL_ENV: "preview" }),
    ).toBeUndefined();
  });

  it("allows local development without the proxy secret", () => {
    expect(getAdminLoginProxySecret({})).toBeUndefined();
  });

  it("rejects a weak shared secret", () => {
    expect(() =>
      getAdminLoginProxySecret({ ADMIN_LOGIN_PROXY_SECRET: "too-short" }),
    ).toThrow("must be at least 32 bytes");
  });
});

describe("getAdminLoginProxyHeaders", () => {
  it("forwards the Vercel-owned client IP with the shared secret", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.42",
      "x-forwarded-for": "198.51.100.7",
    });

    expect(
      getAdminLoginProxyHeaders(headers, {
        ADMIN_LOGIN_PROXY_SECRET: SECRET,
      }),
    ).toEqual({
      [ADMIN_LOGIN_CLIENT_IP_HEADER]: "203.0.113.42",
      [ADMIN_LOGIN_PROXY_SECRET_HEADER]: SECRET,
    });
  });

  it("does not forward a spoofable x-forwarded-for value", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7" });

    expect(
      getAdminLoginProxyHeaders(headers, {
        ADMIN_LOGIN_PROXY_SECRET: SECRET,
      }),
    ).toEqual({});
  });

  it("fails closed for an invalid Vercel client IP", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.42, 198.51.100.7",
    });

    expect(
      getAdminLoginProxyHeaders(headers, {
        ADMIN_LOGIN_PROXY_SECRET: SECRET,
      }),
    ).toEqual({});
  });
});
