import { isIP } from "node:net";

export const ADMIN_LOGIN_CLIENT_IP_HEADER = "x-sunfabb-client-ip";
export const ADMIN_LOGIN_PROXY_SECRET_HEADER = "x-sunfabb-proxy-secret";

const VERCEL_CLIENT_IP_HEADER = "x-vercel-forwarded-for";
const MINIMUM_SECRET_BYTES = 32;

type ProxyEnvironment = Readonly<Record<string, string | undefined>>;

export function getAdminLoginProxySecret(
  environment: ProxyEnvironment = process.env,
): string | undefined {
  const secret = environment.ADMIN_LOGIN_PROXY_SECRET?.trim();

  if (!secret) {
    if (environment.VERCEL_ENV === "production") {
      throw new Error(
        "ADMIN_LOGIN_PROXY_SECRET must be set for the Vercel production deployment",
      );
    }
    return undefined;
  }

  if (Buffer.byteLength(secret, "utf8") < MINIMUM_SECRET_BYTES) {
    throw new Error(
      `ADMIN_LOGIN_PROXY_SECRET must be at least ${MINIMUM_SECRET_BYTES} bytes`,
    );
  }

  return secret;
}

/**
 * Build the private headers sent from the Vercel route to the backend.
 * Vercel owns x-vercel-forwarded-for, so unlike a browser-supplied forwarding
 * header it is suitable as the client identity at this trust boundary.
 */
export function getAdminLoginProxyHeaders(
  requestHeaders: Headers,
  environment: ProxyEnvironment = process.env,
): Record<string, string> {
  const secret = getAdminLoginProxySecret(environment);
  if (!secret) return {};

  const clientIp = requestHeaders.get(VERCEL_CLIENT_IP_HEADER)?.trim();
  if (!clientIp || isIP(clientIp) === 0) return {};

  return {
    [ADMIN_LOGIN_CLIENT_IP_HEADER]: clientIp,
    [ADMIN_LOGIN_PROXY_SECRET_HEADER]: secret,
  };
}
