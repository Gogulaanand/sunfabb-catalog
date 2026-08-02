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
continuous failure. Their first production probes all returned HTTP 200. This backend-only setup
replaced the original storefront and contact probes after the one-minute catalogue `HEAD` probe was
shown to invoke full server rendering and generate synthetic timeout logs.

The `Sunfabb production` service is assigned to the `Sunfabb primary` rotation, and email
notifications are connected. The owner chose email-only background monitoring for now and waived
mobile critical-alert setup.
