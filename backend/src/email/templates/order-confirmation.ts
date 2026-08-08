import type { EmailTemplate } from '../mail-transport.js';
import { appUrl, escapeHtml, layout, safeHttpUrl, template } from './layout.js';

export interface OrderConfirmationLine {
  name: string;
  variantLabel: string;
  quantity: number;
  lineTotalPaise: number;
}

export interface OrderConfirmationInput {
  orderNumber: string;
  orderUrl: string;
  lines: OrderConfirmationLine[];
  totalPaise: number;
}

export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error('Email money values must be non-negative integer paise');
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export function buildOrderConfirmationEmail(
  input: OrderConfirmationInput,
): EmailTemplate {
  const orderNumber = escapeHtml(input.orderNumber);
  const orderUrl = safeHttpUrl(input.orderUrl);
  const lines = input.lines
    .map(
      (line) => `<tr>
        <td style="padding:8px 4px;border-bottom:1px solid #eee;">${escapeHtml(line.name)}<br><span style="color:#746b63;font-size:13px;">${escapeHtml(line.variantLabel)}</span></td>
        <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:center;">${line.quantity}</td>
        <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatPaise(line.lineTotalPaise))}</td>
      </tr>`,
    )
    .join('');
  const total = formatPaise(input.totalPaise);

  return template(
    `Order ${input.orderNumber} confirmed`,
    layout(
      'Order confirmed',
      `<p>Thank you. Your Sunfabb order <strong>${orderNumber}</strong> has been confirmed.</p>
       ${lines ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;"><tr><th align="left">Item</th><th>Qty</th><th align="right">Amount</th></tr>${lines}<tr><td colspan="2" style="padding:12px 4px;font-weight:700;text-align:right;">Total</td><td style="padding:12px 4px;font-weight:700;text-align:right;">${escapeHtml(total)}</td></tr></table>` : ''}
       <p><a href="${orderUrl}" style="color:#6b5b4b;font-weight:700;">View your order</a></p>`,
    ),
    `Your Sunfabb order ${input.orderNumber} has been confirmed. Total: ${total}. View your order: ${input.orderUrl}`,
  );
}

export function defaultOrderUrl(orderNumber: string): string {
  return appUrl(`/account/orders/${encodeURIComponent(orderNumber)}`);
}
