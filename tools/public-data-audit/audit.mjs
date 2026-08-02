import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_API_BASE = "https://sunfabb-backend.onrender.com";
export const DEFAULT_TRACKER_PATH = path.resolve(
  import.meta.dirname,
  "../image-pipeline/CATALOG_PROGRESS.md",
);
export const DEFAULT_REPORT_PATH = path.resolve(
  import.meta.dirname,
  "../../docs/audits/PHASE2C_41_DESIGN_PUBLIC_DATA_AUDIT.md",
);

export const AUDIT_STATUSES = [
  "verified",
  "missing",
  "blocked",
  "not applicable",
];

const PUBLIC_TIMEOUT_MS = 45_000;
const INTERNAL_COPY_PATTERN = /admin catalog|admin catalog/i;

function fail(message) {
  throw new Error(`public-data-audit: ${message}`);
}

function expectObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function expectString(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return value;
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string${nullable ? " or null" : ""}`);
  }
  return value;
}

function expectNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function expectBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be a boolean`);
  return value;
}

function expectArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function parseVariant(raw, productLabel, index) {
  const variant = expectObject(raw, `${productLabel}.variants[${index}]`);
  const material = expectObject(
    variant.material,
    `${productLabel}.variants[${index}].material`,
  );
  const color = expectObject(
    variant.color,
    `${productLabel}.variants[${index}].color`,
  );

  return {
    id: expectString(variant.id, `${productLabel}.variants[${index}].id`),
    size: expectString(variant.size, `${productLabel}.variants[${index}].size`),
    price: expectNumber(
      variant.price,
      `${productLabel}.variants[${index}].price`,
    ),
    stock_quantity: expectNumber(
      variant.stock_quantity,
      `${productLabel}.variants[${index}].stock_quantity`,
    ),
    sku: expectString(variant.sku, `${productLabel}.variants[${index}].sku`),
    material: {
      name: expectString(
        material.name,
        `${productLabel}.variants[${index}].material.name`,
      ),
    },
    color: {
      name: expectString(
        color.name,
        `${productLabel}.variants[${index}].color.name`,
      ),
    },
  };
}

function parseImage(raw, productLabel, index) {
  const image = expectObject(raw, `${productLabel}.images[${index}]`);
  const variantId = image.variant_id;
  if (variantId !== null && typeof variantId !== "string") {
    fail(`${productLabel}.images[${index}].variant_id must be a string or null`);
  }

  return {
    id: expectString(image.id, `${productLabel}.images[${index}].id`),
    url: expectString(image.url, `${productLabel}.images[${index}].url`),
    alt_text: expectString(
      image.alt_text,
      `${productLabel}.images[${index}].alt_text`,
      { nullable: true },
    ),
    is_primary: expectBoolean(
      image.is_primary,
      `${productLabel}.images[${index}].is_primary`,
    ),
    sort_order: expectNumber(
      image.sort_order,
      `${productLabel}.images[${index}].sort_order`,
    ),
    variant_id: variantId,
    image_role: expectString(
      image.image_role,
      `${productLabel}.images[${index}].image_role`,
    ),
  };
}

export function parsePublicProduct(raw, source = "product response") {
  const product = expectObject(raw, source);
  const category = expectObject(product.category, `${source}.category`);
  const variants = expectArray(product.variants, `${source}.variants`).map(
    (variant, index) => parseVariant(variant, source, index),
  );
  const images = expectArray(product.images, `${source}.images`).map(
    (image, index) => parseImage(image, source, index),
  );

  return {
    id: expectString(product.id, `${source}.id`),
    name: expectString(product.name, `${source}.name`),
    slug: expectString(product.slug, `${source}.slug`),
    description: expectString(product.description, `${source}.description`, {
      nullable: true,
    }),
    care_instructions: expectString(
      product.care_instructions,
      `${source}.care_instructions`,
      { nullable: true },
    ),
    category: {
      name: expectString(category.name, `${source}.category.name`),
      slug: expectString(category.slug, `${source}.category.slug`),
    },
    variants,
    images,
  };
}

function parseListItem(raw, index) {
  const item = expectObject(raw, `products.items[${index}]`);
  return {
    slug: expectString(item.slug, `products.items[${index}].slug`),
    name: expectString(item.name, `products.items[${index}].name`),
  };
}

