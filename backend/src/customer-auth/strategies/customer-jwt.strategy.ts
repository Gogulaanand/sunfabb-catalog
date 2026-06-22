import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getCustomerJwtSecret } from '../customer-jwt-secret.js';

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  typ: string;
}

export interface CurrentCustomerData {
  customerId: string;
  email: string;
}

// Registered under the name 'customer-jwt' (the admin strategy is the default
// 'jwt'), so AuthGuard('customer-jwt') and AuthGuard('jwt') are fully distinct.
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor() {
    super({
      // Mirrors admin: the httpOnly cookie lives on the Next.js side and is
      // forwarded as a Bearer token, so there is no CSRF-able auto-sent cookie.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getCustomerJwtSecret(),
      // Pin the algorithm — never accept anything but our HMAC (defence in
      // depth against algorithm-confusion, L2).
      algorithms: ['HS256'],
    });
  }

  validate(payload: CustomerJwtPayload): CurrentCustomerData {
    // Defence in depth: the distinct secret already isolates customer tokens
    // from admin tokens; additionally require the explicit customer stamp.
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException();
    }
    return { customerId: payload.sub, email: payload.email };
  }
}
