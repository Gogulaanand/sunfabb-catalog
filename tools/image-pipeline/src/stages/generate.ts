import * as fs from 'node:fs';
import * as path from 'node:path';
import { CROPS_DIR, SCENES_DIR, SWATCHES_DIR, WORK_DIR, type PipelineConfig } from '../config.js';
import { pricePerImage } from '../cost.js';
import { GeminiClient } from '../gemini.js';
import { SWAP_PROMPT, SWATCH_PROMPT, retryNote, sceneSetFor, scenePrompt } from '../prompts.js';
import { activeItems, artifactAbsPath, loadManifest, loadState, upsertArtifact } from '../state.js';
import { artifactKey, type Artifact, type ManifestItem } from '../types.js';
import { confirm, ensureDir, mimeTypeFor, runLimited } from '../util.js';
import { cropFileName, runCrop } from './crop.js';

interface GenOp {
  kind: 'swatch' | 'scene' | 'swap';
  key: string;
  designNo: string;
  color: string;
  shot: string;
  model: string;
  /** work/-relative output path */
  file: string;
  attempts: number;
  retryNotes?: string;
  /** for scenes and swaps: the design's category */
  category?: ManifestItem['category'];
}

function needsRegen(artifact: Artifact | undefined, maxAttempts: number): boolean {
  if (!artifact) return true;
  if (artifact.status === 'qa_failed' || artifact.status === 'rejected') {
    return artifact.attempts < maxAttempts;
  }
  return false;
}

function exhausted(artifact: Artifact | undefined, maxAttempts: number): boolean {
  return (
    !!artifact &&
    (artifact.status === 'qa_failed' || artifact.status === 'rejected') &&
    artifact.attempts >= maxAttempts
  );
}

export type GenerateOutcome = 'done' | 'aborted' | 'empty';

