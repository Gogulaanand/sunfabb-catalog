# Milestone 6.8 Admin Order Management Design

## Goal

Add a protected admin order-management resource and Chakra UI screens so the single admin can inspect orders and move them through the existing order-status state machine.

## Context and constraints

- The branch is `feature/6.8-admin-orders`, based on `main`.
- The backend remains the source of truth for authorization, validation, persistence, status transitions, and business rules.
- Prisma is the only database access layer. Orders are never deleted.
- Money remains integer paise in the API and database; the frontend formats paise as INR only at the display boundary.
- The existing `JwtAuthGuard` is the project’s single-admin JWT guard. No new authentication principal or roles are introduced.
- Backend response fields remain snake_case to match the existing contract. The frontend maps them to display labels such as “Order number” and “Items”.

## Backend design

Create `backend/src/admin/orders/` as a focused admin resource:

- `admin-orders.module.ts` imports `PrismaModule` and the existing `OrdersModule`, and exports no new auth layer.
- `admin-orders.controller.ts` exposes the three `/admin/orders` routes and is protected with `JwtAuthGuard`.
- `admin-orders.service.ts` owns admin query composition and response mapping. It uses Prisma for list/detail reads and delegates status changes to `OrdersService.transition()` so the existing `assertTransition()` guard remains the sole transition authority.
- DTOs validate pagination, status, and ISO date filters. `date_to` is inclusive for date-only values. Invalid ranges are rejected with HTTP 400.
- Unit tests mock Prisma and `OrdersService`. Controller tests exercise route method delegation, DTO inputs, 404 propagation, illegal-transition propagation, and guard registration.
- An endpoint integration test boots a Nest testing module with the real controller/service wiring, overrides the admin guard and Prisma boundary, and exercises the three HTTP contracts through Supertest.

### API contracts

`GET /admin/orders?page=1&limit=20&status=PAID&date_from=2026-07-01&date_to=2026-07-18`

```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "SF-2026-000123",
      "status": "PAID",
      "customer": {
        "full_name": "Jane Doe",
        "email": "jane@example.com"
      },
      "total_paise": 125000,
      "created_at": "2026-07-18T08:30:00.000Z",
      "item_count": 2
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

The list query filters by status and `created_at`, sorts newest first, and uses Prisma `_count.items` so item counts do not require loading all line items.

`GET /admin/orders/:id` returns a mapped detail object containing all safe order scalar fields, customer `full_name`/`email`/`phone`, frozen order-item display fields and prices, payment status/amount/Razorpay IDs, optional shipment fields, and `allowed_next_statuses`. Sensitive customer fields such as `password_hash` are never selected or returned.

`PATCH /admin/orders/:id/status` accepts `{ "status": "PROCESSING" }`. The service loads the current order, delegates to `OrdersService.transition()`, then returns the refreshed mapped detail response. A missing order is 404; an illegal transition is the existing 400 from `assertTransition()` and is never persisted.

## Frontend design

Extend `frontend/lib/admin-api.ts` with Zod schemas and authenticated functions for list, detail, and status update responses. Every response is parsed before use; no response uses a TypeScript `as` cast.

Create the route group `frontend/app/admin/(dashboard)/orders/`:

- `page.tsx` reads validated URL search params and server-fetches the paginated list.
- `orders-client.tsx` renders the responsive Chakra table, status badges, customer, formatted INR total, date, item count, filters, and pagination links. Filter changes update the URL so the server remains the data-fetching boundary.
- `[id]/page.tsx` server-fetches the validated detail response.
- `[id]/order-detail-client.tsx` renders the order header, line items, payment card, status timeline, and status update control. It invokes a server action so admin cookies remain server-side.
- `[id]/actions.ts` calls the authenticated PATCH and revalidates the order detail/list routes.
- `components/admin/order-status.tsx` centralizes status labels and badge palettes; `order-status-timeline.tsx` owns the fulfillment-path presentation if extraction improves clarity.
- `components/admin/admin-nav.tsx` gains the Orders link.

The status dropdown is populated from server-computed `allowed_next_statuses`, which prevents the frontend from becoming a second authoritative state machine. On confirmation, the detail client applies the selected status immediately, disables the control while pending, and rolls back to the previous validated detail if the request fails. On success, it replaces the optimistic state with the validated server response.

The schema has no status-history table. The timeline therefore represents the canonical fulfillment path (`PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED`) and highlights the current or terminal state; it does not invent transition timestamps.

## Error handling

- Backend DTO validation rejects unknown fields, malformed UUIDs, invalid statuses, invalid dates, invalid page/limit values, and invalid date ranges with 400.
- Backend maps missing order records to 404.
- Frontend preserves the existing `AdminApiError` behavior and renders a clear list/detail error state consistent with the admin UI.
- Status-update failures restore the pre-request detail state and show the returned error message.

## Testing scope

- Backend unit tests cover the Prisma `where`/pagination/orderBy shape, list mapping, detail mapping, payment/customer fields, 404s, and transition delegation.
- Backend controller/integration tests cover all route paths, guard wiring, valid DTO delegation, and 400 propagation for illegal transitions.
- Frontend API tests cover request URLs/methods/bodies and Zod rejection of malformed list/detail/update responses.
- Frontend component tests cover status badges, list filters/pagination links, legal-next-state options, optimistic update, rollback, and successful replacement with the server response.
- Final verification runs backend tests, backend lint/build/type-check, frontend tests, frontend lint, and frontend production build. Existing baseline failures are tracked separately and must be resolved or clearly reported before the PR is opened.
