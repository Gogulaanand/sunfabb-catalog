import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  address: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('AddressesService', () => {
  let service: AddressesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  describe('findAll', () => {
    it('scopes the query to the caller', async () => {
      mockPrisma.address.findMany.mockResolvedValue([]);
      await service.findAll('cust-1');
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customer_id: 'cust-1' } }),
      );
    });
  });

  describe('create', () => {
    it('attaches the caller as owner and defaults country to India', async () => {
      mockPrisma.address.create.mockResolvedValue({ id: 'a1' });
      await service.create('cust-1', {
        full_name: 'A',
        phone: '9999999999',
        line1: '1 St',
        city: 'Madurai',
        state: 'TN',
        pincode: '625001',
      });
      expect(mockPrisma.address.create).toHaveBeenCalledWith({
        data: {
          customer_id: 'cust-1',
          full_name: 'A',
          phone: '9999999999',
          line1: '1 St',
          line2: null,
          city: 'Madurai',
          state: 'TN',
          pincode: '625001',
          country: 'India',
          is_default: false,
        },
      });
    });

    it('clears any existing default before creating a new default address', async () => {
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue({ id: 'a1' });
      await service.create('cust-1', {
        full_name: 'A',
        phone: '9999999999',
        line1: '1 St',
        city: 'Madurai',
        state: 'TN',
        pincode: '625001',
        is_default: true,
      });
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customer_id: 'cust-1', is_default: true },
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes an owned address and returns ok', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'a1',
        customer_id: 'cust-1',
      });
      mockPrisma.address.delete.mockResolvedValue({});

      const result = await service.remove('cust-1', 'a1');

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.address.delete).toHaveBeenCalledWith({
        where: { id: 'a1' },
      });
    });
  });

  describe('update', () => {
    it('clears any existing default before setting is_default on update', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'a1',
        customer_id: 'cust-1',
      });
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.update.mockResolvedValue({ id: 'a1', is_default: true });

      await service.update('cust-1', 'a1', { is_default: true });

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customer_id: 'cust-1', is_default: true },
        }),
      );
      expect(mockPrisma.address.update).toHaveBeenCalled();
    });
  });

  describe('IDOR protection', () => {
    it('returns 404 (not 403) and does not update an address owned by another customer', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.update('cust-1', 'someone-elses-id', { city: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockPrisma.address.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'someone-elses-id', customer_id: 'cust-1' },
        }),
      );
      expect(mockPrisma.address.update).not.toHaveBeenCalled();
    });

    it('returns 404 and does not delete an address owned by another customer', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('cust-1', 'someone-elses-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.address.delete).not.toHaveBeenCalled();
    });

    it('updates an address the caller owns', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'a1',
        customer_id: 'cust-1',
      });
      mockPrisma.address.update.mockResolvedValue({
        id: 'a1',
        city: 'Chennai',
      });

      await service.update('cust-1', 'a1', { city: 'Chennai' });
      expect(mockPrisma.address.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' } }),
      );
    });
  });
});
