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
- If the optional `recursive-training` skill is installed, run `/.recursive/scripts/recursive-training-loader.py` after reading `MEMORY.md` and before planning or implementation whenever the task may benefit from experiential memory.
- The optional `recursive-training-sync.py` helper is read-only; it prints startup guidance about what to read, but does not modify `MEMORY.md` or the memory plane.
- If the task plans delegated review, subagent help, review bundles, smoke-harness portability work, or capability-sensitive execution, read `/.recursive/memory/skills/SKILLS.md` and then load the relevant skill-memory shards.
- Recursive-mode skill package usage, subskill triggers, and file locations for this repo: `/.recursive/memory/skills/usage/recursive-mode-skill-and-subskills.md`
- If Phase 8 will need to promote durable lessons, first capture run-local skill usage in the run artifact and only then promote generalized conclusions into skill-memory shards.
- Runtime routing, provider capability metadata, alias-matrix behavior, Codex Subscription lifecycle semantics, and benchmark quality routing: `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- Taxonomy V1 catalog, groups, roles, classification fields, versioning, deprecation, docs generation: `/.recursive/memory/domains/taxonomy-v1.md`
- Pi package classifier, metadata injection flow, context signals, runtime override, safety boundaries: `/.recursive/memory/domains/pi-role-model-package.md`
- Benchmark routing display and env credential lessons: `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- GitHub Actions validation, docs deploy, binary release publication, and recursive-artifact changelog generation: `/.recursive/memory/patterns/github-ci-and-release-workflow.md`
- Git push and merge workflow (PR-only, no direct main pushes): `/.recursive/memory/patterns/git-push-merge-workflow.md`
- Prefer `Status: CURRENT` docs for planning and execution.
- `Status: SUSPECT` docs may be used as leads, but revalidate them before trust.
- Exclude `STALE` and `DEPRECATED` docs from default retrieval unless doing historical analysis.

## Registry

- `domains/` - stable functional-area knowledge with `Owns-Paths`
- `patterns/` - reusable playbooks and solution patterns
- `incidents/` - recurring failure signatures and fixes
- `episodes/` - distilled lessons from specific runs
- `training/` - extracted experiential learnings promoted from completed recursive-mode runs
- `skills/` - durable skill and capability memory, routed via `skills/SKILLS.md`
- `archive/` - historical or deprecated memory docs

## Freshness Rules

- Durable memory docs must declare the metadata defined in `references/artifact-template.md`.
- Any doc whose `Owns-Paths` or `Watch-Paths` overlaps final changed code paths must be reviewed in Phase 8.
- Affected `CURRENT` docs should be downgraded to `SUSPECT` until revalidated against final code, `STATE.md`, and `DECISIONS.md`.
- If changed paths have no owning domain doc, create one or record the uncovered-path follow-up in `08-memory-impact.md`.
- Training memory docs should keep their canonical content under `/.recursive/memory/training/`, use the memory index as the discovery surface, and record source runs plus watch-path or applicability guidance.
- Skill-memory docs should record source runs, last validated date, environment notes, and current trust/fit guidance.
- If a run materially teaches the repo something about skill availability, delegated-review quality, review-bundle usage, or toolchain fallback behavior, Phase 8 must either create/refresh a skill-memory shard or record why no durable lesson was promoted.
- If the repo itself is a reusable skill/workflow distribution, durable memory must remain generalized. Do not store current-session run residue or temp-environment observations as if they were universal truth.
<!-- RECURSIVE-MODE-MEMORY:END -->
