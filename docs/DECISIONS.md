# DECISIONS.md

A log of the key technical decisions and *why* they were made. Read this before proposing changes to
the stack or architecture — most choices were made deliberately for a specific reason (often the
owner's backend-learning goal, or the India context). ADR-lite format.

---

### D1 — Separate backend (NestJS) instead of Next.js full-stack, from day one
**Decision:** Two services — Next.js frontend + standalone NestJS backend — starting immediately, not
as a later refactor.
**Why:** The owner's primary goal is to genuinely learn backend engineering. Next.js API routes
abstract away most real backend learning (server lifecycle, middleware, layered architecture,
deploying a long-running service). A separate backend teaches all of it and makes the API reusable
(e.g., a future mobile app). The owner explicitly chose to skip the coupled phase for maximum learning.
**Status:** Locked.

### D2 — NestJS as the backend framework (over Express, or Java/Spring)
**Decision:** NestJS.
**Why:** The owner already knows JavaScript, so staying in TS isolates the learning to backend
*concepts* rather than a new language too. NestJS's architecture (modules, dependency injection,
controllers/services, decorators) deliberately mirrors enterprise Java/Spring — so these patterns
transfer directly if the owner moves to Java later. Express was considered too minimal to teach
structure.
**Status:** Locked.

### D3 — PostgreSQL as the database
**Decision:** PostgreSQL.
**Why:** Catalog data is inherently relational (Category → Product → Variant, with Material/Color
lookups). Postgres is the strongest free, general-purpose relational DB and teaches correct relational
modeling — a universally transferable skill. MongoDB was rejected (would require manually reinventing
joins). At this scale any DB works, so the tiebreaker was learning value.
**Status:** Locked.

### D4 — Prisma as the ORM; no raw SQL
**Decision:** Prisma for all DB access. The owner is **not** learning raw SQL right now.
**Why:** Prisma is the most beginner-friendly ORM — type-safe (autocompletes from schema), readable
schema file, first-class migrations. It lets the owner be productive without context-switching to SQL.
(Revisit raw SQL later once comfortable, to understand what the ORM generates.)
**Status:** Locked. *Do not introduce raw SQL queries.*

### D5 — Material and Color as lookup tables (not free-text fields)
**Decision:** Separate `Material` and `Color` tables, referenced by FK from `ProductVariant`.
**Why:** The catalog must be *filterable* by material and color. Free text rots data quality
("Cotton" vs "cotton " vs "100% cotton" become distinct filter options). Lookup tables keep values
consistent, let the filter sidebar populate itself, and let the admin pick from dropdowns.
`Color.hex_code` additionally drives UI swatches.
**Status:** Locked.

### D6 — Store money as integers (paise), never floats
**Decision:** `price` is an integer in the smallest currency unit (₹1,250.00 → `125000`).
**Why:** Floating-point math introduces rounding errors that corrupt financial values. Integer-paise
is the standard correct approach.
**Status:** Locked.

### D7 — Soft deletes, not hard deletes
**Decision:** Deactivate via `is_active = false`; never destroy rows.
**Why:** Preserves history and referential integrity (e.g., a variant referenced elsewhere), avoids
accidental data loss, and is the safer production pattern.
**Status:** Locked.

### D8 — Validation via DTOs + class-validator, on reads and writes
**Decision:** Validate all API inputs with NestJS DTOs + class-validator. Includes public read query
params (page, price range, sort, filters), not just admin writes.
**Why:** The backend is the source of truth, so its data must stay clean. Validation also yields good
admin error messages and is a security baseline — the public API receives malformed/bot traffic
regardless of having no end-user writes. DTOs + class-validator is the idiomatic NestJS approach
(vs. Zod, which is the more general-ecosystem tool mentioned earlier).
**Status:** Locked.

### D9 — Tests (unit + integration) built per module from the start
**Decision:** Every module ships with unit and integration tests as it's written; not a deferred phase.
**Why:** Regression safety — future features must not silently break existing ones. Integration tests
(endpoint + test DB) are the highest-value here. NestJS ships with Jest, making this low-friction and a
core full-stack skill.
**Status:** Locked.

