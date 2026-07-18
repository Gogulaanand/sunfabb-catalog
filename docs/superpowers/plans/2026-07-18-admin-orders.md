# Milestone 6.8 Admin Order Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT-protected admin order list/detail/status-transition APIs and responsive Chakra UI screens that let the admin safely move orders through the existing state machine.

**Architecture:** A focused `backend/src/admin/orders` resource owns admin reads and response mapping, while delegating status changes to the existing `OrdersService.transition()` and `assertTransition()` authority. The Next.js admin pages fetch through server-only `admin-api.ts`, validate every response with Zod, and use a server action for the authenticated status mutation; the detail client performs optimistic state updates with rollback.

**Tech Stack:** NestJS 11, Prisma 7, class-validator, Jest/Supertest, Next.js 16 App Router, React 19, Chakra UI v3, Zod 4, Vitest.

## Global Constraints

- No raw SQL; Prisma is the only database access layer.
- Money remains integer paise in backend responses and database; divide by 100 only when rendering `₹` in the frontend.
- Existing `JwtAuthGuard` remains the single-admin guard; no new auth principal or roles.
- All request input is validated with DTOs and `class-validator`, including page, limit, status, UUID, and date filters.
- All frontend API responses are parsed with Zod at the fetch boundary; no `as` cast is used for external payloads.
- Orders are never deleted and status changes must call the existing `assertTransition()` path.
- New UI uses Chakra UI v3 primitives, semantic tokens, mobile-first responsive layouts, and accessible labels.
- Do not stage or commit the unrelated `.codex`, `.gitignore`, or `tools/image-pipeline/CATALOG_PROGRESS.md` working-tree edits.

---

### Task 1: Define admin order DTOs and service contracts

**Files:**
- Create: `backend/src/admin/orders/dto/list-admin-orders.dto.ts`
- Create: `backend/src/admin/orders/dto/update-order-status.dto.ts`
- Create: `backend/src/admin/orders/admin-orders.service.ts`
- Test: `backend/src/admin/orders/admin-orders.service.spec.ts`

**Interfaces:**
- `ListAdminOrdersDto` exposes optional `page`, `limit`, `status`, `date_from`, and `date_to` query values. Defaults are page `1` and limit `20`; limit is capped at `100`.
- `UpdateOrderStatusDto` exposes exactly `{ status: OrderStatus }`.
- `AdminOrdersService.findAll(dto)` returns `{ orders, total, page, limit }` where each order includes `id`, `order_number`, `status`, `customer.full_name`, `customer.email`, `total_paise`, `created_at`, and `item_count`.
- `AdminOrdersService.findOne(id)` returns the mapped detail shape with safe order fields, customer contact fields, frozen item snapshots, payments, optional shipment, and `allowed_next_statuses`.
- `AdminOrdersService.updateStatus(id, status)` returns the refreshed mapped detail shape.

- [x] **Step 1: Write failing service tests for list filtering and pagination**

```ts
it('lists newest orders with status/date filters and Prisma item counts', async () => {
  mockPrisma.order.findMany.mockResolvedValue([ORDER_LIST_ROW]);
  mockPrisma.order.count.mockResolvedValue(1);

  await expect(service.findAll({
    page: 2,
    limit: 10,
    status: 'PAID',
    date_from: '2026-07-01',
    date_to: '2026-07-18',
  })).resolves.toEqual({
    orders: [expect.objectContaining({ order_number: 'SF-2026-000123', item_count: 2 })],
    total: 1,
    page: 2,
    limit: 10,
  });

  expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      status: 'PAID',
      created_at: {
        gte: new Date('2026-07-01T00:00:00.000Z'),
        lt: new Date('2026-07-19T00:00:00.000Z'),
      },
    },
    orderBy: { created_at: 'desc' },
    skip: 10,
    take: 10,
    include: { customer: { select: { full_name: true, email: true } }, _count: { select: { items: true } } },
  }));
});
```

- [x] **Step 2: Run the focused test and verify it fails because the service does not exist**

Run: `cd backend && npx jest src/admin/orders/admin-orders.service.spec.ts --runInBand`

Expected: FAIL with the missing module/class or missing method error.

- [x] **Step 3: Add DTO validation and the minimal service implementation**

