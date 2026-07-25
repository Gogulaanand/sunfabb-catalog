# Growth Wave 1 - Be worth citing and following

**Parent plan:** `docs/GROWTH.md` (§3.3 trust pages + content, §3.4 GEO, §3.7 Business Profile, §3.8 social engine start).
**Gate:** Wave 0 shipped (✅ 2026-07-17, PR #26) + owner business inputs (§2 below).
**Branch:** `feature/growth-wave1-content-geo` (code); content batches ride separate small PRs.
**Status:** partially shipped - see §11 for what is done, what is pending, and why.
**Relationship to Phase 6:** independent of 6.5/6.6 code, but the trust pages are a hard prerequisite for Razorpay live mode and Merchant Center, i.e. for Phase 6.10 and Wave 2. Ship Wave 1 before or alongside Stream A.
This document is self-contained: an executor should be able to deliver the wave end-to-end from this file plus the cited source files.

---

## 1. Objective

Give Google, LLMs, and customers substantive reasons to trust and cite sunfabb.com: seven trust pages, a lightweight MDX guides section, category/product copy filled in, FAQ with schema, entity signals, and the social presence bootstrapped.
No commerce dependencies; everything here works on the current catalog site.

## 2. Owner inputs required (collect before starting)

Trust-page inputs (blocking for §5.1):
- [ ] Legal entity name and registered address.
- [ ] GSTIN and whether to display it in the footer.
- [ ] Contact email + phone (customer-facing).
- [ ] Return window and conditions (days, condition requirements, who pays return shipping).
- [ ] Shipping coverage (states/cities served or all-India) + estimated delivery timelines.

Other inputs (blocking only for their own sub-tasks):
- [ ] **Physical presence?** Yes → Google Business Profile Branch A (§5.5); No → Branch B (skip GBP, entity signals only).
- [ ] `@sunfabb` handles registered on Instagram, Facebook, Pinterest, YouTube (30 minutes; do immediately regardless - squatting risk).
- [ ] Brand-voice approval: Claude drafts a one-page voice guide first; owner approves once.
- [ ] Real product photos for the hero + social (phone + daylight is fine); the Unsplash hero placeholder should die this wave.
- [ ] Social approval mode: monthly review of the queued calendar vs full auto-post.

## 3. Current state (grounding - do not re-derive)

- Storefront routes live in `frontend/app/(storefront)/` (home, `catalog`, `catalog/[slug]` under catalog, `contact`, plus `cart`/`checkout`); `/contact` **already exists** - trust-page work extends this pattern, it does not invent it.
- Wave 0 shipped: `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `public/llms.txt`, `metadataBase`/OG/Twitter defaults, canonical handling, `noindex` on cart/checkout/account, GA4 via `@next/third-parties` in `frontend/app/layout.tsx`, and four JSON-LD components in `frontend/components/seo/` (`OrganizationSchema`, `ProductSchema`, `BreadcrumbSchema`, `ItemListSchema`) each with tests and XSS-safe `safeJsonLd()`.
- Data layer already has the SEO fields: `Product.description`, `Product.care_instructions`, `ProductImage.alt_text`, `Category.description` (all nullable, mostly thin/unused today).
- `Category.description` is NOT currently rendered on the filtered catalog view.
- Admin UI (`frontend/app/admin`) has full product/category CRUD with Chakra UI v3; the storefront must stay Chakra-free (Ethos & Hearth design tokens in `globals.css`, `motion` primitives in `frontend/components/motion/`).
- Design language: Playfair headlines, terracotta palette, `Reveal`/`StaggerGroup` motion primitives - new pages must match (see `frontend/app/(storefront)/not-found.tsx` for the branded static-page pattern from UX Phase F).
- Backend constraint stack: Prisma only (D4), DTO validation (D8), zod at the frontend boundary (rule 11/D30). Frontend tests are Vitest; e2e is Playwright.

## 4. Locked design decisions

- **D-W1-1 Trust pages are static routes** in `(storefront)`, one file each; copy drafted by Claude from owner inputs, reviewed by owner in the PR. No CMS.
- **D-W1-2 Guides are MDX files in the repo** rendered at `app/(storefront)/guides/[slug]` via `@next/mdx` (or `next-mdx-remote` if the App Router MDX integration fights the route group - executor picks after a 15-minute spike, documents the choice). Frontmatter: `title`, `description`, `date`, `category`. No database involvement.
- **D-W1-3 FAQ is one static page** with question-shaped `h2`s + `FAQPage` JSON-LD (new component in `components/seo/`, same `safeJsonLd()` pattern and test style as the existing four).
- **D-W1-4 Content batches are data, not code:** product/category copy is applied through the existing admin API (or a one-off seed-style script using it), delivered as a reviewable markdown table the owner approves before any write.
- **D-W1-5 Social scheduling via a third-party scheduler CSV** (Metricool/Publer/Postiz free tier), not a custom Graph API integration. Building posting infrastructure for 12 posts/month is over-engineering (→ backlog).
- **D-W1-6 GBP branches on physical presence** (owner input); Branch B costs nothing and keeps entity signals via `Organization.sameAs`.

## 5. Workstreams

### 5.1 Trust pages (code + copy)

1. Routes: `/about`, `/privacy-policy`, `/terms`, `/shipping-policy`, `/returns-policy`, `/faq` as static pages in `frontend/app/(storefront)/` (`/contact` exists; give it the same visual pass if needed).
2. Shared presentation: a simple `LegalPage`/prose layout component (Playfair heading, readable measure, `Reveal` entrance) so all seven pages look intentional and consistent.
3. Copy drafted from §2 inputs; India-specific: privacy policy is DPDP Act 2023-aware (data collected, purpose, retention, erasure contact), returns/shipping match what 6.6/6.10 will actually deliver (flat/free shipping rule, prepaid only - cross-check `docs/plans/phase-6.6-shipping-shiprocket.md` amounts once known).
4. Footer: add a link block for all trust pages + social icons (only for handles that exist) + brand line; wire `sameAs` array in `OrganizationSchema` to the real profiles.
5. Each page gets proper `metadata` (title, description, canonical); pages are indexable (that is the point).
6. `sitemap.ts`: add the static trust + guide URLs.

### 5.2 Guides section (code)

1. MDX pipeline per D-W1-2; guide index page at `/guides` (card list, category filter unnecessary at this scale).
2. Guide template renders frontmatter title/description, semantic headings, and a related-products block (optional stretch: manual slug list in frontmatter → product cards via existing `lib/api.ts` fetchers).
3. First four guides drafted this wave (owner approves topics): "Towel GSM explained", "How to wash cotton bedspreads", "Bedspread size guide for Indian beds", "Table linen setting guide". These match the §3.4 LLM-citability goal: fact-dense, list/table-heavy.
4. `BreadcrumbSchema` on guide pages; guides added to `sitemap.ts` and `public/llms.txt`.

### 5.3 Catalog content quality (data + small code)

1. Render `Category.description` as an intro block on category-filtered catalog views (field exists, currently unused; server component change in the catalog page).
2. Batch 1: Claude generates descriptions + care instructions + image alt texts for all live products and all categories in brand voice; delivered as one reviewable table; applied via admin API after owner approval (D-W1-4).
3. Admin "SEO completeness" nudge: in the admin product list or form, badge products missing `description`, `care_instructions`, or any image `alt_text` (small Chakra addition; read-only computation, no schema change).

### 5.4 GEO / AI-search polish (small code)

Wave 0 already shipped robots + llms.txt + JSON-LD.
Remaining:
1. `FAQPage` JSON-LD on `/faq` (D-W1-3).
2. Semantic pass on product pages: verify one `h1`, spec data in the `<dl>`/table structure (largely done in UX Phase E - verify, fix gaps only).
3. `public/llms.txt` refresh: add guides + trust pages + accurate category links.
4. Entity consistency: identical brand name/description across `OrganizationSchema`, social bios, and footer.
5. Monthly AI-citation spot-check: a documented manual/scheduled prompt list (5 canonical queries) logged to `docs/reports/ai-citations.md`; automation via a scheduled agent is optional, not built infrastructure.

### 5.5 Google Business Profile (owner-led, branched)

- **Branch A (physical presence):** owner creates + verifies the profile (postcard/video); Claude prepares the profile content pack (category "Linens store", description, hours, photo shot-list, website link, review URL for later §3.11 emails). Monthly GBP posts reuse the §5.6 calendar.
- **Branch B (online-only):** skip GBP entirely (not eligible); revisit if a pickup location or exhibition presence appears. Entity work continues via schema + socials.

### 5.6 Social engine bootstrap (owner + batch content)

1. Owner registers handles (§2) and creates Meta Business Suite (Page + IG professional) and Pinterest business accounts; Claude provides a click-by-click checklist and bio/link copy.
2. Claude generates the first monthly calendar: 12-16 posts (product spotlights, care tips reusing guides, styling, seasonal hooks) - captions + hashtags + Cloudinary transform URLs composing branded 4:5 and 9:16 frames from existing product images (no designer).
3. Owner bulk-uploads via the chosen scheduler's CSV (D-W1-5); ~20 min/month review.
4. Pinterest: claim the website (meta tag - tiny code change), pin the catalog + guides; Rich Pins already work via Wave 0 OG tags.
5. Catalog *feeds* for Meta/Pinterest are **Wave 2** (shared code with the Merchant feed) - not here.

## 6. Env & config

No new backend env vars.
Frontend: none required; Pinterest site-claim meta tag is a constant in metadata.

## 7. Test plan

- Vitest: each new page renders (smoke), footer contains all trust links, `FAQPage` JSON-LD component escapes/serializes like its siblings (mirror the existing `components/seo/*.test.tsx`), guide MDX pipeline renders a fixture file, category intro renders when `description` present and collapses when null.
- Playwright: trust pages reachable from the footer at desktop + mobile; `/guides` lists and opens a guide; Rich Results Test (manual) passes FAQ on `/faq`.
- `next build` clean; lint + type-check green; sitemap includes the new URLs.

## 8. Acceptance criteria / KPIs (from GROWTH §3.3-3.8)

1. All 7 trust pages live, linked from the footer, indexable, with owner-approved copy.
2. 4+ guides live; guides + trust pages in sitemap and llms.txt.
3. All live products have description + care instructions + alt text; categories have intro copy rendering.
4. FAQ passes the Rich Results Test.
5. Social profiles exist with consistent branding; first monthly calendar queued; `Organization.sameAs` populated.
6. GBP branch decision recorded; Branch A verified profile with 10+ photos if applicable.
7. Search Console shows impressions on non-brand queries (trailing indicator; check at +30 days).

## 9. Out of scope (→ `docs/plans/PHASE6-BACKLOG.md` / later waves)

Catalog feeds (Wave 2), newsletter capture + `Subscriber` table (Wave 2, §3.11), custom Graph API auto-posting, CMS, blog comments, UGC loop (Wave 3), Amazon/Flipkart.

## 10. Verification commands

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Plus manual: Rich Results Test on `/faq` and a product page; WhatsApp share preview of a guide; footer link sweep on mobile.

## 11. Delivery status (2026-07-25)

The wave was split at the owner-input gate: everything that needed no business inputs was built first, on branch `feature/growth-wave1-content-geo`.
Commits are local to that branch and not yet pushed or merged.

### 11.1 Shipped

| Plan item | What landed | Commit |
|---|---|---|
| §5.2 (all) | MDX pipeline (`@next/mdx` + `remark-gfm`), `/guides` index, `/guides/[slug]`, the four planned guides under `frontend/content/guides/`, `ArticleSchema` + `BreadcrumbSchema` per guide, related-products block driven by a `relatedCategorySlug` frontmatter field, guides added to `sitemap.ts` and `llms.txt` | `6dfdf60` |
| §5.1 (partial) | `/faq` static page with question-shaped `h2`s; footer gained a "Learn" column linking guides + FAQ; `sitemap.ts` gained `/guides`, `/faq`, `/contact` | `6dfdf60` |
| §5.3.1 | `CategoryIntro` renders `Category.description` on category-filtered catalog views, in the page shell rather than behind Suspense so non-JS crawlers see it; falls back to the generic tagline where a category has no description | `2641586` |
| §5.3.3 | Admin SEO-completeness badge: backend annotates admin product rows with a missing-alt-text count via one grouped query, and `lib/admin-api.ts` now parses the admin list with zod instead of casting (rule 11 / D30) | `6dfdf60` |
| §5.4.1 | `FaqSchema` (FAQPage JSON-LD) on `/faq`, same `safeJsonLd()` pattern as the Wave 0 components | `6dfdf60` |
| §5.4.3 | `public/llms.txt` refreshed with guides, FAQ and contact, plus an explicit note that policy pages do not exist yet so an LLM does not infer them | `6dfdf60` |

The stretch goal in §5.2.2 (related-products block on guide pages) was delivered, not skipped.

### 11.2 Pending - blocked on owner inputs (§2)

- §5.1.1 `/about`, `/privacy-policy`, `/terms`, `/shipping-policy`, `/returns-policy`.
  These are five of the seven trust pages and the reason the wave cannot be called done.
- §5.1.2 the shared prose/`LegalPage` layout component.
  Not built: with only `/faq` and `/guides` shipped there was nothing to share it with yet, and its shape should be set by the legal pages that will dominate it.
- §5.1.4 footer trust-page links and social icons.
  `OrganizationSchema` still has `sameAs: []` and the footer's "Follow" column has no outbound links, both waiting on real handles.
- §5.3.2 the **product** copy batch (D-W1-4).
  Category copy is not blocked and not missing - all three live categories already carry a seeded description (verified against production 2026-07-25), so `CategoryIntro` renders real copy the moment this branch deploys.
  Product copy is the gap, and it needs a per-design fact sheet from the owner: fibre and blend, weave/construction, GSM or weight, finished sizes, reversible or not, origin, and any certification.
  Those are verifiable claims about physical goods; drafting them from the product name would be inventing product attributes, which is both a false-advertising risk and self-defeating for a wave whose goal is being citable.
- §5.5 Google Business Profile branch decision (physical presence yes/no).
- §5.6 social handles, Meta/Pinterest accounts, and the first monthly calendar.

### 11.3 Pending - not blocked, just not done

- §5.4.2 the semantic pass on product pages (one `h1`, spec data in `<dl>`/table structure).
  Not audited this session.
- §5.4.5 the monthly AI-citation spot-check.
  `docs/reports/` does not exist yet.

### 11.4 Pulled forward from Wave 2

Nothing moved out of Wave 1 into Wave 2.
Movement went the other way: the GA4 e-commerce events from Wave 2 §5.1 were built on this branch (`2d6898c`) because they need no vendor accounts - the measurement ID has been live since Wave 0 - and collecting funnel data early costs nothing.
All five events ship: `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
That work also amended **D-W2-7** in `docs/plans/growth-wave-2-buyable-everywhere.md`: `purchase` fires at the payment-confirm step, not on the order-confirmation view, because that route doubles as order history.

Two follow-ups this leaves open, both tracked in the Wave 2 plan rather than here:

1. `NEXT_PUBLIC_GA_MEASUREMENT_ID` must be set in the Vercel frontend project.
   It is a build-time inline, so events do not fire until a deploy that has it.
2. The GA4 DebugView walkthrough (Wave 2 §5.1.4) has not been run.
   Wave 3 is gated on that funnel being visible, so it stays a blocker for Wave 3, not Wave 1.

### 11.5 Acceptance criteria status (against §8)

| # | Criterion | State |
|---|---|---|
| 1 | All 7 trust pages live, linked from the footer, indexable | ❌ 2 of 7 (`/faq`, `/contact`) |
| 2 | 4+ guides live; guides + trust pages in sitemap and llms.txt | ✅ guides done; trust-page half pending with the pages |
| 3 | All live products have description + care instructions + alt text; categories have intro copy rendering | ⚠️ categories ✅ (all three have copy and will render on deploy); products ❌ - see §11.6 |
| 4 | FAQ passes the Rich Results Test | ⬜ component shipped, test not run (needs a deploy) |
| 5 | Social profiles exist; `Organization.sameAs` populated | ❌ blocked on owner |
| 6 | GBP branch decision recorded | ❌ blocked on owner |
| 7 | Search Console impressions on non-brand queries | ⬜ trailing indicator, check +30 days after merge |

### 11.6 Live-site content defects found while checking §5.3.2

Audited against production on 2026-07-25 by reading the rendered `<meta name="description">` on each URL in `sitemap.xml`.
These are data problems, not code problems, and none are fixed by this branch.

1. **All three real designs ship an internal note as their public description.**
   `bedspread-design-4219`, `-8525` and `-8569` all read "Printed cotton bedspread design NNNN. Color and product details can be refined in the admin catalog."
   That second sentence is instructions to the catalog operator, published to shoppers and crawlers.
   It is the highest-value thing on this list to fix and the reason the §5.3.2 fact sheet is worth collecting.
2. **Test data is live.** `royal-cotton-bedspread` has the description "An edited test product description".
3. **Seeded demo products are indexable.** `heritage-linen-bedspread`, `quilted-cotton-bedspread`, `turkish-cotton-bath-towel`, `waffle-weave-hand-towel`, `linen-table-runner` and `embroidered-napkin-set` are seed fixtures, not real inventory, but they are in `sitemap.xml` and served to crawlers alongside the three real designs.
   Decide whether they are deliberate catalog filler or should be deactivated (soft delete per rule 4) before Search Console starts indexing them as real products.