### D10 — Single admin, JWT auth, no role system
**Decision:** One admin user, JWT login protecting write endpoints. No roles/permissions.
**Why:** The owner confirmed there will only ever be one admin. A role/permission system would be
unused complexity.
**Status:** Locked.

### D11 — Next.js kept for the frontend (SSR/SSG for SEO)
**Decision:** Next.js frontend even though the backend is separate.
**Why:** A product catalog needs SEO so Google indexes products; Next.js server rendering handles this.
The frontend renders only — all logic stays in NestJS.
**Status:** Locked.

### D12 — Razorpay as the future payment gateway (over Stripe)
**Decision:** Razorpay primary for the future e-commerce phase; Stripe secondary.
**Why:** The market is India-only (INR). Razorpay is India's dominant gateway with smoother local
integration and payment-method support. Not implemented now — Phase 6.
**Status:** Decided, deferred.

### D13 — Cloudinary for image storage; AI tools for photography
**Decision:** Cloudinary for upload/optimization/CDN. Phone photos enhanced via Photoroom (background
removal, white-bg catalog shots) and Pebblely (lifestyle scenes).
**Why:** No photographer or pro camera available. Modern AI tools turn good phone photos into
production-quality images cheaply; Cloudinary handles storage and delivery with auto-optimization.
**Status:** Decided. Workflow detail in `docs/PLAN.md` §10.

### D14 — Not optimizing for scale
**Decision:** Don't add caching layers, microservices, external connection poolers, or other
scale machinery.
**Why:** 20–30 products, near-zero chance of exceeding 100. The long-running NestJS backend already
holds a stable, reused DB connection pool, so the serverless "too many connections" failure mode
doesn't apply. Premature optimization would only add complexity and obscure learning.
**Status:** Locked.

### D15 — Domain/subdomain swap on Vercel
**Decision:** Move the existing homepage to `abc.yourdomain.com`; point the apex domain at the new
storefront.
**Why:** The owner wants the new app on the main domain while preserving the current homepage. Vercel
handles SSL for both automatically. Execute at Phase 5.
**Status:** Decided, deferred.

### D16 — Git workflow: commit-per-unit, feature branches, PR when ready
**Decision:** Commit after every meaningful unit of work. Use `feature/<name>` branches. Open a PR
when a feature is fully functional end-to-end. Never push feature work directly to `main`.
**Why:** Keeping `main` always green means you always have a working baseline to fall back to.
Small, frequent commits make it easy to understand what changed and revert safely if something
breaks. PRs create a natural checkpoint to review what was built before it becomes permanent.
This is standard professional practice worth building as a habit from day one.
**Status:** Locked.

### D17 — Price sort done in application code, not via Prisma `orderBy`
**Decision:** `GET /products?sortBy=price_asc|price_desc` fetches matching rows and sorts by the
cheapest active variant's price in JS, instead of a Prisma-level `orderBy`.
**Why:** Prisma's generated `ProductOrderByWithRelationInput` only supports `_count` for ordering by
a to-many relation (`ProductVariant[]`) — not `_min`/`_max` on a scalar field like `price`. This
compiles fine under ESLint but fails `tsc --noEmit`, so it surfaced as a CI-only failure. Sorting in
app code is acceptable per D14 (catalog stays ≤100 rows). **Do not "fix" this by reverting to a
Prisma-level orderBy on a relation aggregate of a scalar field** — it isn't supported by this Prisma
version's generated types.
**Status:** Locked. See `backend/src/products/products.service.ts`.

### D18 — GOTCHA: GitHub Actions silently skips `pull_request` CI when the PR has merge conflicts
**Observation:** A PR's CI (triggered via `on: pull_request`) does not just fail when the PR's
`mergeable_state` is `"dirty"` (unresolved conflicts with its base branch) — **no workflow run is
created at all** (`total_count: 0` via the Actions API). It looks identical to CI being stuck, with no
error to point at.
**Why this matters:** With stacked feature branches (Phase 2 branched off Phase 1, etc.), pushing a
fix to an earlier branch in the stack can leave a later branch's PR in a conflicted state, silently
killing its CI. If a PR's checks aren't updating after a push, check `mergeable_state` via
`gh api repos/<owner>/<repo>/pulls/<n> --jq .mergeable_state` before assuming CI is broken.
**Fix:** merge/rebase the base branch's changes into the head branch to resolve `dirty` → CI resumes
immediately on the next push.
**Status:** Recorded as a gotcha, not a decision to revisit.

