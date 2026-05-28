# CLAUDE.md

Context for Claude Code. Read this first every session. Keep it updated as the project evolves.

## What this is

A product catalog website for a home-textiles brand (bedspreads, towels, napkins, table linen) in
**India (INR only)**. Built deliberately as a **frontend → full-stack learning project**: the owner is
a frontend engineer learning real backend engineering. **No timeline pressure — prioritize clean code,
correct patterns, and learning over speed or premature optimization.**

E-commerce (cart, checkout, payments) is a **future phase** — not now. Phase 1 is a browsable catalog
with a hidden admin.

## Current status

**Phase 0 Step 1 complete.** Monorepo scaffolded (NestJS backend, Next.js frontend, Prisma 7 init,
GitHub Actions CI). DB provisioned on Neon. Next: Phase 0 Step 2 — write the first three Prisma
models (`Category`, `Material`, `Color`) and run the first migration. See `HANDOFF.md` for details.

## Architecture

Separate frontend and backend from day one (this is intentional, for backend learning depth):

- **Next.js frontend** (React, App Router, SSR/SSG for SEO) — renders UI only, no business logic.
- **NestJS backend** — the real backend: REST API, validation, auth, DB access. All logic lives here.
- **PostgreSQL + Prisma** — relational DB, type-safe ORM access.
- Frontend calls backend over HTTPS. CORS must be configured on the backend.

## Intended repo layout (monorepo)

```
/
├── CLAUDE.md            ← this file
├── HANDOFF.md           ← current state + next steps
├── docs/
│   ├── PLAN.md          ← full build & learning plan
│   └── DECISIONS.md     ← decision log (the "why")
├── backend/             ← NestJS app
└── frontend/            ← Next.js app
```

## Tech stack

Frontend: Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Zustand (cart, future only)
Backend: NestJS · TypeScript · Prisma · class-validator (DTOs) · JWT auth
Data/infra: PostgreSQL (Neon) · Cloudinary (images) · GitHub Actions (CI)
Hosting: Vercel (frontend) · Render/Railway/Fly.io (backend)
Future: Razorpay (payments, India-first) · Resend (email)

## Hard rules — do not violate

1. **No raw SQL.** Use Prisma exclusively. The owner is not learning SQL right now.
2. **Money is stored as integers in paise** (₹1,250.00 → `125000`). Never use floats for money.
3. **Material and Color are lookup tables**, referenced by FK from `ProductVariant`. Never store them
   as free text. Filters and admin dropdowns read from these tables.
4. **Soft deletes only** — set `is_active = false`. Never hard-delete products/variants.
5. **Validate every API input** with DTOs + class-validator — both admin writes AND public read query
   params (page, price range, sort, filters). NestJS validation pipe rejects bad requests with 400.
6. **Every module ships with tests** (unit + integration) as it is built — not a deferred phase.
7. **Single admin only.** No roles/permissions system. JWT login is enough.
8. **Backend holds all business logic.** Next.js renders; it does not contain logic.
9. Follow the **Controller → Service → DTO** pattern in every NestJS module. Prisma is injected via a
   shared `PrismaService`.
10. REST conventions: plural nouns, correct verbs, correct status codes, pagination on list endpoints.

## Commands (valid once scaffolded)

```bash
# Backend (run inside backend/)
npm run start:dev          # NestJS dev server
npx prisma migrate dev     # apply schema changes (after editing schema.prisma)
npx prisma studio          # visual DB browser
npm run test               # unit tests
npm run test:e2e           # integration tests
npm run lint

# Frontend (run inside frontend/)
npm run dev
npm run build
npm run lint
```

## Data model (summary)

`Category` → `Product` → `ProductVariant`, plus `Material`/`Color` lookup tables and `ProductImage`.
- **Category** = shop section (Bedspreads, Towels…).
- **Product** = a named design (one catalog card / one detail page).
- **ProductVariant** = the buyable SKU (size + color + material), with its own price and stock.

Full schema with required/optional fields is in `docs/PLAN.md` §4.

## Git workflow

- **Commit often** — after every meaningful unit of work (a migration, a working module, a config
  change). Commit messages should be short and descriptive (e.g. `add Category migration`).
- **Branch per feature** — name branches `feature/<name>` or `fix/<name>`. Never commit directly
  to `main` for feature work.
- **PR when feature-ready** — when a feature is fully functional end-to-end (e.g. `GET /categories`
  works with tests passing), open a PR against `main` rather than pushing directly.
- **`main` is always green** — CI must pass before merging. Branch protection enforces this.

## CI/CD

GitHub Actions on every PR: install → lint → type-check (`tsc`) → test. Branch protection on `main`
blocks merge until checks pass. Merge to `main` triggers deploy.

## Where to look

- **`HANDOFF.md`** — what to do next, right now.
- **`docs/WORKFLOW.md`** — how to run sessions: learning vs fast track, orchestration patterns,
  per-phase classification. Read this at the start of every session.
- **`docs/PLAN.md`** — the complete plan: architecture, schema, API design, roadmap, learning path.
- **`docs/DECISIONS.md`** — why each technical choice was made (read before proposing changes to stack
  or architecture).
