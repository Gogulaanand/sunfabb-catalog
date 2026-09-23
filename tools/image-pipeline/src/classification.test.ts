import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unresolvedCandidates } from './classification.js';
import { classificationReadinessIssues, isGenerationReady } from './types.js';
import type { ManifestItem } from './types.js';

test('166 grid classification remains deterministic and preserves the omitted duplicate', () => {
  const grid = unresolvedCandidates().filter((candidate) => candidate.source.startsWith('166fe617'));
  assert.equal(grid.length, 12);
  assert.equal(grid.filter((candidate) => candidate.status === 'duplicate').length, 1);
  assert.equal(grid.filter((candidate) => candidate.status === 'ready').length, 11);
  assert.equal(grid.find((candidate) => candidate.candidateId === 'SC-166F-R2C4')?.setContents?.pillowCoverCount, 0);
});

test('unclassified records never reach generation', () => {
  const item: ManifestItem = {
    source: 'unknown.jpg',
    designNo: 'SC-UNKNOWN',
    category: 'other',
    colorways: [{ color: 'source', box: { x: 0, y: 0, w: 100, h: 100 } }],
  };
  assert.equal(isGenerationReady(item), false);
  assert.match(classificationReadinessIssues(item).join(' '), /missing release classification/);
});
