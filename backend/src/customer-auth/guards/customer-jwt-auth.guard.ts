import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guards customer-only routes. Distinct from the admin JwtAuthGuard
// (AuthGuard('jwt')) — an admin token cannot satisfy this guard, and a
// customer token cannot satisfy the admin guard (different secret + name).
@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard('customer-jwt') {}
