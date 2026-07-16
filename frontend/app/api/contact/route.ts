import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Boundary validation (CLAUDE.md rule 11): validate the incoming body before
// forwarding, and validate the 201 response before returning to the client.

const requestSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1),
  email: z.string().email().max(254).optional(),
  message: z.string().min(10).max(2000),
  turnstile_token: z.string().min(1),
  company: z.string().max(0).optional(),
});

const responseSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { message: "API URL not configured" },
      { status: 500 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach backend" },
      { status: 502 }
    );
  }

  if (res.status !== 201) {
    const errBody = await res.json().catch(() => ({}));
    return NextResponse.json(errBody, { status: res.status });
  }

  const raw = await res.json();
  const validated = responseSchema.safeParse(raw);
  if (!validated.success) {
    return NextResponse.json(
      { message: "Unexpected response from backend" },
      { status: 502 }
    );
  }

  return NextResponse.json(validated.data, { status: 201 });
}
