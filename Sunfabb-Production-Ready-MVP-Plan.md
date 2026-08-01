# Sunfabb Production-Ready MVP Plan

## 1. Current state as of August 1, 2026

### 1.1 Foundation and storefront

| Area                      | Status                     | Assessment                                                                                                                  |
| ------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Repository and deployment | Operational                | Main branch deploys successfully to Vercel and `sunfabb.com` is live.                                                       |
| Storefront UX             | Substantially complete     | Responsive home, catalogue, PDPs, filters, search-adjacent discovery, galleries, guides, FAQ and contact foundations exist. |
| Catalogue backend/admin   | Complete enough for MVP    | CRUD, variants, images, stock, categorisation and administrative workflows exist.                                           |
| SEO foundation            | Mostly complete            | Metadata, canonical URLs, sitemap-related work, structured data, Open Graph and content guides have been implemented.       |
| Analytics                 | Implemented                | GA4 and commerce-oriented events exist.                                                                                     |
| Commerce core             | Technically implemented    | Cart, authentication, address flow, checkout, Razorpay, orders, webhook processing and admin orders exist.                  |
| Hardening and tests       | Strong internal foundation | CI includes backend tests, migrations, frontend coverage and Playwright purchase-path testing.                              |
| Production operations     | Incomplete                 | Email, GST invoicing, shipping provider integration and the final go-live drill remain unfinished.                          |
| Customer trust/content    | Incomplete                 | Placeholder contact information, missing policy pages, internal product copy and stock/business-data uncertainty remain.    |
| WhatsApp conversion       | Planned, not productised   | Generic placeholder WhatsApp links exist, but there is no complete product-specific WhatsApp funnel.                        |
| Social presence           | Not launch-critical        | Instagram/Facebook can proceed gradually after the conversion foundation.                                                   |

The master plan records Phases 0–5 as complete, with Phase 6.0–6.4, 6.8 and 6.9 completed. The remaining transactional phases are 6.5 GST, 6.6 Shiprocket, 6.7 Resend and 6.10 final go-live.

### 1.2 Catalogue state

The attached current tracker is materially newer than portions of the repository handoff documentation:

* **41 numbered production designs are published and active.**
* **Five non-production demo products remain active.**
* Therefore, the live total of 46 catalogue items matches 41 production products plus five demos.

For the classified 166-grid pilot:

* Nine candidates have a complete 5/5 local asset set.
* `SC-166F-R1C3` is parked at 4/5 because of hero repeat-scale fidelity.
* `SC-166F-R2C1` is parked at 4/5 because of room-scene repeat-scale fidelity.
* Owner QA, import, approval and publication are still pending for this pilot batch.

The pipeline’s safety rules are good and should remain unchanged: preparation and publication must fail closed when verified classifications or commercial metadata are missing.

### 1.3 Documentation state

The repository contains good plans but lacks a reliable single operational truth:

* `HANDOFF.md` contains catalogue counts that have been overtaken by later work.
* The committed catalogue tracker and the attached local tracker do not describe the state equally clearly.
* Plans are spread across the master plan, handoff, Phase 6 plans, growth-wave plans and pipeline trackers.
* There are currently no open repository issues or pull requests representing the remaining launch backlog.

This means planning exists, but the work is not currently organised into an executable project queue.

---

## 2. Immediate findings requiring attention

### P0. Production catalogue requests are timing out

Connected Vercel telemetry for the preceding seven days showed:

* More than 200 `TimeoutError` occurrences.
* At least 31 affected users.
* Concentration around `/catalog/[slug]` and related React Server Component requests.
* Errors occurring on the latest production deployment.

The frontend backend client imposes an eight-second abort timeout. The handoff also identifies backend sleeping as an unresolved deployment concern. Together, these strongly suggest that backend cold starts or slow upstream requests are exceeding the frontend timeout, although this should be confirmed with correlated backend logs before declaring the final root cause.

**This is the first engineering priority.** More catalogue traffic from Google, WhatsApp or social sharing would amplify this failure.

### P0. Public placeholders are visible

The live footer currently exposes values equivalent to:

* `+91 XXXXX XXXXX`
* `wa.me/91XXXXXXXXXX`
* an incomplete Google Maps URL
* an unverified social handle
* an email address that must be confirmed as operational

The repository itself marks several of these values as placeholders.

