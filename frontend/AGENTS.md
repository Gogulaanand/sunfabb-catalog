<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Consuming the backend API

The NestJS backend is the source of truth for the API contract. The frontend must match it, not the other
way around. A 2026-06-21 audit found `lib/api.ts` had silently drifted from the real payload and shipped
three user-facing bugs (see `docs/DECISIONS.md` D30). To prevent recurrence:

- **The backend payload uses `snake_case` fields, uuid `string` ids, and integer paise for money.** Mirror
  the Prisma schema (`backend/prisma/schema.prisma`) exactly — e.g. `stock_quantity` (not `stock`),
  `sort_order` (not `display_order`), `id: string` (not `number`). When in doubt, read the schema or hit
  the live endpoint; don't guess field names.
- **Never `as`-cast `res.json()`.** Casting tells the compiler to trust a shape it can't check, so a
  mismatch surfaces as `undefined` deep in a component instead of failing at the boundary. Validate the
  response shape at the fetch helper (a runtime schema, e.g. `zod`, is the lightest option — see the
  next-session prompt) so drift fails loudly.
- **When you mock the API in a test, mock the *real* shape.** Tests that invent their own response shape
  just re-encode whatever the type already (wrongly) says — `lib/api.test.ts` mocked `id: 1` and never
  caught the uuid-vs-number bug. Prefer one shared fixture/factory that mirrors the actual payload.
- `lib/admin-api.ts` already matches the backend correctly — use it as the reference for field names.
