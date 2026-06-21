# Workflow

How to actually build this project across many Claude Code sessions without
burning tokens, losing focus, or stalling on small things.

Read this at the start of every session along with `CLAUDE.md` and `HANDOFF.md`.

---

## LEARNING MODE: DISABLED

**All items are currently treated as Fast track regardless of their L/F tag.**
Do not ask the user to predict outcomes, walk through code explanations, or
pause for teaching moments. Build correctly and quickly; let the code and
commit messages speak for themselves. Re-enable by removing this section.

---

## 1. The mental model

This project has two kinds of work:

| Track | Pace | Mode | When to use |
|---|---|---|---|
| **Learning track** | Slow, interactive | Sequential, explain-first, predict-before-run | First time encountering a concept; anything affecting security or correctness |
| **Fast track** | Quick, mechanical | Parallel agents or batched edits, minimal narration | Repetitions of an already-understood pattern; boilerplate; config tweaks |

The orchestrator (the main Claude session) decides which track each task belongs to,
based on the classification in §5.

---

## 2. Session discipline — the single highest-impact habit

**One session = one bounded unit of work.** When the goal is done: commit, update
`HANDOFF.md`, close the session.

Why: every message in a conversation re-sends the entire history. By message 50,
each response is reading ~30k tokens of context that aren't actively useful. Long
sessions also drift — they start as "build the Categories module" and end somewhere
unrelated.

**Good session scopes:**
- "Build PrismaService + Categories module + tests"
- "Add JWT auth and protect write endpoints"
- "Frontend home page + catalog page consuming the API"

**Bad session scopes:**
- "Build Phase 1" (too big — break into modules)
- "Whatever needs doing next" (no clear end condition)

A session is **done** when:
1. Code compiles, lints, and type-checks
2. Tests pass (if any were written this session)
3. Changes are committed (and pushed if feature-ready)
4. `HANDOFF.md` describes exactly what's next

---

## 3. The state files — `HANDOFF.md` vs `.session-state.md`

Project state lives in two files with different lifecycles:

### `HANDOFF.md` — committed, phase-level
Versioned in git. Read by anyone cloning the repo. Answers:
- Which phase are we in?
- What's the current branch / latest PR?
- Any open decisions or blockers?
- What's the milestone history (append-only)?

**Update only at phase boundaries or feature merges** — never every session. Otherwise
the commit history gets polluted with meta-state churn.

### `.session-state.md` — local, gitignored
Lives only on the active developer's machine. Read at the start of a session, rewritten
at the end. Answers:
- Where did the last session leave off, in fine detail?
- What's the exact next bounded scope?
- Anything mid-work-in-progress?
- Anti-scope: things to *not* do this session

**Why split:** the project-level facts (phases, decisions, milestones) belong in git so anyone
can pick up the project. The session-level scratchpad changes every day and would just create
commit noise. Splitting keeps both files honest about their purpose.

### What if a fresh agent needs to pick up cold from another machine?
They get: `HANDOFF.md` (phase + branch) + the latest commit message + git log. That's enough
to know the project state at a phase boundary. For mid-feature pickup, you'd write a focused
session prompt anyway (see §7).

---

## 4. Orchestrator role

The main session acts as orchestrator. Its job is to:

- Read `HANDOFF.md`, identify the next bounded unit
- Spawn parallel agents (see §6) where tasks are independent, review their output, commit
- At the end: update `HANDOFF.md`, commit, summarise

The orchestrator never silently builds large changes without review. It delegates
them to agents or batches them, then reviews output before committing.

---

## 5. Per-phase classification

This is the master plan. Each item is tagged **L** (Learning track), **F** (Fast track),
or **H** (Hybrid — first one is learning, rest are fast).

### Phase 0 — Foundations
| Item | Track | Notes |
|---|---|---|
| Scaffold monorepo | F (done) | Mechanical |
| First Prisma migration | L (done) | First time, taught schema concepts |
| Seed script | L | First time, light teaching |
| PrismaService (injectable) | L | First NestJS DI, important pattern |

### Phase 1 — Backend Core
| Item | Track | Notes |
|---|---|---|
| Categories module (controller + service + DTO) | **L** | First full vertical slice — heaviest learning of the project |
| Categories integration test | L | First test, teach test DB setup |
| Materials module | F | Same pattern as Categories — parallel agent |
| Colors module | F | Same pattern as Categories — parallel agent |
| Products module (with category FK) | L | Introduces FK relations, joins |
| ProductVariant module (composite refs) | L | Introduces nested resources |
| ProductImage module | F | Relation pattern already learned |
| Filtering + sorting + pagination | **L** | Query DTO validation, complex Prisma queries |
| Exception filter + consistent errors | L | Important backend pattern |
| Per-module tests (after first) | F | Pattern is learned — parallel agents |

### Phase 2 — Auth & Image Upload
| Item | Track | Notes |
|---|---|---|
| JWT auth (strategy, guards, decorators) | **L** | Security-critical, first time |
| Apply auth guards to write endpoints | F | Mechanical after learning |
| Cloudinary upload integration | L | First time |
| Auth + upload tests | F | Apply learned patterns |

### Phase 3 — Frontend Storefront
| Item | Track | Notes |
|---|---|---|
| API client + SSR fetch | L | First server-side fetch pattern |
| CORS setup | L | Security concept worth understanding |
| Home page | F | Just React — user's home turf |
| Catalog page with filters (URL state) | L | URL-as-state pattern |
| Product detail page | F | Mostly frontend |
| SEO (metadata, sitemap, Open Graph) | L | First time |
| Responsive build from Stitch mockups | F | Frontend skill, no teaching needed |