A visitor encountering these after arriving from Google is likely to interpret the site as unfinished or untrustworthy.

### P0. Commerce presentation and commerce readiness disagree

The live site currently displays:

* Cart
* Account
* Add to Cart
* prices
* “In stock”
* Product structured-data offers

However, the middleware gates only account-related paths when commerce is disabled; cart and product purchase presentation remain publicly exposed.

Until transactional operations are ready, the site needs one coherent mode:

#### Recommended mode: Lead-generation catalogue

* Product browsing remains public.
* Prices may remain only when confirmed.
* Cart, Account, checkout and Add to Cart are hidden.
* The primary conversion becomes **Enquire on WhatsApp**.
* Every WhatsApp message identifies the product and selected variant.

Later, transactional commerce can be activated as one coordinated release.

### P0. Public product copy contains internal development language

The sampled production product, Design 4195, publicly says:

> “Colour and product details can be refined in the admin catalog.”

That sentence also appears in metadata and structured data, meaning it can be indexed and shown when shared.

The same product currently claims:

* Printed cotton
* King size
* Four colourways
* ₹1,499
* Stock quantity of ten per variant
* Machine-wash instructions
* In-stock availability

Each claim must be confirmed against actual commercial records. The current pipeline explicitly forbids guessing commercial metadata, so that standard should now be applied to the already-published production catalogue as well.

### P1. Demo products remain public

The five `UNKNOWN-*` products are still active and contribute to the live 46-product count. They are explicitly described as development demos, not release evidence.

They should be:

* deactivated,
* removed from the sitemap,
* excluded from structured-data lists,
* blocked from indexing, or
* moved into a dedicated non-production seed environment.

### P1. The storefront promises categories not supported by production inventory

The public navigation and metadata promote bedspreads, towels, napkins and table linen. However, the confirmed production list currently consists primarily or entirely of the numbered bedspread designs.

The catalogue also exposes:

* Unsplash category imagery,
* a category with no image,
* material filters that may not reflect verified production inventory,
* empty or demo-only categories.

Until genuine products exist, unsupported categories should either be hidden or presented honestly as “Coming soon.” Do not send customers into empty category results.

### P1. Trust foundation is incomplete

The earlier growth audit already identified only a partial trust-page implementation and unfinished product/business content.

A customer-facing MVP needs:

* About Sunfabb
* Contact
* Shipping information
* Returns/refunds
* Privacy policy
* Terms
* FAQ
* real business identity and contact details
* delivery and return expectations on PDPs

No marketing claim such as “handcrafted,” “sustainably sourced,” “premium,” “built to last” or a fibre composition should remain unless the owner can substantiate it.

---

# 3. Recommended launch strategy

## Track A — Catalogue + WhatsApp MVP

Launch this first.

The offer becomes:

> Browse verified Sunfabb products, choose a colour or design, and contact the business directly through WhatsApp for availability, delivery and purchase assistance.

This avoids waiting for all transactional integrations while still making the website commercially useful.

## Track B — Transactional e-commerce

Continue after the catalogue MVP is stable:

1. Resend/email
2. GST invoicing
3. Shiprocket
4. Final production hardening and reconciliation
5. Enable checkout

## Track C — Image catalogue expansion

Continue in parallel without blocking Track A:

* owner QA existing generated pilots,
* publish only verified products,
* resolve parked scenes gradually,
* classify and generate subsequent batches,
* retain all current safety gates.

---

# 4. Scoped implementation phases

## Phase 0 — Establish one launch truth

**Priority:** Immediate
**Scope:** Documentation and project control
**Model:** GPT-5.6 Sol Medium / GPT-5.6 Thinking High for synthesis; Luna Low or a lightweight coding agent for documentation edits.

### Work

1. Create `docs/LAUNCH_STATUS.md` as the canonical project status.
2. Replace stale product counts in `HANDOFF.md`.
3. Commit the current local `CATALOG_PROGRESS.md`.
4. Declare the attached tracker authoritative for catalogue production.
5. Add a “last verified” date to every status document.
6. Create GitHub milestones:

   * Catalogue Lead-Gen MVP
   * Transactional Commerce
   * Catalogue Expansion
7. Convert the plan below into small GitHub issues.
8. Assign every issue:

   * priority,
   * owner dependency,
   * model tier,
   * acceptance criteria,
   * blocking relationships.

