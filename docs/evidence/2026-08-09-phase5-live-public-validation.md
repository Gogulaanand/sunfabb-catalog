# Phase 5 live public validation — 2026-08-09

## Scope and evidence boundary

- Source baseline: `origin/main` at `79ab778`.
- Canonical deployment tested: `https://sunfabb.com`.
- Crawl window: 2026-08-09 13:02:38–13:03:00 UTC (18:32:38–18:33:00 IST).
- Lighthouse window: 2026-08-09 13:05:06–13:08:38 UTC (18:35:06–18:38:38 IST).
- This was a read-only public validation. No deployment, Search Console, analytics, social,
  WhatsApp, or contact configuration was changed. Contact values are intentionally omitted from
  this artifact.
- The completed Phase 5 local audit was not repeated. The only local checks below verify the narrow
  accessibility correction prompted by live Lighthouse evidence.

## Commands and method

Initial deployment and sitemap probes:

```bash
curl --silent --show-error --location --max-time 30 \
  --output /dev/null --write-out '<status/timing fields>' https://sunfabb.com/
curl --silent --show-error --location --max-time 30 \
  --output /private/tmp/sunfabb-sitemap.xml https://sunfabb.com/sitemap.xml
```

A temporary Python 3.9 standard-library crawler (removed after the run) fetched `robots.txt`,
parsed the sitemap, fetched every listed URL with six bounded workers, parsed HTML metadata and
anchors, recursively traversed every JSON-LD value, fetched unique internal targets, and fetched
unique OG/Twitter image assets. It emitted aggregate results only; it did not follow external
contact links.

Lighthouse 13.4.1 ran under bundled Node 24.14.0 and headless Google Chrome 149.0.7827.156. Each
route/form-factor pair used a separate Chrome profile. The first run used Lighthouse's normal
storage reset; the second reused the same profile with `--disable-storage-reset`:

```bash
CHROME_PATH='<Google Chrome binary>' <node-24> <npx-cli> --yes lighthouse@13.4.1 <url> \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=<temporary-report> --quiet \
  --chrome-flags='--headless=new --no-sandbox --user-data-dir=<pair-profile>' \
  [--form-factor=mobile|--preset=desktop] [--disable-storage-reset]
```

## Live crawl result: PASS

- Sitemap: 200 XML; 59 listed and 59 unique canonical-origin URLs. Composition was 41 PDPs,
  four category-query URLs, four guide-detail URLs, and ten other public routes. All required
  static routes were present; no private or off-origin URL was listed.
- Routes: 59/59 returned HTML 200 without unexpected redirects. Every route had a matching
  canonical, title, description, OG title/description/image, Twitter card/title/description/image,
  no public `noindex`, valid JSON-LD, and at least one recursively discovered JSON-LD type.
  All 41 PDPs included `Product`; catalogue routes included `BreadcrumbList`.
- Robots: 200 and contained the expected global allow, private-route disallows, and canonical
  sitemap directive.
- Links: 89 unique rendered `href` values observed; 44 unique same-origin targets fetched and all
  returned 200. External HTTPS/contact links were syntax-checked but not followed. There were no
  malformed links and no public links to account, cart, checkout, admin, or API routes.
- Release posture: zero occurrences of the five known demo identifiers; zero rendered commerce
  controls with Add to Cart, Buy Now, Checkout, Place Order, Pay Now, or equivalent labels; zero
  transactional form actions.
- Social-preview assets: 42/42 unique OG/Twitter assets returned image 200 with non-empty bodies.
  The 41 product preview assets were 1200×630 JPEGs; the shared fallback was a 1672×941 PNG.
- GA4 public presence: all 59 documents exposed one consistent measurement configuration. Each of
  the 12 Lighthouse browser sessions loaded one `gtag.js` resource. This proves tag/config presence
  only, not DebugView receipt, event correctness, attribution, or property ownership.
- Response observation: route fetches ranged from 0.415s to 5.274s (mean 0.932s under six-worker
  crawl concurrency). Five responses declared private/no-store cache control; 54 declared public
  revalidation.

## Deployed Lighthouse observations

Scores are `performance / accessibility / best practices / SEO`; timings are milliseconds. The
Phase 5 contract defines no score threshold, so performance numbers are observations rather than a
new pass/fail policy. Cold/warm transfer differences confirm that the paired cache states were
materially distinct.

