import { Test, TestingModule } from '@nestjs/testing';
import { ColorsService } from './colors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockColor = { id: 'cuid-1', name: 'White', hex_code: '#FFFFFF' };

const mockPrisma = {
  color: {
    findMany: jest.fn(),
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
});
