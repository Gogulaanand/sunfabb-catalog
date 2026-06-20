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

- **Phase:** 0 done. Phases 1–3 built and CI-green, **awaiting merge** (stacked PRs). Phase 4 backend
  **and** frontend (admin UI) both built, and golden-path data layer now verified against a live DB —
  see note above; a manual visual click-through is still recommended before fully closing Phase 4.
- **Current branch:** `feature/phase4-admin-ui` (stacked on phase3 → phase2 → phase1 → main)
- **Open PRs (merge in this order — branches are stacked):**
  - PR #1 `feature/categories-vertical-slice` → `main` — Phase 1 backend (categories/materials/colors/products read API)
  - PR #2 `feature/phase2-admin-auth` → PR #1's branch — Phase 2 (JWT auth, Cloudinary upload)
  - PR #3 `feature/phase3-storefront` → PR #2's branch — Phase 3 (Next.js storefront: home/catalog/product pages)
  - *(not yet opened)* `feature/phase4-admin-ui` → PR #3's branch — Phase 4 backend admin CRUD +
    frontend admin UI (committed, not pushed)
- **Database:** Neon, schema synced through `ProductVariant`/`ProductImage` (full schema from `docs/PLAN.md` §4)

For the exact next session scope and any in-flight notes, see local `.session-state.md`.

---

## ✅ Phase 4 golden-path verification — closed out (2026-06-20)

The Phase 4 admin UI (login, categories/materials/colors/products/variants/images CRUD, Chakra UI v3,
design tokens) is built per `.omc/plans/2026-06-20-design-system-and-phase4-admin-ui.md`. The DB
connectivity blocker from the prior session is resolved and the backend golden path is confirmed
against a live Neon query.