| Route | Form | Cache | Scores | FCP | LCP | TBT | CLS | Transfer bytes | Zero-transfer responses |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | mobile | uncached | 71 / 96 / 100 / 100 | 3241 | 5284 | 40 | 0 | 697743 | 0 |
| `/` | mobile | cached | 100 / 96 / 100 / 100 | 872 | 1074 | 46 | 0 | 9443 | 24 |
| `/` | desktop | uncached | 96 / 96 / 100 / 100 | 712 | 1301 | 0 | 0 | 884948 | 0 |
| `/` | desktop | cached | 100 / 96 / 100 / 100 | 272 | 284 | 0 | 0 | 7238 | 27 |
| `/catalog` | mobile | uncached | 74 / 96 / 100 / 100 | 2791 | 5401 | 19 | 0 | 1023277 | 0 |
| `/catalog` | mobile | cached | 99 / 96 / 100 / 100 | 961 | 1948 | 35 | 0 | 38156 | 31 |
| `/catalog` | desktop | uncached | 94 / 90 / 100 / 100 | 480 | 1623 | 0 | 0 | 1405462 | 0 |
| `/catalog` | desktop | cached | 100 / 90 / 100 / 100 | 289 | 575 | 0 | 0 | 87016 | 45 |
| representative live PDP | mobile | uncached | 70 / 97 / 100 / 100 | 3015 | 5205 | 162 | 0 | 750294 | 0 |
| representative live PDP | mobile | cached | 100 / 97 / 100 / 100 | 859 | 990 | 31 | 0 | 9074 | 31 |
| representative live PDP | desktop | uncached | 100 / 97 / 100 / 100 | 359 | 643 | 0 | 0 | 747773 | 0 |
| representative live PDP | desktop | cached | 100 / 97 / 100 / 100 | 284 | 284 | 0 | 0 | 10729 | 32 |

## Deterministic defect and narrow correction

Live Lighthouse consistently identified insufficient contrast on two muted footer details and the
selected-colour suffix on PDPs. Desktop catalogue also had skipped filter heading levels and an
unnamed sort select. The branch changes only those exact selectors:

- use the existing `text-on-surface-variant` token for the three low-contrast cases; its computed
  contrast is 8.49:1 on the footer surface and 8.93:1 on the PDP surface, above the required 4.5:1;
- change filter section headings from `h3` to `h2` under the page `h1`;
- give the sort combobox an accessible name;
- add focused component assertions for all three corrections.

Verification at 2026-08-09 18:42 IST:

```bash
npm test -- <three affected test files>  # 3 files / 13 tests passed
npm run lint -- <six affected TSX/test files>  # passed
npx tsc --noEmit  # passed
npm test  # 50 files / 354 tests passed
```

The public deployment still contains the pre-fix markup until this branch is reviewed, merged, and
deployed. Therefore the live accessibility findings remain open on production; the local tests and
computed ratios verify the correction, not its deployment.

## Remaining BLOCKED/manual gates

- **BLOCKED — deploy verification:** merge and deploy this narrow correction, then rerun the
  affected Lighthouse accessibility audits against the canonical URL.
- **MANUAL/owner — Search Console:** confirm property ownership, sitemap ingestion, indexing state,
  and any URL submissions in the owner-controlled account. No Search Console mutation was made.
- **MANUAL/owner — GA4:** verify deployed conversions in Realtime/DebugView and confirm property
  access and event semantics. Public tag presence is not event-delivery evidence.
- **MANUAL/platform — real social previews:** exercise actual share-card rendering/caches on the
  intended social/messaging platforms. Asset reachability and dimensions do not prove platform
  rendering.
- **MANUAL/device — customer journeys:** run the top PDP and end-to-end journeys on real Android
  Chrome, iPhone Safari, and desktop-human sessions.
- **BLOCKED on Phase 4/owner — WhatsApp:** provide the real owner-controlled WhatsApp Business
  profile, catalogue, approved quick replies, and two-way human journey evidence. Public link syntax
  was checked; business behavior was not exercised or claimed.

## Environment limits

- The default sandbox could not resolve the public host; the authorized read-only network path
  succeeded and produced all live results above.
- No real mobile device, owner Search Console/GA4 console, social platform cache/debugger, or
  WhatsApp Business session was available or used.