Use `@Type(() => Number)`, `@IsInt()`, `@Min(1)`, `@Max(100)`, `@IsEnum(OrderStatus)`, and `@IsDateString()` on the DTOs. Use `Prisma.OrderWhereInput`, Prisma `findMany`, `count`, `findUnique`, and `update` only through the injected `PrismaService`. Convert date-only `date_to` to the next UTC day and use an exclusive `lt` bound so the user-selected day is inclusive. Reject `date_from > date_to` with `BadRequestException`.

The service must select only `Customer.full_name`, `Customer.email`, and `Customer.phone`; never select `password_hash`. The detail mapper must calculate `allowed_next_statuses` from `ORDER_STATUS_TRANSITIONS[order.status]` and preserve all money as paise.

- [x] **Step 4: Add failing tests for detail mapping, missing orders, and status delegation**

```ts
it('maps detail fields and computes legal next statuses from the shared state machine', async () => {
  mockPrisma.order.findUnique.mockResolvedValue(ORDER_DETAIL_ROW);
  await expect(service.findOne('order-1')).resolves.toMatchObject({
    order_number: 'SF-2026-000123',
    customer: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '9876543210' },
    items: [{ product_name: 'Royal Bedspread', unit_price_paise: 5000, quantity: 2 }],
    payments: [{ status: 'CAPTURED', amount_paise: 10000, razorpay_payment_id: 'pay_1' }],
    allowed_next_statuses: ['PROCESSING', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  });
});

it('throws 404 for an unknown order', async () => {
  mockPrisma.order.findUnique.mockResolvedValue(null);
  await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
});

it('delegates status changes to OrdersService.transition and refreshes detail', async () => {
  mockPrisma.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PAID' }).mockResolvedValueOnce(ORDER_DETAIL_ROW);
  mockOrdersService.transition.mockResolvedValue({ id: 'order-1', status: 'PROCESSING' });
  await service.updateStatus('order-1', 'PROCESSING');
  expect(mockOrdersService.transition).toHaveBeenCalledWith({ id: 'order-1', status: 'PAID' }, 'PROCESSING');
});
```

- [x] **Step 5: Run the focused tests to verify the new failures**

Run: `cd backend && npx jest src/admin/orders/admin-orders.service.spec.ts --runInBand`

Expected: the new assertions fail until the mapper, 404, date-range validation, and delegation are implemented.

- [x] **Step 6: Implement the remaining minimal service behavior**

Use `Promise.all` for list rows and count. Use `findUnique({ where: { id }, include: DETAIL_INCLUDE })` for detail. For status updates, load the current status, throw `NotFoundException` when absent, call `ordersService.transition(current, next)`, then call `findOne(id)` so the response includes the same validated detail contract.

- [x] **Step 7: Run the focused tests and refactor only after green**

Run: `cd backend && npx jest src/admin/orders/admin-orders.service.spec.ts --runInBand`

Expected: PASS with all service cases green.

- [x] **Step 8: Commit after the user’s explicit commit approval**

The user approved commit/push/PR creation. Implementation commit: `4637c0e`.

---

### Task 2: Wire the protected backend resource and endpoint integration tests

