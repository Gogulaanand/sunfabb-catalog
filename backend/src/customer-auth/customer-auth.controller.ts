import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CustomerAuthService } from './customer-auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { CustomerLoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from './decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from './strategies/customer-jwt.strategy.js';

@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: CustomerLoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    // Auth is a stateless Bearer token (the httpOnly cookie lives on the
    // Next.js side, mirroring admin). Logout = the frontend clears its cookie;
    // the backend has nothing to revoke. Endpoint exists for symmetry.
    return { ok: true };
  }

  @Get('me')
  @UseGuards(CustomerJwtAuthGuard)
  me(@CurrentCustomer() customer: CurrentCustomerData) {
    return this.authService.me(customer.customerId);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
