# Phase 5 owner unblock follow-up — 2026-08-10

## Scope and evidence boundary

- This is the bounded follow-up for item 2 of `docs/OWNER_UNBLOCK_SEQUENCE.md`.
- No changes were made to Search Console, GA4 configuration, social accounts, WhatsApp, or
  deployment settings.
- No contact-form submission, WhatsApp message, social post, or other message was sent.
- The canonical production target was `https://sunfabb.com`.
- Observations below distinguish deployed proof, authenticated-console proof, browser-side
  observations, and blocked physical-device/platform evidence.

## Main, PR #81, and deployment

- Remote `main` readback at the start of the run: `8bf36c6a17f3d7385ea4fd1d45aab3d3cdf32fb2`.
- The current checkout is based on that commit and its history contains #81's merged accessibility
  correction commit `78b44a5`.
- GitHub PR #81 is `closed`, `merged: true`, merged at `2026-08-09T13:48:19Z`; its five checks
  (`Frontend`, `Backend`, `Production monitor script`, `Playwright E2E`, and `Vercel Preview Comments`)
  all reported `completed / success`.
- Read-only canonical probes returned HTTP 200 for `/`, `/catalog`, and
  `/catalog/bedspread-design-4195`.
- The live interactive DOM exposed the exact #81 corrections: footer muted details using
  `text-on-surface-variant`, catalogue filter headings at `h2`, a `Sort by`-named combobox, and
  the PDP selected-colour text plus colour-selection buttons. This confirms #81's correction is
  present on the canonical surface.

## Targeted Lighthouse rerun

Tool and environment:

- Lighthouse `13.4.1`, invoked with `/opt/homebrew/bin/node` `v24.17.0`.
- Google Chrome `149.0.7827.156`.
- Each report used `--only-categories=accessibility`, `--preset=desktop`, a separate headless
  Chrome profile, and the canonical URL below.
- Raw JSON reports are retained under
  `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/`.

Command pattern used:

```bash
/opt/homebrew/bin/node \
  /Users/gogulaanand/.npm/_npx/5390d7d89c0de19d/node_modules/lighthouse/cli/index.js \
  <canonical-url> \
  --only-categories=accessibility \
  --output=json \
  --output-path=docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/<name>.json \
  --quiet \
  --chrome-flags='--headless=new --no-sandbox --user-data-dir=<separate-profile>' \
  --preset=desktop
```

| Target | Lighthouse fetch time (UTC) | Accessibility | Target audits | Result |
|---|---|---:|---|---|
| `https://sunfabb.com/` | `2026-08-10T02:59:55.672Z` | 100 | `color-contrast=1` | Pass; the footer contrast finding is closed on production |
| `https://sunfabb.com/catalog` | `2026-08-10T02:57:25.205Z` | 100 | `color-contrast=1`, `heading-order=1`, `select-name=1` | Pass; heading order and desktop sort name are closed |
| `https://sunfabb.com/catalog/bedspread-design-4195` | `2026-08-10T02:57:23.104Z` | 100 | `color-contrast=1`, `heading-order=1`, `label=notApplicable` for custom controls | Pass; the live DOM exposes `Color — Beige` and `Select color Beige` with the selected state |

Lighthouse also reported one separate deterministic issue on all three pages:
`label-content-name-mismatch=0` for the shared map link because its visible text was `Find us on
Maps` while its `aria-label` was different. The targeted #81 audits pass; this additional issue is
fixed locally in the focused follow-up change below, but the fix is not deployed yet.

Focused local validation for that follow-up:

```bash
cd frontend
npm ci --ignore-scripts --no-audit --no-fund   # disposable clean-worktree setup
npm test -- components/storefront/footer.test.tsx  # 1 file / 5 tests passed
npm run lint -- components/storefront/footer.tsx components/storefront/footer.test.tsx  # passed
npx tsc --noEmit  # passed
```

## Search Console — verified

Authenticated Google Search Console observations:

- Ownership settings observed at `2026-08-10T03:05:32.135Z`: property
  `https://sunfabb.com/` explicitly displayed **You are a verified owner**.
- Sitemap page observed at `2026-08-10T03:05:24.273Z`: `/sitemap.xml` was already submitted,
  submitted `Jul 17, 2026`, last read `Jul 20, 2026`, status **Success**, `16` discovered pages,
  and `0` discovered videos.
