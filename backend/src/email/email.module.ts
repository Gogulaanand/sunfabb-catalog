import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';

// Global so any module (customer-auth now, orders/shipping later) can inject
// EmailService without re-importing — mirrors PrismaModule.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
