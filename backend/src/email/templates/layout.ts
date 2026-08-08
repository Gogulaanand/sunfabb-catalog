import type { EmailTemplate } from '../mail-transport.js';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

/** Only http(s) links are allowed into href attributes. */
export function safeHttpUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '#';
    return escapeHtml(url.toString());
  } catch {
    return '#';
  }
}

export function appUrl(path: string, query?: Record<string, string>): string {
  const url = new URL(
    path,
    process.env.APP_BASE_URL ?? 'http://localhost:3001',
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f4ef;color:#2f2a25;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ef;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e8e1d8;">
          <tr><td style="padding:28px 32px 16px;">
            <p style="margin:0;color:#6b5b4b;font-size:22px;font-weight:700;">Sunfabb</p>
          </td></tr>
          <tr><td style="padding:0 32px 32px;">
            <h1 style="font-size:24px;line-height:1.3;font-weight:600;">${escapeHtml(title)}</h1>
            ${body}
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e8e1d8;color:#746b63;font-size:12px;">
            This is a transactional email from Sunfabb.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function template(
  subject: string,
  html: string,
  text: string,
): EmailTemplate {
  return { subject, html, text };
}
