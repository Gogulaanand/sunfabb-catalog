import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddItemDto } from './dto/add-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { MergeCartDto } from './dto/merge-cart.dto.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller('me')
@UseGuards(CustomerJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('cart')
  getCart(@CurrentCustomer() customer: CurrentCustomerData) {
    return this.cartService.getCart(customer.customerId);
  }

  @Post('cart/items')
  addItem(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: AddItemDto,
  ) {
    return this.cartService.addItem(customer.customerId, dto);
  }

  @Patch('cart/items/:id')
  updateItem(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(customer.customerId, id, dto);
  }

  @Delete('cart/items/:id')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Param('id') id: string,
  ) {
    return this.cartService.removeItem(customer.customerId, id);
  }

  @Post('cart/merge')
  mergeCart(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: MergeCartDto,
  ) {
    return this.cartService.mergeCart(customer.customerId, dto);
  }
}
