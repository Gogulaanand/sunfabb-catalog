import { Injectable, Logger } from '@nestjs/common';

/**
 * Transactional email.
 *
 * This is a STUB until Resend is wired in Phase 6.7 — it logs the action (and
 * the link, in dev) instead of sending. The token generation/validation logic
 * in CustomerAuthService is real; only delivery is stubbed, so the
 * verify-email and password-reset flows are fully exercisable now.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private link(path: string, token: string): string {
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3001';
    return `${base}${path}?token=${token}`;
  }

  sendVerificationEmail(to: string, token: string): Promise<void> {
    this.logger.log(
      `[stub] verify-email → ${to}: ${this.link('/account/verify-email', token)}`,
    );
    return Promise.resolve();
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.logger.log(
      `[stub] password-reset → ${to}: ${this.link('/account/reset-password', token)}`,
    );
    return Promise.resolve();
  }
}