function parseProductList(raw, source) {
  const response = expectObject(raw, source);
  const items = expectArray(response.items, `${source}.items`).map(
    parseListItem,
  );
  const total = expectNumber(response.total, `${source}.total`);
  if (total < items.length) {
    fail(`${source}.total is smaller than the returned item count`);
  }
  return { items, total };
}

export function parseProductionDesignNumbers(markdown) {
  const match = markdown.match(/numbered designs are:\s*`([^`]+)`/s);
  if (!match) fail("could not find the numbered-design list in the tracker");

  const numbers = match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (numbers.length === 0 || numbers.some((value) => !/^\d+$/.test(value))) {
    fail("tracker numbered-design list contains an invalid design number");
  }
  return numbers;
}

export function parseDemoIdentifiers(markdown) {
  const match = markdown.match(/Five non-production demos[^`]*`([^`]+)`/s);
  if (!match) fail("could not find the demo-identifier list in the tracker");
  return match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function extractDesignNumber(name) {
  return /^Bedspread Design (\d+)$/.exec(name)?.[1] ?? null;
}

export function statusForClaim(value, { verified = false, notApplicable = false } = {}) {
  if (notApplicable) return "not applicable";
  if (value === null || value === undefined || value === "") return "missing";
  return verified ? "verified" : "blocked";
}

function statusCell(value, status) {
  if (!AUDIT_STATUSES.includes(status)) fail(`unknown audit status '${status}'`);
  const rendered = value === null || value === undefined || value === "" ? "—" : value;
  return `${escapeMarkdown(String(rendered))} **${status}**`;
}

function escapeMarkdown(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function unique(values) {
  return [...new Set(values)];
}

function money(values) {
  return unique(values)
    .sort((a, b) => a - b)
    .map((paise) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)
    .join(", ");
}

function imageRoleCounts(images, variantId = undefined) {
  const selected =
    variantId === undefined
      ? images
      : images.filter((image) => image.variant_id === variantId);
  const counts = new Map([
    ["GALLERY", 0],
    ["SWATCH", 0],
  ]);
  for (const image of selected) {
    counts.set(image.image_role, (counts.get(image.image_role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, count]) => `${role}=${count}`)
    .join(", ") || "none";
}

function productAuditRow(product, expectedDesignNo) {
  if (!product) {
    return {
      designNo: expectedDesignNo,
      cells: [
        statusCell(expectedDesignNo, "verified"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
        statusCell(null, "missing"),
      ],
    };
  }

  const variants = product.variants;
  const description = product.description ?? "";
  const materialNames = unique(variants.map((variant) => variant.material.name));
  const colors = unique(variants.map((variant) => variant.color.name));
  const sizes = unique(variants.map((variant) => variant.size));
  const descriptionStatus = description
    ? INTERNAL_COPY_PATTERN.test(description)
      ? "blocked"
      : "blocked"
    : "missing";

  return {
    designNo: expectedDesignNo,
    cells: [
      statusCell(expectedDesignNo, "verified"),
      statusCell(product.name, "blocked"),
      statusCell(product.category.name, "blocked"),
      statusCell(description.match(/^([^,\.]+(?:\s+[^,\.]+)?) /)?.[1] ?? description, "blocked"),
      statusCell(null, "missing"),
      statusCell(sizes.join(", "), statusForClaim(sizes.join(", "))),
      statusCell(null, "missing"),
      statusCell(materialNames.join(", "), statusForClaim(materialNames.join(", "))),
      statusCell(colors.join(", "), statusForClaim(colors.join(", "))),
      statusCell(money(variants.map((variant) => variant.price)), statusForClaim(variants.length ? "present" : null)),
      statusCell(null, "missing"),
      statusCell(product.care_instructions, statusForClaim(product.care_instructions)),
      statusCell(imageRoleCounts(product.images), statusForClaim(product.images.length ? "present" : null, { verified: true })),
      statusCell(description ? (INTERNAL_COPY_PATTERN.test(description) ? "internal admin reference" : "public copy present") : null, descriptionStatus),
      statusCell(null, "missing"),
    ],
    variants,
    images: product.images,
  };
}

function variantAuditRows(product, expectedDesignNo) {
  if (!product) return [];
  return product.variants.map((variant) => [
    expectedDesignNo,
    variant.sku,
    statusCell(variant.size, "blocked"),
    statusCell(variant.material.name, "blocked"),
    statusCell(variant.color.name, "blocked"),
    statusCell(`₹${(variant.price / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "blocked"),
    statusCell(String(variant.stock_quantity), "blocked"),
    statusCell(null, "missing"),
    statusCell(imageRoleCounts(product.images, variant.id), statusForClaim(imageRoleCounts(product.images, variant.id), { verified: true })),
  ]);
}

