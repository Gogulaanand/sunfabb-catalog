import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockMaterial = { id: 'cuid-1', name: 'Cotton' };

const mockPrisma = {
  material: {
    findMany: jest.fn(),
  },
};

describe('MaterialsService', () => {
  let service: MaterialsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('findAll', () => {
    it('returns all materials ordered by name', async () => {
      mockPrisma.material.findMany.mockResolvedValue([mockMaterial]);

      const result = await service.findAll();

      expect(result).toEqual([mockMaterial]);
      expect(mockPrisma.material.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no materials exist', async () => {
      mockPrisma.material.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
