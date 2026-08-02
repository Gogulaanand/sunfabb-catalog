import type { EmailTemplate } from '../mail-transport.js';
import { escapeHtml, layout, template } from './layout.js';

export function buildOrderDeliveredEmail(orderNumber: string): EmailTemplate {
  return template(
    `Order ${orderNumber} delivered`,
    layout(
      'Your order was delivered',
      `<p>Your Sunfabb order <strong>${escapeHtml(orderNumber)}</strong> has been marked as delivered.</p>
       <p>We hope you enjoy it.</p>`,
    ),
    `Your Sunfabb order ${orderNumber} has been marked as delivered. We hope you enjoy it.`,
  );
}
