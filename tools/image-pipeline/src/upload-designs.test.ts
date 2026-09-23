import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AdminProductSchema,
  Api,
  ApiContractError,
  ApiHttpError,
  expectedImages,
  explicitProductBody,
  isCustomerSafeDescription,
  parseArgs,
  prepareDraftForRepair,
  productIsComplete,
  publicIdFor,
  reconcileProduct,
  skuFor,
  type ExpectedVariant,
  type DesignInput,
} from './upload-designs.js';
import type { ReleaseMetadata } from './types.js';

const design: DesignInput = {
  id: 'source-1',
  colorways: [{ color: 'blue', scenes: ['hero', 'closeup', 'folded', 'room'] }, { color: 'pink', scenes: ['hero', 'closeup', 'folded', 'room'] }],
};
const images = expectedImages('sunfabb', design, '1001');
const variants: ExpectedVariant[] = [
  { color: 'blue', sku: skuFor('bedspread', '1001', 'blue'), colorId: 'color-blue', materialId: 'material-cotton', size: 'Queen', price: 100000, stock: 4 },
  { color: 'pink', sku: skuFor('bedspread', '1001', 'pink'), colorId: 'color-pink', materialId: 'material-cotton', size: 'Queen', price: 100000, stock: 4 },
];
const release: ReleaseMetadata = {
  productType: 'bedspread', measuredWidthCm: 240, measuredLengthCm: 260,
  materialConstruction: 'woven cotton textile', setContents: { pieces: ['bedspread', 'pillow cover'], pillowCoverCount: 1 },
  sourceQuality: 'accepted', classificationStatus: 'ready', commercialDesignNo: '1001', commercialName: 'Blue Check',
  variantSize: 'Queen', materialName: 'Cotton', pricePaise: 100000, stockQuantity: 4,
  description: 'Blue checked woven bedspread with one matching pillow cover.', careInstructions: 'Machine wash separately in cold water.',
};

function product(overrides: Record<string, unknown> = {}) {
  return AdminProductSchema.parse({
    id: 'product-1', name: 'Blue Check', slug: 'bedspread-design-1001', is_active: false,
    description: 'Blue checked woven bedspread with one matching pillow cover.', published_at: null,
    care_instructions: 'Machine wash separately in cold water.',
    measured_width_cm: 240,
    measured_length_cm: 260,
    set_contents: 'bedspread, pillow cover; pillow cover count: 1',
    variants: variants.map((variant, index) => ({ id: `variant-${index + 1}`, sku: variant.sku, is_active: true, color_id: variant.colorId, material_id: variant.materialId, size: variant.size, price: variant.price, stock_quantity: variant.stock })),
    images: images.map((image, index) => ({ id: `image-${index + 1}`, public_id: image.publicId, url: `https://cdn.test/${index}.png`, variant_id: index < 4 ? 'variant-1' : 'variant-2', image_role: 'GALLERY', sort_order: image.order, is_primary: image.primary })),
    ...overrides,
  });
}

test('asset and SKU identities are deterministic and first hero is the only primary', () => {
  assert.equal(publicIdFor('sunfabb', '1001', 'blue', 'hero'), 'sunfabb/products/1001/blue/01-hero');
  assert.equal(skuFor('bedspread', '1001', 'blue'), 'BEDSPREAD-1001-BLUE');
  assert.equal(images.length, 8);
  assert.equal(images.filter((image) => image.primary).length, 1);
  assert.equal(images[0]?.primary, true);
});

test('product payload preserves every explicit owner-recorded release fact', () => {
  assert.deepEqual(
    explicitProductBody('bedspread-design-1001', 'category-1', release),
    {
      name: 'Blue Check',
      slug: 'bedspread-design-1001',
      category_id: 'category-1',
      description:
        'Blue checked woven bedspread with one matching pillow cover.',
      care_instructions: 'Machine wash separately in cold water.',
      measured_width_cm: 240,
      measured_length_cm: 260,
      set_contents: 'bedspread, pillow cover; pillow cover count: 1',
    },
  );
});

