import * as fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';
import { UPLOADS_PATH, cloudinaryFolder, requireEnv, type PipelineConfig } from '../config.js';
import { sceneSetFor } from '../prompts.js';
import { activeItems, artifactAbsPath, artifactsByStatus, loadManifest, loadState, upsertArtifact } from '../state.js';
import { buildPublicId, confirm, runLimited } from '../util.js';

interface UploadRecord {
  shot: string;
  publicId: string;
  url: string;
}

export async function runUpload(
  config: PipelineConfig,
  options: { yes?: boolean } = {},
): Promise<void> {
  const state = loadState();
  const approved = artifactsByStatus(state, ['approved']);
  if (approved.length === 0) {
    console.log('Nothing approved for upload. Run: npm run pipeline -- review');
    return;
  }

  const env = requireEnv(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const folder = cloudinaryFolder();
  console.log(`Uploading ${approved.length} approved image(s) to Cloudinary under ${folder}/products/ ...`);
  if (!options.yes && !(await confirm('Proceed?'))) {
    console.log('Aborted.');
    return;
  }

  // Shot index gives carousel ordering: 01-hero, 02-closeup, ... per category's scene set.
  const categoryByDesign = new Map(activeItems(loadManifest()).map((i) => [i.designNo, i.category]));
  const shotIndex = (designNo: string, shot: string): number => {
    const category = categoryByDesign.get(designNo) ?? 'other';
    return sceneSetFor(category).findIndex((spec) => spec.shot === shot) + 1;
  };

  const { ok, failed } = await runLimited(approved, 3, async (artifact) => {
    const publicId = buildPublicId(
      folder,
      artifact.designNo,
      artifact.color,
      artifact.shot,
      shotIndex(artifact.designNo, artifact.shot),
    );
    const result = await cloudinary.uploader.upload(artifactAbsPath(artifact), {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      tags: [
        `design-${artifact.designNo}`,
        `color-${artifact.color}`,
        `shot-${artifact.shot}`,
        'ai-generated',
      ],
      context: {
        design: artifact.designNo,
        color: artifact.color,
        shot: artifact.shot,
        source: 'image-pipeline',
      },
    });
    upsertArtifact(state, {
      ...artifact,
      status: 'uploaded',
      publicId: result.public_id,
      url: result.secure_url,
    });
    console.log(`  uploaded ${result.public_id}`);
  });

  // uploads.json: design -> color -> ordered image list, ready for ProductImage seeding.
  const uploads: Record<string, Record<string, UploadRecord[]>> = {};
  for (const artifact of artifactsByStatus(loadState(), ['uploaded'])) {
    if (!artifact.publicId || !artifact.url) continue;
    const byColor = (uploads[artifact.designNo] ??= {});
    (byColor[artifact.color] ??= []).push({
      shot: artifact.shot,
      publicId: artifact.publicId,
      url: artifact.url,
    });
  }
  for (const byColor of Object.values(uploads)) {
    for (const list of Object.values(byColor)) {
      list.sort((a, b) => a.publicId.localeCompare(b.publicId));
    }
  }
  fs.writeFileSync(UPLOADS_PATH, JSON.stringify(uploads, null, 2) + '\n');

  console.log(`\nUploaded ${ok}/${approved.length}.` + (failed.length > 0 ? ' Failures:' : ''));
  for (const failure of failed) {
    console.log(`  - ${failure.item.key}: ${failure.error.message}`);
  }
  console.log(`Wrote ${UPLOADS_PATH} (design -> color -> images, for ProductImage seeding).`);
}
