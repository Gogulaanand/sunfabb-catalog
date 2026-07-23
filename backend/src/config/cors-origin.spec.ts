import {
  createCorsOriginChecker,
  parseConfiguredOrigins,
} from './cors-origin.js';

describe('cors-origin', () => {
  it('allows an exact configured origin and rejects an unknown origin', () => {
    const checker = createCorsOriginChecker([
      'https://sunfabb.com',
      'https://preview.sunfabb.com',
    ]);
    const callback = jest.fn();

    checker('https://sunfabb.com', callback);
    checker('https://attacker.example', callback);

    expect(callback).toHaveBeenNthCalledWith(1, null, true);
    expect(callback).toHaveBeenNthCalledWith(
      2,
      new Error('Origin not allowed'),
      false,
    );
  });

  it('allows requests without an Origin header for server-to-server calls', () => {
    const callback = jest.fn();

    createCorsOriginChecker(['http://localhost:3001'])(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('trims whitespace, removes duplicates, and defaults to local frontend', () => {
    expect(
      parseConfiguredOrigins(' https://sunfabb.com, https://sunfabb.com '),
    ).toEqual(['https://sunfabb.com']);
    expect(parseConfiguredOrigins(undefined)).toEqual([
      'http://localhost:3001',
    ]);
  });
});
