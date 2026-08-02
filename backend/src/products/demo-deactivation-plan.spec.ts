import { buildDemoDeactivationPlan } from './demo-deactivation-plan.js';

describe('buildDemoDeactivationPlan', () => {
  it('collects each demo identifier and deduplicates its product targets', () => {
    const result = buildDemoDeactivationPlan([
      {
        id: 'product-plaid',
        name: 'Plaid demo',
        slug: 'plaid-demo',
        variants: [{ sku: 'UNKNOWN-PLAID1' }, { sku: 'UNKNOWN-PLAID2' }],
      },
      {
        id: 'product-plaid-3',
        name: 'UNKNOWN-PLAID3',
        slug: 'plaid-demo-3',
        variants: [],
      },
      {
        id: 'product-stripe',
        name: 'Stripe demo',
        slug: 'stripe-demo',
        variants: [{ sku: 'UNKNOWN-STRIPE1' }],
      },
      {
        id: 'product-stripe-2',
        name: 'Stripe demo 2',
        slug: 'stripe-demo-2',
        variants: [{ sku: 'UNKNOWN-STRIPE2' }],
      },
    ]);

    expect(result.missingIdentifiers).toEqual([]);
    expect(result.matchedIdentifiers).toEqual([
      'UNKNOWN-PLAID1',
      'UNKNOWN-PLAID2',
      'UNKNOWN-PLAID3',
      'UNKNOWN-STRIPE1',
      'UNKNOWN-STRIPE2',
    ]);
    expect(result.productIds).toEqual([
      'product-plaid',
      'product-plaid-3',
      'product-stripe',
      'product-stripe-2',
    ]);
  });

  it('reports missing identifiers so callers can refuse a partial operation', () => {
    const result = buildDemoDeactivationPlan([
      {
        id: 'product-plaid',
        name: 'Plaid demo',
        slug: 'plaid-demo',
        variants: [{ sku: 'UNKNOWN-PLAID1' }],
      },
    ]);

    expect(result.missingIdentifiers).toEqual([
      'UNKNOWN-PLAID2',
      'UNKNOWN-PLAID3',
      'UNKNOWN-STRIPE1',
      'UNKNOWN-STRIPE2',
    ]);
    expect(result.productIds).toEqual(['product-plaid']);
  });

  it('ignores unrelated products and variants', () => {
    const result = buildDemoDeactivationPlan([
      {
        id: 'product-real',
        name: 'Royal Cotton Bedspread',
        slug: 'royal-cotton-bedspread',
        variants: [{ sku: 'BED-QUEEN-IVORY' }],
      },
    ]);

    expect(result.productIds).toEqual([]);
    expect(result.matchedIdentifiers).toEqual([]);
    expect(result.missingIdentifiers).toHaveLength(5);
  });
});