### Completion gate

A new agent should be able to understand current production status by reading:

1. `docs/LAUNCH_STATUS.md`
2. `CATALOG_PROGRESS.md`
3. the relevant phase plan

without reconciling contradictory historical documents.

---

## Phase 1 — Customer-safety and reliability release

**Priority:** Highest engineering priority
**Scope:** One focused reliability/security PR, with infrastructure changes documented separately
**Model:** Sol High/strongest GPT-5.6 reasoning model for diagnosis and review; Luna High coding agent for implementation.

### 1A. Diagnose and remove catalogue timeouts

1. Correlate Vercel timeout timestamps with Render/backend logs.
2. Measure:

   * backend cold-start duration,
   * `/products`,
   * `/products/:slug`,
   * category/material lookup endpoints,
   * database connection time.
3. Move the backend to an always-on production instance before actively distributing the site.
4. Replace the single eight-second hard failure with:

   * an appropriate server timeout,
   * structured timeout logging,
   * controlled retry only where safe,
   * cached catalogue data,
   * graceful error presentation.
5. Ensure a temporary backend slowdown does not render a product page as a permanent 404.
6. Add synthetic production checks for:

   * home,
   * catalogue,
   * two PDPs,
   * contact,
   * backend health.
7. Alert on failure or sustained latency.

### 1B. Align runtime environments

CI currently uses Node 20, while the connected Vercel project is configured with Node 24.x.

1. Select one supported production Node version.
2. Pin it in:

   * package metadata,
   * CI,
   * Vercel,
   * Render/backend configuration.
3. Test builds and end-to-end flows against that version.

### 1C. Production security basics

1. Replace placeholder/default admin credentials.
2. Rotate deployment secrets that may have been reused during development.
3. Validate production CORS allowlists.
4. Confirm Turnstile configuration.
5. Confirm admin routes cannot be indexed.
6. Ensure error responses do not expose internals.
7. Add a dependency/security audit to CI or release checks.

### Completion gate

* Twenty consecutive cold/warm requests to each critical public route succeed.
* No request is misclassified as not found because the backend was slow.
* No unresolved production timeout group appears during an observation window.
* Runtime versions match between CI and production.
* Admin credentials and production secrets are non-placeholder.

---

## Phase 2 — Public hygiene and catalogue truth

**Priority:** Immediately after Phase 1
**Scope:** Data audit plus storefront feature-flag cleanup
**Model:** Luna Medium coding agent for scripts and fixes; Sol Medium reviewer for data contracts and edge cases.

### 2A. Introduce an explicit storefront mode

Use an explicit configuration such as:

* `CATALOG_LEAD_GEN`
* `TRANSACTIONAL_COMMERCE`

In lead-generation mode:

* hide Cart,
* hide Account,
* hide checkout routes,
* hide Add to Cart,
* prevent cart API mutations,
* show Enquire on WhatsApp,
* retain product and variant selection.

Do not merely hide visual controls while leaving purchase endpoints enabled.

### 2B. Remove demos from the public release

Deactivate:

* `UNKNOWN-PLAID1`
* `UNKNOWN-PLAID2`
* `UNKNOWN-PLAID3`
* `UNKNOWN-STRIPE1`
* `UNKNOWN-STRIPE2`

Add a regression test confirming demo SKUs never appear in:

* public product APIs,
* catalogue pages,
* sitemaps,
* structured data,
* recommendation blocks.

### 2C. Audit all 41 production designs

Create a report for every product and variant containing:

* design number,
* verified product name,
* product type,
* construction,
* exact dimensions,
* commercial size label,
* exact set contents,
* fibre/material,
* colours,
* selling price,
* stock source,
* care instructions,
* images present by role,
* description status,
* publication approval.

Each field should be one of:

* verified,
* missing,
* blocked,
* not applicable.

Never replace missing values with defaults.

### 2D. Rewrite public product information

Remove:

* internal admin references,
* test notes,
* generation notes,
* unsupported marketing language,
* generic descriptions that add no customer information.

A good PDP should clearly state:

* what the product is,
* dimensions,
* what is included,
* material only when confirmed,
* available colour,
* care,
* availability,
* delivery expectation,
* return position,
* design/reference number.

### 2E. Fix catalogue taxonomy

