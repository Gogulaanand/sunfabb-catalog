# HANDOFF.md

High-level project state. Read alongside `CLAUDE.md` and `docs/WORKFLOW.md`.

Fine-grained "where we left off in the current session" notes live in `.session-state.md`
on the active developer's machine (gitignored). This file only tracks **phase-level**
state that anyone cloning the repo should see.

---

## One-paragraph summary

We're building a home-textiles product catalog (bedspreads, towels, napkins, table linen) for the
India market, INR only. It's a deliberate full-stack learning project for a frontend engineer:
a **separate NestJS backend + Next.js frontend + PostgreSQL/Prisma** monorepo, chosen specifically
to maximize backend learning depth. Catalog is small (20–30 products, won't exceed ~100), so scale
is a non-issue — optimize for clean patterns and learning. E-commerce is a future phase; first goal
is a browsable catalog with a hidden single-admin UI.

---

## Where we are

- **Phase:** 0 complete. Phase 1 next.
- **Current branch:** `main`
- **Latest PR:** *(none yet — all work so far direct to main as initial scaffold)*
- **Database:** Neon, schema synced (`Category`, `Material`, `Color`)

For the exact next session scope and any in-flight notes, see local `.session-state.md`.

---

## Open decisions / blockers

- **Backend host:** Render vs Railway vs Fly.io — decide at Phase 5
- **Stitch mockups** not in repo yet — bring in before Phase 3 (frontend)

---

## Phased roadmap

- **Phase 0** — scaffold, DB, CI skeleton ✅ DONE
- **Phase 1** — backend core: full schema, all modules, public read endpoints (filter/sort/paginate),
  tests per module *(the main backend-learning phase)* ← *next*
- **Phase 2** — admin JWT auth + Cloudinary image upload
- **Phase 3** — Next.js storefront (home, catalog, product detail), CORS, SEO
- **Phase 4** — admin UI (product/variant/category forms, image upload)
- **Phase 5** — deploy, env config, domain/subdomain swap, e2e tests, polish
- **Phase 6 (future)** — cart, checkout, Razorpay, orders, email

Per-item learning vs fast-track classification is in `docs/WORKFLOW.md` §5.

---

## Phase milestone log

Append-only. Update only at phase boundaries or feature merges — *not* every session.

- _(planning)_ — Architecture, stack, schema, validation/testing/CI approach, and learning path
  finalized. Decisions recorded in `docs/DECISIONS.md`.
- _(2026-05-24)_ **Phase 0 complete.** Monorepo scaffolded (NestJS v11, Next.js v16, Prisma 7).
  Neon PostgreSQL provisioned. First migration (`Category`, `Material`, `Color`) applied.
  GitHub Actions CI live. `docs/WORKFLOW.md` published. Git workflow rule (D16) recorded.
