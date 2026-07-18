import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ManifestSchema, artifactKey, box2dToPixels, slugify } from './types.js';

test('box2dToPixels converts normalized boxes and insets every side', () => {
  // Full image, no inset: exact bounds.
  const full = box2dToPixels([0, 0, 1000, 1000], 1000, 2000, 0);
  assert.deepEqual(full, { x: 0, y: 0, w: 1000, h: 2000 });

  // A 100..300 x-band on a 1000px-wide image with 10% inset: 200px wide -> 20px in from each side.
  const band = box2dToPixels([0, 100, 1000, 300], 1000, 1000, 0.1);
  assert.equal(band.x, 120);
  assert.equal(band.w, 160);
  assert.equal(band.y, 100);
  assert.equal(band.h, 800);
});

test('box2dToPixels clamps to image bounds', () => {
  const box = box2dToPixels([900, 900, 1100, 1100], 500, 500, 0);
  assert.ok(box.x + box.w <= 500);
  assert.ok(box.y + box.h <= 500);
});

test('slugify produces color slugs', () => {
  assert.equal(slugify('Dusty Pink'), 'dusty-pink');
  assert.equal(slugify('  Sage / Green  '), 'sage-green');
  assert.equal(slugify('***'), 'unnamed');
});

test('manifest schema rejects bad data at the boundary', () => {
  const good = {
    items: [
      {
        source: 'a.jpg',
        designNo: '8569',
        category: 'bedspread',
        colorways: [{ color: 'blue', box: { x: 0, y: 0, w: 100, h: 100 } }],
      },
    ],
  };
  assert.ok(ManifestSchema.safeParse(good).success);

  const badCategory = structuredClone(good);
  badCategory.items[0]!.category = 'sofa';
  assert.equal(ManifestSchema.safeParse(badCategory).success, false);

  const badColor = structuredClone(good);
  badColor.items[0]!.colorways[0]!.color = 'Dusty Pink';
  assert.equal(ManifestSchema.safeParse(badColor).success, false);

  const emptyColorways = structuredClone(good);
  emptyColorways.items[0]!.colorways = [];
  assert.equal(ManifestSchema.safeParse(emptyColorways).success, false);
});

test('artifactKey is stable', () => {
  assert.equal(artifactKey('8569', 'blue', 'hero'), '8569/blue/hero');
});
