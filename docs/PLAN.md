# Home Textiles Catalog - Master Build & Learning Plan

A product catalog for bedspreads, towels, napkins, and table linen, built as a deliberate
front-end to full-stack learning project.
No timeline pressure; depth of backend learning is a primary goal.

---

## 1. Locked Decisions

These are settled and shape everything below:

- **Region / currency:** India only, INR only. Single currency, no tax/multi-region complexity.
- **Catalog size:** 20-30 products at launch, very unlikely to exceed 100. **Scale is a non-issue** -
  optimize for clean code and learning, never for traffic.
- **Admin:** A single admin user. No roles/permissions system needed.
- **Architecture:** Separate backend from day one (no coupled phase). Maximum backend learning.
- **Database access:** Prisma ORM only. Not learning raw SQL for now.
- **Domain:** Existing Vercel-hosted domain; current homepage moves to a subdomain
  (`home.sunfabb.com`), main domain is the storefront.
- **Photography:** Agent-driven image-generation pipeline (see §10).

---

## 2. Architecture

```
+---------------------+         +----------------------+
|  Next.js Frontend   |  HTTPS  |   NestJS Backend     |
|  React, SSR/SSG     | ------> |   REST API           |
|  for SEO            |  (API)  |   business logic     |
|  Deploy: Vercel     | <------ |   validation, auth   |
+---------------------+         |   Deploy: Render     |
                                +----------+-----------+
                                           | Prisma ORM
                                  +--------v---------+
                                  |   PostgreSQL     |
                                  |   Neon           |
                                  +------------------+
```

**Why this shape:**
- **Next.js** renders the storefront server-side so Google can index products (SEO matters for a
  shop). It only renders UI; it holds no business logic.
- **NestJS** is the real backend - the API, validation, auth, and database access.
  Its structure (modules, dependency injection, controllers/services) mirrors enterprise Java/Spring
  patterns, so the skills transfer widely.
- **PostgreSQL + Prisma** - relational data fits a catalog perfectly; Prisma gives type-safe DB
  access.
- **Long-running backend** (not serverless) means a stable, reused database connection pool - the
  serverless "too many connections" failure mode does not apply here.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) + React | SSR/SSG for SEO |
| Language | TypeScript (both sides) | Shared types where possible |
| Styling | Tailwind CSS | |
| UI components | shadcn/ui | Accessible, you own the code |
| Backend framework | **NestJS** | Structured, DI, Spring-like patterns |
| ORM | Prisma | Type-safe, migrations, great DX |
| Database | PostgreSQL | Hosted on Neon |
| Validation | DTOs + class-validator | NestJS-native validation |
| Auth | JWT (single admin + separate customer JWT) | D10, D32 |
| Image storage | Cloudinary | Upload + auto-optimization + CDN |
| Image generation | Agent-driven pipeline in `tools/image-pipeline/` | See §10 |
| Frontend hosting | Vercel | |
| Backend hosting | Render | Long-running Node process |
| CI/CD | GitHub Actions | Lint, type-check, test on every PR |
| Testing | Jest (unit + integration), Playwright (e2e) | NestJS ships with Jest |
| Cart state | Zustand | Phase 6.2 |
| Payments | **Razorpay** (primary, India) | Phase 6.4 - hosted Checkout, dual HMAC, webhook |

---

## 4. Database Schema

Required fields have no marker; **optional fields are marked `?`**.
Only the genuine must-haves are required so you can develop incrementally and fill detail later.

```
Category
  id            (uuid, pk)
  name          (string)            e.g. "Bedspreads"
  slug          (string, unique)
  description?  (string)
  image_url?    (string)
  created_at    (datetime)

Material         <- lookup table (keeps filters clean)
  id            (uuid, pk)
  name          (string, unique)    e.g. "100% Cotton"

Color            <- lookup table (keeps filters clean)
  id            (uuid, pk)
  name          (string, unique)    e.g. "Cream"
  hex_code?     (string)            e.g. "#F5F0E1" - drives UI swatches

Product          <- the "design" a customer sees as one item
  id                 (uuid, pk)
  name               (string)       e.g. "Floral Cotton Bedspread"
  slug               (string, unique)
  description?       (string)
  care_instructions? (string)
  hsn_code?          (string)       GST HSN, per design not per variant (D35)
  category_id        (fk -> Category)
  is_active          (boolean, default true)
  created_at         (datetime)
  updated_at         (datetime)

ProductVariant   <- the actual buyable version (size + color + material)
  id              (uuid, pk)
  product_id      (fk -> Product)
  material_id     (fk -> Material)
  color_id        (fk -> Color)
  size            (string)          e.g. "King", "60x90 cm"
  price           (integer)         store in paise (smallest unit), never floats
  stock_quantity  (integer, default 0)
  sku             (string, unique)
  is_active       (boolean, default true)

ProductImage
  id          (uuid, pk)
  product_id  (fk -> Product)
  variant_id? (fk -> ProductVariant)   optional: exact-SKU shots; null means shared
  url         (string)
  alt_text?   (string)
  sort_order  (integer, default 0)
  is_primary  (boolean, default false)

-- Phase 6 e-commerce models (added migration 20260622021310_phase6_foundations):
Customer, Address, EmailToken, Cart, CartItem,
Order, OrderItem, Payment, WebhookEvent, Shipment
```

