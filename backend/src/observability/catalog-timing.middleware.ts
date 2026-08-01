import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const CATALOG_ROUTE_ROOTS = new Set([
  'categories',
  'colors',
  'health',
  'materials',
  'products',
]);

function isCatalogRequest(request: Request): boolean {
  const root = request.path.split('/').filter(Boolean)[0];
  return root !== undefined && CATALOG_ROUTE_ROOTS.has(root);
}

@Injectable()
export class CatalogTimingMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    if (!isCatalogRequest(request)) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.log(
        JSON.stringify({
          event: 'catalog_request_completed',
          method: request.method,
          path: request.path,
          status_code: response.statusCode,
          duration_ms: Number(durationMs.toFixed(2)),
        }),
      );
    });

    next();
  }
}
