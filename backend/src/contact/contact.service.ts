import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { TurnstileService } from './turnstile.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly turnstile: TurnstileService,
    private readonly email: EmailService,
  ) {}

  async create(
    dto: CreateContactDto,
    remoteIp?: string,
  ): Promise<{ id: string; created_at: Date }> {
    const ok = await this.turnstile.verify(dto.turnstile_token, remoteIp);
    if (!ok) {
      throw new ForbiddenException('captcha_failed');
    }

    const record = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        message: dto.message,
      },
      select: { id: true, created_at: true },
    });

    // Notification failure must never fail the stored submission.
    try {
      await this.email.sendContactNotification({
        id: record.id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        message: dto.message,
      });
    } catch (err) {
      this.logger.error('Contact notification email failed', err);
    }

    return record;
  }
}
