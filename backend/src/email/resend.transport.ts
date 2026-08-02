import type { EmailConfig } from './email-config.js';
import type { MailMessage, MailTransport } from './mail-transport.js';

export type ResendTransportErrorCode =
  | 'missing_api_key'
  | 'missing_email_from'
  | 'network_error'
  | 'http_error'
  | 'invalid_response';

/** Errors contain only safe operational metadata, never provider bodies. */
export class ResendTransportError extends Error {
  constructor(
    public readonly code: ResendTransportErrorCode,
    public readonly statusCode?: number,
  ) {
    super(
      statusCode === undefined
        ? `Resend delivery failed (${code})`
        : `Resend delivery failed (${code}, HTTP ${statusCode})`,
    );
    this.name = 'ResendTransportError';
  }
}

interface ResendSuccessResponse {
  id: string;
}

function isResendSuccessResponse(
  value: unknown,
): value is ResendSuccessResponse {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return false;
  }
  return typeof value.id === 'string' && value.id.length > 0;
}

export class ResendTransport implements MailTransport {
  private static readonly endpoint = 'https://api.resend.com/emails';

  constructor(private readonly config: EmailConfig) {}

  async send(message: MailMessage): Promise<void> {
    if (!this.config.resendApiKey) {
      throw new ResendTransportError('missing_api_key');
    }
    if (!this.config.emailFrom) {
      throw new ResendTransportError('missing_email_from');
    }

    const payload = {
      from: this.config.emailFrom,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.attachments && message.attachments.length > 0
        ? {
            attachments: message.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.content.toString('base64'),
            })),
          }
        : {}),
    };

    let response: Response;
    try {
      response = await fetch(ResendTransport.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.resendApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'sunfabb-catalog/1.0',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ResendTransportError('network_error');
    }

    if (!response.ok) {
      throw new ResendTransportError('http_error', response.status);
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new ResendTransportError('invalid_response', response.status);
    }

    if (!isResendSuccessResponse(responseBody)) {
      throw new ResendTransportError('invalid_response', response.status);
    }
  }
}
