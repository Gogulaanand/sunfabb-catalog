import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeleteUploadedImageDto } from './delete-uploaded-image.dto.js';

function validateInput(input: unknown) {
  return validate(plainToInstance(DeleteUploadedImageDto, input));
}

describe('DeleteUploadedImageDto', () => {
  it('accepts a nested public id owned by the sunfabb folder', async () => {
    await expect(
      validateInput({ public_id: 'sunfabb/products/image_1-test' }),
    ).resolves.toHaveLength(0);
  });

  it.each(['other-folder/image', 'sunfabb/../image', 'sunfabb/image.jpg', ''])(
    'rejects a public id outside the owned folder: %s',
    async (publicId) => {
      await expect(
        validateInput({ public_id: publicId }),
      ).resolves.not.toHaveLength(0);
    },
  );
});
