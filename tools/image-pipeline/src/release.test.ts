import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireUploadMetadata } from './release.js';
import { classificationReadinessIssues, isGenerationReady, publicationReadinessIssues, ReleaseMetadataSchema } from './types.js';
import type { ManifestItem } from './types.js';

const base: ManifestItem = {
  source: 'photo.jpg',
  designNo: 'SC-TEST-1',
  category: 'bedspread',
  colorways: [{ color: 'blue', box: { x: 0, y: 0, w: 100, h: 100 } }],
  release: {
    productType: 'bedspread',
    measuredWidthCm: 240,
    measuredLengthCm: 260,
    materialConstruction: 'woven cotton textile',
    setContents: { pieces: ['bedspread', 'pillow cover'], pillowCoverCount: 1 },
    sourceQuality: 'accepted',
    classificationStatus: 'ready',
    commercialDesignNo: '1001',
    commercialName: 'Blue Check',
    variantSize: 'Queen',
    materialName: 'Cotton',
    pricePaise: 100000,
    stockQuantity: 4,
    description: 'Blue checked woven bedspread with one matching pillow cover.',
    careInstructions: 'Machine wash separately in cold water.',
  },
};

test('complete owner release metadata is accepted without defaults', () => {
  assert.equal(isGenerationReady(base), true);
  assert.deepEqual(classificationReadinessIssues(base), []);
  assert.deepEqual(publicationReadinessIssues(base), []);
  assert.equal(requireUploadMetadata(base).pricePaise, 100000);
});

test('commercial publication remains blocked when copy is missing', () => {
  const withoutCopy: ManifestItem = {
    ...base,
    release: { ...base.release!, description: undefined, careInstructions: undefined },
  };
  assert.deepEqual(classificationReadinessIssues(withoutCopy), []);
  assert.match(publicationReadinessIssues(withoutCopy).join(' '), /description|care instructions/);
  assert.throws(() => requireUploadMetadata(withoutCopy), /commercial description is missing/);
});

test('schema rejects blank commercial values instead of treating them as approval', () => {
  assert.throws(() => ReleaseMetadataSchema.parse({
    ...base.release,
    commercialName: '   ',
  }), /String must contain at least 1 character/);
});

test('classification can be generation-ready while publication metadata is incomplete', () => {
  const classified: ManifestItem = {
    ...base,
    release: {
      ...base.release!,
      commercialDesignNo: null,
      commercialName: null,
      variantSize: null,
      materialName: null,
      pricePaise: null,
      stockQuantity: null,
      description: null,
      careInstructions: null,
    },
  };
  assert.equal(isGenerationReady(classified), true);
  assert.match(publicationReadinessIssues(classified).join(' '), /commercial design number/);
  assert.throws(() => requireUploadMetadata(classified), /commercial design number/);
});
