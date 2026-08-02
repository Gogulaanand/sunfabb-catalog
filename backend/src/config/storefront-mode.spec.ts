import { ForbiddenException } from '@nestjs/common';
import {
  assertTransactionalCommerceEnabled,
  getStorefrontMode,
  isTransactionalCommerceEnabled,
  STOREFRONT_MODES,
} from './storefront-mode.js';

describe('storefront mode', () => {
  it('defaults non-production environments to lead generation', () => {
    expect(getStorefrontMode({ NODE_ENV: 'test' })).toBe(
      STOREFRONT_MODES.LEAD_GENERATION,
    );
  });

  it('requires an explicit valid mode in production', () => {
    expect(() => getStorefrontMode({ NODE_ENV: 'production' })).toThrow(
      'STOREFRONT_MODE must be set',
    );
    expect(() =>
      getStorefrontMode({ NODE_ENV: 'production', STOREFRONT_MODE: 'invalid' }),
    ).toThrow('STOREFRONT_MODE must be CATALOG_LEAD_GEN');
  });

  it('recognises transactional commerce only when explicitly configured', () => {
    expect(
      isTransactionalCommerceEnabled({
        NODE_ENV: 'test',
        STOREFRONT_MODE: STOREFRONT_MODES.TRANSACTIONAL,
      }),
    ).toBe(true);
    expect(
      isTransactionalCommerceEnabled({
        NODE_ENV: 'test',
        STOREFRONT_MODE: STOREFRONT_MODES.LEAD_GENERATION,
      }),
    ).toBe(false);
  });

  it('rejects transactional operations in lead-generation mode', () => {
    const originalMode = process.env.STOREFRONT_MODE;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    process.env.STOREFRONT_MODE = STOREFRONT_MODES.LEAD_GENERATION;

    expect(() => assertTransactionalCommerceEnabled()).toThrow(
      ForbiddenException,
    );

    if (originalMode === undefined) delete process.env.STOREFRONT_MODE;
    else process.env.STOREFRONT_MODE = originalMode;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });
});
