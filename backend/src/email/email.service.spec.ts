import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMailTransport } from './email.module.js';
import { getEmailConfig } from './email-config.js';
import { LogTransport } from './log.transport.js';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport.js';
import { ResendTransport, ResendTransportError } from './resend.transport.js';
import { buildContactNotificationEmail } from './templates/contact-notification.js';
import { buildOrderConfirmationEmail } from './templates/order-confirmation.js';
import { buildOrderShippedEmail } from './templates/shipped.js';
import { escapeHtml } from './templates/layout.js';
import { EmailService } from './email.service.js';

const originalEnv = { ...process.env };

function restoreEmailEnv(): void {
  for (const key of [
    'NODE_ENV',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'CONTACT_NOTIFY_EMAIL',
    'APP_BASE_URL',
  ]) {
    const original = originalEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

function response(value: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(value),
  } as Response;
}

describe('email configuration and transport selection', () => {
  afterEach(() => restoreEmailEnv());

  it('fails fast in production when provider configuration is incomplete', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;

    expect(() => getEmailConfig()).toThrow('RESEND_API_KEY and EMAIL_FROM');
  });

  it('uses the local log transport without credentials outside production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;

    expect(createMailTransport()).toBeInstanceOf(LogTransport);
  });

  it('uses Resend when an API key is configured', () => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Sunfabb <orders@example.com>';

    expect(createMailTransport()).toBeInstanceOf(ResendTransport);
  });
});

