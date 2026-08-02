import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuditReport,
  extractDesignNumber,
  parseDemoIdentifiers,
  parseProductionDesignNumbers,
  parsePublicProduct,
  statusForClaim,
} from "./audit.mjs";

test("reads the canonical numbered-design and demo lists without inventing rows", () => {
  const tracker = `41 numbered designs are published; the numbered designs are:\n\n\`8569, 4219\`.\n\nFive non-production demos remain active:\n\n\`UNKNOWN-PLAID1, UNKNOWN-STRIPE1\`.`;
  assert.deepEqual(parseProductionDesignNumbers(tracker), ["8569", "4219"]);
  assert.deepEqual(parseDemoIdentifiers(tracker), ["UNKNOWN-PLAID1", "UNKNOWN-STRIPE1"]);
});

test("extracts only the numbered product naming convention", () => {
  assert.equal(extractDesignNumber("Bedspread Design 4195"), "4195");
  assert.equal(extractDesignNumber("Heritage Linen Bedspread"), null);
});

test("uses missing for absent values and blocked for unverified public claims", () => {
  assert.equal(statusForClaim(null), "missing");
  assert.equal(statusForClaim("Cotton"), "blocked");
  assert.equal(statusForClaim("GALLERY=4", { verified: true }), "verified");
  assert.equal(statusForClaim("anything", { notApplicable: true }), "not applicable");
});

test("validates the public product boundary before auditing it", () => {
  const product = parsePublicProduct({
    id: "product-1",
    name: "Bedspread Design 4195",
    slug: "bedspread-design-4195",
    description: "Printed cotton; refine in admin catalog.",
    care_instructions: null,
    category: { name: "Bedspreads", slug: "bedspreads" },
    variants: [
      {
        id: "variant-1",
        size: "King",
        price: 149900,
        stock_quantity: 10,
        sku: "BEDSPREAD-4195-BEIGE",
        material: { name: "Cotton" },
        color: { name: "Beige" },
      },
    ],
    images: [
      {
        id: "image-1",
        url: "https://cdn.example.test/hero.png",
        alt_text: "Bedspread design 4195 in beige",
        is_primary: true,
        sort_order: 0,
        variant_id: "variant-1",
        image_role: "GALLERY",
      },
    ],
  });
  assert.equal(product.variants[0].price, 149900);
  assert.throws(
    () => parsePublicProduct({ ...product, variants: [{ ...product.variants[0], price: "149900" }] }),
    /price must be a finite number/,
  );
});

test("reports a live non-numbered product separately from the 41-design set", () => {
  const report = buildAuditReport({
    observedAt: "2026-08-02T00:00:00.000Z",
    apiBase: "https://example.test",
    trackerPath: "tools/image-pipeline/CATALOG_PROGRESS.md",
    expectedDesignNumbers: ["4195"],
    expectedDemoIdentifiers: ["UNKNOWN-PLAID1"],
    reportedTotal: 2,
    publicProducts: [
      {
        id: "p1",
        name: "Bedspread Design 4195",
        slug: "bedspread-design-4195",
        description: "Printed cotton; refine in admin catalog.",
        care_instructions: null,
        category: { name: "Bedspreads", slug: "bedspreads" },
        variants: [{ id: "v1", size: "King", price: 149900, stock_quantity: 10, sku: "S1", material: { name: "Cotton" }, color: { name: "Beige" } }],
      images: [{ id: "i1", url: "https://cdn.example.test/hero.png", alt_text: "hero", is_primary: true, sort_order: 0, variant_id: "v1", image_role: "GALLERY" }],
      },
      {
        id: "p2",
        name: "Heritage Linen Bedspread",
        slug: "heritage-linen-bedspread",
        description: "Demo",
        care_instructions: null,
        category: { name: "Bedspreads", slug: "bedspreads" },
        variants: [],
        images: [],
      },
    ],
  });
  assert.match(report, /Heritage Linen Bedspread/);
  assert.match(report, /merged Phase 2B deactivation evidence is incomplete/);
  assert.match(report, /Exact dimensions/);
});
