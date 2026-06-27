import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';

// CustomerJwtAuthGuard relies on CustomerJwtStrategy, which is instantiated by
// CustomerAuthModule (loaded in AppModule) and registers itself globally with
// Passport — so this module needs no extra import for the guard to work.
@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
