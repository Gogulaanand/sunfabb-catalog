import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildManualSteps } from './stages/manual.js';
import type { ManifestItem } from './types.js';

const box = { x: 0, y: 0, w: 100, h: 100 };

const item: ManifestItem = {
  source: 'a.jpg',
  designNo: '8569',
  category: 'bedspread',
  colorways: [
    { color: 'blue', box },
    { color: 'pink', box },
  ],
};

test('buildManualSteps orders swatches, then master scenes, then swaps', () => {
  const steps = buildManualSteps(item);
  // 2 swatches + 4 master scenes + 4 swaps (4 shots x 1 non-master colorway)
  assert.equal(steps.length, 10);
  assert.deepEqual(
    steps.map((s) => s.kind),
    ['swatch', 'swatch', 'scene', 'scene', 'scene', 'scene', 'swap', 'swap', 'swap', 'swap'],
  );
});

test('steps attach only files produced by earlier steps or crops', () => {
  const steps = buildManualSteps(item);
  const produced = new Set<string>();
  for (const step of steps) {
    for (const attachment of step.attach) {
      const isCrop = attachment.startsWith('work/crops/');
      assert.ok(
        isCrop || produced.has(attachment),
        `step ${step.key} attaches ${attachment} before it exists`,
      );
    }
    produced.add(step.saveAs);
  }
});

test('swap steps attach the master scene first, then the target swatch', () => {
  const swap = buildManualSteps(item).find((s) => s.kind === 'swap');
  assert.ok(swap);
  assert.equal(swap.attach[0], 'work/scenes/8569/blue/hero.png');
  assert.equal(swap.attach[1], 'work/swatches/8569-pink.png');
  assert.equal(swap.saveAs, 'work/scenes/8569/pink/hero.png');
});

test('every step prompt carries the fidelity instruction and an aspect note', () => {
  for (const step of buildManualSteps(item)) {
    assert.match(step.prompt, /Preserve the printed fabric pattern EXACTLY/);
    assert.match(step.prompt, /aspect ratio/i);
  }
});
