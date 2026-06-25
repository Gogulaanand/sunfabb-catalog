import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const getMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getMock })),
}));

import {
  CustomerApiError,
  register,
  login,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "./customer-api";

const SAFE_CUSTOMER = {
  id: "c1",
  email: "jane@example.com",
  full_name: "Jane Doe",
  phone: null,
  email_verified: false,
};

const AUTH_RESULT = {
  access_token: "jwt-token",
  customer: SAFE_CUSTOMER,
};

const ADDRESS = {
  id: "a1",
  customer_id: "c1",
  full_name: "Jane Doe",
  phone: "9876543210",
  line1: "1 MG Road",
  line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
  is_default: true,
  created_at: "2026-06-25T00:00:00.000Z",
  updated_at: "2026-06-25T00:00:00.000Z",
};

describe("customer-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getMock.mockReturnValue({ value: "test-jwt" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    getMock.mockReset();
  });

  it("attaches the Authorization header from the customer_token cookie", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => SAFE_CUSTOMER });
    await me();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-jwt");
  });

  it("omits Authorization when there is no cookie", async () => {
    getMock.mockReturnValue(undefined);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => SAFE_CUSTOMER });
    await me();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws CustomerApiError with the response status and message on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Invalid credentials" }),
    });

    await expect(login({ email: "jane@example.com", password: "wrong-password" })).rejects.toMatchObject({
      status: 401,
      message: "Invalid credentials",
    });
  });

  it("falls back to statusText when the error body isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    const error = (await me().catch((e) => e)) as CustomerApiError;
    expect(error).toBeInstanceOf(CustomerApiError);
    expect(error.status).toBe(500);
  });

  it("parses a valid register/login response", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => AUTH_RESULT });
    const result = await register({ email: "jane@example.com", password: "Password123!" });
    expect(result).toEqual(AUTH_RESULT);
  });

  it("throws when the response is missing a required field (zod boundary validation)", async () => {
    const incomplete: Record<string, unknown> = { ...AUTH_RESULT };
    delete incomplete.access_token;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => incomplete });

    await expect(login({ email: "jane@example.com", password: "Password123!" })).rejects.toThrow();
  });

  it("throws when an address response is missing a required field", async () => {
    const incomplete: Record<string, unknown> = { ...ADDRESS };
    delete incomplete.pincode;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [incomplete] });

    await expect(listAddresses()).rejects.toThrow();
  });

  it.each([
    ["logout", () => logout(), "/auth/customer/logout", "POST", { ok: true }],
    ["verifyEmail", () => verifyEmail("raw-token"), "/auth/customer/verify-email", "POST", { verified: true }],
    ["forgotPassword", () => forgotPassword("jane@example.com"), "/auth/customer/forgot-password", "POST", { ok: true }],
    ["resetPassword", () => resetPassword("raw-token", "NewPassword123!"), "/auth/customer/reset-password", "POST", { ok: true }],
    ["listAddresses", () => listAddresses(), "/me/addresses", "GET", [ADDRESS]],
    [
      "createAddress",
      () =>
        createAddress({
          full_name: "Jane Doe",
          phone: "9876543210",
          line1: "1 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        }),
      "/me/addresses",
      "POST",
      ADDRESS,
    ],
    ["updateAddress", () => updateAddress("a1", { city: "Mumbai" }), "/me/addresses/a1", "PATCH", ADDRESS],
    ["deleteAddress", () => deleteAddress("a1"), "/me/addresses/a1", "DELETE", { ok: true }],
  ] as const)("%s calls %s with method %s", async (_name, fn, path, method, body) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });
    await fn();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(path);
    expect(init.method ?? "GET").toBe(method);
  });
});