### D19 — Added `GET /products/admin`, a JWT-guarded endpoint that lists products including inactive
**Decision:** Added a new guarded route (`backend/src/products/products.controller.ts` +
`products.service.ts: findAllAdmin`) that returns products regardless of `is_active`, with the same
filter/sort/pagination shape as the public `findAll`.
**Why:** The public `GET /products` hard-codes `where: { is_active: true }` with no override — there
was no way for the Phase 4 admin product list to ever show deactivated products, even though the
admin UI plan explicitly requires "active + inactive" visibility (soft-deleted products must stay
manageable). This was discovered while building the Phase 4 frontend, not anticipated in the original
Phase 4 backend commit.
**Status:** Locked. Covered by tests in `products.service.spec.ts` / `products.controller.spec.ts`.

### D20 — GOTCHA: Prisma 7's `prisma-client` generator can emit an ESM-ambiguous client under NestJS's CJS build
**Observation:** `nest start --watch` failed immediately with
`ReferenceError: exports is not defined in ES module scope` inside the generated
`dist/generated/prisma/client.js`, even though the root `package.json` has no `"type"` field (defaults
to CommonJS) and `tsc` emitted CJS syntax (`exports.x = ...`) into that file. Node's loader still
routed it through the ESM path (`loadESMFromCJS` in the stack trace), breaking the app on startup.
**Fix:** Added `moduleFormat = "cjs"` to the `generator client { ... }` block in
`backend/prisma/schema.prisma`, then re-ran `npx prisma generate`. This pins the generator's output
format explicitly instead of relying on format inference, which resolved the crash.
**Why this matters:** This will resurface on any fresh clone / fresh `node_modules` install until the
schema change is committed — `npx prisma generate` alone (without the schema edit) does not fix it.
**Status:** Confirmed (2026-06-20) — verified against a live Neon query (`GET /categories` → 200) from
an unrestricted network. The fix holds.

### D21 — GOTCHA: Node's Happy Eyeballs (`autoSelectFamily`) times out connecting to Neon's pooler on networks with no IPv6 route
**Observation:** Every Prisma query against Neon failed with
`PrismaClientKnownRequestError: ETIMEDOUT`, even though `nc` and `curl` could reach the same
hostname/port instantly and `npx prisma db pull` (Rust engine, separate network stack) connected
fine. Root cause: the Neon pooler hostname resolves to 3 IPv4 + 3 IPv6 addresses. Node 20+'s default
`autoSelectFamily` (Happy Eyeballs) races connections across both families; on a network with no IPv6
route (`EHOSTUNREACH` on every AAAA address), the race logic stalls long enough to time out the IPv4
attempts too, even though a direct connection to a literal IPv4 address succeeds in under a second.
This is a Node networking quirk, not a Neon, Prisma, or sandbox issue — it had nothing to do with the
"sandboxed environment" hypothesis from the prior verification attempt.
**Fix:** Added `setDefaultAutoSelectFamily(false)` at the top of `backend/src/main.ts` (Node's
documented escape hatch, available since Node 19.4/18.18), restoring sequential single-family
resolution. Also added `import 'dotenv/config'` to `main.ts` — previously only `prisma.config.ts`
(used by the Prisma CLI) loaded `.env`; the actual NestJS app had no `.env` loading at all and only
ever worked when `DATABASE_URL` etc. happened to be exported in the parent shell.
**Why this matters:** Will resurface on any machine/CI/host without a working IPv6 route trying to
reach a DNS-round-robined Postgres endpoint (common for managed Postgres providers like Neon, RDS,
Supabase). Worth keeping in mind for Phase 5 deploy targets (Render/Railway/Fly.io) — confirm their
network has IPv6 egress, or rely on this fix.
**Status:** Confirmed (2026-06-20) — verified against a live DB query with no manual env exports, full
test suite (72 tests) still passing after the `main.ts` changes.