test('completeness requires active variants, every deterministic gallery image, and a primary hero', () => {
  assert.equal(productIsComplete(product(), variants, images, release), true);
  assert.equal(isCustomerSafeDescription('Refine in admin catalog.'), false);
  assert.equal(productIsComplete(product({ description: 'Refine in admin catalog.' }), variants, images, release), false);
  assert.equal(productIsComplete(product({ measured_width_cm: 230 }), variants, images, release), false);
  assert.equal(productIsComplete(product({ variants: [{ ...product().variants[0], is_active: false }, product().variants[1]] }), variants, images, release), false);
  assert.equal(productIsComplete(product({ images: product().images.slice(0, -1) }), variants, images, release), false);
  assert.equal(productIsComplete(product({ images: product().images.map((image, index) => index === 0 ? { ...image, is_primary: false } : image) }), variants, images, release), false);
});

test('parseArgs rejects duplicate designs and allows tokenless dry runs', () => {
  assert.deepEqual(parseArgs(['--dry-run', 'source-1']), { designs: ['source-1'], tokenFile: '', api: 'https://sunfabb-backend.onrender.com', dryRun: true });
  assert.throws(() => parseArgs(['source-1', 'source-1']), /unique/);
  assert.throws(() => parseArgs(['source-1']), /token-file/);
});

