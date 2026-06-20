import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockMaterial = { id: 'cuid-1', name: 'Cotton' };

const mockMaterialsService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  describe('create', () => {
    it('creates a material', async () => {
      const dto = { name: 'Linen' };
      mockMaterialsService.create.mockResolvedValue({ id: 'cuid-2', ...dto });

      const result = await controller.create(dto);

      expect(result).toEqual({ id: 'cuid-2', ...dto });
      expect(mockMaterialsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates a material', async () => {
      const dto = { name: 'Egyptian Cotton' };
      mockMaterialsService.update.mockResolvedValue({
        ...mockMaterial,
        ...dto,
      });

      const result = await controller.update('cuid-1', dto);

      expect(result).toEqual({ ...mockMaterial, ...dto });
      expect(mockMaterialsService.update).toHaveBeenCalledWith('cuid-1', dto);
    });
  });

  describe('remove', () => {
    it('removes a material', async () => {
      mockMaterialsService.remove.mockResolvedValue(mockMaterial);

      const result = await controller.remove('cuid-1');

      expect(result).toEqual(mockMaterial);
      expect(mockMaterialsService.remove).toHaveBeenCalledWith('cuid-1');
    });
  });
});
