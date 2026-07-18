# Design-generation orchestration

Read this reference before spawning workers. It defines the root-owned assignment, review, retry,
and refill protocol. Workers never choose their own design or scene family.

## Pool sizing and lifecycle

1. Determine the runtime's available direct-child capacity.
2. Set `worker_limit = min(4, available direct-child slots, eligible designs remaining)`.
3. Spawn one fresh `design_worker` per design until the pool reaches `worker_limit`.
4. Keep `agents.max_depth = 1`; design workers must not delegate.
5. When a worker reports completion, move its design from `active` to `reviewing` without assigning
   its thread another design.
6. If review passes, update progress, close the worker thread, and spawn a fresh worker for the next
   eligible design. If review fails, keep the same worker and send targeted retry instructions.
7. Stop refilling only when the requested queue scope is exhausted, the user interrupts, no
   eligible designs remain, or a defined generation stop condition occurs.

Use a small root-owned ledger with these states: `queued`, `active`, `reviewing`, `retrying`,
`accepted`, `stopped`. A design can appear in only one state.

## Assignment packet

Each worker assignment must include:

- exact design number and category;
- absolute original source-photo path;
- absolute crop paths in prep order, with colorway labels;
- absolute prep-file path and expected step count;
- absolute existing accepted swatch/scene paths that must be preserved;
- assigned scene-family letter and the reason it differs from recent designs;
- required skill/reference paths;
- exact allowed write scope (`work/swatches/<design>-*.png` and
  `work/scenes/<design>/...` only);
- explicit prohibition on progress/config/manifest/shared-file edits, imports, uploads,
  Cloudinary, paid APIs, and nested delegation;
- required `DESIGN_WORKER_REPORT` fields from the custom agent contract.

Prefer `fork_turns = "none"` or the smallest useful fork when the complete packet is supplied. This
keeps unrelated orchestrator history out of worker context. If the runtime cannot select the
`design_worker` role directly, state the role and its config path in the assignment and require the
worker to read that file before acting.

## Independent orchestrator review gate

Do not accept a worker report by count alone. The root must:

1. Re-read the worker report and list every expected output from the prep file.
2. Confirm exact counts: one swatch per colorway and four scenes per colorway, with no unexpected
   design files.
3. Verify each image's aspect ratio and readable file state: swatches 1:1, scenes landscape 4:3.
4. View every swatch and compare it with its crop and the original source. Reject contamination,
   wrong colorway, missing defining motifs, redesigned repeat, perspective, folds, labels, or edge
   artifacts.
5. View all four first-colorway masters. Check exact print identity, product construction, exactly
   two matching pillows where required, four folded layers, scene-family compliance, minimal
   styling, natural geometry, and required framing.
6. View every colorway swap beside its master and swatch. Reject changes to room, furniture,
   folds, light, shadows, camera, framing, or pattern scale; only print and print colors may change.
7. Compare the design with the two most recent completed designs to confirm meaningful but
   restrained room/bed/camera/light variation.
8. Record pass/fail per path. Only a full pass moves the design to `accepted`.

## Retry packet

For each failed path, send the original worker:

- exact output path;
- concise visible defect;
- exact reference attachments and their order;
- the original required prompt class (`swatch`, structured master scene, or `swap`);
- what must remain unchanged;
- objective acceptance criteria.

Ask for only the failed images. The worker must preserve all passed assets, replace accepted retries
at the same paths, re-run its count/dimension check, and return an amended report. The root repeats
the review gate for every replacement.

If one step fails three consecutive times or image generation reports a rate limit, mark that
design `stopped`, preserve all good assets, close the worker when no follow-up is possible, and
report the exact step and error. Other independent workers may finish, but do not refill in a way
that ignores a global rate limit.

## Progress ownership

Only the root edits `tools/image-pipeline/CATALOG_PROGRESS.md`, and only after final review. Record:

- local completion count;
- assigned scene family;
- owner visual QA, import, review, and upload still pending;
- any meaningful retry note needed for future verification.

Do not let workers edit shared progress because parallel writes create conflicts and self-approval
would weaken the review boundary.
