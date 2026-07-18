---
name: design-gen
description: Orchestrate parallel, verified catalog image generation for the next eligible designs, or resume specified design numbers, using project-scoped design workers in tools/image-pipeline. Use when invoked as $design-gen, when given design numbers with $design-gen, or when asked to generate catalog swatches and bedspread scenes. Keep up to four independent design workers busy, then centrally verify and retry their canonical hero, close-up, folded, and room outputs; never use paid image APIs, the automated generate stage, import, upload, or Cloudinary.
---

# Catalog design generation

Use this skill for the image-generation stage of the Catalog home-textiles pipeline. The root
thread is the orchestrator; each worker owns one design in an isolated context. Treat
`tools/image-pipeline/CATALOG_PROGRESS.md` as the living source of truth and use each selected
design's prep file as its authoritative execution order and file contract.

## Invocation

Accept either form:

- `$design-gen`: fill the worker pool with the next eligible designs from the verified table.
- `$design-gen <designNo>`: generate or resume that exact design with one worker.
- `$design-gen <designNo> <designNo> ...`: assign the listed eligible designs, up to the available
  worker cap, then refill from the default queue when the request says to keep going.
- A natural-language request to generate the next or a specified catalog design.

Treat `/design-gen` as invalid Codex CLI syntax. Skills use `$<skill-name>`; `/...` is reserved
for built-in CLI commands. Use `/skills` only to list available skills.

Resolve every initial design before generating anything. If an explicit design is already locally
generation-complete, owner-QA-complete, uploaded, or otherwise not eligible for regeneration,
do not assign it and report its current state. Resume partial work by preserving existing good
files.

## Preflight

1. Read `tools/image-pipeline/CATALOG_PROGRESS.md` first.
2. Read the repository `AGENTS.md` when its rules are not already in context.
3. Read `references/orchestration.md` completely before spawning any worker.
4. For every candidate, confirm that `tools/image-pipeline/work/prep/<designNo>-steps.md` exists.
   The assigned worker must read it completely before generation.
5. Read `references/scene-prompts.md` completely before assigning scene families. Select the
   next scene family from its controlled rotation before starting the first master scene.
6. Inspect the completed scene sets for designs 8569, 4219, 8525, and 8555, plus the most recently
   completed local designs, for catalog
   consistency before starting a new design. Use `view_image` on representative hero, closeup,
   folded, and room images. Identify repeated room layouts, bed styles, camera positions, and light
   directions so the new design does not repeat the same scene family used by either of the two
   most recent designs.
7. Resolve each selected design's source photo and colorways from `work/manifest.json`. Include
   absolute source/crop paths and the existing-file inventory in its assignment.
8. Never assign the same design to two workers. Keep a root-owned ledger of queued, active,
   reviewing, retrying, accepted, and failed designs.

Ignore legacy prep-file instructions about opening Gemini chats, manually pasting prompts, or
downloading results. Follow this skill's built-in generation workflow instead.

For default queue selection, use the verified-table order in `CATALOG_PROGRESS.md`. Select the
first unassigned designs whose prep files exist, whose crops are verified, and whose status is
eligible for generation (normally `cropped`). Skip designs marked uploaded, done, parked, needs
review, retrying, locally generation-complete, or already active. Do not hard-code design numbers.

## Orchestrator pool

- Use the project-scoped `design_worker` custom agent from `.codex/agents/design-worker.toml`.
- Keep at most four workers running, but obey the smaller runtime child-slot limit when one is
  exposed. The root orchestrator never counts itself as a design worker.
- Give each worker exactly one design and one scene-family letter. Adjacent queue designs must use
  different families, and the selected family must differ from the two most recent completed
  designs when enough alternatives exist.
- Workers write only disjoint design-specific assets. Only the orchestrator edits
  `CATALOG_PROGRESS.md`, the skill, references, config, or shared manifests.
