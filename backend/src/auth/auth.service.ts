import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      throw new UnauthorizedException('Admin credentials not configured');
    }

    const emailMatches = dto.email === adminEmail;
    const passwordMatches = await bcrypt.compare(
      dto.password,
      adminPasswordHash,
    );

    if (!emailMatches || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: 'admin', email: dto.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
