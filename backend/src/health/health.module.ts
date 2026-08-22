import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { LivenessController } from './liveness.controller.js';

@Module({
  controllers: [HealthController, LivenessController],
})
export class HealthModule {}
