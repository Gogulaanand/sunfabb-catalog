import { Test, TestingModule } from '@nestjs/testing';
import { VariantsController } from './variants.controller.js';
import { VariantsService } from './variants.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockVariant = {
  id: 'cuid-var-1',
  product_id: 'cuid-1',
  material_id: 'cuid-mat-1',
  color_id: 'cuid-col-1',
  size: 'Queen',
  price: 250000,
  stock_quantity: 10,
  sku: 'BED-Q-WHT',
  is_active: true,
};

const mockVariantsService = {
  update: jest.fn(),
  remove: jest.fn(),
};

describe('VariantsController', () => {
  let controller: VariantsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [{ provide: VariantsService, useValue: mockVariantsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VariantsController>(VariantsController);
  });

  describe('update', () => {
    it('updates a variant', async () => {
      const dto = { price: 270000 };
      mockVariantsService.update.mockResolvedValue({ ...mockVariant, ...dto });

      const result = await controller.update('cuid-var-1', dto);

      expect(result).toEqual({ ...mockVariant, ...dto });
      expect(mockVariantsService.update).toHaveBeenCalledWith(
        'cuid-var-1',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('removes a variant', async () => {
      mockVariantsService.remove.mockResolvedValue({
        ...mockVariant,
        is_active: false,
      });

      const result = await controller.remove('cuid-var-1');

      expect(result).toEqual({ ...mockVariant, is_active: false });
      expect(mockVariantsService.remove).toHaveBeenCalledWith('cuid-var-1');
    });
  });
});
