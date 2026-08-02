import { ForbiddenException } from '@nestjs/common';

export const STOREFRONT_MODES = {
  LEAD_GENERATION: 'CATALOG_LEAD_GEN',
  TRANSACTIONAL: 'TRANSACTIONAL_COMMERCE',
} as const;

export type StorefrontMode =
  (typeof STOREFRONT_MODES)[keyof typeof STOREFRONT_MODES];

function isStorefrontMode(value: string | undefined): value is StorefrontMode {
  return (
    value === STOREFRONT_MODES.LEAD_GENERATION ||
    value === STOREFRONT_MODES.TRANSACTIONAL
  );
}

export function getStorefrontMode(
  environment: NodeJS.ProcessEnv = process.env,
): StorefrontMode {
  const configured = environment.STOREFRONT_MODE;

  if (!configured) {
    if (environment.NODE_ENV === 'production') {
      throw new Error(
        'STOREFRONT_MODE must be set to CATALOG_LEAD_GEN or TRANSACTIONAL_COMMERCE in production',
      );
    }
    return STOREFRONT_MODES.LEAD_GENERATION;
  }

  if (!isStorefrontMode(configured)) {
    throw new Error(
      `STOREFRONT_MODE must be CATALOG_LEAD_GEN or TRANSACTIONAL_COMMERCE; received '${configured}'`,
    );
  }

  return configured;
}

export function isTransactionalCommerceEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return getStorefrontMode(environment) === STOREFRONT_MODES.TRANSACTIONAL;
}

export function assertTransactionalCommerceEnabled(): void {
  if (!isTransactionalCommerceEnabled()) {
    throw new ForbiddenException(
      'Transactional commerce is disabled while the storefront is in lead-generation mode',
    );
  }
}
