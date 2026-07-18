import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Workspace root: tools/image-pipeline */
export const ROOT = path.resolve(here, '..');
export const INPUT_DIR = path.join(ROOT, 'input');
export const WORK_DIR = path.join(ROOT, 'work');
export const CROPS_DIR = path.join(WORK_DIR, 'crops');
export const SWATCHES_DIR = path.join(WORK_DIR, 'swatches');
export const SCENES_DIR = path.join(WORK_DIR, 'scenes');
export const MANIFEST_PATH = path.join(WORK_DIR, 'manifest.json');
export const STATE_PATH = path.join(WORK_DIR, 'state.json');
export const UPLOADS_PATH = path.join(WORK_DIR, 'uploads.json');

/** Repo root, for the backend/.env Cloudinary fallback. */
const REPO_ROOT = path.resolve(ROOT, '..', '..');

export interface Models {
  /** Vision analysis for scan + QA. Free tier is enough. */
  analysis: string;
  /** Swatch extraction and master scenes: highest fidelity. */
  scene: string;
  /** Colorway swaps: the bulk of the volume, cheaper model. */
  swap: string;
}

export interface PipelineConfig {
  models: Models;
  /** Output resolution for generated images: 1K | 2K | 4K. */
  imageSize: '1K' | '2K' | '4K';
  /** Aspect ratio for all scene shots, kept uniform for the carousel. */
  sceneAspectRatio: string;
  /** QA fidelity threshold 0-10; below this an image is qa_failed. */
  qaThreshold: number;
  /** Max generation attempts per artifact (1 initial + retries). */
  maxAttempts: number;
  /** Parallel generation calls. */
  concurrency: number;
  reviewPort: number;
}

export const DEFAULT_CONFIG: PipelineConfig = {
  models: {
    analysis: 'gemini-flash-latest',
    scene: 'gemini-3-pro-image-preview',
    swap: 'gemini-3.1-flash-image',
  },
  imageSize: '1K',
  sceneAspectRatio: '4:3',
  qaThreshold: 7,
  maxAttempts: 2,
  concurrency: 2,
  reviewPort: 4977,
};

const CONFIG_PATH = path.join(ROOT, 'pipeline.config.json');

export function loadConfig(): PipelineConfig {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Partial<PipelineConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    models: { ...DEFAULT_CONFIG.models, ...(raw.models ?? {}) },
  };
}

let envLoaded = false;

/** Load .env from the tool dir, then backfill Cloudinary vars from backend/.env. */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  dotenv.config({ path: path.join(ROOT, '.env') });
  const backendEnvPath = path.join(REPO_ROOT, 'backend', '.env');
  if (fs.existsSync(backendEnvPath)) {
    const backend = dotenv.parse(fs.readFileSync(backendEnvPath, 'utf8'));
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (!process.env[key] && backend[key]) process.env[key] = backend[key];
    }
  }
}

/** Fail fast: each stage requires exactly the env vars it uses (project rule D31). */
export function requireEnv(names: string[]): Record<string, string> {
  loadEnv();
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}.\n` +
        `Set them in tools/image-pipeline/.env (see .env.example).`,
    );
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n] as string]));
}

export function cloudinaryFolder(): string {
  loadEnv();
  return process.env.CLOUDINARY_FOLDER || 'sunfabb';
}
