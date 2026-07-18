import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { WORK_DIR, type PipelineConfig } from '../config.js';
import { loadState, saveState, upsertArtifact } from '../state.js';
import { ArtifactStatusSchema, type Artifact } from '../types.js';
import { mimeTypeFor } from '../util.js';

const SHOT_ORDER = ['swatch', 'hero', 'closeup', 'folded', 'room', 'hanging', 'rolled', 'overhead', 'ring', 'drape'];

function shotRank(shot: string): number {
  const index = SHOT_ORDER.indexOf(shot);
  return index === -1 ? SHOT_ORDER.length : index;
}

function galleryHtml(artifacts: Artifact[]): string {
  const designs = new Map<string, Map<string, Artifact[]>>();
  for (const artifact of artifacts) {
    const colors = designs.get(artifact.designNo) ?? new Map<string, Artifact[]>();
    designs.set(artifact.designNo, colors);
    const list = colors.get(artifact.color) ?? [];
    colors.set(artifact.color, list);
    list.push(artifact);
  }

  let body = '';
  for (const [designNo, colors] of [...designs.entries()].sort()) {
    body += `<h2>Design ${designNo}</h2>`;
    for (const [color, list] of [...colors.entries()].sort()) {
      body += `<h3>${color}</h3><div class="row">`;
      for (const artifact of list.sort((a, b) => shotRank(a.shot) - shotRank(b.shot))) {
        const fidelity = artifact.fidelity !== undefined ? `${artifact.fidelity}/10` : '-';
        body += `
        <figure data-key="${artifact.key}">
          <img src="/img?f=${encodeURIComponent(artifact.file)}" loading="lazy" alt="${artifact.key}">
          <figcaption>
            <strong>${artifact.shot}</strong>
            <span class="badge ${artifact.status}">${artifact.status}</span>
            <span>fidelity ${fidelity}</span>
            ${artifact.qaNotes ? `<span class="notes">${artifact.qaNotes}</span>` : ''}
            <span class="buttons">
              <button class="approve" onclick="decide('${artifact.key}','approved')">Approve</button>
              <button class="reject" onclick="decide('${artifact.key}','rejected')">Reject</button>
            </span>
          </figcaption>
        </figure>`;
      }
      body += '</div>';
    }
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Image pipeline review</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #fafaf7; color: #222; }
  .row { display: flex; flex-wrap: wrap; gap: 1rem; }
  figure { margin: 0; width: 260px; }
  img { width: 100%; border-radius: 6px; border: 1px solid #ddd; }
  figcaption { display: flex; flex-direction: column; gap: 2px; font-size: 13px; padding-top: 4px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 12px; width: fit-content; }
  .badge.qa_passed { background: #d9f2d9; } .badge.qa_failed { background: #fbd9d3; }
  .badge.approved { background: #b6e3b6; } .badge.rejected { background: #f3b8ae; }
  .badge.generated { background: #eee; } .badge.uploaded { background: #cfe3f7; }
  .notes { color: #a33; }
  button { cursor: pointer; border: 1px solid #bbb; border-radius: 4px; padding: 2px 10px; background: #fff; }
  button.approve:hover { background: #d9f2d9; } button.reject:hover { background: #fbd9d3; }
  #bulk { position: fixed; top: 1rem; right: 1rem; }
</style></head>
<body>
<h1>Checkpoint B - review generated images</h1>
<p>Approve what goes to Cloudinary. Rejected images are regenerated on the next <code>generate</code> run.</p>
<button id="bulk" onclick="bulkApprove()">Approve all QA-passed</button>
${body}
<script>
  async function decide(key, decision) {
    await fetch('/decision', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, decision }) });
    location.reload();
  }
  async function bulkApprove() {
    await fetch('/bulk-approve', { method: 'POST' });
    location.reload();
  }
</script>
</body></html>`;
}

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => (data += chunk));
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

export async function runReview(config: PipelineConfig): Promise<void> {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        const artifacts = Object.values(loadState().artifacts);
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(galleryHtml(artifacts));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/img') {
        const file = url.searchParams.get('f') ?? '';
        const absPath = path.resolve(WORK_DIR, file);
        if (!absPath.startsWith(WORK_DIR + path.sep) || !fs.existsSync(absPath)) {
          response.writeHead(404).end('not found');
          return;
        }
        response.writeHead(200, { 'content-type': mimeTypeFor(absPath) });
        fs.createReadStream(absPath).pipe(response);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/decision') {
        const { key, decision } = JSON.parse(await readBody(request)) as {
          key?: string;
          decision?: string;
        };
        const status = ArtifactStatusSchema.parse(decision);
        if (status !== 'approved' && status !== 'rejected') throw new Error('invalid decision');
        const state = loadState();
        const artifact = key ? state.artifacts[key] : undefined;
        if (!artifact) {
          response.writeHead(404).end('unknown artifact');
          return;
        }
        upsertArtifact(state, { ...artifact, status });
        response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        return;
      }
      if (request.method === 'POST' && url.pathname === '/bulk-approve') {
        const state = loadState();
        for (const artifact of Object.values(state.artifacts)) {
          if (artifact.status === 'qa_passed') {
            state.artifacts[artifact.key] = { ...artifact, status: 'approved' };
          }
        }
        saveState(state);
        response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        return;
      }
      response.writeHead(404).end('not found');
    } catch (error) {
      response.writeHead(500).end(error instanceof Error ? error.message : 'error');
    }
  });

  server.listen(config.reviewPort, () => {
    console.log(`Review gallery: http://localhost:${config.reviewPort}`);
    console.log('Approve/reject images, then Ctrl+C and run: npm run pipeline -- upload');
  });
}
