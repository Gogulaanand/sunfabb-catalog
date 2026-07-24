# Prompt repository - phase & wave kickoff prompts

Copy-paste one of these into a fresh agent session (Sonnet or any executor) to start a phase or wave.
Each prompt points at the self-contained plan doc, tells the agent what to read (and what not to), and marks the `<placeholders>` you fill in with your inputs at kickoff.
Replace every `<...>` before pasting; delete any optional line that does not apply.

General rules baked into every prompt: the agent reads `CLAUDE.md` first (hard rules), works on a fresh feature branch off latest `main`, ships tests with every module, and opens a PR when the phase is feature-complete with CI green.

---

## Phase 6.7 - Email (Resend)

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/phase-6.7-email-resend.md in full - it is the complete, self-contained plan for this phase.
Read the source files it cites before writing code; skip broad codebase scanning.

Execute the phase end-to-end on a new branch feature/6.7-resend-email off latest main.

My inputs for this phase:
- RESEND_API_KEY: already added to backend/.env locally and to the Render dashboard (never commit it).
- EMAIL_FROM: <e.g. "Sunfabb <orders@sunfabb.com>">
- CONTACT_NOTIFY_EMAIL: <email>
- Domain verification status in Resend: <verified / pending - if pending, build everything and I will verify before merge>

Deliver every item in the plan's Backend tasks, Tests, and Env sections.
Do not change any EmailService caller signatures except where the plan says so.
Run the plan's Verification commands and show me the results, then open a PR against main using the plan's acceptance criteria as the PR checklist.
```

## Phase 6.5 - GST invoicing

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/phase-6.5-gst-invoicing.md in full - it is the complete, self-contained plan for this phase.
Read the source files it cites before writing code; skip broad codebase scanning.

Execute the phase end-to-end on a new branch feature/6.5-gst-invoicing off latest main.

My accountant-confirmed inputs (plan §2):
- GSTIN: <value>
- Seller legal name + registered address: <value>
- Seller state code: <2-digit code, e.g. 33>
- HSN code per product: <list product → HSN, or "in the attached table">
- Rate per HSN incl. slab rule: <e.g. HSN 6304: 5% below ₹1000/piece, 12% at/above; confirm ≤ vs < boundary>
- Prices are GST-inclusive: <yes/no - plan default is yes>
- Invoice series prefix: <default SF>
- Invoice layout: plan §8 field list is approved / amended as follows: <changes or "approved">

Phase 6.7 (email) is <merged / not merged> - follow the plan's §7 step 8 accordingly.
Seed the GstRate table from my rates above.
Run the plan's Verification commands plus the tax-math unit suite and show me the results, then open a PR against main using the plan's acceptance criteria as the PR checklist.
```

## Phase 6.6 - Shipping (Shiprocket)

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/phase-6.6-shipping-shiprocket.md in full - it is the complete, self-contained plan for this phase.
Read the source files it cites before writing code; skip broad codebase scanning.

Execute the phase end-to-end on a new branch feature/6.6-shiprocket-shipping off latest main.

My inputs for this phase (plan §2):
- Shiprocket API user credentials: added to backend/.env locally and Render (never commit).
- Pickup location name (as configured in the Shiprocket dashboard): <value>
- Flat shipping rate: <₹ amount> ; free-shipping threshold: <₹ amount>
- Default package dimensions (L×W×H cm): <value>
- SHIPROCKET_WEBHOOK_TOKEN: generated and set in both Shiprocket settings and Render.
- Variant weights: <I have filled weight_grams via admin / I will provide a SKU → grams table for you to apply>

Phase 6.5 (GST) is <merged / not merged> and 6.7 (email) is <merged / not merged> - follow the plan's §6 cross-phase notes accordingly.
The serviceability check (plan §7 step 6) is a stretch goal - build it last, cut it if the phase runs long.
Run the plan's Verification commands including the Playwright job with the Shiprocket stub and show me the results, then open a PR against main using the plan's acceptance criteria as the PR checklist.
```

## Phase 6.10 - Go-live

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/phase-6.10-go-live.md in full - it is the complete, self-contained plan for this phase.
Prerequisite check before anything else: confirm 6.5, 6.6, and 6.7 are merged; stop and tell me if not.

Part 1 (code): execute plan §3 on a new branch feature/6.10-go-live off latest main - refund webhook sync (refund.created / refund.processed), the security verification sweep, and the optional checkout kill switch <build it / skip it>.
Open that PR first.

Part 2 (cutover): walk me through plan §4 step by step.
For each step tell me exactly what I must do (owner steps) and do everything marked Claude yourself.
My status going in:
- Razorpay live KYC: <approved / pending>
- Shiprocket live KYC: <approved / pending>
- Trust pages: <live / not yet - if not, stop after Part 1 and tell me>
- Render Starter upgrade: <done / do it now>
Record evidence for every checklist step in the tracking issue as the plan requires, and do not flip live keys until the Playwright suite is green.
```

