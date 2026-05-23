# Home Textiles Catalog — Master Build & Learning Plan

A product catalog for bedspreads, towels, napkins, and table linen, built as a deliberate
front-end → full-stack learning project. No timeline pressure; depth of backend learning is a
primary goal.

---

## 1. Locked Decisions

These are settled and shape everything below:

- **Region / currency:** India only, INR only. Single currency, no tax/multi-region complexity.
- **Catalog size:** 20–30 products at launch, very unlikely to exceed 100. **Scale is a non-issue** —
  optimize for clean code and learning, never for traffic.
- **Admin:** A single admin user. No roles/permissions system needed.
- **Architecture:** Separate backend from day one (no coupled phase). Maximum backend learning.
- **Database access:** Prisma ORM only. Not learning raw SQL for now.
- **Domain:** Existing Vercel-hosted domain; current homepage moves to a subdomain
  (`abc.yourdomain.com`), main domain becomes this app.
- **Photography:** No photographer/pro camera. Phone photos enhanced via AI tools.

---

## 2. Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  Next.js Frontend   │  HTTPS  │   NestJS Backend     │
│  React, SSR/SSG     │ ──────► │   REST API           │
│  for SEO            │  (API)  │   business logic     │
│  Deploy: Vercel     │ ◄────── │   validation, auth   │
└─────────────────────┘         │   Deploy: Render/    │
                                │   Railway/Fly.io     │
                                └──────────┬───────────┘
                                           │ Prisma ORM
                                  ┌────────▼─────────┐
                                  │   PostgreSQL     │
                                  │   Neon/Supabase  │
                                  └──────────────────┘
```

**Why this shape:**
- **Next.js** renders the storefront server-side so Google can index products (SEO matters for a shop).
  It only renders UI; it holds no business logic.
- **NestJS** is the real backend — the API, validation, auth, and database access. Its structure
  (modules, dependency injection, controllers/services) mirrors enterprise Java/Spring patterns, so the
  skills transfer widely.
- **PostgreSQL + Prisma** — relational data fits a catalog perfectly; Prisma gives type-safe DB access.
- **Long-running backend** (not serverless) means a stable, reused database connection pool — the
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
| Database | PostgreSQL | Hosted on Neon or Supabase |
| Validation | DTOs + class-validator | NestJS-native validation |
| Auth | JWT (single admin) | Simple; no role system |
| Image storage | Cloudinary | Upload + auto-optimization + CDN |
| Image enhancement | Photoroom + Pebblely | Phone photos → professional shots |
| Frontend hosting | Vercel | |
| Backend hosting | Render / Railway / Fly.io | Long-running Node process |
| CI/CD | GitHub Actions | Lint, type-check, test on every PR |
| Testing | Jest (unit + integration), Playwright (e2e) | NestJS ships with Jest |
| Cart state (later) | Zustand | Phase 6 only |
| Payments (later) | **Razorpay** (primary, India) / Stripe | Razorpay is India's dominant gateway |

---

## 4. Database Schema

Required fields have no marker; **optional fields are marked `?`**. Only the genuine
must-haves are required so you can develop incrementally and fill detail later.

```
Category
  id            (uuid, pk)
  name          (string)            e.g. "Bedspreads"
  slug          (string, unique)
  description?  (string)
  image_url?    (string)
  created_at    (datetime)

Material         ← lookup table (keeps filters clean)
  id            (uuid, pk)
  name          (string, unique)    e.g. "100% Cotton"

Color            ← lookup table (keeps filters clean)
  id            (uuid, pk)
  name          (string, unique)    e.g. "Cream"
  hex_code?     (string)            e.g. "#F5F0E1" — drives UI swatches

Product          ← the "design" a customer sees as one item
  id                 (uuid, pk)
  name               (string)       e.g. "Floral Cotton Bedspread"
  slug               (string, unique)
  description?       (string)
  care_instructions? (string)
  category_id        (fk → Category)
  is_active          (boolean, default true)
  created_at         (datetime)
  updated_at         (datetime)

