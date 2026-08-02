# Production monitoring

The `Production Synthetic Checks` GitHub Actions workflow runs every ten minutes and can also be
started manually. It probes the customer-critical routes named by the production-readiness plan:

- home;
- catalogue;
- two representative product-detail pages;
- contact;
- backend health.

Each route is sampled twice. A transport error or non-2xx response marks the workflow as failed.
Latency fails the workflow only when both samples exceed the route threshold, so a single Render
Free cold start remains visible as a warning without being misreported as sustained degradation.

Default thresholds are 25 seconds for storefront routes and 10 seconds for backend health. These
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

Before public distribution, move the backend to an always-on production instance as required by
`Sunfabb-Production-Ready-MVP-Plan.md`. An external monitor such as HeyOnCall can provide independent
one-minute probes and mobile alerts, but it is monitoring and temporary cold-start mitigation—not a
replacement for always-on hosting.

## External monitor

HeyOnCall was configured on 2026-08-02 with all three free-tier outbound probes:

- `Backend health` targets `https://sunfabb-backend.onrender.com/health`;
- `Storefront catalog` targets `https://sunfabb.com/catalog`;
- `Contact page` targets `https://sunfabb.com/contact`.

The probes use `HEAD`, run independently of GitHub Actions, and alert after five minutes of
continuous failure. Their first production probes all returned HTTP 200. The backend probe also
provides one-minute inbound traffic as temporary Render Free cold-start mitigation.

The `Sunfabb production` service is assigned to the `Sunfabb primary` rotation, and immediate email
notifications are connected. Email delivery is a fallback channel: install and sign in to the
HeyOnCall mobile app to enable the recommended critical push notifications.
