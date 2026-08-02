import type { EmailTemplate } from '../mail-transport.js';
import { appUrl, layout, safeHttpUrl, template } from './layout.js';

export function buildVerificationEmail(token: string): EmailTemplate {
  const url = appUrl('/account/verify-email', { token });
  const link = safeHttpUrl(url);
  return template(
    'Verify your Sunfabb email',
    layout(
      'Verify your email',
      `<p>Thanks for creating a Sunfabb account. Confirm your email address to continue.</p>
       <p><a href="${link}" style="color:#6b5b4b;font-weight:700;">Verify email address</a></p>
       <p style="color:#746b63;font-size:14px;">This link expires according to your account security policy.</p>`,
    ),
    `Thanks for creating a Sunfabb account. Verify your email address here: ${url}`,
  );
}
