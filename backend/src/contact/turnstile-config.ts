// Turnstile secret key, resolved lazily on first call so the app boots before
// keys are provisioned (mirrors razorpay-config.ts pattern / D31).
// Dev test key: 1x0000000000000000000000000000000AA (always passes).
// Failure-force key: 2x0000000000000000000000000000000AA (always fails).
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — required for Cloudflare Turnstile CAPTCHA verification`,
    );
  }
  return value;
}

export function getTurnstileSecretKey(): string {
  return requiredEnv('TURNSTILE_SECRET_KEY');
}
