import { Test, TestingModule } from '@nestjs/testing';
import { ColorsController } from './colors.controller.js';
import { ColorsService } from './colors.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockColor = { id: 'cuid-1', name: 'White', hex_code: '#FFFFFF' };

const mockColorsService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ColorsController', () => {
  let controller: ColorsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColorsController],
      providers: [{ provide: ColorsService, useValue: mockColorsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ColorsController>(ColorsController);
  });

  describe('findAll', () => {
    it('returns all colors', async () => {
      mockColorsService.findAll.mockResolvedValue([mockColor]);

      const result = await controller.findAll();

      expect(result).toEqual([mockColor]);
      expect(mockColorsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('creates a color', async () => {
      const dto = { name: 'Navy', hex_code: '#000080' };
      mockColorsService.create.mockResolvedValue({ id: 'cuid-2', ...dto });

      const result = await controller.create(dto);

      expect(result).toEqual({ id: 'cuid-2', ...dto });
      expect(mockColorsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates a color', async () => {
      const dto = { hex_code: '#F5F5F5' };
      mockColorsService.update.mockResolvedValue({ ...mockColor, ...dto });

      const result = await controller.update('cuid-1', dto);

      expect(result).toEqual({ ...mockColor, ...dto });
      expect(mockColorsService.update).toHaveBeenCalledWith('cuid-1', dto);
    });
  });

  describe('remove', () => {
    it('removes a color', async () => {
      mockColorsService.remove.mockResolvedValue(mockColor);

      const result = await controller.remove('cuid-1');

      expect(result).toEqual(mockColor);
      expect(mockColorsService.remove).toHaveBeenCalledWith('cuid-1');
    });
  });
});