**The hierarchy in one line:** *Category* is the section of the shop -> *Product* is the named
design (one card, one detail page) -> *ProductVariant* is the specific buyable SKU (a size + color
+ material combination with its own price and stock).

**Why Material/Color are separate tables:** the filter sidebar populates itself from them, every
value stays consistent (no "Cotton" vs "cotton "), and the admin selects from dropdowns.
`Color.hex_code` lets the UI render swatches straight from the database.

**Money rule:** store `price` as an integer in paise (e.g. ₹1,250.00 -> `125000`).
Never use floats for money - they cause rounding bugs.

---

## 5. Backend Structure (NestJS)

NestJS organizes code into **modules**, each with a **controller** (handles HTTP), a **service**
(business logic), and **DTOs** (define + validate request shapes).
Prisma is injected as a shared service.

```
backend/
├── src/
│   ├── main.ts                 <- bootstraps app, enables CORS + validation pipe
│   ├── app.module.ts           <- root module wiring everything together
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts   <- single Prisma client, injected everywhere
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   └── dto/
│   ├── products/               <- same controller/service/dto pattern
│   ├── variants/
│   ├── materials/
│   ├── colors/
│   ├── images/
│   ├── auth/                   <- JWT login for the single admin
│   ├── customers/              <- Phase 6 customer principal (D32)
│   ├── cart/                   <- Phase 6 server cart + Zustand sync
│   ├── orders/                 <- Phase 6 order state machine
│   ├── payments/               <- Phase 6 Razorpay integration (D40)
│   └── webhooks/               <- Phase 6 Razorpay webhook handler
├── prisma/
│   ├── schema.prisma           <- the schema from section 4
│   ├── migrations/             <- versioned DB changes (auto-generated)
│   └── seed.ts                 <- inserts sample categories/materials/colors
├── test/                       <- integration (e2e) tests
└── package.json
```

**The request flow to internalize:**
`HTTP request -> Controller -> DTO validation (auto) -> Service (business logic) -> Prisma ->
PostgreSQL` and back out the same way.

---

## 6. API Design

Public (read-only, consumed by the storefront):

```
GET  /categories
GET  /products?category=&material=&color=&size=&minPrice=&maxPrice=&sort=&page=
GET  /products/:slug
GET  /materials
GET  /colors
```

Admin (write, JWT-protected):

```
POST   /auth/login

POST   /products
PATCH  /products/:id
DELETE /products/:id          (soft delete via is_active - avoid hard deletes)

POST   /products/:id/variants
PATCH  /variants/:id
POST   /products/:id/images
... (same pattern for categories, materials, colors)
```

Admin orders (milestone 6.8, JWT-protected):

```
GET    /admin/orders?page=&limit=&status=&date_from=&date_to=
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status
```

The order list is newest-first and returns customer summary, integer paise totals, creation time,
and item count. The detail endpoint returns safe order/customer fields, frozen item snapshots,
payments, shipment data, and server-computed legal next statuses. Status updates delegate to the
shared order state machine and reject illegal transitions with 400.

Customer (Phase 6, separate JWT principal):

```
POST   /customers/register
POST   /customers/login
POST   /customers/verify-email
POST   /customers/forgot-password
POST   /customers/reset-password
GET    /customers/me/addresses
POST   /customers/me/addresses
...
GET    /cart
POST   /cart/items
POST   /orders
POST   /payments/verify
```

