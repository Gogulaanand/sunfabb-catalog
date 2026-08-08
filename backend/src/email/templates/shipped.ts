import type { EmailTemplate } from '../mail-transport.js';
import { appUrl, escapeHtml, layout, safeHttpUrl, template } from './layout.js';

export function buildOrderShippedEmail(
  orderNumber: string,
  courierName: string,
  trackingUrl: string,
): EmailTemplate {
  const link = safeHttpUrl(trackingUrl);
  return template(
    `Order ${orderNumber} shipped`,
    layout(
      'Your order is on its way',
      `<p>Your Sunfabb order <strong>${escapeHtml(orderNumber)}</strong> has shipped with ${escapeHtml(courierName)}.</p>
       <p><a href="${link}" style="color:#6b5b4b;font-weight:700;">Track your order</a></p>`,
    ),
    `Your Sunfabb order ${orderNumber} has shipped with ${courierName}. Track it here: ${trackingUrl}`,
  );
}

export function defaultTrackingUrl(orderNumber: string): string {
  return appUrl(`/account/orders/${encodeURIComponent(orderNumber)}`);
}