## Growth Wave 1 - Trust pages & content

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/growth-wave-1-trust-and-content.md in full - it is the complete, self-contained plan for this wave.
Read the source files it cites before writing code; skip broad codebase scanning.

Execute the wave on a new branch feature/growth-wave1-trust-content off latest main.

My business inputs (plan §2):
- Legal entity name + registered address: <value>
- GSTIN: <value> ; display in footer: <yes/no>
- Contact email: <value> ; phone: <value>
- Return window and conditions: <e.g. 7 days, unused, tags on, customer pays return shipping>
- Shipping coverage + timelines: <e.g. all India, 3-7 business days>
- Physical presence for Google Business Profile: <yes → Branch A / no → Branch B>
- Social handles registered: <list which of IG/FB/Pinterest/YouTube exist>
- Social approval mode: <monthly review / full auto-post>

Sequence: draft the brand-voice one-pager first and show me for approval, then trust pages + guides + FAQ schema, then the catalog copy batch (show me the full table before applying anything via the admin API).
Run the plan's Verification commands and show me the results, then open a PR against main using the plan's acceptance criteria as the PR checklist.
```

## Growth Wave 2 - Buyable everywhere

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/growth-wave-2-buyable-everywhere.md in full - it is the complete, self-contained plan for this wave.
Prerequisite check before anything else: confirm Phase 6.10 go-live is complete and Wave 1 trust pages are live; stop and tell me if not.

Execute the code workstreams on two branches off latest main as the plan specifies:
- feature/growth-wave2-feeds: Merchant XML + Meta CSV feeds and the GA4 e-commerce event layer.
- feature/growth-wave2-retention: newsletter (double opt-in), post-purchase flows, abandoned-cart email, weekly report job.

My inputs for this wave (plan §2):
- Merchant Center account: <created / walk me through it with your checklist>
- Meta Commerce Manager + Pinterest: <created / walk me through it>
- WhatsApp Business number: <value / pending>
- ONDC: <chosen SNP / skip for now>
- Search Console + GA4 API service-account credentials for the weekly report: <added as GitHub secrets / help me create them>

Feeds ship first (they gate everything owner-side).
After the feeds PR merges, give me the Merchant Center click-by-click checklist.
Verify the GA4 purchase event in DebugView on a test-mode purchase and show me the evidence - that verification is the Wave 3 gate.
Run the plan's Verification commands per branch and open each PR with the plan's acceptance criteria as the checklist.
```

## Growth Wave 3 - Paid amplification

```
Read CLAUDE.md first and follow its hard rules.
Then read docs/plans/growth-wave-3-paid-amplification.md in full - it is the complete, self-contained plan for this wave.
Gate check before anything else (plan header): Wave 2 live, GA4 purchase events verified, Merchant Center variants approved, trust pages live, and some organic conversions exist.
Show me the evidence for each gate; stop if any fails.

Code part: execute plan §5.1 on a new branch feature/growth-wave3-pixel off latest main - the dual-sink analytics helper (GA4 + Meta Pixel from the same call sites), consent-layer check, and the spend/ROAS line in the weekly report.
NEXT_PUBLIC_META_PIXEL_ID: <value - I have created the Pixel in Business Suite>.

Owner-led part: prepare the PMax campaign pack (plan §5.2) and the Meta retargeting pack (plan §5.3) for me to execute in the ad dashboards.
My budget inputs:
- Monthly ceiling: <₹ amount>
- Kill-switch rule: <accept the plan default (pause under 1x ROAS after 14 days) / my rule>
- Marketplace hero-SKU test: <yes, these SKUs: <list> / defer>

Do not propose cold prospecting until retargeting holds ≥2.5x ROAS for a month, per the plan.
Run the plan's Verification commands, show me Meta Events Manager test-event evidence, then open the PR with the plan's acceptance criteria as the checklist.
```

---

## Maintenance note

When a plan doc changes materially (scope, branch name, inputs), update its prompt here in the same PR.
When a phase/wave ships, mark its prompt with a `(done - PR #N)` suffix on the heading rather than deleting it, so the history of how each phase was kicked off stays visible.
