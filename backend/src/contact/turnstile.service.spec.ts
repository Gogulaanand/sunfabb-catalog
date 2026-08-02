import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileService } from './turnstile.service.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TurnstileService', () => {
  let service: TurnstileService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [TurnstileService],
    }).compile();

    service = module.get<TurnstileService>(TurnstileService);
  });

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it('returns true when Cloudflare responds success=true', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await service.verify('good-token', '1.2.3.4');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      VERIFY_URL,
      expect.objectContaining({ method: 'POST' }),
    );

    const [, callOptions] = mockFetch.mock.calls[0] as [
      string,
      { body: URLSearchParams },
    ];
    const body = callOptions.body;
    expect(body.get('secret')).toBe('test-secret');
    expect(body.get('response')).toBe('good-token');
    expect(body.get('remoteip')).toBe('1.2.3.4');
  });

  it('returns false when Cloudflare responds success=false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });

    const result = await service.verify('bad-token');

    expect(result).toBe(false);
  });

  it('fails closed when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('network timeout'));

    const result = await service.verify('some-token');

    expect(result).toBe(false);
  });

  it('fails closed when Cloudflare returns a non-OK HTTP status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const result = await service.verify('some-token');

    expect(result).toBe(false);
  });

  it.each([
    ['an object without a boolean success field', {}],
    ['an object with a non-boolean success field', { success: 'true' }],
    ['a null response', null],
    ['a non-object response', 'not-an-object'],
    ['an array response', []],
  ])(
    'fails closed when Cloudflare returns %s',
    async (_description, payload) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      });

      const result = await service.verify('some-token');

      expect(result).toBe(false);
    },
  );

  it('fails closed when Cloudflare returns an unreadable JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('invalid JSON')),
    });

    const result = await service.verify('some-token');

    expect(result).toBe(false);
  });

  it('fails closed when TURNSTILE_SECRET_KEY is not set', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await service.verify('some-token');

    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('omits remoteip when not provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await service.verify('token-no-ip');

    const [, callOptionsNoIp] = mockFetch.mock.calls[0] as [
      string,
      { body: URLSearchParams },
    ];
    const body = callOptionsNoIp.body;
    expect(body.has('remoteip')).toBe(false);
  });
});