### D22 — GOTCHA: admin pages inherited the storefront header/footer because both lived under one root layout
**Observation:** While visually QA-ing the Phase 4 admin UI against the Stitch mockups, the public
storefront nav and footer rendered above/below `/admin/login` and every other `/admin/**` page —
directly contradicting the Phase 4 plan's own acceptance criterion ("uses a layout distinct from
storefront header/footer, no public nav/cart chrome"). Root cause: `frontend/app/layout.tsx` (the root
layout, which every route including `/admin/**` inherits) rendered the storefront `<header>`/`<footer>`
directly, and Next.js App Router layouts always wrap their children — there was no route-level escape
hatch for `/admin` to opt out.
**Fix:** Moved the storefront pages (`page.tsx`, `catalog/`) into a `(storefront)` route group with
their own `(storefront)/layout.tsx` carrying the header/footer; the root `app/layout.tsx` is now a bare
`<html>/<body>` shell with just font variables. Route groups don't affect URL paths, so `/`, `/catalog`,
`/catalog/[slug]` are unchanged. `/admin/**` now only gets `app/admin/layout.tsx`'s Chakra `Provider`,
with no storefront chrome.
**Why this matters:** Any future top-level section that needs different chrome (e.g. a future
mobile app shell, a checkout flow) should get its own route group + layout rather than adding
conditional rendering to the root layout — the root layout should stay a minimal shell.
**Status:** Confirmed (2026-06-20) — verified via Playwright screenshot that `/admin/login` and
`/admin` no longer render the Sunfabb storefront nav/footer.

### D23 — GOTCHA: Phase 5.5 restyle had no mobile nav and an uncollapsed filter sidebar, found via Stitch mobile mockups
**Observation:** A mobile-responsive QA pass against three Stitch mobile mockups (Home, Catalog,
Product Detail — project `3370511650101935244`) at a 390×844 viewport, run with Playwright against
the live dev servers, found two real layout gaps the desktop-focused Phase 5.5 restyle had missed:
1. `frontend/app/(storefront)/layout.tsx`'s nav was `hidden sm:flex` with no mobile replacement — below
   the `sm` breakpoint the entire nav (Bedspreads/Towels/Table Linen/All Products) simply disappeared,
   leaving no way to navigate categories from a phone. The mockups show a hamburger icon in its place.
2. `frontend/app/(storefront)/catalog/CatalogFilters.tsx`'s sidebar was `flex-col lg:flex-row` —
   below `lg` it rendered full-height, fully expanded (Sort, Category, Material, Color Palette) stacked
   *above* the product grid. Measuring screenshot pixel heights at the same 390px width confirmed it:
   the catalog page rendered 43% taller than the mockup's catalog screen (4153px vs. ~2910px), almost
   entirely from filter UI a mobile visitor has to scroll past before seeing a single product.
**Fix:** Added a `<details>`-based hamburger menu to the storefront header (`sm:hidden`, native
disclosure, no client JS needed) that lists the same four nav links stacked in a dropdown. Refactored
`CatalogFilters` to extract its filter markup into a `filterContent` fragment, rendered inside a
`<details>` "Filter & Sort" disclosure below `lg` (collapsed by default, chevron rotates via
`group-open:rotate-180`) and as the original always-visible sidebar at `lg+` — both render the same
JSX, just gated by Tailwind breakpoint visibility classes, so there's no duplicated filter logic.
**Why this matters:** The Phase 5.5 restyle was verified visually but only at desktop/tablet widths;
sidebar-pattern layouts in particular (filters, multi-column nav) need an explicit mobile collapse
strategy, not just `flex-col` reflow — reflowing a sidebar to the top of a narrow viewport without
collapsing it usually just moves the "wall of UI before content" problem rather than fixing it. Any
future sidebar-shaped component should default to a `<details>` (or similar zero-JS) disclosure below
its desktop breakpoint.
**Not fixed (separate, non-responsive issues, noted for a future session):** the product-detail
thumbnail strip shows a broken image (alt text bleeding outside its frame) on `embroidered-napkin-set`
— root cause is a 404 from the seeded Unsplash URL, not a layout bug, and reproduces identically on
desktop. The Stitch product-detail mockup also has a "Shipping & Returns" section the live page has no
equivalent content field for (`ProductVariant`/`Product` only has `care_instructions`) — adding it
would need a schema change, out of scope for a frontend-only QA pass.
**Status:** Confirmed (2026-06-21) — re-screenshotted all three pages at 390×844 after the fix:
catalog now shows the product grid immediately with filters collapsed behind a working toggle (chevron
rotates, content matches the always-open desktop sidebar), and the mobile hamburger menu opens/closes
correctly on the home page. `tsc --noEmit` and `npm run lint` both clean.

