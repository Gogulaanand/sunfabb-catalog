import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { assertTransactionalCommerceEnabled } from './storefront-mode.js';

@Injectable()
export class StorefrontModeGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    assertTransactionalCommerceEnabled();
    return true;
  }
}