**Root cause (not what was hypothesized):** the prior session's `ETIMEDOUT` had nothing to do with a
sandbox blocking port 5432 — `nc`/`curl` could always reach Neon's pooler instantly. The real bug:
Node's Happy Eyeballs (`autoSelectFamily`) races IPv4 + IPv6 connection attempts, and on networks with
no IPv6 route it stalls long enough to time out the working IPv4 path too. Fixed in `backend/src/main.ts`
with `setDefaultAutoSelectFamily(false)` — see D21 in `docs/DECISIONS.md`. Also discovered `main.ts`
never loaded `.env` at all (only the Prisma CLI's `prisma.config.ts` did); added `import 'dotenv/config'`
so `npm run start:dev` works standalone without manually exporting env vars.

**Verified end-to-end** (via direct API calls against the running backend — no browser/screenshot
tooling was available this session, so this wasn't a literal UI click-through, but it exercises the
exact same write endpoints the admin UI's server-side `admin-api.ts` calls):
- Login: wrong password → 401, correct password → JWT ✅
- Validation error: missing required fields on category create → 400 ✅
- Create category → material → color → product → variant, all 201 with real Neon rows ✅
- Edit product, edit variant (price) → 200 ✅
- Soft-delete the only variant on a product → `is_active: false`, and the public product-detail
  endpoint correctly hides it (`variants: []`) instead of hard-deleting ✅
- Full backend test suite (72 tests) still green after the `main.ts` changes ✅

**Known gap, separate from this blocker:** image upload (`POST /admin/images/upload`) returns 500 —
`Error: cloud_name is disabled` — because `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` are blank in
`backend/.env`. This is a missing-credentials issue, not a code bug; fill in real Cloudinary credentials
to test image upload/attach.

**Not done:** an actual visual click-through of the Chakra UI admin forms in a browser (login page
rendering, dialog forms, design tokens) — no browser automation tool was available in this session.
Recommend a manual pass in an actual browser before fully closing Phase 4, focused on visual/UX
correctness (the design-token theming, form validation messages, dialog flows) rather than data
correctness, which is now confirmed at the API layer.

Test data left in the dev DB from this verification pass (category "Bedspreads", material "Cotton",
color "Indigo", product "Royal Cotton Bedspread" with one soft-deleted variant) — left in place per
request, safe to delete manually via the admin UI once it's up.

**See `docs/PRE_PHASE5_VERIFICATION.md`** for the full manual test checklist (credentials sanity
check, plus scenario-by-scenario coverage across PRs #1–#4) that still needs a human pass before
treating Phase 4 as fully closed and starting Phase 5.

---

## Open decisions / blockers

- **Backend host:** Render vs Railway vs Fly.io — still undecided, getting more urgent as Phase 5
  approaches. Decide before starting Phase 5.
- **Stitch mockups** — ✅ done (2026-06-20). Phase 3 storefront (home/catalog/product-detail) is now
  restyled to match the Ethos & Hearth Stitch mockups using the same design tokens the admin UI
  already had. See the milestone log entry below for what changed.
- **Local admin password is a placeholder, not a secret to carry forward.** During this session's
  visual QA pass the original `ADMIN_PASSWORD_HASH` in `backend/.env` (bcrypt hash, plaintext unknown)
  was swapped for a known dev password (`DevPassword123!`) so the login flow could be tested in a
  browser. `backend/.env` is gitignored and was never committed, so this has zero production exposure
  — but **before deploying, generate a fresh strong password + bcrypt hash and set `ADMIN_EMAIL` /
  `ADMIN_PASSWORD_HASH` directly as environment variables in the hosting platform's dashboard**
  (Render/Railway/Fly.io secrets), never in a file. Local `.env` and prod env vars are already
  separate; don't reuse the dev password.
- **Phase 4 verification** — data-layer golden path confirmed against a live DB (see note above); a
  manual visual click-through in a browser (Chakra forms, design tokens, dialogs) is still pending —
  no browser tooling was available this session. Also need real Cloudinary credentials in
  `backend/.env` to test image upload (currently blank, fails with `cloud_name is disabled`). Full
  checklist: `docs/PRE_PHASE5_VERIFICATION.md`.

---

## Phased roadmap

- **Phase 0** — scaffold, DB, CI skeleton ✅ DONE
- **Phase 1** — backend core: full schema, all modules, public read endpoints (filter/sort/paginate),
  tests per module *(the main backend-learning phase)* ✅ DONE (PR #1 open)
- **Phase 2** — admin JWT auth + Cloudinary image upload ✅ DONE (PR #2 open)
- **Phase 3** — Next.js storefront (home, catalog, product detail), CORS, SEO ✅ DONE (PR #3 open)
- **Phase 4** — admin UI: backend admin CRUD ✅ DONE, frontend (login, CRUD forms, Chakra UI v3,
  design tokens, image upload) ✅ BUILT — ⚠️ golden-path **not yet verified against a live DB**
  ← *current focus, finish verification before moving to Phase 5*
- **Phase 5** — deploy, env config, domain/subdomain swap, e2e tests ← *current focus*
- **Phase 5.5** — restyle the Phase 3 storefront to match the Ethos & Hearth Stitch mockups ✅ DONE
  (2026-06-20)
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
- _(2026-06-20)_ **Phases 1–3 backend/frontend complete, PRs #1–#3 open.** Categories/Materials/
  Colors/Products public read API with filter/sort/pagination (Phase 1); JWT admin auth +
  Cloudinary upload (Phase 2); Next.js storefront — home, catalog with filters, product detail
  (Phase 3). Fixed two CI gotchas along the way (see D17, D18 in `docs/DECISIONS.md`).
  **Phase 4 backend** (admin CRUD for categories/materials/colors/products/variants/images, all
  JWT-protected) complete and committed on `feature/phase4-admin-ui`. **Phase 4 frontend (admin UI)
  not yet built** — see blocker above.
- _(2026-06-20, same day)_ **Phase 4 frontend (admin UI) built.** Ethos & Hearth design tokens added
  as a Tailwind `@theme` layer (`frontend/app/globals.css`) plus a Chakra UI v3 custom theme
  (`frontend/lib/chakra-theme.ts`), scoped to `/admin` only so the storefront stays Chakra/Emotion-free
  (verified via bundle inspection). Built: httpOnly-cookie JWT login, deny-by-default middleware,
  server-only `lib/admin-api.ts` client, full CRUD for categories/materials/colors (hard delete +
  confirm dialog), products list (active+inactive) and detail page (edit fields, variants with
  ₹↔paise conversion, image upload via Cloudinary). Required one backend addition not anticipated in
  the original Phase 4 backend commit: `GET /products/admin` (D19), since the public list endpoint
  hard-filtered to active-only with no admin override. Also fixed a Prisma 7 / NestJS CJS interop
  startup bug (D20). `tsc`, `next build`, both lints, and the full backend test suite (72 tests) all
  pass. **Golden-path click-through against a live DB not yet run** — the verification session hit a
  sandbox network restriction (Postgres port 5432 blocked; HTTPS fine) — see active blocker above.
- _(2026-06-20, same day)_ **Phase 5.5 storefront restyle + Playwright visual QA pass.** Restyled
  `frontend/app/(storefront)/page.tsx`, `catalog/page.tsx`, `catalog/[slug]/page.tsx`,
  `CatalogFilters.tsx`, and `VariantSelector.tsx` to match the Ethos & Hearth Stitch mockups (hero
  banner with overlay card, Curated Collections, Featured Pieces, sidebar checkbox/swatch filters,
  size/material/color pills, "Complete the Look" related-products row) — all using the design tokens
  already established in `globals.css`, no new tokens needed. Verified with Playwright (Chrome) against
  a live dev server and seeded mock product/variant/image data (`backend/prisma/seed.ts` extended with
  6 products across all 3 categories). Found and fixed two real bugs along the way: (1) admin pages
  were inheriting the storefront header/footer because both lived under the same root layout — fixed by
  moving storefront pages into a `(storefront)` route group with their own layout, leaving the root
  layout as a bare shell so `/admin/**` no longer renders public nav/footer chrome (matches the Phase 4
  plan's original "no public chrome in admin" requirement, which had silently regressed); (2) Chakra
  `Field`'s `optionalText` rendered with no space (e.g. "DescriptionOptional") — fixed in
  `components/ui/field.tsx`. Also added `suppressHydrationWarning` to `<html>` for the standard
  next-themes SSR caveat. `tsc --noEmit` and `npm run lint` both clean after the route-group move.
  See D22 in `docs/DECISIONS.md` for the admin-chrome-leak root cause.