test('admin existence lookup returns missing only for 404', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('', { status: 404 });
    assert.deepEqual(await new Api('https://api.test', 'token').getAdminProduct('bedspread-design-1001'), { kind: 'missing' });

    globalThis.fetch = async () => new Response('forbidden', { status: 403 });
    await assert.rejects(() => new Api('https://api.test', 'token').getAdminProduct('bedspread-design-1001'), (error: unknown) => error instanceof ApiHttpError && error.status === 403);

    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(() => new Api('https://api.test', 'token').getAdminProduct('bedspread-design-1001'), (error: unknown) => error instanceof ApiContractError && /network failure/.test(error.message));

    globalThis.fetch = async () => new Response('backend unavailable', { status: 503 });
    await assert.rejects(() => new Api('https://api.test', 'token').getAdminProduct('bedspread-design-1001'), (error: unknown) => error instanceof ApiHttpError && error.status === 503);

    globalThis.fetch = async () => new Response('backend unavailable', { status: 503 });
    await assert.rejects(() => new Api('https://api.test', 'token').publicProductExists('bedspread-design-1001'), (error: unknown) => error instanceof ApiHttpError && error.status === 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin detail response is validated at the API boundary', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'p', slug: 's', is_active: false, variants: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(() => new Api('https://api.test', 'token').getAdminProduct('s'), (error: unknown) => error instanceof ApiContractError && /unexpected response shape/.test(error.message));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function draftProduct(): ReturnType<typeof product> {
  return AdminProductSchema.parse({
    id: 'product-1', name: 'Blue Check', slug: 'bedspread-design-1001', is_active: false,
    description: null, care_instructions: null, measured_width_cm: null,
    measured_length_cm: null, set_contents: null, published_at: null,
    variants: [], images: [],
  });
}

function fakeRepairApi(current: ReturnType<typeof product>, events: string[], failImageOnce = false): Api {
  let failed = false;
  return {
    getAdminProduct: async () => ({ kind: 'found', product: current }),
    publicProductExists: async () => false,
    get: async () => { throw new Error('unexpected generic GET'); },
    post: async (requestPath: string, body: unknown) => {
      events.push(`POST ${requestPath}`);
      const payload = body as Record<string, unknown>;
      if (requestPath === '/products') {
        current.name = String(payload.name);
        current.description = typeof payload.description === 'string' ? payload.description : null;
        current.care_instructions = typeof payload.care_instructions === 'string' ? payload.care_instructions : null;
        current.measured_width_cm = typeof payload.measured_width_cm === 'number' ? payload.measured_width_cm : null;
        current.measured_length_cm = typeof payload.measured_length_cm === 'number' ? payload.measured_length_cm : null;
        current.set_contents = typeof payload.set_contents === 'string' ? payload.set_contents : null;
        return { id: current.id };
      }
      if (requestPath.endsWith('/variants')) {
        const index = current.variants.length + 1;
        current.variants.push({
          id: `variant-${index}`, sku: String(payload.sku), is_active: true,
          color_id: String(payload.color_id), material_id: String(payload.material_id), size: String(payload.size),
          price: Number(payload.price), stock_quantity: Number(payload.stock_quantity),
        });
        return { id: `variant-${index}` };
      }
      if (requestPath.endsWith('/images')) {
        if (failImageOnce && !failed && current.images.length === 1) {
          failed = true;
          throw new Error('simulated image write interruption');
        }
        const index = current.images.length + 1;
        current.images.push({
          id: `image-${index}`, public_id: String(payload.public_id), url: String(payload.url),
          variant_id: String(payload.variant_id), image_role: 'GALLERY', sort_order: Number(payload.sort_order), is_primary: Boolean(payload.is_primary),
        });
        return { id: `image-${index}` };
      }
      throw new Error(`unexpected POST ${requestPath}`);
    },
    patch: async (requestPath: string, body: unknown) => {
      events.push(`PATCH ${requestPath}`);
      if (requestPath.endsWith('/publish') || requestPath.endsWith('/restore')) current.is_active = true;
      else if (requestPath === `/products/${current.id}`) {
        const payload = body as Record<string, unknown>;
        current.name = String(payload.name);
        current.description = typeof payload.description === 'string' ? payload.description : null;
        current.care_instructions = typeof payload.care_instructions === 'string' ? payload.care_instructions : null;
        current.measured_width_cm = typeof payload.measured_width_cm === 'number' ? payload.measured_width_cm : null;
        current.measured_length_cm = typeof payload.measured_length_cm === 'number' ? payload.measured_length_cm : null;
        current.set_contents = typeof payload.set_contents === 'string' ? payload.set_contents : null;
      }
      return { id: current.id };
    },
    delete: async (requestPath: string) => {
      events.push(`DELETE ${requestPath}`);
      current.is_active = false;
      return { id: current.id };
    },
  } as unknown as Api;
}

test('active incomplete legacy products are hidden through the soft-delete endpoint before repair', async () => {
  const current = product({ is_active: true, images: [] });
  const events: string[] = [];
  const api = fakeRepairApi(current, events);

  const result = await prepareDraftForRepair(
    api,
    { kind: 'found', product: current },
    'bedspread-design-1001',
    'category-1',
    release,
    variants,
    images,
  );

  assert.equal(result.kind, 'found');
  assert.equal(current.is_active, false);
  assert.deepEqual(events, ['DELETE /products/product-1']);
  assert.equal(events.some((event) => event === 'PATCH /products/product-1'), false);
});

test('direct reconciliation hides, refreshes explicit facts, then publishes', async () => {
  const current = product({ is_active: true, images: [] });
  const events: string[] = [];
  const urls = new Map(
    images.map((image, index) => [
      image.publicId,
      `https://cdn.test/${index}.png`,
    ]),
  );
  const api = fakeRepairApi(current, events);

  await reconcileProduct({
    api,
    existing: { kind: 'found', product: current },
    slug: 'bedspread-design-1001',
    categoryId: 'category-1',
    release,
    variants,
    images,
    urls,
  });

  assert.equal(events[0], 'DELETE /products/product-1');
  assert.equal(events.includes('PATCH /products/product-1'), true);
  assert.equal(events.includes('PATCH /products/product-1/publish'), true);
});

test('active products with internal placeholder copy are hidden and repaired from explicit owner facts', async () => {
  const current = product({ is_active: true, description: 'Refine in admin catalog.' });
  const events: string[] = [];
  const api = fakeRepairApi(current, events);
  const urls = new Map(images.map((image, index) => [image.publicId, `https://cdn.test/${index}.png`]));

  await reconcileProduct({ api, existing: { kind: 'found', product: current }, slug: 'bedspread-design-1001', categoryId: 'category-1', release, variants, images, urls });

  assert.equal(current.is_active, true);
  assert.equal(current.description, release.description);
  assert.equal(current.measured_width_cm, release.measuredWidthCm);
  assert.equal(events[0], 'DELETE /products/product-1');
  assert.equal(events.includes('PATCH /products/product-1'), true);
  assert.equal(events.includes('PATCH /products/product-1/publish'), true);
});

test('draft preparation hides an active product with internal copy before repair', async () => {
  const current = product({ is_active: true, description: 'Refine in admin catalog.' });
  const events: string[] = [];
  const api = fakeRepairApi(current, events);

  const prepared = await prepareDraftForRepair(api, { kind: 'found', product: current }, 'bedspread-design-1001', 'category-1', release, variants, images);
  assert.equal(prepared.kind, 'found');
  assert.equal(current.is_active, false);
  assert.deepEqual(events, ['DELETE /products/product-1']);
});

test('repair reruns by SKU and public_id after a partial image write, then publishes last', async () => {
  const current = draftProduct();
  const events: string[] = [];
  const urls = new Map(images.map((image, index) => [image.publicId, `https://cdn.test/${index}.png`]));
  const api = fakeRepairApi(current, events, true);

  await assert.rejects(
    () => reconcileProduct({ api, existing: { kind: 'missing' }, slug: 'bedspread-design-1001', categoryId: 'category-1', release, variants, images, urls }),
    /simulated image write interruption/,
  );
  assert.equal(current.is_active, false);
  assert.equal(current.images.length, 1);

  const result = await reconcileProduct({ api, existing: { kind: 'found', product: current }, slug: 'bedspread-design-1001', categoryId: 'category-1', release, variants, images, urls });
  assert.deepEqual(result, { productId: 'product-1', status: 'published', images: 8 });
  assert.equal(new Set(current.images.map((image) => image.public_id)).size, 8);
  const publishIndex = events.findIndex((event) => event === 'PATCH /products/product-1/publish');
  assert.ok(publishIndex > events.findIndex((event) => event === 'POST /products/product-1/images'));
  assert.equal(current.is_active, true);
});

test('complete hidden products use restore rather than publish', async () => {
  const current = product({ is_active: false, published_at: '2026-01-01T00:00:00.000Z' });
  const events: string[] = [];
  const urls = new Map(images.map((image, index) => [image.publicId, `https://cdn.test/${index}.png`]));
  const api = fakeRepairApi(current, events);

  const result = await reconcileProduct({ api, existing: { kind: 'found', product: current }, slug: 'bedspread-design-1001', categoryId: 'category-1', release, variants, images, urls });
  assert.deepEqual(result, { productId: 'product-1', status: 'published', images: 8 });
  assert.equal(events.includes('PATCH /products/product-1/restore'), true);
  assert.equal(events.includes('PATCH /products/product-1/publish'), false);
});

for (const active of [true, false]) {
  test(`corrects the approved name before publishing an ${active ? 'active' : 'hidden'} product`, async () => {
    const current = product({ name: 'Old product name', is_active: active, published_at: '2026-01-01T00:00:00.000Z' });
    const events: string[] = [];
    const api = fakeRepairApi(current, events);
    assert.equal(productIsComplete(current, variants, images, release), false);

    await reconcileProduct({ api, existing: { kind: 'found', product: current }, slug: current.slug, categoryId: 'category-1', release, variants, images, urls: new Map() });

    assert.equal(current.name, release.commercialName);
    assert.equal(current.is_active, true);
    assert.ok(events.indexOf('PATCH /products/product-1') < events.indexOf('PATCH /products/product-1/restore'));
    assert.equal(events.includes('PATCH /products/product-1'), true);
    assert.equal(events.includes('PATCH /products/product-1/restore'), true);
    events.length = 0;
    const retry = await reconcileProduct({ api, existing: { kind: 'found', product: current }, slug: current.slug, categoryId: 'category-1', release, variants, images, urls: new Map() });
    assert.equal(retry.status, 'already-complete');
    assert.deepEqual(events, []);
  });
}
