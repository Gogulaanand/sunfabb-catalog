import {
  classificationReadinessIssues,
  publicationReadinessIssues,
  type ManifestItem,
  type ReleaseMetadata,
} from './types.js';

/** Upload callers must use recorded owner facts; this deliberately has no defaults. */
export function requireUploadMetadata(item: ManifestItem): ReleaseMetadata {
  const issues = [...classificationReadinessIssues(item), ...publicationReadinessIssues(item)];
  if (issues.length) {
    throw new Error(`release metadata incomplete for ${item.designNo}: ${issues.join('; ')}`);
  }
  if (!item.release) {
    throw new Error(`release metadata incomplete for ${item.designNo}: missing release classification`);
  }
  return item.release;
}