ProductVariant   ← the actual buyable version (size + color + material)
  id              (uuid, pk)
  product_id      (fk → Product)
  material_id     (fk → Material)
  color_id        (fk → Color)
  size            (string)          e.g. "King", "60x90 cm"
  price           (integer)         store in paise (smallest unit), never floats
  stock_quantity  (integer, default 0)   ← used when ordering is added
  sku             (string, unique)
  is_active       (boolean, default true)

ProductImage
  id          (uuid, pk)
  product_id  (fk → Product)
  variant_id? (fk → ProductVariant)   optional: color-specific shots
  url         (string)
  alt_text?   (string)
  sort_order  (integer, default 0)
  is_primary  (boolean, default false)
```

**The hierarchy in one line:** *Category* is the section of the shop → *Product* is the named design
(one card, one detail page) → *ProductVariant* is the specific buyable SKU (a size + color + material
combination with its own price and stock).

**Why Material/Color are separate tables:** the filter sidebar populates itself from them, every value
stays consistent (no "Cotton" vs "cotton "), and the admin selects from dropdowns. `Color.hex_code`
lets the UI render swatches straight from the database.

**Money rule:** store `price` as an integer in paise (e.g. ₹1,250.00 → `125000`). Never use floats for
money — they cause rounding bugs.

---

## 5. Backend Structure (NestJS)

NestJS organizes code into **modules**, each with a **controller** (handles HTTP), a **service**
(business logic), and **DTOs** (define + validate request shapes). Prisma is injected as a shared service.

```
backend/
├── src/
│   ├── main.ts                 ← bootstraps app, enables CORS + validation pipe
│   ├── app.module.ts           ← root module wiring everything together
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts   ← single Prisma client, injected everywhere
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   └── dto/
│   │       ├── create-category.dto.ts
│   │       └── update-category.dto.ts
│   ├── products/               ← same controller/service/dto pattern
│   ├── variants/
│   ├── materials/
│   ├── colors/
│   ├── images/
│   └── auth/                   ← JWT login for the single admin
├── prisma/
│   ├── schema.prisma           ← the schema from section 4
│   ├── migrations/             ← versioned DB changes (auto-generated)
│   └── seed.ts                 ← inserts sample categories/materials/colors
├── test/                       ← integration (e2e) tests
└── package.json
```

**The request flow to internalize:**
`HTTP request → Controller → DTO validation (auto) → Service (business logic) → Prisma → PostgreSQL`
and back out the same way.

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
DELETE /products/:id          (soft delete via is_active — avoid hard deletes)

POST   /products/:id/variants
PATCH  /variants/:id
POST   /products/:id/images
... (same pattern for categories, materials, colors)
```

**Conventions:** plural nouns, correct HTTP verbs, correct status codes (200/201/400/401/404),
consistent error response shape, pagination on the product list, soft deletes (set `is_active=false`)
rather than destroying rows.

---

## 7. Validation Approach

Done with **DTOs + class-validator**, NestJS's native pattern. NestJS auto-rejects bad requests with a
400 before your code runs. What gets validated:

- **Admin writes:** presence (name, price, category), type (price is a number), range (price ≥ 0,
  stock ≥ 0), referential integrity (category_id / material_id / color_id actually exist), format
  (slug URL-safe, image URLs valid), string length limits.
- **Public reads:** query params — page is a positive integer, minPrice < maxPrice, sort is one of an
  allowed set, filter values are valid. Reject malformed requests cleanly (the API is on the public
  internet; scanners send junk regardless of whether you have users).

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

- **Unit tests** — one service method in isolation, database mocked. Many, fast.
  e.g. "cheapest-variant price returns the lowest of three."
- **Integration tests** — endpoint + a real **test database** (reset between runs). Most valuable here.
  e.g. "POST a product then GET it back; category and material are joined correctly."
- **E2E tests** (few, later) — full flows through the running app via Playwright.
  e.g. admin login → create product → product appears on storefront.

Every module ships with its own unit + integration tests as it's built — not a deferred "testing phase."

---

## 9. CI/CD

GitHub Actions, with branch protection on `main`:

- **On every Pull Request:** install → **lint** (ESLint) → **type-check** (`tsc`) → **test**
  (unit + integration). Failing checks block the merge button.
- **On merge to `main`:** auto-deploy (Vercel for frontend, backend host for API).

