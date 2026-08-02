import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const API_URL = "https://api.example.com";
const validBody = {
  name: "Anand",
  phone: "+919876543210",
  email: "anand@example.com",
  message: "I would like to know more about bedspreads.",
  turnstile_token: "test-token",
};

function requestWith(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3001/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
    vi.unstubAllGlobals();
  });

  it("validates the request and the backend success response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2026-08-02T10:00:00.000Z",
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(requestWith(validBody));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2026-08-02T10:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/contact`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects invalid input before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(requestWith({ ...validBody, message: "short" }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes backend errors without passing through unknown fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: "captcha_failed", secret: "do not echo" }),
          { status: 403 },
        ),
      ),
    );

    const response = await POST(requestWith(validBody));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "captcha_failed" });
  });

  it("fails closed when the backend success shape drifts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "not-a-uuid" }), { status: 201 }),
      ),
    );

    const response = await POST(requestWith(validBody));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Unexpected response from backend",
    });
  });
});