export async function runGenerate(
  config: PipelineConfig,
  options: { yes?: boolean; dryRun?: boolean } = {},
): Promise<GenerateOutcome> {
  const manifest = loadManifest();
  const items = activeItems(manifest);
  if (items.length === 0) {
    console.log('Manifest is empty. Run: npm run pipeline -- scan');
    return 'empty';
  }
  await runCrop();
  const state = loadState();

  const swatchOps: GenOp[] = [];
  const sceneOps: GenOp[] = [];
  const swapOps: GenOp[] = [];
  const stuck: string[] = [];

  for (const item of items) {
    for (const colorway of item.colorways) {
      const key = artifactKey(item.designNo, colorway.color, 'swatch');
      const existing = state.artifacts[key];
      if (needsRegen(existing, config.maxAttempts)) {
        swatchOps.push({
          kind: 'swatch',
          key,
          designNo: item.designNo,
          color: colorway.color,
          shot: 'swatch',
          model: config.models.scene,
          file: path.join('swatches', `${item.designNo}-${colorway.color}.png`),
          attempts: (existing?.attempts ?? 0) + 1,
          retryNotes: existing?.qaNotes,
        });
      } else if (exhausted(existing, config.maxAttempts)) {
        stuck.push(key);
      }
    }

    const master = item.colorways[0];
    if (!master) continue;
    for (const spec of sceneSetFor(item.category)) {
      const masterKey = artifactKey(item.designNo, master.color, spec.shot);
      const masterArtifact = state.artifacts[masterKey];
      const regenMaster = needsRegen(masterArtifact, config.maxAttempts);
      if (regenMaster) {
        sceneOps.push({
          kind: 'scene',
          key: masterKey,
          designNo: item.designNo,
          color: master.color,
          shot: spec.shot,
          model: config.models.scene,
          file: path.join('scenes', item.designNo, master.color, `${spec.shot}.png`),
          attempts: (masterArtifact?.attempts ?? 0) + 1,
          retryNotes: masterArtifact?.qaNotes,
          category: item.category,
        });
      } else if (exhausted(masterArtifact, config.maxAttempts)) {
        stuck.push(masterKey);
      }

      for (const colorway of item.colorways.slice(1)) {
        const swapKey = artifactKey(item.designNo, colorway.color, spec.shot);
        const swapArtifact = state.artifacts[swapKey];
        // A regenerated master scene invalidates its swaps: they must re-run against the new master.
        if (needsRegen(swapArtifact, config.maxAttempts) || (regenMaster && swapArtifact)) {
          swapOps.push({
            kind: 'swap',
            key: swapKey,
            designNo: item.designNo,
            color: colorway.color,
            shot: spec.shot,
            model: config.models.swap,
            file: path.join('scenes', item.designNo, colorway.color, `${spec.shot}.png`),
            attempts: (swapArtifact?.attempts ?? 0) + 1,
            retryNotes: swapArtifact?.qaNotes,
            category: item.category,
          });
        } else if (exhausted(swapArtifact, config.maxAttempts)) {
          stuck.push(swapKey);
        }
      }
    }
  }

  if (stuck.length > 0) {
    console.log(`Needs attention (failed ${config.maxAttempts}x, will not auto-retry):`);
    for (const key of stuck) console.log(`  - ${key}`);
    console.log('Reset one by deleting its entry from work/state.json, or fix its crop/box.\n');
  }

  const total = swatchOps.length + sceneOps.length + swapOps.length;
  if (total === 0) {
    console.log('Nothing to generate. Next: npm run pipeline -- qa');
    return 'empty';
  }

  const scenePrice = pricePerImage(config.models.scene, config.imageSize);
  const swapPrice = pricePerImage(config.models.swap, config.imageSize);
  const usd =
    (swatchOps.length + sceneOps.length) * scenePrice + swapOps.length * swapPrice;
  console.log(
    `Plan: ${swatchOps.length} swatch(es) + ${sceneOps.length} master scene(s) ` +
      `[${config.models.scene}] + ${swapOps.length} swap(s) [${config.models.swap}] at ${config.imageSize}`,
  );
  console.log(`Estimated cost: ~$${usd.toFixed(2)} USD (billed to your Gemini API key)`);

  if (options.dryRun) {
    for (const op of [...swatchOps, ...sceneOps, ...swapOps]) {
      console.log(`  [${op.kind}] ${op.key} -> work/${op.file}`);
    }
    console.log('\nDry run only - nothing was generated or billed.');
    return 'aborted';
  }
  if (!options.yes && !(await confirm('Proceed and spend this?'))) {
    console.log('Aborted. Nothing was generated or billed.');
    return 'aborted';
  }

  const gemini = new GeminiClient();

  const record = (op: GenOp): void => {
    upsertArtifact(state, {
      key: op.key,
      designNo: op.designNo,
      color: op.color,
      shot: op.shot,
      file: op.file,
      status: 'generated',
      attempts: op.attempts,
    });
  };

  const readImage = (absPath: string) => ({
    data: fs.readFileSync(absPath),
    mimeType: mimeTypeFor(absPath),
  });

  const writeOutput = (op: GenOp, image: Buffer): void => {
    const absPath = path.join(WORK_DIR, op.file);
    ensureDir(path.dirname(absPath));
    fs.writeFileSync(absPath, image);
    record(op);
    console.log(`  [${op.kind}] ${op.key} done`);
  };

  const withRetryNote = (prompt: string, op: GenOp): string =>
    op.retryNotes ? prompt + retryNote(op.retryNotes) : prompt;

  ensureDir(SWATCHES_DIR);
  ensureDir(SCENES_DIR);

  console.log(`\nGenerating ${swatchOps.length} swatch(es) ...`);
  const swatchRun = await runLimited(swatchOps, config.concurrency, async (op) => {
    const crop = path.join(CROPS_DIR, cropFileName(op.designNo, op.color));
    const image = await gemini.generateImage({
      model: op.model,
      prompt: withRetryNote(SWATCH_PROMPT, op),
      images: [readImage(crop)],
      aspectRatio: '1:1',
      imageSize: config.imageSize,
      label: op.key,
    });
    writeOutput(op, image);
  });

  const swatchPath = (designNo: string, color: string): string => {
    const artifact = state.artifacts[artifactKey(designNo, color, 'swatch')];
    if (!artifact || artifact.status === 'qa_failed' || artifact.status === 'rejected') {
      throw new Error(`missing usable swatch for ${designNo}/${color}`);
    }
    return artifactAbsPath(artifact);
  };

  console.log(`\nGenerating ${sceneOps.length} master scene(s) ...`);
  const sceneRun = await runLimited(sceneOps, config.concurrency, async (op) => {
    const image = await gemini.generateImage({
      model: op.model,
      prompt: withRetryNote(scenePrompt(op.category ?? 'other', op.shot), op),
      images: [readImage(swatchPath(op.designNo, op.color))],
      aspectRatio: config.sceneAspectRatio,
      imageSize: config.imageSize,
      label: op.key,
    });
    writeOutput(op, image);
  });

  console.log(`\nGenerating ${swapOps.length} colorway swap(s) ...`);
  const swapRun = await runLimited(swapOps, config.concurrency, async (op) => {
    const item = items.find((i) => i.designNo === op.designNo);
    const masterColor = item?.colorways[0]?.color;
    if (!masterColor) throw new Error(`no master colorway for ${op.designNo}`);
    const masterArtifact = state.artifacts[artifactKey(op.designNo, masterColor, op.shot)];
    if (!masterArtifact) throw new Error(`master scene missing for ${op.designNo}/${op.shot}`);
    const image = await gemini.generateImage({
      model: op.model,
      prompt: withRetryNote(SWAP_PROMPT, op),
      images: [
        readImage(artifactAbsPath(masterArtifact)),
        readImage(swatchPath(op.designNo, op.color)),
      ],
      aspectRatio: config.sceneAspectRatio,
      imageSize: config.imageSize,
      label: op.key,
    });
    writeOutput(op, image);
  });

  const failed = [...swatchRun.failed, ...sceneRun.failed, ...swapRun.failed];
  console.log(
    `\nGenerated ${swatchRun.ok + sceneRun.ok + swapRun.ok}/${total} image(s)` +
      (failed.length > 0 ? `, ${failed.length} failed:` : '.'),
  );
  for (const failure of failed) {
    console.log(`  - ${(failure.item as GenOp).key}: ${failure.error.message}`);
  }
  console.log('\nNext: npm run pipeline -- qa');
  return 'done';
}
