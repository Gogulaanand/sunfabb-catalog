import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';

export const ADMIN_LOGIN_CLIENT_IP_HEADER = 'x-sunfabb-client-ip';
export const ADMIN_LOGIN_PROXY_SECRET_HEADER = 'x-sunfabb-proxy-secret';

const MINIMUM_SECRET_BYTES = 32;

type ProxyEnvironment = Readonly<Record<string, string | undefined>>;

type ThrottleRequest = {
  headers?: Record<string, unknown>;
  ip?: unknown;
};

export function getAdminLoginProxySecret(
  environment: ProxyEnvironment = process.env,
): string | undefined {
  const secret = environment.ADMIN_LOGIN_PROXY_SECRET?.trim();

  if (!secret) {
    if (environment.NODE_ENV === 'production') {
      throw new Error('ADMIN_LOGIN_PROXY_SECRET must be set in production');
    }
    return undefined;
  }

  if (Buffer.byteLength(secret, 'utf8') < MINIMUM_SECRET_BYTES) {
    throw new Error(
      `ADMIN_LOGIN_PROXY_SECRET must be at least ${MINIMUM_SECRET_BYTES} bytes`,
    );
  }

  return secret;
}

function trustedSecretMatches(expected: string, supplied: unknown): boolean {
  if (typeof supplied !== 'string') return false;

  const expectedDigest = createHash('sha256').update(expected).digest();
  const suppliedDigest = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

export function resolveAdminLoginThrottleTracker(
  request: ThrottleRequest,
  environment: ProxyEnvironment = process.env,
): string {
  const directIp =
    typeof request.ip === 'string' && request.ip.length > 0
      ? request.ip
      : 'unknown';
  const secret = getAdminLoginProxySecret(environment);
  if (!secret) return `direct:${directIp}`;

  const suppliedSecret = request.headers?.[ADMIN_LOGIN_PROXY_SECRET_HEADER];
  const forwardedIp = request.headers?.[ADMIN_LOGIN_CLIENT_IP_HEADER];

  if (
    trustedSecretMatches(secret, suppliedSecret) &&
    typeof forwardedIp === 'string' &&
    isIP(forwardedIp) !== 0
  ) {
    return `proxy:${forwardedIp}`;
  }

  return `direct:${directIp}`;
}

@Injectable()
export class AdminLoginThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected override getTracker(request: Record<string, unknown>) {
    return Promise.resolve(resolveAdminLoginThrottleTracker(request));
  }
}