1. Show only categories with real active products.
2. Show only materials represented by verified active variants.
3. Remove irrelevant empty filters.
4. Replace Unsplash and emoji category imagery with real Sunfabb assets.
5. Avoid promoting towels or table linen until genuine inventory exists.
6. Make the home page’s value proposition match the currently buyable range.

### Completion gate

* Exactly the approved production catalogue is publicly listed.
* No `UNKNOWN-*` product is public.
* No visible internal-development sentence remains.
* No unverified stock, material, size or price is represented as fact.
* Structured data agrees with the UI and database.
* Empty categories are not presented as active shopping destinations.

---

## Phase 3 — Trust and conversion foundation

**Priority:** Before active Google/social promotion
**Scope:** Business content, policies, contact delivery and PDP trust elements
**Model:** Luna Medium for page implementation and first drafts; Sol Medium for consistency/risk review. Owner, accountant or legal professional must verify business and policy facts.

### Work

1. Replace every contact placeholder with verified information.
2. When a value is unavailable, hide the control rather than rendering a placeholder.
3. Create and link:

   * About
   * Shipping
   * Returns and refunds
   * Privacy
   * Terms
4. Complete Phase 6.7 email delivery sufficiently for:

   * contact-form notifications,
   * customer contact acknowledgement,
   * internal failure visibility.
5. Add PDP trust blocks:

   * dispatch expectation,
   * delivery region,
   * returns summary,
   * payment posture,
   * business contact.
6. Add the verified business identity to:

   * footer,
   * contact page,
   * structured data,
   * email templates.
7. Populate `sameAs` only with real, active social profiles.
8. Remove unverified Twitter/Instagram metadata.
9. Replace generic home/category images with owned product imagery.
10. Test contact form delivery end to end.

### Completion gate

A first-time visitor can answer:

* Who is selling this?
* How do I contact them?
* What exactly will I receive?
* How large is it?
* How and when will it be delivered?
* Can it be returned?
* What happens after I send an enquiry?

without reading developer-oriented text or encountering a placeholder.

---

## Phase 4 — WhatsApp Business MVP

**Priority:** Highest-return conversion feature
**Scope:** Business setup plus a small site integration PR
**Model:** Luna Medium coding agent; Luna Low/Medium for verified catalogue-copy formatting. Sol is unnecessary unless the implementation expands into APIs, automation or multi-agent customer support.

The existing growth plan already identifies WhatsApp setup, a manual catalogue, quick replies and PDP/contact CTAs as a workstream.

### 4A. Owner/business work

1. Obtain a dedicated WhatsApp Business number.
2. Complete the business profile:

   * business name,
   * logo,
   * description,
   * operating hours,
   * email,
   * website,
   * business address where appropriate.
3. Create a manual catalogue containing the best 10–20 fully verified products.
4. For each item include:

   * design number,
   * customer-facing name,
   * hero image,
   * price only when confirmed,
   * size/dimensions,
   * set contents,
   * site product link.
5. Create quick replies for:

   * availability,
   * dimensions,
   * set contents,
   * delivery,
   * payment,
   * returns,
   * care instructions.
6. Establish a realistic response SLA and an away message.

### 4B. Website implementation

Add a product-aware WhatsApp CTA that passes:

* product/design name,
* selected colour,
* selected size,
* current product URL,
* optional enquiry source.

Example intent:

> Hi Sunfabb, I’m interested in Bedspread Design 4195, Beige, King. Please confirm current availability, delivery and final price. Product: [URL]

Add the CTA to:

* PDP primary action area,
* sticky mobile action area,
* contact page,
* optionally the catalogue card secondary action.

Do not add an intrusive floating CTA everywhere until mobile overlap and accessibility are tested.

### 4C. Measurement

Track:

* `whatsapp_click`
* product ID
* variant ID
* page location
* campaign/referrer where available

Use unique prefilled text or campaign parameters for:

* organic Google,
* direct sharing,
* Instagram,
* Facebook,
* printed/QR material.

### Completion gate

* Every WhatsApp CTA reaches the real business number.
* PDP enquiries contain enough context to identify the exact product.
* Mobile and desktop flows are tested.
* The owner can answer common enquiries using verified quick replies.
* GA4 records the enquiry conversion.
* No placeholder number exists anywhere.

---

