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
    this.logLink('verify-email', to, this.link('/account/verify-email', token));
    return Promise.resolve();
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.logLink(
      'password-reset',
      to,
      this.link('/account/reset-password', token),
    );
    return Promise.resolve();
  }

  // Order confirmation, sent when a payment is confirmed (6.4). Still a stub
  // until Resend (6.7); logs instead of sending. Callers must never let an
  // email failure fail the payment webhook (§12 acceptance #7) — this resolves
  // (and in prod only warns) so a stubbed send can't break the money path.
  sendOrderConfirmation(to: string, orderNumber: string): Promise<void> {
    const url = `${process.env.APP_BASE_URL ?? 'http://localhost:3001'}/account/orders/${orderNumber}`;
    this.logLink('order-confirmation', to, url);
    return Promise.resolve();
  }

  // Never log a raw token link in production — that would be a credential leak.
  // The real Resend integration (6.7) replaces this stub entirely.
  private logLink(kind: string, to: string, url: string): void {
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        `EmailService stub invoked in production (${kind} → ${to}); no email sent. Wire Resend (6.7).`,
      );
    } else {
      this.logger.log(`[stub] ${kind} → ${to}: ${url}`);
    }
  }
}