### D24 — Branch-state verification: trust content diffs over history diffs after a rebase
**Decision:** When checking whether a branch's work has landed on `main`, use a two-dot content diff
(`git diff main otherBranch`) as the source of truth, not ancestor/history checks (`git merge-base
--is-ancestor`) or three-dot diffs.
**Why:** During Phase 5 deploy prep, `git merge-base --is-ancestor` and a three-dot diff both
suggested PR #5's 136 files (Phase 4 frontend + Phase 5.5 restyle) were missing from `main` — a false
alarm. The branches had been rebased after merging, changing commit SHAs without changing content. A
two-dot diff against the actual branch tips showed `main` already had equivalent content (1 trivial
`package-lock.json` line of drift). History-based checks (ancestry, three-dot diff) are unreliable
after rebases; only a direct content diff tells you what's actually missing.
**Status:** Locked — process note for future merge-state checks.

### D25 — Render now requires a card on file even for the free tier
**Decision:** Added a payment method to the Render account before provisioning, despite staying on
the free plan.
**Why:** Render's billing policy changed since the original Phase 4 hosting decision (see the
"Backend host" note in HANDOFF.md) — `create_web_service` returned an explicit 402 Payment Required
until a card was added. No cost was incurred; this is purely an account-verification gate now.
**Status:** Locked — informational, no plan change.

### D26 — `start:prod` script path bug (dist/main → dist/src/main)
**Decision:** Fixed `backend/package.json`'s `start:prod` from `node dist/main` to `node dist/src/main`.
**Why:** `nest-cli.json` sets `sourceRoot: "src"`, and with `prisma.config.ts` + `prisma/seed.ts` also
under TypeScript's compiled root, `tsc`/`nest build` emits to `dist/src/main.js`, not `dist/main.js`.
This was always broken but invisible locally since `npm run start:dev` (ts-node via Nest CLI) never
exercises the compiled `dist/` output — it only surfaced on Render's first real production boot
(`Error: Cannot find module '.../dist/main'`). See PR #7.
**Status:** Locked.

### D27 — Convention: every storefront image must use `fill` + a sized/aspect-ratio container
**Decision:** Any `next/image` usage on storefront surfaces (`/`, `/catalog`, `/catalog/[slug]`) must
use `fill` inside a container with an explicit size (fixed height, e.g. `h-[640px]`) or aspect ratio
(e.g. `aspect-square`, `aspect-[3/4]`), plus a `sizes` prop matching the container's real rendered
width. Never let an image's intrinsic dimensions determine layout box size.
**Why:** This is why CLS measured 0.00 on both `/` and `/catalog` in the Phase 5.5.1 Web Vitals
baseline (`.omc/plans/2026-06-21-phase-web-vitals-optimization.md`) — every existing image already
followed this pattern, reserving layout space before the image loads. The hero image was the one gap
(`fill` with no `sizes`), fixed in the same phase. Without this convention, a future image added
without a sized container would silently regress CLS.
**Status:** Locked. *Numbered D27, not D24, because D24–D26 exist on the not-yet-merged
`feature/phase5-deploy` branch — renumber if merge order changes and a collision results.*

