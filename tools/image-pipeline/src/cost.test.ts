import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateUsd, planCountsFor, pricePerImage } from './cost.js';
import { DEFAULT_CONFIG } from './config.js';
import type { Manifest } from './types.js';

const box = { x: 0, y: 0, w: 100, h: 100 };

const manifest: Manifest = {
  items: [
    {
      source: 'a.jpg',
      designNo: '8569',
      category: 'bedspread',
      colorways: [
        { color: 'blue', box },
        { color: 'pink', box },
        { color: 'green', box },
        { color: 'peach', box },
      ],
    },
    {
      source: 'b.jpg',
      designNo: '9001',
      category: 'towel',
      colorways: [{ color: 'white', box }],
    },
    {
      source: 'c.jpg',
      designNo: '9002',
      category: 'napkin',
      skip: true,
      colorways: [{ color: 'red', box }],
    },
  ],
};

test('planCountsFor counts swatches, masters and swaps, honoring skip', () => {
  const counts = planCountsFor(manifest, () => 4);
  // 4 + 1 colorways (skipped item excluded)
  assert.equal(counts.swatches, 5);
  // 4 shots per design, 2 designs
  assert.equal(counts.masterScenes, 8);
  // shots x (colorways - 1): 4x3 + 4x0
  assert.equal(counts.swaps, 12);
});

test('estimateUsd prices masters and swatches at the scene model, swaps at the swap model', () => {
  const counts = { swatches: 5, masterScenes: 8, swaps: 12 };
  const scenePrice = pricePerImage(DEFAULT_CONFIG.models.scene, DEFAULT_CONFIG.imageSize);
  const swapPrice = pricePerImage(DEFAULT_CONFIG.models.swap, DEFAULT_CONFIG.imageSize);
  const expected = Math.round((13 * scenePrice + 12 * swapPrice) * 100) / 100;
  assert.equal(estimateUsd(counts, DEFAULT_CONFIG), expected);
});

test('unknown models estimate at the conservative fallback price, never zero', () => {
  assert.equal(pricePerImage('some-future-model', '2K'), 0.24);
});
