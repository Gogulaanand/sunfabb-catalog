import { Test, TestingModule } from '@nestjs/testing';
import { ColorsController } from './colors.controller.js';
import { ColorsService } from './colors.service.js';

const mockColor = { id: 'cuid-1', name: 'White', hex_code: '#FFFFFF' };

const mockColorsService = {
  findAll: jest.fn(),
};

describe('ColorsController', () => {
  let controller: ColorsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColorsController],
      providers: [{ provide: ColorsService, useValue: mockColorsService }],
    }).compile();

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
});
