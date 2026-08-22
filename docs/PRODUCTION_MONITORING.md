# Production monitoring

The repository keeps process wake-up separate from database readiness and customer-route
monitoring:

- `Render Keep-Alive` (`.github/workflows/keep-alive.yml`) runs every ten minutes and probes only
  `GET /live`. This endpoint is process-only and does not query Prisma, so it can wake a sleeping
  Render service without making database availability part of the keep-alive signal.
- `Production Synthetic Checks` (`.github/workflows/production-synthetic-checks.yml`) runs hourly
  at minute 17 when activated and can also be started manually. It probes the customer-critical
  routes named by the production-readiness plan, plus the database-backed `GET /health` readiness
  endpoint:

- home;
- catalogue;
- two representative product-detail pages;
- contact;
- backend readiness (`/health`).

Scheduled synthetic checks are disabled by default. The job runs on a schedule only when the
repository Actions variable `PRODUCTION_SYNTHETICS_ENABLED` is exactly `true`; manual dispatch
continues to run regardless of that variable. Leave the variable unset while production
monitoring is paused or the database provider is quota-blocked. To activate scheduled checks,
set it under **Settings → Secrets and variables → Actions → Variables** and then verify a manual
run before relying on the hourly schedule.

Each route is sampled twice. A transport error or non-2xx response marks the workflow as failed.
Latency fails the workflow only when both samples exceed the route threshold, so a single Render
Free cold start remains visible as a warning without being misreported as sustained degradation.

Default thresholds are 25 seconds for storefront routes and 10 seconds for backend readiness. These
are deliberately below the storefront's 30-second backend request budget. Repository variables
`PRODUCTION_FRONTEND_URL` and `PRODUCTION_BACKEND_URL` can override the default public URLs without
changing the workflow. The monitor no longer depends on a secret and never treats missing
configuration or curl failure as success.

## Run locally

```bash
bash tools/production-monitor.sh
```

The script accepts these optional environment variables:

- `FRONTEND_URL` and `BACKEND_URL`;
- `CHECK_ATTEMPTS`;
- `FRONTEND_SLOW_MS` and `BACKEND_SLOW_MS`;
- `CURL_MAX_TIME_SECONDS`.

## Operational limits

GitHub scheduled workflows are best-effort and can run late. A green workflow proves only that its
recorded probes passed; it does not prove continuous availability or that Render Free stayed warm
between runs. GitHub's normal Actions notifications provide a basic failure signal, but they are not
an on-call alerting system.

The production-readiness plan recommends an always-on backend before public distribution. On
2026-08-02 the owner explicitly accepted the remaining Render Free cold-start risk and chose to keep
the service on the free tier for the catalogue MVP. HeyOnCall therefore provides only background
cold-start mitigation; it is not treated as proof of always-on hosting.

## External monitor

HeyOnCall was configured on 2026-08-02 with all three free-tier outbound probes pointed directly at
the Render backend:

- `Backend health` targets `https://sunfabb-backend.onrender.com/health`;
- `Backend categories keep-alive` targets `https://sunfabb-backend.onrender.com/categories`;
- `Backend products keep-alive` targets
  `https://sunfabb-backend.onrender.com/products?limit=1`.

The probes use `HEAD`, run independently of GitHub Actions, and alert by email after five minutes of
continuous failure. Their first production probes all returned HTTP 200. This provider-managed
configuration is separate from the repository workflows; when it is next edited, use `/live` for
keep-alive and reserve `/health` for database readiness.

The `Sunfabb production` service is assigned to the `Sunfabb primary` rotation, and email
notifications are connected. The owner chose email-only background monitoring for now and waived
mobile critical-alert setup.
