import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getMock })),
}));

import {
  adminEnquiriesResponseSchema,
  listAdminEnquiries,
  parseAdminEnquiriesQuery,
} from "./admin-enquiries";

describe("admin-enquiries", () => {
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

  it("parses pagination and ignores invalid query values", () => {
    expect(parseAdminEnquiriesQuery({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
    });
    expect(parseAdminEnquiriesQuery({ page: "0", limit: "101" })).toEqual({});
  });

  it("attaches the admin token and validates the response boundary", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        enquiries: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "Jane Doe",
            phone: "+919876543210",
            email: "jane@example.com",
            message: "Please share the available king-size bedspreads.",
            created_at: "2026-09-12T08:30:00.000Z",
          },
        ],
        total: 1,
        page: 2,
        limit: 10,
      }),
    });

    await expect(listAdminEnquiries({ page: 2, limit: 10 })).resolves.toEqual(
      expect.objectContaining({ total: 1, page: 2, limit: 10 }),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/enquiries?page=2&limit=10");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-jwt");
  });

  it("rejects malformed responses instead of rendering them", async () => {
    const invalid = {
      enquiries: [
        {
          id: "not-a-uuid",
          name: "Jane Doe",
          phone: "+919876543210",
          email: null,
          message: "Hello",
          created_at: "2026-09-12T08:30:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    expect(() => adminEnquiriesResponseSchema.parse(invalid)).toThrow();
  });
});