**Conventions:** plural nouns, correct HTTP verbs, correct status codes (200/201/400/401/404),
consistent error response shape, pagination on the product list, soft deletes (set `is_active=false`)
rather than destroying rows.

---

## 7. Validation Approach

Done with **DTOs + class-validator**, NestJS's native pattern.
NestJS auto-rejects bad requests with a 400 before your code runs.
What gets validated:

- **Admin writes:** presence (name, price, category), type (price is a number), range (price >= 0,
  stock >= 0), referential integrity (category_id / material_id / color_id actually exist), format
  (slug URL-safe, image URLs valid), string length limits.
- **Public reads:** query params - page is a positive integer, minPrice < maxPrice, sort is one of
  an allowed set, filter values are valid.
  Reject malformed requests cleanly (the API is on the public internet; scanners send junk
  regardless of whether you have users).

Example DTO:

```ts
export class CreateVariantDto {
  @IsUUID()        productId: string;
  @IsUUID()        materialId: string;
  @IsUUID()        colorId: string;
  @IsString()      @MaxLength(50)  size: string;
  @IsInt() @Min(0)                 price: number;   // paise
  @IsInt() @Min(0)                 stockQuantity: number;
  @IsString()                      sku: string;
}
```

---

## 8. Testing Strategy

Tests exist so future features can't silently break existing ones (regression safety).

- **Unit tests** - one service method in isolation, database mocked. Many, fast.
  e.g. "cheapest-variant price returns the lowest of three."
- **Integration tests** - endpoint + a real **test database** (reset between runs).
  Most valuable here.
  e.g. "POST a product then GET it back; category and material are joined correctly."
- **E2E tests** - full flows through the running app via Playwright.
  e.g. admin login -> create product -> product appears on storefront.

Every module ships with its own unit + integration tests as it's built - not a deferred "testing
phase."

---

## 9. CI/CD

GitHub Actions, with branch protection on `main`:

- **On every Pull Request:** install -> **lint** (ESLint) -> **type-check** (`tsc`) -> **test**
  (unit + integration). Failing checks block the merge button.
- **On merge to `main`:** auto-deploy (Vercel for frontend, Render for backend).

---

## 10. Image Workflow

The originally planned manual Photoroom/Pebblely workflow was superseded by an agent-driven
generation pipeline that produces catalog-ready images without a photographer or manual editing.

**Pipeline (lives in `tools/image-pipeline/`, local/uncommitted by owner request):**

1. **Crop** - standardize raw phone photos to catalog dimensions.
2. **Swatch** - extract a fabric swatch for pattern-reference input to the generation step.
3. **Scenes** - a Claude-driven AI image generation step using the swatch as a material reference;
   produces white-background catalog shots + lifestyle scene variants per design.
   Reference prompt in `tools/image-pipeline/sample_prompt.md`.
4. **Owner QA** - review generated images, approve or request regeneration.
5. **Cloudinary upload** - approved images are uploaded via the `design-upload` skill
   (`tools/image-pipeline/` -> Cloudinary -> admin API).

Progress across the ~50-design catalog is tracked in
`tools/image-pipeline/CATALOG_PROGRESS.md` (local, gitignored).

---

## 11. Domain / Subdomain Swap (Vercel)

- Move the current homepage project to `home.sunfabb.com` (done).
- Apex domain `sunfabb.com` points to the storefront project (done).
- Vercel handles SSL automatically for both.

---

## 12. Phased Roadmap

### Phases 0-5 - complete

| Phase | What was built | PR(s) |
|-------|----------------|-------|
| 0 - Foundations | Monorepo scaffold, Prisma init, first migration, GitHub Actions skeleton | #1 |
| 1 - Backend Core | All catalog modules (Categories, Products, Variants, Materials, Colors, Images), filter/sort/pagination, seed script, unit + integration tests | #2 |
| 2 - Auth & Image Upload | JWT admin auth, Cloudinary upload, auth + upload tests | #2 |
| 3 - Frontend Storefront | Next.js SSR storefront (home, catalog, product detail), CORS, API client | #3 |
| 4 - Admin UI | Admin login + CRUD for all entities, Chakra UI v3, image upload UI | #4-#8 |
| 5 - Deploy & Hardening | Render + Vercel deploy, domain swap, Playwright e2e, CI hardening, API contract audit (D30/D31) | #7/#16 |

### Phase 6 - e-commerce (in progress)

Full scope: **`.omc/plans/2026-06-21-phase6-ecommerce.md`**. ADRs D32-D41 plus D43 for milestone 6.8.

