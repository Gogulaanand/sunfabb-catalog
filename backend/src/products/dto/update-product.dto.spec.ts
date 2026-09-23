import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProductDto } from './update-product.dto.js';

async function validationErrors(input: object) {
  return validate(plainToInstance(UpdateProductDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateProductDto', () => {
  it('accepts editable product fields', async () => {
    await expect(
      validationErrors({
        name: 'Updated Bedspread',
        description: null,
        care_instructions: null,
        measured_width_cm: 240.5,
        measured_length_cm: 260,
        set_contents: '1 bedspread and 1 pillow cover',
        category_id: 'category-1',
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects non-positive measured dimensions', async () => {
    const errors = await validationErrors({ measured_width_cm: 0 });

    expect(errors.map((error) => error.property)).toContain(
      'measured_width_cm',
    );
  });

  it('rejects lifecycle fields from generic product updates', async () => {
    const errors = await validationErrors({ is_active: true });

    expect(errors.map((error) => error.property)).toContain('is_active');
  });

  it('global validation rejects the forbidden field before controller execution', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        { is_active: true },
        { type: 'body', metatype: UpdateProductDto, data: '' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
