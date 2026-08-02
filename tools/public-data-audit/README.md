# Public-data audit

The Phase 2C audit is a read-only snapshot of the public catalogue. It validates the public API
payload at the boundary, derives the 41-design scope from
`tools/image-pipeline/CATALOG_PROGRESS.md`, fetches every public PDP, and writes a product-level
and variant-level Markdown report.

Run from the repository root:

```bash
node tools/public-data-audit/audit.mjs
node --test tools/public-data-audit/audit.test.mjs
```

Override the public API or output path when needed:

```bash
node tools/public-data-audit/audit.mjs \
  --api https://sunfabb-backend.onrender.com \
  --out docs/audits/PHASE2C_41_DESIGN_PUBLIC_DATA_AUDIT.md
```

The report does not write to the database, approve commercial facts, deactivate products, upload
images, or publish new designs. Public values that lack owner-approved evidence remain `blocked`;
empty fields remain `missing`.
