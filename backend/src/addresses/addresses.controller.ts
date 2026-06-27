import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller('me/addresses')
@UseGuards(CustomerJwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findAll(@CurrentCustomer() customer: CurrentCustomerData) {
    return this.addressesService.findAll(customer.customerId);
  }

  @Post()
  create(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(customer.customerId, dto);
  }

  @Patch(':id')
  update(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(customer.customerId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(customer.customerId, id);
  }
}
