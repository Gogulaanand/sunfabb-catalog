import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getCustomerJwtSecret } from '../customer-jwt-secret.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  typ: string;
  tokenVersion: number;
}

export interface CurrentCustomerData {
  customerId: string;
  email: string;
  emailVerified: boolean;
}

// Registered under the name 'customer-jwt' (the admin strategy is the default
// 'jwt'), so AuthGuard('customer-jwt') and AuthGuard('jwt') are fully distinct.
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(private readonly prisma: PrismaService) {
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

  async validate(payload: CustomerJwtPayload): Promise<CurrentCustomerData> {
    // Defence in depth: the distinct secret already isolates customer tokens
    // from admin tokens; additionally require the explicit customer stamp.
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException();
    }

    // D38 (M1 + M2): reload the customer on every authenticated request to
    // enforce immediate revocation on deactivation or password reset.
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { is_active: true, token_version: true, email_verified: true },
    });

    if (
      !customer ||
      !customer.is_active ||
      customer.token_version !== payload.tokenVersion
    ) {
      throw new UnauthorizedException();
    }

    return {
      customerId: payload.sub,
      email: payload.email,
      emailVerified: customer.email_verified,
    };
  }
}