### D28 — GOTCHA: Prisma 7's wasm query compiler can't load under Jest/ts-jest (CJS), so DB-backed e2e tests can't run through Nest's `TestingModule`
**Observation:** While wiring `npm run test:e2e` into CI (Phase 5.7), `test/app.e2e-spec.ts` (boots the
real `AppModule`, including `PrismaService`) failed with `TypeError: A dynamic import callback was
invoked without --experimental-vm-modules`, thrown from `generated/prisma/internal/class.ts`'s
`getRuntime`. Also found and fixed a smaller, separate bug on the way: `test/jest-e2e.json` was
missing the `^(\.{1,2}/.*)\.js$` → extensionless moduleNameMapper that the unit-test Jest config
already had, so `app.e2e-spec.ts` couldn't even resolve `./prisma/prisma.module.js`'s relative
import — masked until now because PR #6 only ever ran `test:e2e -- test/compression.e2e-spec.ts`
(a single self-contained file with no DB dependency), never the full e2e suite.
**Root cause:** Prisma 7's architecture (confirmed via Prisma's own docs) has no native binary query
engine at all anymore — query compilation is Rust-compiled-to-wasm, loaded via a runtime
`await import(...)`. Jest's CJS test environment (`ts-jest` without ESM mode) throws on any dynamic
`import()` unless run with `NODE_OPTIONS=--experimental-vm-modules` *and* a full ESM-mode Jest/
ts-jest setup (`"type": "module"`, a custom `.mjs` resolver, hybrid-module `tsconfig`). That's a
project-wide module-system migration, not a one-line config fix, and risks destabilizing the working
unit-test suite (which deliberately mocks the generated Prisma client, see `__mocks__/prisma-client`)
and the Nest build.
**Decision:** Don't migrate the backend to ESM/`--experimental-vm-modules` to make this work. Real,
DB-backed end-to-end coverage comes from the Phase 5.7 Playwright suite instead (Step 6) — it drives
the actual built app as a running HTTP server (`node dist/src/main.js`, real `import()` support, no
Jest CJS transform in the way) rather than booting the app through Nest's `TestingModule`. Jest e2e
(`test/*.e2e-spec.ts`) stays scoped to self-contained specs with no real Prisma client init
(e.g. `compression.e2e-spec.ts`); CI runs `prisma migrate deploy` against a fresh Postgres service
container as a separate "migrations apply cleanly from scratch" check, decoupled from Jest entirely.
**Why this matters:** Don't add a second `*.e2e-spec.ts` file that boots `AppModule` against a real
DB expecting it to work under plain Jest — it will hit this exact wasm/dynamic-import wall. Use
Playwright against a live server for that need instead.
**Status:** Locked — process note for future backend test work.

### D29 — GOTCHA: `PrismaService`/`seed.ts` unconditionally forced SSL, breaking plain (non-Neon) Postgres
**Observation:** The Phase 5.7 Playwright e2e CI job's "migrate and seed" step failed against the
job's Postgres service container with `Error opening a TLS connection: The server does not support
SSL connections` — a real bug, not a CI quirk. `backend/src/prisma/prisma.service.ts` and
`backend/prisma/seed.ts` both hardcoded `ssl: { rejectUnauthorized: false }` on the `PrismaPg`
adapter unconditionally (added per D-prior-Neon-pooler-fix, written only against Neon, which always
requires SSL). Plain Postgres — the CI service container, and any future local-without-Neon setup —
doesn't speak TLS at all and the connection fails outright.
**Fix:** Made `ssl` conditional on the connection string actually requesting it:
`dbUrl.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : undefined`. Neon
URLs already carry `?sslmode=require`, so production/dev behavior is unchanged; a plain
`postgresql://postgres:postgres@localhost:5432/db` (no `sslmode`) now connects without forcing TLS.
**Why this matters:** Any future code path that constructs its own `PrismaPg` adapter (rather than
injecting `PrismaService`) needs the same conditional — don't copy the old unconditional `ssl: {...}`
pattern from git history.
**Status:** Locked.

### D30 — GOTCHA: hand-written storefront API types + `as` casts silently drifted from the real backend payload
**Observation:** A retrospective audit (2026-06-21) found `frontend/lib/api.ts` describes a *different
shape* than the backend actually returns, and because every fetch helper casts the JSON
(`return res.json() as Promise<Product>`) instead of validating it, `tsc` **and** the unit tests both
stayed green while three real, user-facing bugs shipped:
- `ProductVariant.stock` (api.ts) vs `stock_quantity` (Prisma schema) → `selectedVariant.stock` is always
  `undefined`, so every product-detail page reads "Out of stock" (`VariantSelector.tsx:164`).
- `id: number` (api.ts) vs uuid `String` ids (schema) → `catalog/page.tsx:29-30` does `Number(uuid)` =
  `NaN`, sent as `materialId=NaN`, so material/color filtering returns zero products.
- `ProductImage.display_order` (api.ts) vs `sort_order` (schema) → image secondary sort is a `NaN` no-op
  (`catalog/[slug]/page.tsx:42`).
