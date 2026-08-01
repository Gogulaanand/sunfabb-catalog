import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const startedAt = process.hrtime.bigint();

    try {
      await this.prisma.category.count();
      return { status: 'ok' as const };
    } catch (error) {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.error(
        JSON.stringify({
          event: 'health_check_failed',
          duration_ms: Number(durationMs.toFixed(2)),
          error: error instanceof Error ? error.name : 'unknown',
        }),
      );
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