| # | Milestone | Status |
|---|-----------|--------|
| 6.0 | Foundations - schema (10 models incl. `WebhookEvent`), migration, ADRs D32-D37 | ✅ PR #17 |
| 6.1 | Customer accounts & auth - separate `customer-jwt`, addresses CRUD, email-token verify/reset | ✅ PRs #18/#19 |
| 6.2 | Cart - server `Cart`/`CartItem` + Zustand, merge-on-login, price re-read | ✅ PR #20 |
| 6.3 | Checkout & orders - totals engine, order snapshots, stock reserve/release, state machine | ✅ PR #21 |
| 6.4 | Razorpay payments + C9 abandoned-checkout expiry (D40/D41) | ✅ PRs #22/#23 |
| 6.5 | GST invoicing - HSN, CGST/SGST/IGST, sequential invoice numbers, PDF | ⬜ needs accountant inputs |
| 6.6 | Shipping (Shiprocket) - serviceability/rates, AWB/label, tracking webhook | ⬜ needs Shiprocket account |
| 6.7 | Email (Resend) - replace `EmailService` stub, verified domain | ⬜ needs Resend domain verify |
| 6.8 | Admin order management UI | 🟡 implementation complete - PR open |
| 6.9 | Hardening & Playwright e2e (full purchase, cross-principal test) | ⬜ |
| 6.10 | Go-live (gated on Razorpay + Shiprocket KYC, Render Starter upgrade) | ⬜ |

**Milestone 6.8 implementation:** The admin order resource and Chakra UI screens are complete on
`feature/6.8-admin-orders`. The backend exposes paginated/filterable list, detail, and status-update
routes behind the single-admin JWT guard. The frontend validates every admin-order response with Zod,
formats paise as INR at the display boundary, and uses the server's `allowed_next_statuses` for the
status control. The PR is open against `main`; merge is the remaining milestone step.

**Parallel catalog-content track:** ~47 designs in the image-generation pipeline
(`tools/image-pipeline/CATALOG_PROGRESS.md`); non-blocking for app development.

### Phase 7 - Reach & Growth

Detailed plan: **`docs/GROWTH.md`**.

Sequenced in four waves gated by readiness; sending traffic to a site that times out, lacks trust
pages, or cannot take payment wastes the effort.

| Wave | Theme | Gate | Key items |
|------|-------|------|-----------|
| **Wave 0** | Be indexable | None - start now | `robots.ts`, `sitemap.ts`, JSON-LD (`Product`/`Offer`/`BreadcrumbList`), OG/Twitter metadata, `noindex` on cart/checkout/account, GA4; trust pages deferred to Wave 1 |
| **Wave 1** | Be worth citing | Wave 0 shipped | Trust pages (needs owner business inputs), guides section (MDX), GEO/AI-search robots, Business Profile |
| **Wave 2** | Be buyable everywhere | Phase 6.10 go-live | Google Shopping feed, Meta catalog, WhatsApp Business, ONDC, post-purchase email flows |
| **Wave 3** | Pay to amplify | Wave 2 + GA4 funnel verified | Google PMax, Meta retargeting, cold prospecting |

Wave 0 is the current unblocked stream (see HANDOFF "Current focus - two streams").
Trust pages are deferred out of Wave 0 because they need owner business inputs (legal entity name,
GSTIN display preference, contact channels, return window, shipping coverage); they are prerequisites
for Razorpay live mode and Merchant Center anyway.

---

## 13. Backend Learning Path (ordered, Prisma-level)

The build order above is sequenced so each phase teaches the next concept:

1. **Relational data modeling** with Prisma (tables, relations, migrations)
2. **NestJS fundamentals** - modules, dependency injection, controllers, services
3. **REST API design** - resources, verbs, status codes, pagination
4. **Validation** - DTOs + class-validator at the API boundary
5. **Error handling** - exception filters, consistent error shapes
6. **Authentication** - JWT, guards, protecting routes
7. **File uploads** - multipart handling, integrating Cloudinary
8. **Testing** - unit (mocked) and integration (test DB) with Jest
9. **CI/CD** - GitHub Actions, branch protection
10. **Deployment & environments** - running a real server, env/secrets management, CORS
11. *(Phase 6)* **Payments & webhooks** - Razorpay, idempotency, order state machine
12. *(Phase 7)* **Discoverability** - SEO, structured data, feed endpoints, analytics
