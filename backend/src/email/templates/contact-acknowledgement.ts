import type { EmailTemplate } from '../mail-transport.js';
import { escapeHtml, layout, template } from './layout.js';

export function buildContactAcknowledgementEmail(name: string): EmailTemplate {
  return template(
    'We received your Sunfabb enquiry',
    layout(
      'We received your message',
      `<p>Hello ${escapeHtml(name)},</p>
       <p>Thank you for contacting Sunfabb. We have received your enquiry and will get back to you as soon as possible.</p>
       <p>We appreciate your interest.</p>`,
    ),
    `Hello ${name},\n\nThank you for contacting Sunfabb. We have received your enquiry and will get back to you as soon as possible.\n\nWe appreciate your interest.`,
  );
}
