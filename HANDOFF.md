# HANDOFF.md

Pick-up point for resuming this project in Claude Code. Read `CLAUDE.md` first for the rules.

## One-paragraph summary

We're building a home-textiles product catalog (bedspreads, towels, napkins, table linen) for the
India market, INR only. It's a deliberate full-stack learning project for a frontend engineer: a
**separate NestJS backend + Next.js frontend + PostgreSQL/Prisma**, chosen specifically to maximize
backend learning. Catalog is small (20–30 products, won't exceed ~100), so scale is a non-issue —
optimize for clean patterns and learning. E-commerce is a future phase; first goal is a browsable
catalog with a hidden single-admin UI.

## Exactly where we are

- All planning and key decisions are **done and locked** (see `CLAUDE.md` → "Hard rules" and
  `docs/DECISIONS.md`).
- **No code exists yet.** Nothing has been scaffolded.
- The design mockups are being produced separately by the owner using Google Stitch (prompt already
  written; not part of this repo yet).

## Immediate next steps (in order)

### Step 1 — Phase 0: scaffold
```bash
# from repo root
npx @nestjs/cli new backend
npx create-next-app@latest frontend --typescript --tailwind --app
cd backend && npm install prisma --save-dev && npx prisma init
```
- Set up ESLint + Prettier + TypeScript config in both apps.
- Provision a PostgreSQL database (Neon or Supabase) and put its pooled connection string in
  `backend/.env` as `DATABASE_URL`. Never commit `.env`.
- Add a minimal GitHub Actions workflow: install → lint → type-check.

### Step 2 — First migration (the three simplest tables)
- In `backend/prisma/schema.prisma`, define `Category`, `Material`, `Color` (see `docs/PLAN.md` §4).
- Run `npx prisma migrate dev --name init`.
- Write a small `prisma/seed.ts` inserting a few sample categories, materials, and colors.

### Step 3 — First vertical slice: `GET /categories`
Build one complete request path to internalize the whole backend shape:
`HTTP request → Controller → Service → Prisma → PostgreSQL → response`.
- Create `prisma/prisma.service.ts` (+ module) — the injectable Prisma client.
- Create the `categories` module: controller + service.
- Implement `GET /categories` returning seeded rows.
- Write a unit test (service, mocked) and an integration test (endpoint + test DB).
- Confirm the GitHub Actions checks pass on a PR.

Once that slice works, the rest of the backend is repetition of the same pattern across modules
(Products, Variants, Materials, Colors, Images), then auth, then the frontend.

## The roadmap at a glance

- **Phase 0** — scaffold, DB, CI skeleton ← *next*
- **Phase 1** — backend core: full schema, all modules, public read endpoints (filter/sort/paginate),
  tests per module *(the main backend-learning phase)*
- **Phase 2** — admin JWT auth + Cloudinary image upload
- **Phase 3** — Next.js storefront (home, catalog, product detail), CORS, SEO
- **Phase 4** — admin UI (product/variant/category forms, image upload)
- **Phase 5** — deploy, env config, domain/subdomain swap, e2e tests, polish
- **Phase 6 (future)** — cart, checkout, Razorpay, orders, email

Full detail and the ordered backend learning path are in `docs/PLAN.md` §12–13.

## Open items / not yet decided

- **Repo style:** plan assumes a monorepo (`backend/` + `frontend/`). Could be two repos instead —
  decide at Phase 0.
- **Backend host:** Render vs Railway vs Fly.io — pick at deploy time (Phase 5).
- **DB host:** Neon vs Supabase — both fine; pick at Phase 0. (Supabase bundles extras you won't need
  for a single admin; Neon is a lean Postgres.)
- **Stitch mockups** aren't in the repo yet — bring them in before Phase 3 (frontend).

## Progress log

Update this section as work happens.

- _(planning)_ — Architecture, stack, schema, validation/testing/CI approach, and learning path
  finalized. Decisions recorded in `docs/DECISIONS.md`. No code yet.
- _(Phase 0 Step 1)_ — Monorepo scaffolded: NestJS backend (v11, strict TS), Next.js frontend
  (v16, App Router, Tailwind), Prisma 7 initialised. Root `.gitignore`, `.prettierrc`,
  `backend/.env.example`, and GitHub Actions CI workflow added. DB provisioned on Neon.
  Git workflow rule added (D16). `docs/` directory created; PLAN.md and DECISIONS.md moved there.
