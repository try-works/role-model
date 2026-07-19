Type: `pattern`
Status: `CURRENT`
Scope: `How this repository should use the installed recursive-mode skill package, its subskills, and the repo control-plane files they operate on.`
Owns-Paths:
Watch-Paths:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/config/recursive-router.json`
- `/.recursive/config/recursive-router-discovered.json`
- `/.recursive/scripts/**`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.agents/skills/recursive-mode/SKILL.md`
- `/.agents/skills/recursive-mode/skills/**/SKILL.md`
- `/.agents/skills/recursive-mode/scripts/**`
Source-Runs:
- `none (generic repository guidance)`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-07-12`
Tags:
- `skills`
- `recursive-mode`
- `subskills`
- `paths`
- `workflow`

# Recursive-Mode Skill And Subskills

Use this shard when the task is about `recursive-mode` itself, about one of its subskills, or about the scripts and files those skills operate on.

## Canonical Boundary

There are two different surfaces in this repo:

- the **installed skill package** under `/.agents/skills/recursive-mode/`
- the **live repository control plane** under `/.recursive/`

Do not confuse them.

The installed package contains the skill entrypoints, helper scripts, references, and template scaffold:

- `/.agents/skills/recursive-mode/SKILL.md`
- `/.agents/skills/recursive-mode/skills/<subskill>/SKILL.md`
- `/.agents/skills/recursive-mode/scripts/**`
- `/.agents/skills/recursive-mode/references/**`
- `/.agents/skills/recursive-mode/.recursive/**` (template/example scaffold)

The live repository truth is the repo-local scaffold:

- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/<run-id>/`
- `/.recursive/config/**`
- `/.recursive/scripts/**`

When there is a conflict, use the repo-local control-plane docs, especially `/.recursive/RECURSIVE.md`. The package copy under `/.agents/skills/recursive-mode/.recursive/` is not the authoritative run state for this repository.

## File Map In This Repo

### Installed recursive-mode package

- Main skill entrypoint: `/.agents/skills/recursive-mode/SKILL.md`
- Subskills:
  - `/.agents/skills/recursive-mode/skills/recursive-spec/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-worktree/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-debugging/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-tdd/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-review-bundle/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-router/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-subagent/SKILL.md`
  - `/.agents/skills/recursive-mode/skills/recursive-training/SKILL.md`
- Helper scripts: `/.agents/skills/recursive-mode/scripts/**`
- References: `/.agents/skills/recursive-mode/references/**`
- Command templates: `/.agents/skills/recursive-mode/docs/templates/**`

### Repo-local recursive control plane

- Workflow contract: `/.recursive/RECURSIVE.md`
- Current system truth: `/.recursive/STATE.md`
- Run ledger: `/.recursive/DECISIONS.md`
- Memory router: `/.recursive/memory/MEMORY.md`
- Skill-memory router: `/.recursive/memory/skills/SKILLS.md`
- Run folders: `/.recursive/run/<run-id>/`
- Router policy: `/.recursive/config/recursive-router.json`
- Router discovery inventory: `/.recursive/config/recursive-router-discovered.json`
- Training scripts: `/.recursive/scripts/recursive-training-*.py` and `.ps1`
- Codex bridge docs: `/.codex/AGENTS.md` and `/.agent/PLANS.md`

## Main Skill: When And How To Use It

Use the main `recursive-mode` skill when the user is:

- starting a recursive run
- resuming an existing run
- asking to run a specific phase
- asking to verify locks
- asking how the recursive workflow should behave in this repo

Correct read order for the main skill in this repo:

1. `/.agents/skills/recursive-mode/SKILL.md`
2. `/.recursive/RECURSIVE.md`
3. `/.codex/AGENTS.md`
4. `/.agent/PLANS.md`
5. `/.recursive/STATE.md`
6. `/.recursive/DECISIONS.md`
7. `/.recursive/memory/MEMORY.md`
8. only the relevant memory shards

Correct operating rule:

- the package skill explains how to use the workflow
- the repo-local `/.recursive/RECURSIVE.md` defines the workflow contract

Do not treat the skill entrypoint as a replacement for `/.recursive/RECURSIVE.md`.

## Subskill Map

### `recursive-spec`

Use before a run exists when the user wants help creating a new recursive requirements/spec document.

Correct boundary:

- draft outside the repo until the user approves it
- do not create `/.recursive/run/<run-id>/` early
- do not write `00-requirements.md` from an unapproved draft

### `recursive-worktree`

Use at the start of a run for Phase 0 isolation.

Correct boundary:

- create an isolated feature-branch worktree before Phase 1+
- record baseline setup and test state in `00-worktree.md`
- keep later phases on the same worktree/branch

### `recursive-debugging`

Use for bugfix, performance, crash, failing-test, or investigation requirements.

Correct boundary:

- insert Phase `01.5-root-cause.md` between Phase 1 and Phase 2
- do root-cause analysis before planning fixes
- do not treat symptom fixes as acceptable progress

### `recursive-tdd`

Use for Phase 3 implementation work.

Correct boundary:

- no production code before a failing test
- record `TDD Mode: strict|pragmatic` in the Phase 3 artifact
- pragmatic mode is an explicit exception, not a silent shortcut

### `recursive-review-bundle`

Use when delegated review or audit needs a canonical bundle.

Correct boundary:

- generate a durable bundle before routed/delegated review
- refresh the bundle after material repairs or scope changes
- record `Review Bundle Path` in the phase artifact

### `recursive-router`

Use only when routed delegation is explicitly requested or an already configured external route must be honored.

Correct boundary:

- re-read `/.recursive/config/recursive-router.json`
- re-read `/.recursive/config/recursive-router-discovered.json`
- use it for bounded delegated roles, not as a second orchestrator
- do not perform new local CLI/provider discovery unless routing setup is actually in scope

### `recursive-subagent`

Use when a phase may benefit from delegated audit, review, testing, memory audit, or narrowly bounded implementation support.

Correct boundary:

- one active recursive phase at a time still applies
- the main agent remains the orchestrator
- delegated output is untrusted until verified against actual files, diffs, and recursive artifacts
- routed delegation, when configured, sits underneath this skill rather than replacing it

### `recursive-training`

Use after completed runs accumulate, or when planning/execution may benefit from prior extracted experiential memory.

Correct boundary:

- `08-memory-impact.md` captures run-local observations
- `recursive-training` promotes cross-run learnings into `/.recursive/memory/**`
- canonical training scripts for this repo live under `/.recursive/scripts/`, not only under the installed package

## Script Location Rules

For this repository, do not assume every helper command exists at `./scripts/...` from repo root.

Current path split:

- most recursive-mode helper scripts live under `/.agents/skills/recursive-mode/scripts/`
- training scripts that operate on the repo-local memory plane live under `/.recursive/scripts/`

Examples:

- reopen or lock an artifact:
  - `python .agents/skills/recursive-mode/scripts/recursive-lock.py ...`
- lint a run artifact set:
  - `python .agents/skills/recursive-mode/scripts/lint-recursive-run.py ...`
- verify locks:
  - `python .agents/skills/recursive-mode/scripts/verify-locks.py ...`
- load or extract training memory:
  - `python .recursive/scripts/recursive-training-loader.py ...`
  - `python .recursive/scripts/recursive-training-grpo.py ...`

If the repo later mirrors the helper scripts into a top-level `scripts/` directory, revalidate this note. Until then, use the actual installed-package path or the repo-local `/.recursive/scripts/` path as appropriate.

## Correctness Rules

- Do not use `/.agents/skills/recursive-mode/.recursive/RECURSIVE.md` as the active workflow contract for this repo; use `/.recursive/RECURSIVE.md`.
- Do not use `recursive-router` by itself to bypass `recursive-subagent` or the controller verification loop.
- Do not use `recursive-spec` to jump straight into Phase 2 planning or implementation.
- Do not use `recursive-debugging` after code changes have already started; root-cause analysis belongs before planning the fix.
- Do not hand-edit `Status`, `LockedAt`, or `LockHash` when `recursive-lock.py` or `recursive-lock.ps1` is available.
- Do not treat training extraction as a replacement for Phase 8 run-local capture.

## Retrieval Hint

When the task is "how do I use recursive-mode correctly in this repo?" the minimum useful read set is:

1. `/.recursive/memory/skills/usage/recursive-mode-skill-and-subskills.md`
2. `/.agents/skills/recursive-mode/SKILL.md`
3. `/.recursive/RECURSIVE.md`
4. the specific subskill `SKILL.md` that matches the request