export function buildAuditReport({
  observedAt,
  apiBase,
  trackerPath,
  expectedDesignNumbers,
  expectedDemoIdentifiers,
  publicProducts,
  reportedTotal,
}) {
  const byDesignNo = new Map();
  for (const product of publicProducts) {
    const designNo = extractDesignNumber(product.name);
    if (designNo) byDesignNo.set(designNo, product);
  }

  const expectedSet = new Set(expectedDesignNumbers);
  const numbered = expectedDesignNumbers.map((number) => byDesignNo.get(number)).filter(Boolean);
  const missingDesignNumbers = expectedDesignNumbers.filter((number) => !byDesignNo.has(number));
  const unexpectedNumbered = publicProducts
    .map((product) => ({ product, designNo: extractDesignNumber(product.name) }))
    .filter(({ designNo }) => designNo && !expectedSet.has(designNo));
  const nonNumbered = publicProducts.filter((product) => !extractDesignNumber(product.name));
  const internalCopyCount = numbered.filter((product) => INTERNAL_COPY_PATTERN.test(product.description ?? "")).length;
  const variantCount = numbered.reduce((count, product) => count + product.variants.length, 0);

  const productRows = expectedDesignNumbers.map((number) => productAuditRow(byDesignNo.get(number), number));
  const variantRows = expectedDesignNumbers.flatMap((number) => variantAuditRows(byDesignNo.get(number), number));
  const expectedDemoText = expectedDemoIdentifiers.length ? expectedDemoIdentifiers.join(", ") : "none recorded";
  const liveNonNumberedText = nonNumbered.length
    ? nonNumbered.map((product) => `\`${product.slug}\` — ${product.name}`).join("; ")
    : "none";

  const lines = [
    "# Phase 2C — 41-design public-data audit",
    "",
    `Generated: ${observedAt} (UTC)`,
    `Public source: \`${apiBase}\``,
    `Tracker source: \`${trackerPath}\``,
    "",
    "This is a read-only snapshot of the public catalogue. It does not approve, correct, deactivate, or publish any product. The current numbered list is a working production set, not the final catalogue: additional raw supplier inputs remain pending for later image-pipeline processing.",
    "",
    "## Scope and result",
    "",
    `- Public products returned: **${reportedTotal}**.
- Numbered production designs found: **${numbered.length}/${expectedDesignNumbers.length}**.
- Variants audited for the numbered designs: **${variantCount}**.
- Numbered designs whose public description contains an internal admin reference: **${internalCopyCount}/${numbered.length}**.
- Missing numbered designs: ${missingDesignNumbers.length ? missingDesignNumbers.join(", ") : "none"}.
- Numbered designs with a public care-instruction value: **${numbered.filter((product) => product.care_instructions).length}/${numbered.length}** (presence is not approval).`,
    "",
    "### Demo discrepancy requiring follow-up",
    "",
    `The tracker declares these demo identifiers: ${expectedDemoText}. The public API currently returns these five non-numbered products instead: ${liveNonNumberedText}. That means the merged Phase 2B deactivation evidence is incomplete for the current deployed data; this report intentionally does not mutate production data.`,
    "",
    "### Status meanings",
    "",
    `- **verified** — structurally observed and cross-checked against the canonical numbered-design list, or structurally present in the public API (for image-role counts only). This is not visual or physical QA.
- **missing** — no value or source/approval evidence is present in the audited public boundary.
- **blocked** — a public value exists, but the audit has no owner-approved source proving that it is truthful for release; it must not be treated as verified.
- **not applicable** — the field does not apply. No current numbered row uses this status.`,
    "",
    "## Product-level audit",
    "",
    "Values are shown as observed public values followed by the required release status. Empty dimensions and set contents are deliberately not inferred from category, SKU, prompt, or image appearance.",
    "",
    "| Design | Verified product name | Product type | Construction | Exact dimensions | Commercial size | Exact set contents | Fibre/material | Colours | Selling price | Stock source | Care instructions | Images present by role | Description status | Publication approval |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...productRows.map((row) => `| ${row.cells.join(" | ")} |`),
    "",
    "## Variant-level audit",
    "",
    "Each row is a public variant. Stock quantity, price, size, material, and colour are marked blocked until matched to owner-approved commercial/release records. `Images present by role` is only an API-shape check; it does not certify visual fidelity or owner QA.",
    "",
    "| Design | SKU | Commercial size label | Fibre/material | Colour | Selling price | Stock quantity | Stock source | Images present by role |",
    "|---|---|---|---|---|---|---|---|---|",
    ...variantRows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Required next inputs",
    "",
    `1. Owner-approved fact sheets for each numbered design: product name, physical product type, construction, exact dimensions, set contents, fibre/material, care, sellable size, colours, price, stock source, and publication approval.
2. A production-data reconciliation for the five live non-numbered products, including whether they are demos to soft-delete or approved production inventory.
3. A separate pass for internal descriptions and unsupported claims after the fact sheets are available.
4. Additional raw supplier inputs can be added later to the image pipeline; they are outside this 41-design snapshot and must enter through classification, crop, generation, owner QA, and publication gates.`,
    "",
  ];

  return lines.join("\n");
}