Set up once; protects the codebase forever after.

---

## 10. Image Workflow (no photographer needed)

1. **Shoot on phone** in bright, even daylight near a window. Fabric flat or neatly draped, phone steady,
   fill the frame. (Better input = better AI output.)
2. **Photoroom** — remove background, place on clean white for catalog-grid shots.
3. **Pebblely** — generate 1–2 lifestyle scenes per product (styled bed, set table) for detail pages
   and the hero banner.
4. Upload finals through the admin UI → Cloudinary stores, optimizes, and serves via CDN.

(*Claid.ai* is an API-first option to revisit later if you want the admin panel to auto-process uploads.)

---

## 11. Domain / Subdomain Swap (Vercel)

- Move the current homepage project to serve at `abc.yourdomain.com` (add it as a domain on that
  existing Vercel project).
- Point the apex/root domain (`yourdomain.com`) at the new Next.js storefront project.
- Vercel handles SSL automatically for both. Plan a brief DNS-propagation window.

---

## 12. Phased Roadmap

Self-paced. Each phase is a learning milestone, not a deadline.

### Phase 0 — Foundations
- Repo + tooling: TypeScript, ESLint, Prettier
- Provision PostgreSQL (Neon or Supabase)
- Scaffold NestJS backend and Next.js frontend
- Prisma init + first migration (Category, Material, Color)
- GitHub Actions skeleton (lint + type-check)

### Phase 1 — Backend Core *(the big learning phase)*
- Complete Prisma schema (all tables from section 4) + migrations
- Build modules: Categories, Materials, Colors, Products, Variants, Images
- Controller / Service / DTO pattern for each
- Public read endpoints with filtering, sorting, pagination
- Error handling + consistent responses
- Seed script with sample data
- Unit + integration tests per module

### Phase 2 — Admin Auth & Image Upload
- JWT login for the single admin; protect write endpoints
- Cloudinary upload integration
- Tests for auth + upload

### Phase 3 — Frontend Storefront
- Next.js consuming the API (server-side fetch for SEO)
- Home, Catalog (filters fed by Material/Color tables), Product Detail
- Responsive build from the Stitch mockups
- CORS configured on the backend
- SEO: metadata, Open Graph, sitemap.xml

### Phase 4 — Admin UI
- Admin login page
- Product / variant / category management forms
- Image upload UI with previews

### Phase 5 — Deploy & Domain Swap
- Deploy backend + frontend
- Environment config across dev/prod
- Domain/subdomain swap
- A few Playwright e2e tests
- Loading/empty/error states, performance pass

### Phase 6 — E-commerce *(future)*
- Cart (Zustand)
- Checkout flow
- **Razorpay** integration (India)
- Orders + inventory + email confirmations (Resend)
- Webhooks + idempotency (a real backend rite of passage)

---

## 13. Backend Learning Path (ordered, Prisma-level)

The build order above is sequenced so each phase teaches the next concept:

1. **Relational data modeling** with Prisma (tables, relations, migrations)
2. **NestJS fundamentals** — modules, dependency injection, controllers, services
3. **REST API design** — resources, verbs, status codes, pagination
4. **Validation** — DTOs + class-validator at the API boundary
5. **Error handling** — exception filters, consistent error shapes
6. **Authentication** — JWT, guards, protecting routes
7. **File uploads** — multipart handling, integrating Cloudinary
8. **Testing** — unit (mocked) and integration (test DB) with Jest
9. **CI/CD** — GitHub Actions, branch protection
10. **Deployment & environments** — running a real server, env/secrets management, CORS
11. *(Phase 6)* **Payments & webhooks** — Razorpay, idempotency, order state

---

## 14. First Concrete Steps

```bash
# Backend
npx @nestjs/cli new backend
cd backend
npm install prisma --save-dev
npx prisma init

# Frontend
npx create-next-app@latest frontend --typescript --tailwind --app
```

Then write the Category / Material / Color models in `schema.prisma`, run your first migration
(`npx prisma migrate dev --name init`), and stand up a single `GET /categories` endpoint end to end.
That first vertical slice — request → controller → service → Prisma → database → response — is the
whole backend in miniature. Everything after is repetition and depth.
