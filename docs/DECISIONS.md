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
