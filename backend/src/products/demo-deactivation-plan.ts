import {
  DEMO_PRODUCT_IDENTIFIERS,
  isDemoProductIdentifier,
} from './demo-product-identifiers.js';

export interface DemoProductCandidate {
  id: string;
  slug: string;
  name: string;
  variants: readonly { sku: string }[];
}

export interface DemoDeactivationPlan {
  productIds: string[];
  matchedIdentifiers: string[];
  missingIdentifiers: string[];
}

/**
 * Builds the exact soft-delete target set without touching the database.
 * Keeping this pure makes the destructive boundary auditable and testable.
 */
export function buildDemoDeactivationPlan(
  products: readonly DemoProductCandidate[],
): DemoDeactivationPlan {
  const matchedIdentifiers = new Set<string>();
  const productIds = new Set<string>();

  for (const product of products) {
    const productIdentifiers = [product.slug, product.name];
    const matchingProductIdentifier = productIdentifiers.find(
      isDemoProductIdentifier,
    );

    if (matchingProductIdentifier) {
      matchedIdentifiers.add(matchingProductIdentifier);
      productIds.add(product.id);
    }

    for (const variant of product.variants) {
      if (isDemoProductIdentifier(variant.sku)) {
        matchedIdentifiers.add(variant.sku);
        productIds.add(product.id);
      }
    }
  }

  return {
    productIds: [...productIds],
    matchedIdentifiers: DEMO_PRODUCT_IDENTIFIERS.filter((identifier) =>
      matchedIdentifiers.has(identifier),
    ),
    missingIdentifiers: DEMO_PRODUCT_IDENTIFIERS.filter(
      (identifier) => !matchedIdentifiers.has(identifier),
    ),
  };
}
