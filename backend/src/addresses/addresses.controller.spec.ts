import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

const mockService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const currentCustomer: CurrentCustomerData = {
  customerId: 'cust-1',
  email: 'a@example.com',
  emailVerified: false,
};

const baseDto = {
  full_name: 'Alice',
  phone: '9999999999',
  line1: '1 Main St',
  city: 'Madurai',
  state: 'TN',
  pincode: '625001',
};

const addressRow = {
  id: 'addr-1',
  customer_id: 'cust-1',
  ...baseDto,
  country: 'India',
  is_default: false,
};

describe('AddressesController', () => {
  let controller: AddressesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [{ provide: AddressesService, useValue: mockService }],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
  });

  describe('findAll', () => {
    it('returns addresses scoped to the authenticated customer', async () => {
      mockService.findAll.mockResolvedValue([addressRow]);

      const result = await controller.findAll(currentCustomer);

      expect(result).toEqual([addressRow]);
      expect(mockService.findAll).toHaveBeenCalledWith('cust-1');
    });

    it('returns an empty array when the customer has no addresses', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(currentCustomer);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates an address scoped to the authenticated customer and returns it', async () => {
      mockService.create.mockResolvedValue(addressRow);

      const result = await controller.create(currentCustomer, baseDto);

      expect(result).toEqual(addressRow);
      expect(mockService.create).toHaveBeenCalledWith('cust-1', baseDto);
    });

    it('creates a default address when is_default is true', async () => {
      const defaultRow = { ...addressRow, is_default: true };
      mockService.create.mockResolvedValue(defaultRow);

      const result = await controller.create(currentCustomer, {
        ...baseDto,
        is_default: true,
      });

      expect(result).toMatchObject({ is_default: true });
    });
  });

  describe('update', () => {
    it('updates the address and returns the updated row', async () => {
      const updated = { ...addressRow, city: 'Chennai' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(currentCustomer, 'addr-1', {
        city: 'Chennai',
      });

      expect(result).toMatchObject({ city: 'Chennai' });
      expect(mockService.update).toHaveBeenCalledWith('cust-1', 'addr-1', {
        city: 'Chennai',
      });
    });

    it('propagates NotFoundException when the address is not owned by the caller (IDOR guard)', async () => {
      mockService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update(currentCustomer, 'other-addr', { city: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes the owned address and returns ok', async () => {
      mockService.remove.mockResolvedValue({ ok: true });

      const result = await controller.remove(currentCustomer, 'addr-1');

      expect(result).toEqual({ ok: true });
      expect(mockService.remove).toHaveBeenCalledWith('cust-1', 'addr-1');
    });

    it('propagates NotFoundException when the address is not owned by the caller (IDOR guard)', async () => {
      mockService.remove.mockRejectedValue(new NotFoundException());

      await expect(
        controller.remove(currentCustomer, 'other-addr'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
