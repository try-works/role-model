# Prior recursive evidence reviewed for run 104

Sources: the private memory plane (`/.recursive/memory/domains/direct-track-b.md`, read in the private controller
repo) and the prior run folders (read in their own worktrees, which are outside this worktree's `.recursive/run`
tree).

## Run 97 - unrestricted replay, evaluation and learning

- Docs read: run folder summary; `memory/domains/direct-track-b.md` (run 97 section).
- Reused insight: replay dispatch is idempotent by a durable dispatch key; durable background jobs must be
  terminal under failure (bounded expiration sweep); replay output is never a replay source.
- Superseded or contradicted: nothing; run 104 adds the eligibility dimension run 97 did not cover.

## Run 98 - shadow-to-active routing graduation

- Docs read: `memory/domains/direct-track-b.md` (run 98 section).
- Reused insight: versioned activation policy plus the promotion interval gate; public compatibility vocabulary
  must not expose an effective activation surface.
- Superseded or contradicted: the run-99 ratchet enforces that every published policy field has a consumer; the
  controller checkout's unpulled local `dev` (`06c61411`) violates it with 24 fields, while the pin
  (`5df90b6d`) violates it with two.

## Run 100 - replay evidence completeness and learner yield

- Docs read: `memory/domains/direct-track-b.md` (run 100 section); run 100 `00-requirements.md` reference.
- Reused insight: every consumer needs a named producer and the producer belongs where the evidence is fresh; a
  deprecation refusal is not an offered capability.
- Superseded or contradicted: nothing; the learner-yield gap this run fixes is the same family.

## Run 101 - effect-mq queue rebuild

- Docs read: run 101 requirements/worktree references; landed code in `queue-runtime/*`.
- Reused insight: one `ManagedRuntime` per plane; `PersistedQueue` with a SQL store; retry schedule idiom
  `Schedule.min([exponential, spaced])`; the dependency-closure build is required before bridge lanes.
- Superseded or contradicted: the run name says "effect-mq" but the landed planes are `PersistedQueue`-based and
  the router has no `effect-mq` import - recorded as the `R15` correction.

## Run 103 - agent strategy and scoring strategy

- Docs read: `00-requirements.md`, `05-manual-qa.md`, `06-decisions-update.md`, the memory-audit findings.
- Reused insight: routing posture/scoring vocabulary, canonical-only writes, decision receipts and the latency
  policy (off by default, 10 000 ms / 5..30); the stage monitor script to reuse in Phase 5.
- Superseded or contradicted: run 103's learning/memory updates landed only partially (the memory audit found
  the plane stale), which is why run 104 reads the run artifacts directly.

## Live state copied for this run (2026-10-01)

- `%LOCALAPPDATA%\role-model-runtime-stage\standalone-runtime-stage\track-b\replay-disposition.sqlite`
- `%LOCALAPPDATA%\role-model-runtime-stage\standalone-runtime-stage\track-b\queues\queues.sqlite`
- Per-worker `durable-output.sqlite` stores for replay-core, evaluation-core and profile-learner