**Root cause:** Two independent copies of one contract (the Prisma model and the hand-written frontend
interface) with nothing keeping them in sync, plus an `as` cast at the fetch boundary that tells the
compiler "trust me" instead of checking. The existing tests can't catch it because they mock the response
shape themselves (`api.test.ts:95` even mocks `id: 1`), so they encode the *same* wrong assumption.
`admin-api.ts` happens to be correct, which is why only the storefront is affected.
**Prevention (generic, not bug-specific — see CLAUDE.md rule 11 and `frontend/AGENTS.md`):**
1. Don't hand-maintain a second copy of a type that already exists authoritatively on the backend —
   derive it (generate from the API) or validate against it at runtime.
2. Never consume an external response via a bare `as` cast. Parse/validate at the boundary so a shape
   mismatch fails loudly (in a test or at runtime) instead of surfacing as `undefined` three layers later.
3. A test that mocks a backend response must mock the *real* shape — keep one shared fixture/factory that
   mirrors the actual payload, so a contract change breaks every test at once rather than none of them.
**Status:** Fixed (2026-06-21) — `lib/api.ts` rewritten with `zod` schemas mirroring the real backend
payload (uuid string ids, `stock_quantity`, `sort_order`, plus the narrower `{name, slug}` category and
`{name[, hex_code]}` material/color shapes actually nested in product responses — distinct from the
full lookup-table shapes returned by `/categories`, `/materials`, `/colors`). Every fetch helper now
parses the response through its schema instead of `as`-casting `res.json()`, so a future contract
drift throws immediately instead of surfacing as `undefined` deep in a component. `lib/api.test.ts`
fixtures rewritten to the real shapes, with tests asserting on `stock_quantity`/`sort_order` and a
missing-field case that fails parsing. Also found and fixed a related latent bug surfaced by the new
validation: `VariantSelector.tsx` deduped a product's materials/colors by `.id`, but the nested
material/color on a variant has no `id` field (only `name`, see above) — every variant's material/color
silently collapsed to a single Map entry, so a product with multiple colors only ever showed one color
swatch. Fixed by deduping on `name` (unique per `Material`/`Color` row) instead.

### D31 — GOTCHA: required secrets must fail fast, never fall back to a default
**Observation:** The same 2026-06-21 audit found both the JWT signer (`auth/auth.module.ts:13`) and
verifier (`auth/strategies/jwt.strategy.ts:11`) default to `process.env.JWT_SECRET ?? 'dev-secret'`. If
`JWT_SECRET` is ever unset in production, the app signs *and* verifies admin tokens with a hardcoded,
public string — anyone could forge a valid admin JWT and reach every guarded write endpoint. The fallback
also *masks* the misconfiguration: the app boots and "works" instead of refusing to start.
**Prevention (generic — see CLAUDE.md rule 12):** A required secret/credential must have no fallback.
Read it once at boot, throw if missing (mirror the `DATABASE_URL` guard already in
`prisma.service.ts:11`), and let a single source own it so signer and verifier can't drift. Defaults are
fine only for genuinely optional, non-security config (e.g. `JWT_EXPIRES_IN ?? '24h'`, `PORT`).
**Status:** Fixed (2026-06-21) — added `backend/src/auth/jwt-secret.ts` (`getJwtSecret()`, throws if
`JWT_SECRET` is unset) as the single source both `auth.module.ts`'s `JwtModule.register` and
`jwt.strategy.ts`'s `secretOrKey` now call, so signer and verifier can't drift onto different values.
Removed both `?? 'dev-secret'` fallbacks. Added `JWT_SECRET` to the Playwright e2e CI job's env block
(`.github/workflows/ci.yml`) since it boots a real `start:prod` server that now refuses to boot without
it — the local backend/Jest unit-test job already had it set and needed no change.

---

## Phase 6 — e-commerce (decisions locked at milestone 6.0)

These resolve the open decisions C1–C10 in `.omc/plans/2026-06-21-phase6-ecommerce.md` §9 that need no
external input. C5 (PII erasure), C10 (GST rates/invoice format), C8 (CSRF) and the externally-gated
items remain open and are decided at their milestone.

