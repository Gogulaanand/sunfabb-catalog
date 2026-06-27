// Customer JWT secret — a SEPARATE secret from the admin JWT_SECRET (D32), so a
// customer token can never be valid for an admin route and vice-versa. Fail fast
// if unset (CLAUDE.md rule 12 / D31); single source so signer and verifier match.
export function getCustomerJwtSecret(): string {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) throw new Error('CUSTOMER_JWT_SECRET is not set');
  return secret;
}
