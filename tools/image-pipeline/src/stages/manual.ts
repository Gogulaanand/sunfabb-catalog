import * as fs from 'node:fs';
import * as path from 'node:path';
import { WORK_DIR } from '../config.js';
import { SWAP_PROMPT, SWATCH_PROMPT, sceneSetFor, scenePrompt } from '../prompts.js';
import { activeItems, loadManifest, loadState, upsertArtifact } from '../state.js';
import { artifactKey, type ManifestItem } from '../types.js';
import { ensureDir } from '../util.js';
import { cropFileName } from './crop.js';

export interface ManualStep {
  kind: 'swatch' | 'scene' | 'swap';
  key: string;
  /** Files to attach to the chat, relative to tools/image-pipeline/. */
  attach: string[];
  /** Where to save the downloaded result, relative to tools/image-pipeline/. */
  saveAs: string;
  prompt: string;
}

const SQUARE_NOTE = ' Square 1:1 aspect ratio.';
const LANDSCAPE_NOTE = ' Landscape 4:3 aspect ratio.';

function swatchPath(designNo: string, color: string): string {
  return path.posix.join('work', 'swatches', `${designNo}-${color}.png`);
}

function scenePath(designNo: string, color: string, shot: string): string {
  return path.posix.join('work', 'scenes', designNo, color, `${shot}.png`);
}

/**
 * The manual-generation plan for one design, in dependency order:
 * swatches first, then master scenes (attach the first colorway's swatch),
 * then swaps (attach the master scene + the target colorway's swatch).
 */
export function buildManualSteps(item: ManifestItem): ManualStep[] {
  const steps: ManualStep[] = [];
  for (const colorway of item.colorways) {
    steps.push({
      kind: 'swatch',
      key: artifactKey(item.designNo, colorway.color, 'swatch'),
      attach: [path.posix.join('work', 'crops', cropFileName(item.designNo, colorway.color))],
      saveAs: swatchPath(item.designNo, colorway.color),
      prompt: SWATCH_PROMPT + SQUARE_NOTE,
    });
  }
  const master = item.colorways[0];
  if (!master) return steps;
  for (const spec of sceneSetFor(item.category)) {
    steps.push({
      kind: 'scene',
      key: artifactKey(item.designNo, master.color, spec.shot),
      attach: [swatchPath(item.designNo, master.color)],
      saveAs: scenePath(item.designNo, master.color, spec.shot),
      prompt: scenePrompt(item.category, spec.shot) + LANDSCAPE_NOTE,
    });
  }
  for (const spec of sceneSetFor(item.category)) {
    for (const colorway of item.colorways.slice(1)) {
      steps.push({
        kind: 'swap',
        key: artifactKey(item.designNo, colorway.color, spec.shot),
        attach: [
          scenePath(item.designNo, master.color, spec.shot),
          swatchPath(item.designNo, colorway.color),
        ],
        saveAs: scenePath(item.designNo, colorway.color, spec.shot),
        prompt: SWAP_PROMPT + LANDSCAPE_NOTE,
      });
    }
  }
  return steps;
}

function stepsMarkdown(item: ManifestItem, steps: ManualStep[]): string {
  const lines: string[] = [
    `# Manual generation steps - design ${item.designNo} (${item.category})`,
    '',
    'Execute in order: later steps attach files produced by earlier ones.',
    'For each step: start a NEW chat in the Gemini app, attach the file(s), paste the prompt,',
    'download the generated image, and save it to the exact path shown.',
    '',
  ];
  steps.forEach((step, i) => {
    lines.push(
      `## Step ${i + 1} of ${steps.length} - ${step.kind}: ${step.key}`,
      '',
      ...step.attach.map((file, j) => `Attach ${j + 1}: ${file}`),
      `Save result as: ${step.saveAs}`,
      '',
      'Prompt:',
      '```',
      step.prompt,
      '```',
      '',
    );
  });
  return lines.join('\n');
}

/** Write work/prep/{design}-steps.md for every active design. */
export function runPrep(): void {
  const items = activeItems(loadManifest());
  if (items.length === 0) {
    console.log('Manifest is empty. Run: npm run pipeline -- scan');
    return;
  }
  const prepDir = path.join(WORK_DIR, 'prep');
  ensureDir(prepDir);
  let total = 0;
  for (const item of items) {
    const steps = buildManualSteps(item);
    const outPath = path.join(prepDir, `${item.designNo}-steps.md`);
    fs.writeFileSync(outPath, stepsMarkdown(item, steps));
    console.log(`  ${outPath} (${steps.length} steps)`);
    total += steps.length;
  }
  console.log(`\n${total} generation step(s) across ${items.length} design(s).`);
  console.log('Generate each image in the Gemini app, save to the listed paths, then run:');
  console.log('  npm run pipeline -- import');
}

const IMPORT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** Given a step's saveAs ("work/..."), find the file on disk; returns a work/-relative path. */
function findExisting(saveAsPng: string): string | undefined {
  const base = saveAsPng.replace(/^work\//, '').replace(/\.png$/, '');
  for (const ext of IMPORT_EXTENSIONS) {
    const candidate = `${base}.${ext}`;
    if (fs.existsSync(path.join(WORK_DIR, candidate))) return candidate;
  }
  return undefined;
}

/** Register manually generated files (from prep steps) as pipeline artifacts. */
export function runImport(): void {
  const items = activeItems(loadManifest());
  const state = loadState();
  let added = 0;
  let missing = 0;
  for (const item of items) {
    for (const step of buildManualSteps(item)) {
      if (state.artifacts[step.key]) continue;
      const found = findExisting(step.saveAs);
      if (!found) {
        missing += 1;
        continue;
      }
      const [designNo, color, shot] = step.key.split('/') as [string, string, string];
      upsertArtifact(state, {
        key: step.key,
        designNo,
        color,
        shot,
        file: found,
        status: 'generated',
        attempts: 1,
      });
      added += 1;
    }
  }
  console.log(`Imported ${added} image(s) as generated; ${missing} step output(s) not found yet.`);
  if (added > 0) console.log('Next: npm run pipeline -- qa');
}