**Files:**
- Create: `backend/src/admin/orders/admin-orders.controller.ts`
- Create: `backend/src/admin/orders/admin-orders.module.ts`
- Create: `backend/src/admin/orders/admin-orders.controller.spec.ts`
- Create: `backend/src/admin/orders/admin-orders.integration.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- `GET /admin/orders` calls `AdminOrdersService.findAll(query)`.
- `GET /admin/orders/:id` calls `AdminOrdersService.findOne(id)`.
- `PATCH /admin/orders/:id/status` calls `AdminOrdersService.updateStatus(id, dto.status)` and returns the updated detail response.

- [x] **Step 1: Write the failing controller and integration tests**

The controller test must override `JwtAuthGuard`, assert each method delegates to the service, and assert the class has the guard metadata. The integration test must create a Nest testing module with the real controller/service, a mocked `PrismaService`, mocked `OrdersService`, and an overridden `JwtAuthGuard`, then use Supertest to exercise all three route contracts. Include a malformed status body assertion that returns `400` under the global `ValidationPipe` and an illegal transition assertion that returns `400` without an update call.

- [x] **Step 2: Run the tests and verify they fail before wiring the module**

Run: `cd backend && npx jest src/admin/orders/admin-orders.controller.spec.ts src/admin/orders/admin-orders.integration.spec.ts --runInBand`

Expected: FAIL because the controller/module files and routes are absent.

- [x] **Step 3: Implement the guarded controller and module**

Use `@Controller('admin/orders')` and `@UseGuards(JwtAuthGuard)`. Import `PrismaModule` and `OrdersModule` in `AdminOrdersModule`, register the controller/service, then import `AdminOrdersModule` in `AppModule`.

- [x] **Step 4: Run backend order tests**

Run: `cd backend && npx jest src/admin/orders --runInBand`

Expected: PASS.

---

### Task 3: Add validated admin API functions

**Files:**
- Modify: `frontend/lib/admin-api.ts`
- Test: `frontend/lib/admin-api.test.ts`

**Interfaces:**
- Export `AdminOrderStatus`, `AdminOrderListItem`, `AdminOrdersResponse`, and `AdminOrderDetail` as Zod-inferred types.
- Export `listAdminOrders(params)`, `getAdminOrder(id)`, and `updateAdminOrderStatus(id, status)`.

- [x] **Step 1: Add failing API tests**

Test exact URL/query serialization, `PATCH` method/body, auth headers, and rejection when a response is missing `total_paise`, `customer`, `items`, `payments`, or `allowed_next_statuses`. Use fixtures that mirror the backend snake_case contract and UUID string IDs.

- [x] **Step 2: Run the focused frontend API tests and verify they fail**

Run: `cd frontend && npx vitest run lib/admin-api.test.ts`

Expected: FAIL because the three functions and schemas are absent.

- [x] **Step 3: Implement Zod schemas and authenticated functions**

Use `requestJson()` and parse every response. Build list query strings with `URLSearchParams`; omit empty filters. Define status as a Zod enum and derive the TypeScript type with `z.infer`, rather than maintaining a separate TypeScript interface. Parse the status-update response with the detail schema.

- [x] **Step 4: Run the focused tests**

Run: `cd frontend && npx vitest run lib/admin-api.test.ts`

Expected: PASS.

---

### Task 4: Build the admin orders list and navigation

**Files:**
- Create: `frontend/app/admin/(dashboard)/orders/page.tsx`
- Create: `frontend/app/admin/(dashboard)/orders/orders-client.tsx`
- Create: `frontend/app/admin/(dashboard)/orders/orders-client.test.tsx`
- Create: `frontend/components/admin/order-status.tsx`
- Modify: `frontend/components/admin/admin-nav.tsx`

**Interfaces:**
- The server page validates URL params, calls `listAdminOrders`, and passes data plus filter state to the client.
- The client renders the responsive table, filters, pagination, empty state, loading/disabled filter controls, and links to `/admin/orders/:id`.
- `OrderStatusBadge` renders a readable label and Chakra `Tag.Root colorPalette` for every status, including terminal/refund states.

- [x] **Step 1: Read the installed Next.js App Router guide for async page/search params**

Run: `cd frontend && rg -n "searchParams|page props|params" node_modules/next/dist/docs -g '*.md' | head -80` and inspect the relevant guide before writing the page.

- [x] **Step 2: Write failing component tests**

Cover the table columns, formatted `₹1,250.00` output from `125000` paise, status labels/palettes, filter values, pagination links preserving filters, and the Orders nav link. Verify order IDs are used as stable keys and links.

- [x] **Step 3: Run the focused component tests and verify they fail**

Run: `cd frontend && npx vitest run 'app/admin/(dashboard)/orders/orders-client.test.tsx'`

Expected: FAIL because the list components are absent.

- [x] **Step 4: Implement the responsive Chakra UI list**

Use `Table.Root`, `NativeSelect.Root`, `Input`, `Stack`, `HStack`, `Tag.Root`, `Link`, and semantic tokens. Use a mobile overflow wrapper around the table, a `base`/`md` responsive filter layout, `formatPrice` for paise, and query-string pagination links. Keep the page server-rendered and the filter/table client behavior at the leaf.

- [x] **Step 5: Run focused tests and lint the changed frontend files**

Run: `cd frontend && npx vitest run 'app/admin/(dashboard)/orders/orders-client.test.tsx' && npx eslint 'app/admin/(dashboard)/orders' components/admin/order-status.tsx components/admin/admin-nav.tsx`

Expected: PASS with no lint errors.

---

### Task 5: Build the order detail, timeline, status mutation, and optimistic rollback

**Files:**
- Create: `frontend/app/admin/(dashboard)/orders/[id]/page.tsx`
- Create: `frontend/app/admin/(dashboard)/orders/[id]/order-detail-client.tsx`
- Create: `frontend/app/admin/(dashboard)/orders/[id]/actions.ts`
- Create: `frontend/app/admin/(dashboard)/orders/[id]/order-detail-client.test.tsx`
- Create: `frontend/components/admin/order-status-timeline.tsx`

**Interfaces:**
- The server page calls `getAdminOrder(id)` and passes the validated detail to the client.
- `updateAdminOrderStatusAction(id, status)` calls `updateAdminOrderStatus`, revalidates `/admin/orders` and `/admin/orders/${id}`, and returns `{ ok: true, data }` or `{ ok: false, error }`.
- The client displays header fields, line item quantity/unit/line totals, order totals, customer contact, payment records/Razorpay IDs, status timeline, and only `allowed_next_statuses` in the update dropdown.

- [x] **Step 1: Write failing client/action tests**

Test the legal-next-state options, optimistic status rendering before the action resolves, rollback and error message when the action fails, replacement by the parsed server response on success, formatted money, and payment/order identifiers. Mock only the server action boundary and authenticated API function; keep status/timeline display real.

- [x] **Step 2: Run the focused detail tests and verify they fail**

Run: `cd frontend && npx vitest run 'app/admin/(dashboard)/orders/[id]/order-detail-client.test.tsx'`

Expected: FAIL because the detail components and action are absent.

- [x] **Step 3: Implement the server action and detail client**

Use Chakra v3 `NativeSelect`/`Button`/`Table`/`Tag`/`Stack` components with accessible labels. On confirmation, save the prior detail, immediately update the displayed status and timeline, disable the control, await the action, replace state with validated `data` on success, and restore the saved detail on failure. Use `allowed_next_statuses` from the server response; do not recreate the backend transition map in the frontend.

- [x] **Step 4: Implement the derived status timeline**

Render the canonical fulfillment sequence through `DELIVERED`. Mark states before the current fulfillment state complete, the current state active, and terminal/refund states in a distinct terminal section. Do not display invented timestamps because the schema stores no status history.

- [x] **Step 5: Run detail tests and changed-file lint**

Run: `cd frontend && npx vitest run 'app/admin/(dashboard)/orders/[id]/order-detail-client.test.tsx' && npx eslint 'app/admin/(dashboard)/orders/[id]' components/admin/order-status-timeline.tsx`

Expected: PASS with no lint errors.

---

### Task 6: Full verification and handoff before approval

**Files:**
- Modify only files required by failed verification; do not touch unrelated working-tree files.

- [x] **Step 1: Run backend unit/integration tests**

Run: `cd backend && npm test -- --runInBand` and `npm run test:e2e -- --runInBand`.

Result: the full unit/integration suite passes (43 suites, 268 tests). The existing e2e suite has one passing suite and two unrelated baseline failures: the stale scaffold test still expects `GET /` to return `Hello World!` although no root route exists, and the contact happy-path test receives a 500 because the configured remote Prisma database times out (`ETIMEDOUT` on `ContactMessage.create`).

- [x] **Step 2: Run backend lint, type-check, and build**

Run: `cd backend && npm run lint && npx tsc --noEmit && npm run build`.

Expected: exit code `0` for each command.

- [x] **Step 3: Run frontend tests, lint, type-check, and production build**

Run: `cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build`.

Expected: exit code `0` for each command.

- [x] **Step 4: Audit the diff and requirement checklist**

Run `git diff --stat main...HEAD`, `git diff --check`, and inspect all changed files. Confirm all three routes, guard, DTO validation, Prisma-only access, Zod boundary validation, paise formatting, optimistic rollback, nav link, tests, and no unrelated files are included.

- [x] **Step 5: Commit, push, and open the PR after user approval**

The feature commit was pushed to `feature/6.8-admin-orders`, and the owner has opened the PR
against `main`. The remaining milestone step is PR review and merge.
