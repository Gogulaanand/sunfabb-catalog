import type { Manifest } from './types.js';
import type { PipelineConfig } from './config.js';

/**
 * Per-image output prices in USD from https://ai.google.dev/gemini-api/docs/pricing
 * (checked 2026-07-03). Unknown models estimate at the highest known price so the
 * confirmation gate never understates cost.
 */
const PRICE_PER_IMAGE: Record<string, Record<string, number>> = {
  'gemini-3-pro-image-preview': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
  'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
  'gemini-3.1-flash-image': { '1K': 0.067, '2K': 0.101, '4K': 0.151 },
  'gemini-3.1-flash-lite-image': { '1K': 0.034, '2K': 0.034, '4K': 0.034 },
  'gemini-2.5-flash-image': { '1K': 0.039, '2K': 0.039, '4K': 0.039 },
};

const FALLBACK_PRICE = 0.24;

export function pricePerImage(model: string, imageSize: string): number {
  return PRICE_PER_IMAGE[model]?.[imageSize] ?? FALLBACK_PRICE;
}

export interface GenerationPlanCounts {
  swatches: number;
  masterScenes: number;
  swaps: number;
}

/** Counts for a full run over the manifest (used for the upfront whole-catalog estimate). */
export function planCountsFor(manifest: Manifest, shotsPerCategory: (category: string) => number): GenerationPlanCounts {
  let swatches = 0;
  let masterScenes = 0;
  let swaps = 0;
  for (const item of manifest.items) {
    if (item.skip) continue;
    const shots = shotsPerCategory(item.category);
    swatches += item.colorways.length;
    masterScenes += shots;
    swaps += shots * Math.max(0, item.colorways.length - 1);
  }
  return { swatches, masterScenes, swaps };
}

export function estimateUsd(counts: GenerationPlanCounts, config: PipelineConfig): number {
  const scenePrice = pricePerImage(config.models.scene, config.imageSize);
  const swapPrice = pricePerImage(config.models.swap, config.imageSize);
  const total =
    counts.swatches * scenePrice + counts.masterScenes * scenePrice + counts.swaps * swapPrice;
  return Math.round(total * 100) / 100;
}

export function formatEstimate(counts: GenerationPlanCounts, config: PipelineConfig): string {
  const usd = estimateUsd(counts, config);
  return (
    `${counts.swatches} swatches + ${counts.masterScenes} master scenes ` +
    `(${config.models.scene}) + ${counts.swaps} colorway swaps (${config.models.swap}) ` +
    `at ${config.imageSize} = ~$${usd.toFixed(2)} USD`
  );
}
