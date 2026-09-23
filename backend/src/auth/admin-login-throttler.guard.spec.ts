import {
  ADMIN_LOGIN_CLIENT_IP_HEADER,
  ADMIN_LOGIN_PROXY_SECRET_HEADER,
  getAdminLoginProxySecret,
  resolveAdminLoginThrottleTracker,
} from './admin-login-throttler.guard.js';

const SECRET = 'a-secure-test-secret-with-32-bytes-minimum';

describe('admin login proxy configuration', () => {
  it('fails fast when production has no shared proxy secret', () => {
    expect(() => getAdminLoginProxySecret({ NODE_ENV: 'production' })).toThrow(
      'ADMIN_LOGIN_PROXY_SECRET must be set',
    );
  });

  it('allows tests and local development without the proxy secret', () => {
    expect(getAdminLoginProxySecret({ NODE_ENV: 'test' })).toBeUndefined();
  });

  it('rejects a weak shared secret', () => {
    expect(() =>
      getAdminLoginProxySecret({
        NODE_ENV: 'test',
        ADMIN_LOGIN_PROXY_SECRET: 'too-short',
      }),
    ).toThrow('must be at least 32 bytes');
  });
});

describe('resolveAdminLoginThrottleTracker', () => {
  const environment = {
    NODE_ENV: 'test',
    ADMIN_LOGIN_PROXY_SECRET: SECRET,
  };

  it('uses the forwarded client identity when the proxy secret matches', () => {
    expect(
      resolveAdminLoginThrottleTracker(
        {
          ip: '10.0.0.4',
          headers: {
            [ADMIN_LOGIN_CLIENT_IP_HEADER]: '203.0.113.42',
            [ADMIN_LOGIN_PROXY_SECRET_HEADER]: SECRET,
          },
        },
        environment,
      ),
    ).toBe('proxy:203.0.113.42');
  });

  it('falls back to the direct peer for a spoofed secret', () => {
    expect(
      resolveAdminLoginThrottleTracker(
        {
          ip: '10.0.0.4',
          headers: {
            [ADMIN_LOGIN_CLIENT_IP_HEADER]: '203.0.113.42',
            [ADMIN_LOGIN_PROXY_SECRET_HEADER]: `${SECRET}-wrong`,
          },
        },
        environment,
      ),
    ).toBe('direct:10.0.0.4');
  });

  it('falls back to the direct peer for an invalid forwarded IP', () => {
    expect(
      resolveAdminLoginThrottleTracker(
        {
          ip: '10.0.0.4',
          headers: {
            [ADMIN_LOGIN_CLIENT_IP_HEADER]: 'not-an-ip',
            [ADMIN_LOGIN_PROXY_SECRET_HEADER]: SECRET,
          },
        },
        environment,
      ),
    ).toBe('direct:10.0.0.4');
  });

  it('ignores all forwarded identity headers when no secret is configured', () => {
    expect(
      resolveAdminLoginThrottleTracker(
        {
          ip: '10.0.0.4',
          headers: {
            [ADMIN_LOGIN_CLIENT_IP_HEADER]: '203.0.113.42',
            [ADMIN_LOGIN_PROXY_SECRET_HEADER]: SECRET,
          },
        },
        { NODE_ENV: 'test' },
      ),
    ).toBe('direct:10.0.0.4');
  });
});
