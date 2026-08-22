import { Controller, Get } from '@nestjs/common';

/**
 * Reports that the Node process and HTTP server can accept requests.
 *
 * Keep this endpoint dependency-free so it can wake a sleeping Render service
 * without also requiring the database provider to be available.
 */
@Controller('live')
export class LivenessController {
  @Get()
  check() {
    return { status: 'live' as const };
  }
}