- No Search Console mutation was needed or made.

## GA4 Realtime — event delivery remains blocked

- Authenticated GA4 property: Sunfabb; Realtime observation at `2026-08-10T03:05:46.046Z`.
- Realtime showed `4` active users in the last 30 minutes and `0` in the last 5 minutes.
- Standard activity was present: `first_visit=4`, `page_view=4`, `session_start=4`, `view_item=1`,
  and `view_item_list=1`.
- Two controlled, read-only CTA clicks were exercised during this run (one product-page enquiry
  link and one primary contact-page WhatsApp link). Neither `whatsapp_click` nor a contact-form
  success event appeared in Realtime. The links opened WhatsApp destinations without sending a
  message.
- Result: **BLOCKED for custom conversion delivery evidence**. GA4 access and standard event
  receipt are verified; the requested custom event observation is not.

## Real social-platform previews

LinkedIn Post Inspector was used at
`https://www.linkedin.com/post-inspector/inspect/` for all three canonical URLs. Each showed a
rendered preview, a 200-success fetch, and canonical metadata:

- Home: preview rendered; warning that the description is under 100 characters.
- Catalogue: preview rendered; same description-length warning.
- PDP: preview rendered without that warning.

Screenshots were captured at `2026-08-10T08:33:08+0530` (home), `08:33:21+0530` (catalogue), and
`08:33:24+0530` (PDP):

- `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/linkedin-home.png`
- `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/linkedin-catalog.png`
- `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/linkedin-pdp.png`

Meta Sharing Debugger was reachable, but its visible state was **Log into Facebook to use this
tool**. No Facebook account access was available, so Meta preview evidence remains blocked.

## Browser and device journeys

- Desktop Chrome authenticated-browser journey passed without emulation: home → catalogue → PDP.
  The catalogue rendered `All Products`, exposed exactly one `Sort by`-named combobox, opened
  `/catalog/bedspread-design-4195`, and rendered `Bedspread Design 4195` with selected-colour text.
- No physical Android Chrome or iPhone Safari device session was available. Emulation was not used.
  Those two device gates remain **BLOCKED**.

## Verified / failed / blocked matrix

| Gate | State | Evidence |
|---|---|---|
| PR #81 merged on current main | Verified | Remote `main` `8bf36c6`; GitHub #81 merged and five checks successful |
| #81 deployed to canonical production | Verified | Canonical 200 probes and live DOM markers |
| Targeted footer contrast | Verified | Lighthouse accessibility 100; `color-contrast=1` |
| Catalogue headings and desktop sort name | Verified | `heading-order=1`, `select-name=1` |
| PDP colour-label association | Verified | Custom-control DOM readback; no targeted Lighthouse failure |
| Additional shared map-link name | Failed on current production / fixed locally | Production still has the mismatched aria label; narrow source/test fix is pending deployment |
| Search Console ownership and sitemap | Verified | Verified owner; submitted sitemap Success |
| GA4 custom event delivery | Blocked | Standard events present; `whatsapp_click` not observed after controlled clicks |
| LinkedIn rendered previews | Verified | Three real Post Inspector previews and screenshots |
| Meta rendered previews | Blocked | Facebook login required |
| Desktop Chrome journey | Verified | Real authenticated desktop browser journey passed |
| Android Chrome / iPhone Safari journeys | Blocked | No physical devices available; no emulation substituted |

## Exact artifact locations

- Evidence: `docs/evidence/2026-08-10-phase5-owner-unblock-2.md`
- Lighthouse JSON: `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/{home-footer.json,catalog-filters.json,pdp-colour.json}`
- Pre-fix Lighthouse JSON retained for comparison:
  `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/home-footer-before-map-label-fix.json`
- LinkedIn screenshots: `docs/evidence/artifacts/2026-08-10-phase5-owner-unblock-2/linkedin-{home,catalog,pdp}.png`

## Minimal owner inputs, ordered by effort

1. Merge/deploy the narrow map-link accessibility follow-up, then rerun only the home footer
   audit against `https://sunfabb.com/`.
2. Use the owner-controlled GA4 Tag Assistant/DebugView or Realtime session to observe one
   `whatsapp_click` and the approved contact event, then provide the event names and timestamp.
3. Sign in to Meta Sharing Debugger and rerun the three URLs if Meta coverage is required.
4. Run the priority journey on one real Android Chrome device and one real iPhone Safari device.