### Phase 4 — Admin UI
| Item | Track | Notes |
|---|---|---|
| Admin login page + protected routes | L | Token storage, refresh, redirect pattern |
| Product/variant/category forms | F | Frontend forms |
| Image upload UI | F | Plain upload component |

### Phase 5 — Deploy
| Item | Track | Notes |
|---|---|---|
| Deploy backend (Render/Railway/Fly) | **L** | First production deploy — env, secrets, CORS in prod |
| Deploy frontend (Vercel) | L | First time |
| Domain/subdomain swap | L | DNS basics |
| Playwright e2e tests | L | First e2e tests |
| Loading/empty/error polish | F | UI tidy-up |

### Phase 6 — E-commerce (future)
| Item | Track | Notes |
|---|---|---|
| Cart (Zustand) | F | Frontend state — already known |
| Checkout flow | L | Form orchestration + validation |
| Razorpay integration | **L** | Payments, webhooks, idempotency — first time |
| Orders + inventory | L | Transactional logic |
| Email confirmations (Resend) | L | First time |

---

## 6. Orchestration patterns

### Pattern A — Sequential learning session
The default mode for any L-tagged item.

1. Orchestrator describes the concept and the pattern
2. Asks user to predict the outcome of the next command
3. User confirms understanding
4. Orchestrator writes code (or guides user to write it)
5. Walks through the generated code line by line if asked
6. Runs the command, observes the result together
7. Commits with a clear message

### Pattern B — Parallel fast-track work
For F-tagged items that share a pattern (e.g. Materials + Colors modules after
Categories is built).

1. Orchestrator spawns N parallel agents, each with one focused prompt
2. Each agent is briefed with: `CLAUDE.md` rules, the proven pattern (with file
   references), the exact task and acceptance criteria
3. Agents work in isolation (their own context, no shared conversation history)
4. Orchestrator reviews each agent's diff before committing
5. If reviews pass: commit. If not: send specific fixes to that agent

### Pattern C — Hybrid (background fast-track during learning)
When the user is in a learning session, the orchestrator can spawn a background
agent to handle an independent F-tagged task in parallel.

Example: while teaching the Products module (L), spawn a background agent to
write integration tests for the already-built Categories module (F).

The orchestrator brings the background agent's output back at a natural pause,
reviews and commits it without interrupting the learning flow.

---

## 7. Agent prompt template

Every spawned agent starts cold. The prompt must be self-contained:

```
You are working on the sunfabb-catalog project (NestJS backend, Prisma 7,
PostgreSQL, monorepo layout).

REQUIRED READING (in order):
1. CLAUDE.md — project rules (hard rules section is non-negotiable)
2. docs/WORKFLOW.md — workflow conventions
3. backend/src/categories/ — the proven Controller → Service → DTO pattern
   to mirror

YOUR TASK:
[ONE specific, bounded task. e.g. "Build the Materials module mirroring the
Categories module structure exactly. Files to create: ..."]

ACCEPTANCE CRITERIA:
- [Specific checks. e.g. "GET /materials returns seeded rows"]
- npm run lint passes
- npx tsc --noEmit passes
- Integration test exists at test/materials.e2e-spec.ts and passes

CONSTRAINTS (from CLAUDE.md):
- No raw SQL — Prisma only
- DTOs + class-validator on all inputs
- Soft delete pattern if applicable
- Tests ship with the module — not deferred

DO NOT:
- Modify files outside the scope of this task
- Touch the schema or run migrations
- Push to git (orchestrator handles commits)

OUTPUT:
- Show me a summary of files changed and the test output
- Wait for my review before any further work
```

---

## 8. Anti-patterns — what NOT to do

- ❌ **Don't have one giant session that builds the whole backend.** Break it.
- ❌ **Don't spawn parallel agents on tasks with sequential dependencies.** (e.g. don't
  build Products and Variants in parallel — Variants needs Products done first.)
- ❌ **Don't update `HANDOFF.md` halfway through a session.** Only at the end,
  reflecting what was actually completed.
- ❌ **Don't let an agent run for >20 messages without reviewing its work.**

---

## 9. Quick session checklist

**At session start:**
- [ ] Read `CLAUDE.md` (rules)
- [ ] Read `HANDOFF.md` (phase-level state)
- [ ] Read `.session-state.md` if present (fine-grained next-step detail)
- [ ] Confirm the bounded scope of this session (one thing, with a clear done condition)
- [ ] Restate the plan to the user; get confirmation

**During the session:**
- [ ] Spawn agent or batch-edit, review, commit
- [ ] Commit per meaningful unit (don't accumulate)

**At session end:**
- [ ] All code compiles, lints, type-checks
- [ ] Tests pass (if relevant)
- [ ] Changes committed
- [ ] Pushed to remote if feature-ready (PR if appropriate)
- [ ] `.session-state.md` rewritten for the next session's pickup
- [ ] `HANDOFF.md` updated **only if** this session crossed a phase boundary or merged a feature
- [ ] Summarise outcome to user in 3 lines

---

## 10. The single most expensive mistake

Continuing to use a session past its scope. If you finished what the session was
for and find yourself thinking "while we're here, let me also…" — stop. Close the
session. The next bounded unit is a fresh session with a fresh prompt.

Every token you save here adds up over the dozens of sessions this project will take.
