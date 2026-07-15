import { ProductImageRole } from '../../generated/prisma/enums.js';
import {
  classifyKnownSwatches,
  TARGET_PRODUCT_SLUGS,
  type SwatchBackfillOperations,
  type SwatchBackfillRecord,
} from '../../prisma/backfill-product-image-roles.js';

function makeRecords(
  role: ProductImageRole = ProductImageRole.GALLERY,
): SwatchBackfillRecord[] {
  return TARGET_PRODUCT_SLUGS.flatMap((slug, productIndex) =>
    Array.from({ length: 4 }, (_, imageIndex) => ({
      id: `image-${productIndex}-${imageIndex}`,
      variant_id: `variant-${productIndex}-${imageIndex}`,
      image_role: role,
      is_primary: false,
      product: { slug },
    })),
  );
}

function makeOperations(
  records: SwatchBackfillRecord[],
): SwatchBackfillOperations {
  return {
    findMatchingSwatches: jest.fn().mockResolvedValue(records),
    classifySwatch: jest.fn().mockImplementation((imageId: string) => {
      const image = records.find((record) => record.id === imageId);
      if (image) {
        image.image_role = ProductImageRole.SWATCH;
        image.is_primary = false;
      }
      return Promise.resolve();
    }),
  };
}

describe('classifyKnownSwatches', () => {
  it('runs the count and association preflight before updating', async () => {
    const operations = makeOperations(makeRecords().slice(0, 11));

    await expect(classifyKnownSwatches(operations)).rejects.toThrow(
      'expected exactly 12 matching records',
    );
    expect(operations.classifySwatch).not.toHaveBeenCalled();
  });

  it('aborts without updates when a matching image has no variant', async () => {
    const records = makeRecords();
    records[0].variant_id = null;
    const operations = makeOperations(records);

    await expect(classifyKnownSwatches(operations)).rejects.toThrow(
      'has no variant association',
    );
    expect(operations.classifySwatch).not.toHaveBeenCalled();
  });

  it('aborts without updates when a target product is missing', async () => {
    const records = makeRecords();
    records.slice(0, 4).forEach((record) => {
      record.product.slug = 'unrecognized-product';
    });
    const operations = makeOperations(records);

    await expect(classifyKnownSwatches(operations)).rejects.toThrow(
      "no matching record belongs to 'bedspread-design-8569'",
    );
    expect(operations.classifySwatch).not.toHaveBeenCalled();
  });

  it('aborts when the total is correct but the per-product counts are uneven', async () => {
    const records = makeRecords();
    records[0].product.slug = TARGET_PRODUCT_SLUGS[1];
    const operations = makeOperations(records);

    await expect(classifyKnownSwatches(operations)).rejects.toThrow(
      "expected exactly 4 matching records for 'bedspread-design-8569', found 3",
    );
    expect(operations.classifySwatch).not.toHaveBeenCalled();
  });

  it('classifies all twelve known swatches', async () => {
    const operations = makeOperations(makeRecords());

    await expect(classifyKnownSwatches(operations)).resolves.toBe(12);
    expect(operations.classifySwatch).toHaveBeenCalledTimes(12);
  });

  it('is idempotent when the records are already classified', async () => {
    const operations = makeOperations(makeRecords(ProductImageRole.SWATCH));

    await expect(classifyKnownSwatches(operations)).resolves.toBe(0);
    expect(operations.classifySwatch).not.toHaveBeenCalled();
  });

  it('removes primary status from an already-classified swatch', async () => {
    const records = makeRecords(ProductImageRole.SWATCH);
    records[0].is_primary = true;
    const operations = makeOperations(records);

    await expect(classifyKnownSwatches(operations)).resolves.toBe(1);
    expect(operations.classifySwatch).toHaveBeenCalledWith(records[0].id);
    expect(records[0].is_primary).toBe(false);
  });
});
