export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface MailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
