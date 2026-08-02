import { Injectable, Logger } from '@nestjs/common';
import { getTurnstileSecretKey } from './turnstile-config.js';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function isTurnstileVerificationResponse(
  value: unknown,
): value is { success: boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    let secret: string;
    try {
      secret = getTurnstileSecretKey();
    } catch (err) {
      this.logger.error('Turnstile secret key not configured', err);
      return false;
    }

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.append('remoteip', remoteIp);

    let res: Response;
    try {
      res = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body,
      });
    } catch (err) {
      this.logger.error('Turnstile network error (outage?)', err);
      return false;
    }

    if (!res.ok) {
      this.logger.error(
        `Turnstile returned HTTP ${res.status} — treating as failure`,
      );
      return false;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      this.logger.error('Turnstile response JSON could not be parsed');
      return false;
    }

    if (!isTurnstileVerificationResponse(data)) {
      this.logger.error('Turnstile response payload was invalid');
      return false;
    }

    return data.success;
  }
}
