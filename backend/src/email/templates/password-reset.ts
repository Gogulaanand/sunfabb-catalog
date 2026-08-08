import type { EmailTemplate } from '../mail-transport.js';
import { appUrl, layout, safeHttpUrl, template } from './layout.js';

export function buildPasswordResetEmail(token: string): EmailTemplate {
  const url = appUrl('/account/reset-password', { token });
  const link = safeHttpUrl(url);
  return template(
    'Reset your Sunfabb password',
    layout(
      'Reset your password',
      `<p>We received a request to reset your Sunfabb password.</p>
       <p><a href="${link}" style="color:#6b5b4b;font-weight:700;">Reset password</a></p>
       <p style="color:#746b63;font-size:14px;">If you did not request this, you can safely ignore this email.</p>`,
    ),
    `Reset your Sunfabb password here: ${url}. If you did not request this, you can safely ignore this email.`,
  );
}
