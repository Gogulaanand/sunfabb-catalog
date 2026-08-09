# Dependency audit exception

Updated 2026-08-09 during the Phase 6.10 security sweep.

## Current result

- Backend: `npm audit` reports **0 vulnerabilities**. Its CI job continues to
  block high and critical findings with `npm audit --audit-level=high`.
- Frontend before remediation: **5 high** vulnerable packages, including
  production-path `postcss@8.4.31` and `sharp@0.34.5` under `next@16.2.12`.
- Frontend after remediation: `npm audit` reports **2 high** vulnerable
  packages; `npm audit --omit=dev` reports **1 high**.

## Remediated now

Next and its aligned packages were updated from 16.2.12 to 16.3.0. Next 16.3.0
resolves `postcss@8.5.23` and `sharp@0.35.3`, removing both audit findings.

The Sharp advisory applies when processing untrusted images. This storefront’s
public Next image optimizer accepts URLs from configured remote hosts, so the
vulnerable decoder was treated as a reachable runtime risk rather than deferred.
The same-major Next update was isolated and verified with frontend lint,
TypeScript, 352 unit tests, and a production build.

## Temporarily accepted

- `nanoid@3.3.16` is transitive through PostCSS. Its advisory requires calling a
  custom generator with a zero size; the application does not import nanoid or
  expose such a call boundary. This remains the one production-closure high.
- `undici@7.28.0` is dev-only through jsdom and is absent from
  `npm audit --omit=dev`. It is not shipped in the production frontend.

Neither remaining advisory has a directly exploitable application path in the
current code, so this bounded security slice does not broaden into unrelated
transitive lockfile upgrades. The frontend CI job keeps the temporary
`critical` threshold so both findings remain visible on every run.

Expiry: **2026-08-16**. At or before expiry, rerun both frontend audits, apply
compatible patched transitive versions when available, and restore
`npm audit --audit-level=high` once the high count is zero. Do not use
`npm audit fix --force`.