- While workers run, inspect completed reports promptly. Do not duplicate their generation work in
  the root thread.
- Independently verify every worker result using the review gate in `references/orchestration.md`.
  A worker's self-review is evidence, not final acceptance.
- For a defect, send the same worker a targeted retry request naming the exact path, visible defect,
  required references, and acceptance criteria. Re-review every replacement. Do not rerun good
  files.
- When a design passes, update progress, close that worker thread, select the next eligible design,
  and spawn a fresh worker so the pool remains full until the requested queue scope ends or a stop
  condition occurs.

## Generation rules

- Use the built-in/manual agent-driven image-generation workflow only.
- Never run `npm run pipeline -- generate`.
- Never call paid Gemini or OpenAI image APIs.
- Each worker executes its assigned prep file in order, one generation at a time, until that design
  is complete. Different workers may generate different designs concurrently.
- Do not ask the user to paste prompts, reattach files, approve each step, or tell you to continue.
  One invocation owns the requested queue and refill loop unless a defined stop condition occurs.
- Generate every swatch first, inspect all accepted swatches, then generate the first-colorway
  master scenes, then generate the remaining colorway swaps.
- Attach exactly the reference files named by the prep step.
- For `swatch` and `swap` steps, use the prep step's prompt faithfully.
- For first-colorway `scene` steps, use the matching canonical structured prompt from
  `references/scene-prompts.md`, applying the one selected scene family to all four master scenes.
  The structured prompt replaces the prep file's legacy paragraph for that scene, while the prep
  file remains authoritative for attachments, scene name, order, aspect ratio, and output path.
  Add any stricter design-specific motif requirements recorded in the prep file or
  `CATALOG_PROGRESS.md`; never weaken them.
- Preserve the prep file's colorway labels, scene names, attachment order, aspect ratios, and
  exact output paths. Do not invent alternate labels or output locations.
- Keep the catalog identity bright, minimal, warm-neutral, softly daylit, and textile-led. Vary the
  room layout, bed or display furniture, camera side and height, restrained props, and daylight
  direction between designs according to the selected scene family. Never introduce dramatic,
  dark, ornate, maximalist, or strongly colored styling merely for variety.
- Keep all four masters for one design visually coherent with their selected scene family. During
  colorway swaps preserve the master room, furniture, folds, lighting, camera angle, and
  composition exactly; only the fabric print and colors may change.
- Accept the small sparkle/watermark mark on hero shots; it is expected and not a defect.
- Inspect each generated image visually before accepting it. Retry only a defective or failed
  generation, using a fresh manual generation attempt and the same required output path.
- If the generation tool fails three consecutive times or reports a rate limit, stop and report
  the exact step and failure instead of grinding.

The built-in generator writes to its default generated-images directory. Workers copy accepted results
into the exact workspace path from the prep file, leaving the default original intact. Create
missing design/colorway directories as needed. Do not overwrite an existing good asset.

## Boundaries

This skill ends at local generation. Do not run `import`, `qa`, `review`, `upload`, Cloudinary
commands, database seed work, or frontend changes unless the user explicitly asks in a later
request. Do not alter 8555's generated files or regenerate it.

## Completion and progress update

When all prep steps for a worker's design are present and visually accepted by the orchestrator:

1. Verify the exact expected count from the number of `## Step` entries in the prep file.
2. Count the target swatches and scenes separately and list any missing or extra files.
3. Update `tools/image-pipeline/CATALOG_PROGRESS.md` to mark the design as locally
   generation-complete, while explicitly keeping owner visual QA, import, review, and upload
   pending. Record the selected scene-family letter so later designs can rotate reliably. Make the
   smallest targeted edit and preserve unrelated progress notes.
4. Close the accepted design's worker and refill its slot when queue scope remains.
5. Report completed, active, retrying, and stopped designs; their colorways, exact counts, retries,
   saved path patterns, assigned scene families, and remaining release stages. Do not claim a
   design is released or uploaded.