## Phase 5 — Catalogue MVP release validation

**Priority:** Final lead-generation launch gate
**Scope:** Audit and limited fixes rather than new feature work
**Model:** Sol Medium/Thinking High for the audit; Luna Medium for corrections.

### Release checks

1. Crawl all public routes.
2. Validate:

   * HTTP statuses,
   * canonical URLs,
   * sitemap entries,
   * robots directives,
   * metadata,
   * Open Graph images,
   * structured data.
3. Test the top 10 PDPs on:

   * Android Chrome,
   * iPhone Safari,
   * desktop Chrome.
4. Run accessibility and keyboard checks.
5. Run Lighthouse against uncached and cached pages.
6. Test poor-network behaviour.
7. Test catalogue filters with only valid production facets.
8. Test all footer/contact/WhatsApp links.
9. Confirm Google Search Console ownership and sitemap ingestion.
10. Submit only verified catalogue URLs for indexing.
11. Test real social sharing previews.
12. Conduct several human customer journeys:

    * Google → PDP → WhatsApp
    * shared link → PDP → WhatsApp
    * home → catalogue → variant → WhatsApp
    * contact → acknowledgement

### Lead-generation MVP definition of done

* Public routes are reliable.
* Business contact information is real.
* Product claims are verified.
* Demo products are absent.
* Trust pages are linked.
* WhatsApp conversion works.
* Analytics captures the conversion.
* Transactional UI is not publicly implied.
* The catalogue image pipeline can continue independently.

---

## Phase 6 — Transactional commerce completion

**Priority:** After the catalogue MVP is stable
**Model:** Sol High for architecture, tax/payment/shipping review and failure modelling; Luna High coding agent for implementation. Use separate sessions and PRs for each integration.

### Recommended order

#### 6A. Resend / transactional email

The drafted Phase 6.7 plan is ready once the account, domain, sender identity and API key are supplied.

Complete:

* email-domain verification,
* order confirmation,
* payment confirmation,
* dispatch notification,
* delivery/update notifications,
* failure logging,
* non-blocking email behaviour.

#### 6B. GST invoicing

Requires owner/accountant input:

* legal business name,
* GSTIN,
* registered address,
* state code,
* HSN assignment,
* tax rates,
* price-inclusivity decision,
* invoice sequence.

Do not have an agent invent these values. The existing GST plan is appropriately detailed and should be executed after the inputs are signed off.

#### 6C. Shiprocket

Requires:

* production account,
* API credentials,
* pickup location,
* product weights,
* shipping policy,
* free-shipping threshold,
* webhook security decision.

Implement shipment creation, tracking and status reconciliation only after weights and operational processes are verified.

#### 6D. Final go-live

Execute the existing Phase 6.10 plan:

* payment/refund webhook reconciliation,
* security sweep,
* production environment verification,
* order-to-shipment drill,
* refund drill,
* invoice drill,
* incident/runbook preparation,
* controlled enablement of transactional commerce.

Only then:

* expose Account,
* expose Cart,
* replace WhatsApp as the primary CTA with Add to Cart,
* enable checkout,
* advertise direct online purchase.

---

## Parallel Track C — Image catalogue pipeline

**Priority:** Continuous, but not a blocker for the lead-generation MVP
**Model:** Luna Low/Medium workers for deterministic preparation/generation; one Luna Medium or Sol Medium reviewer only for systemic fidelity failures. Owner remains the final QA authority.

### C1. Finish current 166-grid QA

1. Owner-review the nine complete 5/5 candidates.
2. Review R3C2’s accepted density-adjusted assets carefully.
3. Record an explicit owner QA decision per asset.
4. Do not import anything until commercial metadata is supplied.

### C2. Resolve the two parked candidates

For R1C3 and R2C1:

1. Preserve existing accepted 4/5 assets.
2. Attempt a different generation strategy rather than repeating the same prompt.
3. Consider:

   * larger or tiled source references,
   * explicit repeat-count conditioning,
   * image compositing,
   * controlled texture mapping,
   * re-photography where appropriate.
4. Set a retry budget.
5. Keep the candidate parked if fidelity cannot be achieved.

Do not weaken the canonical-set rules merely to mark them complete.

### C3. Commercial completion

For every approved candidate obtain:

* commercial design number/name,
* sellable variant size,
* material lookup,
* price,
* stock,
* publication approval.

