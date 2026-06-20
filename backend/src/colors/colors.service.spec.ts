import { Test, TestingModule } from '@nestjs/testing';
import { ColorsService } from './colors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockColor = { id: 'cuid-1', name: 'White', hex_code: '#FFFFFF' };

const mockPrisma = {
  color: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ColorsService', () => {
  let service: ColorsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ColorsService>(ColorsService);
  });

  describe('findAll', () => {
    it('returns all colors ordered by name', async () => {
      mockPrisma.color.findMany.mockResolvedValue([mockColor]);

      const result = await service.findAll();

      expect(result).toEqual([mockColor]);
      expect(mockPrisma.color.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no colors exist', async () => {
      mockPrisma.color.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a color', async () => {
      const dto = { name: 'Navy', hex_code: '#000080' };
      mockPrisma.color.create.mockResolvedValue({ id: 'cuid-2', ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ id: 'cuid-2', ...dto });
      expect(mockPrisma.color.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('updates a color', async () => {
      const dto = { hex_code: '#F5F5F5' };
      mockPrisma.color.update.mockResolvedValue({ ...mockColor, ...dto });

      const result = await service.update('cuid-1', dto);

      expect(result).toEqual({ ...mockColor, ...dto });
      expect(mockPrisma.color.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('deletes a color', async () => {
      mockPrisma.color.delete.mockResolvedValue(mockColor);

      const result = await service.remove('cuid-1');

      expect(result).toEqual(mockColor);
      expect(mockPrisma.color.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
      });
    });
  });
});