describe('ResendTransport', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the validated message shape and base64 attachment through the HTTP API', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
    fetchMock.mockResolvedValue(response({ id: 'email-1' }));
    globalThis.fetch = fetchMock;
    const transport = new ResendTransport({
      resendApiKey: 're_test_key',
      emailFrom: 'Sunfabb <orders@example.com>',
    });

    await transport.send({
      to: 'customer@example.com',
      subject: 'Order confirmed',
      html: '<p>Order</p>',
      text: 'Order',
      attachments: [{ filename: 'invoice.pdf', content: Buffer.from('pdf') }],
    });

    const request = fetchMock.mock.calls[0];
    expect(request?.[0]).toBe('https://api.resend.com/emails');
    expect(request?.[1]?.method).toBe('POST');
    expect(request?.[1]?.headers).toEqual({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
      'User-Agent': 'sunfabb-catalog/1.0',
    });
    const requestInit = request?.[1];
    if (!requestInit || typeof requestInit.body !== 'string') {
      throw new Error('Expected a JSON request body');
    }
    const payload = JSON.parse(requestInit.body) as {
      from: string;
      to: string[];
      attachments: { filename: string; content: string }[];
    };
    expect(payload.from).toBe('Sunfabb <orders@example.com>');
    expect(payload.to).toEqual(['customer@example.com']);
    expect(payload.attachments).toEqual([
      {
        filename: 'invoice.pdf',
        content: Buffer.from('pdf').toString('base64'),
      },
    ]);
  });

  it('surfaces a non-2xx provider response without exposing its body', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        response({ message: 'provider body must not leak' }, false, 422),
      );
    globalThis.fetch = fetchMock;
    const transport = new ResendTransport({
      resendApiKey: 're_test_key',
      emailFrom: 'orders@example.com',
    });

    await expect(
      transport.send({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      }),
    ).rejects.toMatchObject({
      code: 'http_error',
      statusCode: 422,
    });
    await expect(
      transport.send({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      }),
    ).rejects.not.toThrow('provider body must not leak');
  });

  it('rejects a successful response that does not match the Resend shape', async () => {
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
    fetchMock.mockResolvedValue(response({ data: { id: 'sdk-shaped-id' } }));
    globalThis.fetch = fetchMock;
    const transport = new ResendTransport({
      resendApiKey: 're_test_key',
      emailFrom: 'orders@example.com',
    });

    await expect(
      transport.send({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
});

describe('email templates', () => {
  it('escapes contact free text in HTML', () => {
    const content = buildContactNotificationEmail({
      id: 'contact-1',
      name: '<img src=x onerror=alert(1)>',
      phone: '+91 <script>bad</script>',
      email: 'person@example.com',
      message: '<script>alert("x")</script> & please call',
    });

    expect(content.html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(content.html).not.toContain('<script>');
    expect(content.html).not.toContain('<img');
  });

  it('formats order totals as integer-paise INR at the template boundary', () => {
    const content = buildOrderConfirmationEmail({
      orderNumber: 'SF-2026-000123',
      orderUrl: 'https://sunfabb.com/account/orders/SF-2026-000123',
      lines: [
        {
          name: 'Cotton Bedspread',
          variantLabel: 'King / Indigo',
          quantity: 1,
          lineTotalPaise: 125000,
        },
      ],
      totalPaise: 125000,
    });

    expect(content.html).toContain('₹1,250.00');
    expect(content.text).toContain('₹1,250.00');
    expect(content.html).toContain('SF-2026-000123');
  });

  it('allows only safe tracking URLs in shipped HTML', () => {
    const content = buildOrderShippedEmail(
      'SF-1',
      'Safe Courier',
      'javascript:alert(1)',
    );

    expect(content.html).toContain('href="#"');
    expect(content.html).not.toContain('javascript:');
  });

  it('escapes generic HTML values at the shared boundary', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('EmailService', () => {
  let service: EmailService;
  const transport: jest.Mocked<MailTransport> = { send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.APP_BASE_URL = 'https://sunfabb.com';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MAIL_TRANSPORT, useValue: transport },
      ],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => restoreEmailEnv());

  it('sends verification email content to the injected transport', async () => {
    transport.send.mockResolvedValue(undefined);

    await service.sendVerificationEmail('a@example.com', 'rawtoken');

    expect(transport.send.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        to: 'a@example.com',
        subject: 'Verify your Sunfabb email',
      }),
    );
    const message = transport.send.mock.calls[0]?.[0];
    if (!message) throw new Error('Expected a transport message');
    expect(message.html).toContain('account/verify-email?token=rawtoken');
  });

  it('includes order details and an optional invoice attachment', async () => {
    transport.send.mockResolvedValue(undefined);

    await service.sendOrderConfirmation(
      'a@example.com',
      'SF-1',
      {
        orderUrl: 'https://sunfabb.com/account/orders/SF-1',
        lines: [
          {
            name: 'Towel set',
            variantLabel: 'Bath / White',
            quantity: 2,
            lineTotalPaise: 250000,
          },
        ],
        totalPaise: 250000,
      },
      Buffer.from('pdf'),
    );

    const message = transport.send.mock.calls[0]?.[0];
    if (!message) throw new Error('Expected a transport message');
    expect(message.html).toContain('₹2,500.00');
    expect(message.attachments).toEqual([
      { filename: 'invoice-SF-1.pdf', content: Buffer.from('pdf') },
    ]);
  });

  it('swallows transport failures and records structured metadata only', async () => {
    transport.send.mockRejectedValue(
      new ResendTransportError('http_error', 503),
    );
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    await expect(
      service.sendOrderConfirmation('a@example.com', 'SF-1'),
    ).resolves.toBeUndefined();

    expect(loggerError.mock.calls[0]?.[0]).toEqual(
      expect.stringContaining('"kind":"order-confirmation"'),
    );
    expect(loggerError.mock.calls[0]?.[0]).not.toContain('message body');
    loggerError.mockRestore();
  });

  it('skips internal delivery with structured visibility when the owner email is absent', async () => {
    delete process.env.CONTACT_NOTIFY_EMAIL;
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation();

    await service.sendContactNotification({
      id: 'contact-1',
      name: 'Anand',
      phone: '+91 98765 43210',
      message: 'Please call me',
    });

    expect(transport.send.mock.calls).toHaveLength(0);
    expect(loggerWarn.mock.calls[0]?.[0]).toEqual(
      expect.stringContaining('CONTACT_NOTIFY_EMAIL_not_configured'),
    );
    loggerWarn.mockRestore();
  });

  it('supports acknowledgement and the forward shipping/delivery methods', async () => {
    transport.send.mockResolvedValue(undefined);

    await service.sendContactAcknowledgement('a@example.com', 'Anand');
    await service.sendOrderShipped(
      'a@example.com',
      'SF-1',
      'Safe Courier',
      'https://courier.example/track/SF-1',
    );
    await service.sendOrderDelivered('a@example.com', 'SF-1');

    expect(transport.send.mock.calls).toHaveLength(3);
    expect(transport.send.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ subject: 'Order SF-1 shipped' }),
    );
  });

  it('never logs a token-bearing link through the production log transport', async () => {
    process.env.NODE_ENV = 'production';
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation();
    const logTransport = new LogTransport();

    await logTransport.send({
      to: 'a@example.com',
      subject: 'Verify your Sunfabb email',
      html: 'https://sunfabb.com/verify?token=secret-token',
      text: 'https://sunfabb.com/verify?token=secret-token',
    });

    expect(loggerWarn.mock.calls).not.toHaveLength(0);
    expect(loggerWarn.mock.calls[0]?.[0]).not.toContain('secret-token');
    loggerWarn.mockRestore();
  });
});