The tracker confirms these values remain required for the classified grid.

### C4. Publish in small batches

Publish two to five verified designs per batch:

1. dry-run import,
2. owner review,
3. upload,
4. product creation,
5. live PDP inspection,
6. search/structured-data inspection,
7. tracker update.

Avoid combining image generation, metadata inference, upload and publication into one autonomous agent action.

### C5. Remaining source work

Proceed gradually with:

* unidentified individual designs,
* re-photography candidates,
* floral grids,
* packaged warehouse photos,
* plaid/stripe grids,
* positional splitting.

Keep Design 4429 blocked until an authorised alternative exists.

---

# 5. Model allocation summary

| Work type                                     | Recommended model setup                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| Repository-wide audit and prioritisation      | GPT-5.6 Sol High / strongest Thinking tier                 |
| Reliability, security, payment, GST, shipping | Sol High planner/reviewer + Luna High implementation agent |
| Normal full-stack feature PR                  | Luna Medium or High as one primary coding agent            |
| Documentation/status consolidation            | Luna Low or Medium                                         |
| Repetitive catalogue audit scripts            | Luna Medium                                                |
| Product-copy drafting from verified facts     | Luna Low or Medium                                         |
| Legal, tax and policy factual review          | Sol Medium, followed by human professional verification    |
| Image preparation/generation                  | Luna Low/Medium workers                                    |
| Image failure-pattern diagnosis               | Sol Medium                                                 |
| Launch audit and failure modelling            | Sol Medium/High                                            |
| Social captions and routine catalogue entries | Luna Low                                                   |

## Agent-count guidance

Do not use a large orchestrator swarm for this plan.

Use:

* one implementation agent per scoped phase,
* one reviewer for high-risk phases,
* parallel workers only for independent catalogue/image batches.

Multiple agents are useful when work is genuinely independent, such as:

* backend reliability investigation,
* storefront placeholder audit,
* catalogue-data report generation.

They are counterproductive when several agents concurrently change shared configuration, schema or checkout code.

---

# 6. Agent execution contract

Pass each phase to a fresh agent with this contract:

> Work only on the assigned Sunfabb phase. First read `docs/LAUNCH_STATUS.md`, `CATALOG_PROGRESS.md`, the relevant phase plan and the implementation paths involved. Verify the repository’s current state rather than assuming the plan is still accurate.
>
> Do not invent business, legal, tax, stock, price, material, dimension, set-content, shipping or contact information. Mark missing owner inputs as blockers.
>
> Before editing, produce:
>
> 1. current-state findings,
> 2. proposed file-level changes,
> 3. risks,
> 4. acceptance tests.
>
> Implement the smallest coherent change. Add or update automated tests. Run the relevant unit, integration and end-to-end checks. Update `docs/LAUNCH_STATUS.md` and any affected tracker in the same PR.
>
> Do not enable transactional commerce, upload image-pipeline assets, publish products or modify production data unless the assigned phase explicitly authorises it.
>
> End with:
>
> * files changed,
> * tests executed,
> * unresolved owner inputs,
> * production configuration required,
> * rollback instructions,
> * next recommended issue.

---

# 7. Ordered attention list

The correct execution order is:

1. **Fix catalogue/PDP production timeouts.**
2. **Remove public contact placeholders.**
3. **Put the storefront into an explicit lead-generation mode.**
4. **Deactivate all five demo products.**
5. **Audit the 41 production products for public-data truthfulness.**
6. **Remove internal product descriptions and unsupported claims.**
7. **Create the missing trust/policy pages and operational email delivery.**
8. **Launch the product-aware WhatsApp Business funnel.**
9. **Run the catalogue-MVP release audit.**
10. **Continue image generation and publication in parallel batches.**
11. **Finish Resend, GST, Shiprocket and final transactional go-live.**
12. **Then expand Instagram, Facebook, product feeds and paid acquisition.**

## What should not receive first attention

Do not prioritise these ahead of the items above:

* large-scale social posting,
* paid advertising,
* more visual animation,
* broad image generation volume,
* complex WhatsApp API automation,
* recommendation engines,
* customer reviews,
* loyalty features,
* additional payment methods,
* large storefront redesigns.

They will not compensate for unreliable PDPs, placeholder contact information or uncertain product facts.
