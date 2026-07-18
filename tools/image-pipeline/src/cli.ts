import { INPUT_DIR, loadConfig, loadEnv } from './config.js';
import { estimateUsd, formatEstimate, planCountsFor } from './cost.js';
import { sceneSetFor } from './prompts.js';
import { activeItems, artifactsByStatus, loadManifest, loadState } from './state.js';
import { ARTIFACT_STATUSES, type Category } from './types.js';
import { ensureDir } from './util.js';
import { runCrop } from './stages/crop.js';
import { runGenerate } from './stages/generate.js';
import { runImport, runPrep } from './stages/manual.js';
import { runQa } from './stages/qa.js';
import { runReview } from './stages/review.js';
import { runScan } from './stages/scan.js';
import { runUpload } from './stages/upload.js';

const USAGE = `Catalog image pipeline. Usage: npm run pipeline -- <command> [flags]

Commands (in workflow order):
  scan        Analyze photos in input/: design number, category, colorways -> work/manifest.json
              Checkpoint A: review/edit work/manifest.json afterwards.
  crop        Cut each colorway into its own reference crop (work/crops/)
  generate    Generate swatches, master scenes and colorway swaps  [--yes] [--dry-run]
              Prints the cost estimate and asks before spending.
  prep        Free/manual mode: write per-design step files (prompt + attachments +
              save path) to work/prep/ for generation in the Gemini app
  import      Free/manual mode: register images saved to the prep step paths
  qa          Score every generated image against its reference fabric
  review      Open the approval gallery (Checkpoint B) in your browser
  upload      Upload approved images to Cloudinary  [--yes]
  run         generate -> qa -> generate (retries) -> qa            [--yes]
  status      Show progress and estimated remaining cost
  doctor      Check env vars, models and connectivity

Flags:
  --yes       Skip confirmation prompts
  --dry-run   generate only: print the plan and cost, call nothing
  --force     crop only: re-cut crops that already exist`;

async function status(): Promise<void> {
  const config = loadConfig();
  const manifest = loadManifest();
  const items = activeItems(manifest);
  const state = loadState();
  const artifacts = Object.values(state.artifacts);

  console.log(`Manifest: ${items.length} design(s), ${items.reduce((n, i) => n + i.colorways.length, 0)} colorway(s)`);
  if (artifacts.length === 0) {
    const counts = planCountsFor(manifest, (c) => sceneSetFor(c as Category).length);
    console.log(`No generations yet. Full run: ${formatEstimate(counts, config)}`);
    return;
  }
  for (const artifactStatus of ARTIFACT_STATUSES) {
    const count = artifactsByStatus(state, [artifactStatus]).length;
    if (count > 0) console.log(`  ${artifactStatus}: ${count}`);
  }
}

async function doctor(): Promise<void> {
  loadEnv();
  const config = loadConfig();
  console.log('Environment:');
  for (const name of ['GEMINI_API_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    console.log(`  ${name}: ${process.env[name] ? 'set' : 'MISSING'}`);
  }
  console.log(`\nConfigured models (override in pipeline.config.json):`);
  console.log(`  analysis: ${config.models.analysis}`);
  console.log(`  scene:    ${config.models.scene}`);
  console.log(`  swap:     ${config.models.swap}`);

  if (process.env.GEMINI_API_KEY) {
    const { GeminiClient } = await import('./gemini.js');
    try {
      const ids = await new GeminiClient().listModelIds();
      for (const [role, model] of Object.entries(config.models)) {
        console.log(`  ${role} "${model}": ${ids.includes(model) ? 'available' : 'NOT FOUND for this key'}`);
      }
      const imageModels = ids.filter((id) => id.includes('image')).sort();
      console.log(`\nImage models visible to this key:\n  ${imageModels.join('\n  ') || '(none)'}`);
    } catch (error) {
      console.log(`  Could not list models: ${error instanceof Error ? error.message : error}`);
    }
  }

  const estimateConfig = loadConfig();
  const counts = planCountsFor(loadManifest(), (c) => sceneSetFor(c as Category).length);
  if (counts.swatches > 0) {
    console.log(`\nWhole-catalog estimate: ~$${estimateUsd(counts, estimateConfig).toFixed(2)} USD`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith('--'));
  const flags = {
    yes: args.includes('--yes'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };
  const config = loadConfig();
  ensureDir(INPUT_DIR);

  switch (command) {
    case 'scan':
      await runScan(config);
      break;
    case 'crop':
      await runCrop({ force: flags.force });
      break;
    case 'generate':
      await runGenerate(config, flags);
      break;
    case 'prep':
      runPrep();
      break;
    case 'import':
      runImport();
      break;
    case 'qa':
      await runQa(config);
      break;
    case 'run': {
      const first = await runGenerate(config, flags);
      if (first === 'aborted') break;
      await runQa(config);
      // Retry pass for QA failures; re-confirms the (small) extra spend unless --yes.
      const retry = await runGenerate(config, flags);
      if (retry === 'done') await runQa(config);
      break;
    }
    case 'review':
      await runReview(config);
      break;
    case 'upload':
      await runUpload(config, flags);
      break;
    case 'status':
      await status();
      break;
    case 'doctor':
      await doctor();
      break;
    default:
      console.log(USAGE);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
