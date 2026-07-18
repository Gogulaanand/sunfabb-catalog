import * as fs from 'node:fs';
import * as path from 'node:path';
import { CROPS_DIR, type PipelineConfig } from '../config.js';
import { GeminiClient } from '../gemini.js';
import { QA_PROMPT } from '../prompts.js';
import { artifactAbsPath, artifactsByStatus, loadState, upsertArtifact } from '../state.js';
import { QaResultSchema, artifactKey } from '../types.js';
import { mimeTypeFor, runLimited } from '../util.js';
import { cropFileName } from './crop.js';

const QA_JSON_SCHEMA = {
  type: 'object',
  properties: {
    fidelityScore: { type: 'number', minimum: 0, maximum: 10 },
    artifacts: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['fidelityScore', 'artifacts', 'notes'],
};

export async function runQa(config: PipelineConfig): Promise<void> {
  const state = loadState();
  const pending = artifactsByStatus(state, ['generated']);
  if (pending.length === 0) {
    console.log('Nothing awaiting QA. Next: npm run pipeline -- review');
    return;
  }

  const gemini = new GeminiClient();
  console.log(`QA-checking ${pending.length} image(s) against their reference fabric ...`);

  const { failed } = await runLimited(pending, config.concurrency, async (artifact) => {
    // Reference: swatches are judged against their source crop, scenes against their swatch.
    const referencePath =
      artifact.shot === 'swatch'
        ? path.join(CROPS_DIR, cropFileName(artifact.designNo, artifact.color))
        : (() => {
            const swatch = state.artifacts[artifactKey(artifact.designNo, artifact.color, 'swatch')];
            if (!swatch) throw new Error(`no swatch to judge ${artifact.key} against`);
            return artifactAbsPath(swatch);
          })();

    const result = await gemini.analyzeJson({
      model: config.models.analysis,
      prompt: QA_PROMPT,
      images: [
        { data: fs.readFileSync(referencePath), mimeType: mimeTypeFor(referencePath) },
        { data: fs.readFileSync(artifactAbsPath(artifact)), mimeType: mimeTypeFor(artifact.file) },
      ],
      jsonSchema: QA_JSON_SCHEMA,
      zodSchema: QaResultSchema,
      label: `qa ${artifact.key}`,
    });

    const passed = result.fidelityScore >= config.qaThreshold && !result.artifacts;
    upsertArtifact(state, {
      ...artifact,
      status: passed ? 'qa_passed' : 'qa_failed',
      fidelity: result.fidelityScore,
      qaNotes: result.notes,
    });
    console.log(
      `  ${passed ? 'PASS' : 'FAIL'} ${artifact.key} (fidelity ${result.fidelityScore}/10)` +
        (passed ? '' : ` - ${result.notes}`),
    );
  });

  for (const failure of failed) {
    console.log(`  ERROR ${failure.item.key}: ${failure.error.message}`);
  }

  const failCount = artifactsByStatus(state, ['qa_failed']).length;
  if (failCount > 0) {
    console.log(
      `\n${failCount} image(s) failed QA. Run: npm run pipeline -- generate` +
        ' (regenerates only the failures, with the QA notes fed back into the prompt)',
    );
  } else {
    console.log('\nAll images passed QA. Next: npm run pipeline -- review');
  }
}