### D32 — Customer auth is a SEPARATE principal from the single admin (does not reopen D10) [C6]
**Decision:** Phase 6 adds customer accounts (register / login / verify / reset, saved addresses, order
history) as a wholly separate authentication domain from the single admin. Distinct secret
(`CUSTOMER_JWT_SECRET`), distinct cookie name, distinct guard, distinct Passport strategy. A customer
token must never satisfy an admin guard, and vice-versa — enforced by a test on every `/admin/**` route.
The session mechanism mirrors the admin httpOnly-cookie JWT for consistency and learning continuity
(rather than adopting Auth.js/NextAuth); the secret is resolved fail-fast via a `getCustomerJwtSecret()`
single source, mirroring `backend/src/auth/jwt-secret.ts` (D31).
**Why:** D10 ("single admin, no role system") is about *not* building roles/permissions on the admin
actor — it is **not** a ban on a second actor type. Customers are a different principal, not an admin
role, so this extends rather than violates D10. Sharing a secret/guard between admin and customers would
be a privilege-escalation hole.
**Status:** Locked (6.0).

### D33 — Email verification + password-reset tokens are stored hashed, single-use, short-TTL
**Decision:** The `EmailToken` table stores a **hash** of the token (`token_hash`), never the raw value;
tokens are single-use (`used_at`) with a short expiry (`expires_at`). The reset response is identical
whether or not the email exists (no account enumeration). One `EmailToken` table, typed by
`EmailTokenType` (`VERIFY_EMAIL` / `PASSWORD_RESET`).
**Why:** A leaked DB must not yield usable reset/verify links; reuse and enumeration are standard auth
attack vectors. Mirrors the fail-loud posture of D31.
**Status:** Locked (6.0).

### D34 — Hybrid cart; price is never trusted from the client [C1]
**Decision:** Server-side `Cart`/`CartItem` for logged-in customers + a Zustand client store, merged
into the server cart on login. **`CartItem` stores no price** — unit price and stock are re-read from
`ProductVariant` at `/checkout/quote` and order creation. The Razorpay order amount is always computed
server-side from that re-read.
**Why:** A persisted cart matches the "accounts now" choice and survives devices. Storing or trusting
a client-supplied price is the classic e-commerce tampering vector (see §7.1 of the plan); the server must
be the sole price authority.
**Status:** Locked (6.0).

### D35 — HSN code lives on `Product`, not `ProductVariant` [C4]
**Decision:** GST `hsn_code` is a nullable field on `Product` (a design has one HSN that its size/colour
variants share). `OrderItem` snapshots `hsn_code` at order time so an invoice is reproducible even if the
product's HSN is later edited.
**Why:** For home textiles, HSN classification is per design, not per size/colour. Putting it on `Product`
avoids duplicating the same code across every variant. Revisit only if variants ever need distinct HSNs.
**Status:** Locked (6.0).

### D36 — Order numbers `SF-{FY}-{6-digit sequence}`; invoice numbers are a separate gap-free series [C2]
**Decision:** Customer-facing order numbers follow `SF-{financial-year}-{zero-padded sequence}` (e.g.
`SF-2026-000123`), generated server-side, unique. **GST invoice numbers are a distinct, sequential,
gap-free series per financial year** (a legal GST requirement) — implemented as a per-FY counter row
incremented inside the order-confirmation transaction, *not* derived from the order number. An order can
exist (e.g. `PENDING_PAYMENT`, `CANCELLED`) without ever consuming an invoice number.
**Why:** Order numbers can have gaps (cancelled/abandoned); invoice numbers legally cannot. Coupling them
would either leak gaps into the invoice series or block order creation. The exact rate/format details
remain open under C10 pending the owner's accountant.
**Status:** Locked (6.0) for the numbering mechanism; C10 (rates/format) still open.

### D37 — Customer passwords hashed with argon2id (bcrypt ≥ 12 fallback) [C7]
**Decision:** Hash customer passwords with **argon2id**; fall back to bcrypt (cost ≥ 12) only if the
argon2 native module proves awkward to build on Render. Never reversible, never logged.
**Why:** argon2id is the current OWASP-recommended password KDF (memory-hard, GPU-resistant). The admin
side already uses bcrypt; allowing the bcrypt fallback keeps deploys unblocked if the native build is a
problem on the free tier.
**Status:** Locked (6.0).
