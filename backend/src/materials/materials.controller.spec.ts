import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';

const mockMaterial = { id: 'cuid-1', name: 'Cotton' };

const mockMaterialsService = {
  findAll: jest.fn(),
};

describe('MaterialsController', () => {
  let controller: MaterialsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [
        { provide: MaterialsService, useValue: mockMaterialsService },
      ],
    }).compile();

    controller = module.get<MaterialsController>(MaterialsController);
  });

  describe('findAll', () => {
    it('returns all materials', async () => {
      mockMaterialsService.findAll.mockResolvedValue([mockMaterial]);

      const result = await controller.findAll();

      expect(result).toEqual([mockMaterial]);
      expect(mockMaterialsService.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
