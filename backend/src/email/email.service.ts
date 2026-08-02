import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmailTemplate } from './mail-transport.js';
import {
  MAIL_TRANSPORT,
  type MailAttachment,
  type MailTransport,
} from './mail-transport.js';
import { ResendTransportError } from './resend.transport.js';
import { buildContactAcknowledgementEmail } from './templates/contact-acknowledgement.js';
import {
  buildContactNotificationEmail,
  type ContactEmailSubmission,
} from './templates/contact-notification.js';
import {
  buildOrderConfirmationEmail,
  defaultOrderUrl,
  type OrderConfirmationInput,
  type OrderConfirmationLine,
} from './templates/order-confirmation.js';
import { buildOrderDeliveredEmail } from './templates/delivered.js';
import { buildOrderShippedEmail } from './templates/shipped.js';
import { buildPasswordResetEmail } from './templates/password-reset.js';
import { buildVerificationEmail } from './templates/verification.js';

export type ContactSubmission = ContactEmailSubmission;

export interface OrderConfirmationDetails {
  orderUrl?: string;
  lines?: OrderConfirmationLine[];
  totalPaise?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.deliver('verification', to, () => buildVerificationEmail(token));
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.deliver('password-reset', to, () =>
      buildPasswordResetEmail(token),
    );
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    invoicePdf?: Buffer,
  ): Promise<void>;
  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    details?: OrderConfirmationDetails,
    invoicePdf?: Buffer,
  ): Promise<void>;
  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    detailsOrInvoice?: OrderConfirmationDetails | Buffer,
    invoicePdf?: Buffer,
  ): Promise<void> {
    const details = Buffer.isBuffer(detailsOrInvoice)
      ? undefined
      : detailsOrInvoice;
    const attachment = Buffer.isBuffer(detailsOrInvoice)
      ? detailsOrInvoice
      : invoicePdf;

    await this.deliver(
      'order-confirmation',
      to,
      () => {
        const input: OrderConfirmationInput = {
          orderNumber,
          orderUrl: details?.orderUrl ?? defaultOrderUrl(orderNumber),
          lines: details?.lines ?? [],
          totalPaise: details?.totalPaise ?? 0,
        };
        return buildOrderConfirmationEmail(input);
      },
      attachment
        ? [{ filename: `invoice-${orderNumber}.pdf`, content: attachment }]
        : undefined,
    );
  }

  async sendContactNotification(submission: ContactSubmission): Promise<void> {
    const to = process.env.CONTACT_NOTIFY_EMAIL?.trim();
    if (!to) {
      this.logger.warn(
        JSON.stringify({
          event: 'email.delivery.skipped',
          kind: 'contact-notification',
          reason: 'CONTACT_NOTIFY_EMAIL_not_configured',
          required_for: 'internal_delivery',
        }),
      );
      return;
    }
    await this.deliver('contact-notification', to, () =>
      buildContactNotificationEmail(submission),
    );
  }

  async sendContactAcknowledgement(to: string, name: string): Promise<void> {
    await this.deliver('contact-acknowledgement', to, () =>
      buildContactAcknowledgementEmail(name),
    );
  }

  async sendOrderShipped(
    to: string,
    orderNumber: string,
    courierName: string,
    trackingUrl: string,
  ): Promise<void> {
    await this.deliver('order-shipped', to, () =>
      buildOrderShippedEmail(orderNumber, courierName, trackingUrl),
    );
  }

  async sendOrderDelivered(to: string, orderNumber: string): Promise<void> {
    await this.deliver('order-delivered', to, () =>
      buildOrderDeliveredEmail(orderNumber),
    );
  }

  private async deliver(
    kind: string,
    to: string,
    build: () => EmailTemplate,
    attachments?: MailAttachment[],
  ): Promise<void> {
    try {
      const content = build();
      const message = attachments
        ? { ...content, to, attachments }
        : { ...content, to };
      await this.transport.send(message);
    } catch (error: unknown) {
      const metadata =
        error instanceof ResendTransportError
          ? { error_code: error.code, status_code: error.statusCode }
          : { error_type: error instanceof Error ? error.name : 'unknown' };
      this.logger.error(
        JSON.stringify({
          event: 'email.delivery.failed',
          kind,
          recipient: to,
          ...metadata,
        }),
      );
    }
  }
}
