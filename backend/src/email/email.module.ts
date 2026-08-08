import { Global, Module } from '@nestjs/common';
import { getEmailConfig } from './email-config.js';
import { EmailService } from './email.service.js';
import { LogTransport } from './log.transport.js';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport.js';
import { ResendTransport } from './resend.transport.js';

export function createMailTransport(): MailTransport {
  const config = getEmailConfig();
  return config.resendApiKey ? new ResendTransport(config) : new LogTransport();
}

// Global so any module (customer-auth now, orders/shipping later) can inject
// EmailService without re-importing — mirrors PrismaModule.
@Global()
@Module({
  providers: [
    EmailService,
    {
      provide: MAIL_TRANSPORT,
      useFactory: createMailTransport,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
