import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
} from 'resend';
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

export interface ResendEmailClient {
  send(payload: CreateEmailOptions): Promise<CreateEmailResponse>;
}

interface ResendClient {
  emails: ResendEmailClient;
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
  private readonly client?: ResendClient;

  constructor(
    private readonly config: EmailConfig,
    client?: ResendClient,
  ) {
    this.client =
      client ??
      (config.resendApiKey
        ? {
            emails: new Resend(config.resendApiKey, {
              userAgent: 'sunfabb-catalog/1.0',
            }).emails,
          }
        : undefined);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.config.resendApiKey) {
      throw new ResendTransportError('missing_api_key');
    }
    if (!this.config.emailFrom) {
      throw new ResendTransportError('missing_email_from');
    }
    if (!this.client) {
      throw new ResendTransportError('missing_api_key');
    }

    const payload: CreateEmailOptions = {
      from: this.config.emailFrom,
      to: [message.to],
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.attachments && message.attachments.length > 0
        ? {
            attachments: message.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: attachment.content,
            })),
          }
        : {}),
    };

    let response: CreateEmailResponse;
    try {
      response = await this.client.emails.send(payload);
    } catch {
      throw new ResendTransportError('network_error');
    }

    if (response.error) {
      throw new ResendTransportError(
        'http_error',
        response.error.statusCode ?? undefined,
      );
    }

    if (!isResendSuccessResponse(response.data)) {
      throw new ResendTransportError('invalid_response');
    }
  }
}
