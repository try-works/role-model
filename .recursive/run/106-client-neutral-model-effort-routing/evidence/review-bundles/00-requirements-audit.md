# Run 106 Phase 0 requirements audit bundle

Phase: `00 Requirements`
Artifact: `/.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md`
Role: phase-auditor / traceability-auditor
Artifact state: DRAFT, 417 lines, read back after write

## Upstream artifacts to reread

- `/.recursive/RECURSIVE.md`
- `/AGENTS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`

Relevant addenda: none for run 106.

## Diff basis and changed files

- Baseline type: current controller checkout, requirements-only pre-worktree phase
- Baseline/normalized baseline: `HEAD` / `701b8b8fc0b0eeebdfe818b757f5702f50021488`
- Comparison: working tree
- Command: `git diff -- .recursive/run/106-client-neutral-model-effort-routing/00-requirements.md`
- Run-106 changed file: `/.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md`
- Pre-existing excluded drift: two modified llama-swap binary artifacts

## Targeted code references for feasibility checks

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: effort pool resolution, ingress normalization, difficulty, dispatch, runtime startup and decision projection
- `/role-model-router/packages/core/src/router.ts`: eligibility, metric evidence, weighted scoring and tie-break
- `/role-model-router/packages/protocol-routing/src/index.ts`: candidate projection and route wrapper
- `/packages/pi-role-model/`: Pi discovery/provider binding
- `/role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`: precedence
- `/role-model-router/packages/sqlite-memory/src/index.ts`: evidence and telemetry persistence

## Operator decisions to verify losslessly

- Client-neutral across Pi, DSH, Codex and other clients.
- Joint model-effort arm selection; effort-specific evidence.
- Omitted=router, legacy scalar=preferred, explicit strict supported.
- Preferred exact primary; pool-wide unsupported hint ignored with receipt; strict unavailable fails.
- No implicit high/xhigh/max mapping; none/default/omitted distinct.
- Approved F4/F5/F6 repairs included.
- Strict TDD and substantive delegation required.
- Packaged SEA tested with a real Pi process explicitly bound to a free isolated port; 3456/3457/3458 forbidden and untouched.

## Audit questions

1. Are R1-R15 stable, unambiguous, observable, internally consistent, and complete?
2. Does preferred fallback distinguish pool-wide unsupported from exact arms made unavailable after hard eligibility?
3. Can arms be executed, deduplicated, persisted, benchmarked, and scored without identity/evidence leakage?
4. Are discovery and provenance sufficient for every client and operator surface?
5. Are F4 difficulty, F5 cost/latency/Pareto, and F6 priors bounded enough for a safe Phase 2 plan?
6. Does R15 prove that Pi itself reached the rebuilt runtime on a non-reserved isolated port, with identity-safe cleanup?
7. Does strict TDD cover production behavior and preserve prior-run regressions?
8. Are delegation, audit, action-record, and controller-verification obligations compliant with recursive-mode?
9. Are out-of-scope, constraints, assumptions, tasks, and traceability sufficient?
10. Identify contradictions, missing acceptance criteria, hidden implementation choices, scope explosions, and requirements that cannot be mechanically verified.

## Required output

Return:
- findings ordered by severity with exact artifact line citations;
- missing or ambiguous requirement mappings;
- concrete repair text;
- explicit `Audit: PASS` or `Audit: FAIL`;
- enough detail for a durable subagent action record (inputs reread, files reviewed, findings, verification handoff).
