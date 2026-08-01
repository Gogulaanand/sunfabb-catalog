import type { NextFunction, Request, Response } from 'express';
import { CatalogTimingMiddleware } from './catalog-timing.middleware.js';

describe('CatalogTimingMiddleware', () => {
  const middleware = new CatalogTimingMiddleware();
  const next = jest.fn() as jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.restoreAllMocks();
    next.mockClear();
  });

  it('records structured timing data for catalogue routes without query values', () => {
    const finishHandlers: (() => void)[] = [];
    const response = {
      statusCode: 200,
      once: jest.fn((_event: string, handler: () => void) => {
        finishHandlers.push(handler);
      }),
    } as unknown as Response;
    const request = {
      method: 'GET',
      path: '/products/design-4195',
    } as Request;
    const log = jest.spyOn(console, 'log').mockImplementation();

    middleware.use(request, response, next);
    finishHandlers[0]();

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        /"event":"catalog_request_completed".*"path":"\/products\/design-4195".*"status_code":200/,
      ),
    );
  });

  it('does not add timing listeners to non-catalogue routes', () => {
    const once = jest.fn();
    const response = { once } as unknown as Response;
    const request = { method: 'POST', path: '/contact' } as Request;

    middleware.use(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(once).not.toHaveBeenCalled();
  });
});
