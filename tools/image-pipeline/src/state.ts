import * as fs from 'node:fs';
import * as path from 'node:path';
import { MANIFEST_PATH, STATE_PATH, WORK_DIR } from './config.js';
import { ensureDir } from './util.js';
import {
  Manifest,
  ManifestSchema,
  State,
  StateSchema,
  type Artifact,
  isGenerationReady,
} from './types.js';

export function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) return { items: [] };
  const base = ManifestSchema.parse(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')));
  const classified166Path = path.join(WORK_DIR, '..', 'classification', '166-pilots.json');
  const classified166 = process.env.IMAGE_PIPELINE_INCLUDE_CLASSIFIED_166 === 'false'
    ? { items: [] }
    : fs.existsSync(classified166Path)
      ? ManifestSchema.parse(JSON.parse(fs.readFileSync(classified166Path, 'utf8')))
      : { items: [] };
  return ManifestSchema.parse({ items: [...base.items, ...classified166.items] });
}

export function saveManifest(manifest: Manifest): void {
  ensureDir(path.dirname(MANIFEST_PATH));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

export function activeItems(manifest: Manifest) {
  return manifest.items.filter((item) => !item.skip);
}

export function generationReadyItems(manifest: Manifest) {
  return activeItems(manifest).filter(isGenerationReady);
}

export function loadState(): State {
  if (!fs.existsSync(STATE_PATH)) return { artifacts: {} };
  return StateSchema.parse(JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')));
}

export function saveState(state: State): void {
  ensureDir(path.dirname(STATE_PATH));
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

export function upsertArtifact(state: State, artifact: Artifact): void {
  state.artifacts[artifact.key] = artifact;
  saveState(state);
}

/** Absolute path of an artifact's image file. */
export function artifactAbsPath(artifact: Artifact): string {
  return path.join(WORK_DIR, artifact.file);
}

export function artifactsByStatus(state: State, statuses: Artifact['status'][]): Artifact[] {
  const wanted = new Set(statuses);
  return Object.values(state.artifacts).filter((a) => wanted.has(a.status));
}
