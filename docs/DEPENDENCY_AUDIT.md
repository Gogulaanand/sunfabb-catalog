# Dependency audit exception

Updated 2026-08-02 as part of the Phase 1C dependency remediation.

The backend clean install is at zero advisories, so its CI job blocks high and
critical findings with `npm audit --audit-level=high`.

The frontend clean install has zero critical findings and three high findings
reported through `next@16.2.12`:

- `next` bundles `postcss@8.4.31`, which is below the current advisory fix range.
- `next` resolves `sharp@0.34.5`, which is below the current `0.35.x` advisory fix.

The current npm audit metadata offers no semver-compatible Next.js release that
updates either nested dependency. Its only automated fix is a forced downgrade
to `next@9.3.3`, which would break the application’s Next 16 contract. The
frontend CI job therefore uses the temporary `critical` threshold rather than
silently accepting a high threshold. The remaining findings are visible in
every CI audit run and must be re-evaluated when a patched Next 16 release is
published.

Expiry: **2026-08-16**. At or before expiry, rerun `npm audit --json` in
`frontend/`, update Next within the supported major when a patched release is
available, and restore `npm audit --audit-level=high` once the high count is
zero. Do not use `npm audit fix --force`.
