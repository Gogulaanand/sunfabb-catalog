export interface EmailConfig {
  resendApiKey?: string;
  emailFrom?: string;
}

/**
 * Resolve email configuration once at module initialization. Local and test
 * processes can use LogTransport, but a production process must never boot
 * with a provider that cannot deliver real mail.
 */
export function getEmailConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmailConfig {
  const resendApiKey = env.RESEND_API_KEY?.trim() || undefined;
  const emailFrom = env.EMAIL_FROM?.trim() || undefined;

  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!resendApiKey) missing.push('RESEND_API_KEY');
    if (!emailFrom) missing.push('EMAIL_FROM');

    if (missing.length > 0) {
      throw new Error(
        `Email configuration is incomplete for production; set ${missing.join(' and ')}.`,
      );
    }
  }

  return { resendApiKey, emailFrom };
}
