import { Injectable, Logger } from '@nestjs/common';
import { getTurnstileSecretKey } from './turnstile-config.js';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

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

    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  }
}
