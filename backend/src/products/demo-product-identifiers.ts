export const DEMO_PRODUCT_IDENTIFIERS = [
  'UNKNOWN-PLAID1',
  'UNKNOWN-PLAID2',
  'UNKNOWN-PLAID3',
  'UNKNOWN-STRIPE1',
  'UNKNOWN-STRIPE2',
] as const;

export function isDemoProductIdentifier(
  value: string,
): value is (typeof DEMO_PRODUCT_IDENTIFIERS)[number] {
  return DEMO_PRODUCT_IDENTIFIERS.some((identifier) => identifier === value);
}