async function fetchJson(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(PUBLIC_TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!response.ok) fail(`${url} returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    fail(`${url} did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchPublicProducts(apiBase, fetchImpl = fetch) {
  const limit = 100;
  const firstPage = parseProductList(
    await fetchJson(`${apiBase}/products?limit=${limit}`, fetchImpl),
    "products response",
  );
  const pageCount = Math.ceil(firstPage.total / limit);
  const pages = [firstPage];
  for (let page = 2; page <= pageCount; page += 1) {
    pages.push(
      parseProductList(
        await fetchJson(`${apiBase}/products?limit=${limit}&page=${page}`, fetchImpl),
        `products page ${page}`,
      ),
    );
  }

  const items = pages.flatMap((page) => page.items);
  if (items.length !== firstPage.total) {
    fail(`expected ${firstPage.total} public products but received ${items.length} list items`);
  }

  const products = [];
  for (const item of items) {
    products.push(
      parsePublicProduct(
        await fetchJson(`${apiBase}/products/${encodeURIComponent(item.slug)}`, fetchImpl),
        `products/${item.slug}`,
      ),
    );
  }
  return { products, total: firstPage.total };
}

export async function runAudit({
  apiBase = DEFAULT_API_BASE,
  trackerPath = DEFAULT_TRACKER_PATH,
  observedAt = new Date().toISOString(),
  fetchImpl = fetch,
} = {}) {
  const resolvedTrackerPath = path.resolve(trackerPath);
  const tracker = await fs.readFile(resolvedTrackerPath, "utf8");
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const trackerLabel = path.relative(repositoryRoot, resolvedTrackerPath);
  const expectedDesignNumbers = parseProductionDesignNumbers(tracker);
  const expectedDemoIdentifiers = parseDemoIdentifiers(tracker);
  const { products, total } = await fetchPublicProducts(apiBase.replace(/\/$/, ""), fetchImpl);
  return buildAuditReport({
    observedAt,
    apiBase: apiBase.replace(/\/$/, ""),
    trackerPath: trackerLabel || resolvedTrackerPath,
    expectedDesignNumbers,
    expectedDemoIdentifiers,
    publicProducts: products,
    reportedTotal: total,
  });
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

export async function main(args = process.argv.slice(2)) {
  const apiBase = option(args, "--api", process.env.PUBLIC_API_BASE ?? DEFAULT_API_BASE);
  const trackerPath = option(args, "--tracker", DEFAULT_TRACKER_PATH);
  const outputPath = option(args, "--out", DEFAULT_REPORT_PATH);
  const report = await runAudit({ apiBase, trackerPath });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report, "utf8");
  console.log(`Wrote ${outputPath}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
