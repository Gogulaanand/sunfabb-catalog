import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sceneSetFor, scenePrompt } from './prompts.js';
import { CATEGORIES } from './types.js';
import { buildPublicId } from './util.js';

test('every category has a 4-shot scene set with unique shot ids', () => {
  for (const category of CATEGORIES) {
    const set = sceneSetFor(category);
    assert.equal(set.length, 4, `${category} should have 4 shots`);
    assert.equal(new Set(set.map((s) => s.shot)).size, 4, `${category} shots must be unique`);
  }
});

test('every scene prompt carries the pattern-fidelity instruction', () => {
  for (const category of CATEGORIES) {
    for (const spec of sceneSetFor(category)) {
      const prompt = scenePrompt(category, spec.shot);
      assert.match(prompt, /Preserve the printed fabric pattern EXACTLY/);
    }
  }
});

test('scenePrompt rejects unknown shots', () => {
  assert.throws(() => scenePrompt('bedspread', 'poolside'));
});

test('buildPublicId formats catalog ids', () => {
  assert.equal(
    buildPublicId('sunfabb', '8569', 'blue', 'hero', 1),
    'sunfabb/products/8569/blue/01-hero',
  );
  assert.equal(
    buildPublicId('sunfabb', '8569', 'dusty-pink', 'swatch', 0),
    'sunfabb/products/8569/dusty-pink/swatch',
  );
});
