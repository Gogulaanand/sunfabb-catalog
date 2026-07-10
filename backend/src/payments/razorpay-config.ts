// Razorpay credentials, resolved fail-fast on first use (CLAUDE.md rule 12 / D31):
// each getter throws if its env var is unset — never a fallback default, which
// would silently sign/verify with a public value. Unlike the JWT secret (D31),
// these are resolved *lazily* (on the first payment call), not at module
// construction, so the rest of the app — catalog, admin, customer auth, cart —
// still boots before Razorpay test keys are provisioned. 6.4 ships code-complete;
// live keys are the remaining external gate (§10). Any payment operation attempted
// without keys therefore throws a clear, loud error rather than succeeding quietly.

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — required for Razorpay payments (Phase 6.4)`,
    );
  }
  return value;
}

export function getRazorpayKeyId(): string {
  return requiredEnv('RAZORPAY_KEY_ID');
}

export function getRazorpayKeySecret(): string {
  return requiredEnv('RAZORPAY_KEY_SECRET');
}

export function getRazorpayWebhookSecret(): string {
  return requiredEnv('RAZORPAY_WEBHOOK_SECRET');
}
