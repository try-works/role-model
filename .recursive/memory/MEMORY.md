# MEMORY.md

<!-- RECURSIVE-MODE-MEMORY:START -->
## Memory Router

This file is the durable memory router for the repository.
It is not a knowledge dump. Store durable memory in sharded docs under `domains/`, `patterns/`, `incidents/`, `episodes/`, `training/`, `skills/`, or `archive/`.

Control-plane docs are not memory docs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.codex/AGENTS.md`
- `/AGENTS.md`
- `/.agent/PLANS.md`

## Retrieval Rules

- Read this file before loading any other memory docs.
- Load only the memory docs relevant to the current task.
- If the task may benefit from prior recursive-mode experiential learnings, use this index to identify the relevant docs under `/.recursive/memory/training/` and `/.recursive/memory/domains/`.
- The optional `recursive-training-sync.py` helper is read-only; it prints startup guidance about what to read, but does not modify `MEMORY.md` or the memory plane.
- If the task plans delegated review, subagent help, review bundles, smoke-harness portability work, or capability-sensitive execution, read `/.recursive/memory/skills/SKILLS.md` and then load the relevant skill-memory shards.
- If Phase 8 will need to promote durable lessons, first capture run-local skill usage in the run artifact and only then promote generalized conclusions into skill-memory shards.
- Prefer `Status: CURRENT` docs for planning and execution.
- `Status: SUSPECT` docs may be used as leads, but revalidate them before trust.
- Exclude `STALE` and `DEPRECATED` docs from default retrieval unless doing historical analysis.

## Registry

<!-- RECURSIVE-TRAINING-REGISTRY:START -->
## Training Extraction Registry

- `domains/-recursive.md` — .recursive (Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle)
- `domains/direct-track-b.md` — Direct Track B domain memory (Source-Runs: 00-direct-track-b-v1-1-implementation; 79-extension-control-and-recommendations-qa; 80-signed-recommendation-cloud-lifecycle; 81-kw-activation-browser-recommendation-evidence)
- `domains/role-model-router.md` — role-model-router (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/closeout-workflow.md` — Training Memory: closeout-workflow (Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle)
- `training/code-review.md` — Training Memory: code-review (Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle)
- `training/extension-policy.md` — Training Memory: extension-policy (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/frontend-implementation.md` — Training Memory: frontend-implementation (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/packaging-verification.md` — Training Memory: packaging-verification (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/phase-authoring.md` — Training Memory: phase-authoring (Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle)
- `training/qa-verification.md` — Training Memory: qa-verification (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/requirements-scoping.md` — Training Memory: requirements-scoping (Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa)
- `training/test-validation.md` — Training Memory: test-validation (Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle)
<!-- RECURSIVE-TRAINING-REGISTRY:END -->

- `domains/direct-track-b.md` — Direct Track B v1.1 surfaces, run-79 mutate/dismiss/Set-mode UI, run-80 live `--track=dev` signed recommendation lifecycle, run-81 gated KW activation + browser recommendation evidence, run-82 pin re-freeze + digest-bound KW + launch scope, and run-83 KW soft toggle + equals-form argv + evidence-root + full Playwright assemble (Source-Runs: `00-direct-track-b-v1-1-implementation`, `79-extension-control-and-recommendations-qa`, `80-signed-recommendation-cloud-lifecycle`, `81-kw-activation-browser-recommendation-evidence`, `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`, `83-kw-operator-toggle-assemble-live-e2e-argv-equals`)
- `domains/role-model-router.md` — GRPO-extracted role-model-router domain notes (Source-Runs: `79-extension-control-and-recommendations-qa`, `81-kw-activation-browser-recommendation-evidence`)
- `episodes/00-direct-track-b-v1-1-implementation.md` — closeout episode for `00-direct-track-b-v1-1-implementation`
- `skills/usage/review-bundle-citation-requirements.md` — Phase 3.5 review-bundle citation expectations (Source-Runs: `79-extension-control-and-recommendations-qa`, `80-signed-recommendation-cloud-lifecycle`)
- `skills/issues/anticipatory-phase-docs.md` — Do not author Phase 3–8 docs before that phase’s real work; do not batch-write 3.5–8; reject/reopen anticipatory closeouts (Source-Runs: `80-signed-recommendation-cloud-lifecycle`, `81-kw-activation-browser-recommendation-evidence`, `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`, `83-kw-operator-toggle-assemble-live-e2e-argv-equals`)
- `skills/issues/launch-packaged-runtime-argv-equals.md` — Equals-form and discrete argv both bind; non-run80 scopes require `--evidence-root` (Source-Runs: `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`, `83-kw-operator-toggle-assemble-live-e2e-argv-equals`)

- `domains/` - stable functional-area knowledge with `Owns-Paths`
- `patterns/` - reusable playbooks and solution patterns
- `incidents/` - recurring failure signatures and fixes
- `episodes/` - distilled lessons from specific runs
- `training/` - extracted experiential learnings promoted from completed recursive-mode runs
- `skills/` - durable skill and capability memory, routed via `skills/SKILLS.md`
- `archive/` - historical or deprecated memory docs

## Freshness Rules

- Durable memory docs must declare the metadata defined by the installed `recursive-mode` artifact template.
- Any doc whose `Owns-Paths` or `Watch-Paths` overlaps final changed code paths must be reviewed in Phase 8.
- Affected `CURRENT` docs should be downgraded to `SUSPECT` until revalidated against final code, `STATE.md`, and `DECISIONS.md`.
- If changed paths have no owning domain doc, create one or record the uncovered-path follow-up in `08-memory-impact.md`.
- Training memory docs should keep their canonical content under `/.recursive/memory/training/`, use the memory index as the discovery surface, and record source runs plus watch-path or applicability guidance.
- Skill-memory docs should record source runs, last validated date, environment notes, and current trust/fit guidance.
- If a run materially teaches the repo something about skill availability, delegated-review quality, review-bundle usage, or toolchain fallback behavior, Phase 8 must either create/refresh a skill-memory shard or record why no durable lesson was promoted.
- If the repo itself is a reusable skill/workflow distribution, durable memory must remain generalized. Do not store current-session run residue or temp-environment observations as if they were universal truth.
<!-- RECURSIVE-MODE-MEMORY:END -->
