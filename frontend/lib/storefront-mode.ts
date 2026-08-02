export const STOREFRONT_MODES = {
  LEAD_GENERATION: "CATALOG_LEAD_GEN",
  TRANSACTIONAL: "TRANSACTIONAL_COMMERCE",
} as const;

export type StorefrontMode = (typeof STOREFRONT_MODES)[keyof typeof STOREFRONT_MODES];

function isStorefrontMode(value: string | undefined): value is StorefrontMode {
  return (
    value === STOREFRONT_MODES.LEAD_GENERATION ||
    value === STOREFRONT_MODES.TRANSACTIONAL
  );
}

function getRuntimeEnvironment(): Record<string, string | undefined> {
  // Keep these as direct environment lookups. Next.js replaces public env
  // properties at build time for client bundles; passing the whole process.env
  // object through a helper leaves that bundle with an empty environment.
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STOREFRONT_MODE: process.env.NEXT_PUBLIC_STOREFRONT_MODE,
  };
}

export function getStorefrontMode(
  environment: Record<string, string | undefined> = getRuntimeEnvironment(),
): StorefrontMode {
  const configured = environment.NEXT_PUBLIC_STOREFRONT_MODE;

  if (!configured) {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_STOREFRONT_MODE must be set to CATALOG_LEAD_GEN or TRANSACTIONAL_COMMERCE in production",
      );
    }
    return STOREFRONT_MODES.LEAD_GENERATION;
  }

  if (!isStorefrontMode(configured)) {
    throw new Error(
      `NEXT_PUBLIC_STOREFRONT_MODE must be CATALOG_LEAD_GEN or TRANSACTIONAL_COMMERCE; received '${configured}'`,
    );
  }

  return configured;
}

export function isTransactionalCommerceEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return getStorefrontMode(environment) === STOREFRONT_MODES.TRANSACTIONAL;
}
