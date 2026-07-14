import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductImageRole } from '../../../generated/prisma/enums.js';
import { CreateProductImageDto } from './create-product-image.dto.js';

const validImage = {
  url: 'https://res.cloudinary.com/sunfabb/image/upload/photo.jpg',
  variant_id: '11111111-1111-4111-8111-111111111111',
  image_role: ProductImageRole.GALLERY,
};

async function validationErrors(input: object) {
  return validate(plainToInstance(CreateProductImageDto, input));
}

describe('CreateProductImageDto', () => {
  it('accepts a valid role and UUID variant association', async () => {
    await expect(validationErrors(validImage)).resolves.toHaveLength(0);
  });

  it.each(['INVALID', 'swatch'])(
    'rejects image role %s',
    async (image_role) => {
      const errors = await validationErrors({ ...validImage, image_role });
      expect(errors.map((error) => error.property)).toContain('image_role');
    },
  );

  it('rejects a malformed variant UUID', async () => {
    const errors = await validationErrors({
      ...validImage,
      variant_id: 'variant-1',
    });
    expect(errors.map((error) => error.property)).toContain('variant_id');
  });

  it('accepts a shared image without a variant association', async () => {
    const { variant_id, ...sharedImage } = validImage;
    void variant_id;
    await expect(validationErrors(sharedImage)).resolves.toHaveLength(0);
  });
});
