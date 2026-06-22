import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy.js';
import { getCustomerJwtSecret } from './customer-jwt-secret.js';

// This module's JwtModule is registered with the CUSTOMER secret, so the
// JwtService injected into CustomerAuthService signs/verifies customer tokens
// only — fully separate from the admin AuthModule's JwtModule (D32).
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: getCustomerJwtSecret(),
      signOptions: {
        expiresIn: (process.env.CUSTOMER_JWT_EXPIRES_IN ?? '7d') as StringValue,
      },
    }),
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerJwtStrategy],
  exports: [PassportModule],
})
export class CustomerAuthModule {}
