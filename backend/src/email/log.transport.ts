import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from './mail-transport.js';

/**
 * Safe local transport. It deliberately logs metadata only, so token-bearing
 * links and message bodies can never enter application logs.
 */
export class LogTransport implements MailTransport {
  private readonly logger = new Logger(LogTransport.name);

  send(message: MailMessage): Promise<void> {
    const event = JSON.stringify({
      event:
        process.env.NODE_ENV === 'production'
          ? 'email.stub_invoked_in_production'
          : 'email.log_transport',
      recipient: message.to,
      subject: message.subject,
      detail:
        process.env.NODE_ENV === 'production'
          ? 'EmailService stub invoked in production; no email sent.'
          : 'Email logged locally; no email sent.',
    });

    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(event);
    } else {
      this.logger.log(event);
    }
    return Promise.resolve();
  }
}
