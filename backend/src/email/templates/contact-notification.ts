import type { EmailTemplate } from '../mail-transport.js';
import { escapeHtml, layout, template } from './layout.js';

export interface ContactEmailSubmission {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
}

export function buildContactNotificationEmail(
  submission: ContactEmailSubmission,
): EmailTemplate {
  const email = submission.email
    ? escapeHtml(submission.email)
    : '<em>Not provided</em>';
  return template(
    'New Sunfabb contact enquiry',
    layout(
      'New contact enquiry',
      `<p><strong>Name:</strong> ${escapeHtml(submission.name)}</p>
       <p><strong>Phone:</strong> ${escapeHtml(submission.phone)}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Submission ID:</strong> ${escapeHtml(submission.id)}</p>
       <p><strong>Message:</strong></p>
       <p style="white-space:pre-wrap;">${escapeHtml(submission.message)}</p>`,
    ),
    `New contact enquiry\n\nName: ${submission.name}\nPhone: ${submission.phone}\nEmail: ${submission.email ?? 'Not provided'}\nSubmission ID: ${submission.id}\n\nMessage:\n${submission.message}`,
  );
}
