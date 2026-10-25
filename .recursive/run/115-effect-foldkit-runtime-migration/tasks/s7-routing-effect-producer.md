# S7 deterministic route decision behind an Effect producer (public, R25)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R25; source proposal §17 B7 and §7.3. Baseline public f0d50fab.

## Contract
The policy scorer must stay a pure synchronous kernel. Add the thinnest honest Effect producer around it so an Effect-based caller can depend on a service rather than importing the kernel directly, without changing any decision.

Required behaviour:
1. A new Effect module exposes the existing deterministic decision through an Effect, with the same inputs and the same output for the same inputs.
2. Byte-for-byte decision equality with the synchronous kernel on a fixture matrix: ties, empty pool, hard-eligibility filtering, arm/effort identity, and the reason code/detail wire fields.
3. The empty-pool case must remain a success with an empty chosen endpoint id, not a failure.
4. No new validation, no reordering of policy steps, no changed strictness.
5. The producer must be reachable from a real caller you add or change, or it must be explicitly documented as staged with the caller named in the file. Do not add a service that nothing can call.

## API reality check (do this first)
Read the vendored Effect source before writing code: `vendor/effect/packages/effect/src` for the current `Effect`/`Context`/`Layer` shape, and `vendor/effect/packages/effect/*.md` guidance. The vendored tree is 4.0.1 today, so APIs may differ from any 4.0.6 documentation. If the exact API you need is not clearly supported by the vendored source, STOP and report what you found instead of inventing a signature.

## Files
You may add one new module and one new test under `role-model-router/packages/core/` and touch `role-model-router/packages/core/src/index.ts` only if an export is genuinely required. Nothing else: no other package, no root or lockfile, no private repo, no phase artifacts. Evidence goes to the run directory under `evidence/logs/s7-*` and `evidence/other/s7-tdd.json`.

## Strict TDD
1. Write the equality test first against the existing kernel plus the not-yet-written producer, so it fails for the missing export, then add the minimal module. If the first failure is only a missing export, say so and treat the behavioural assertions as the real gate: they must run and pass afterwards.
2. Capture RED and GREEN logs and a typecheck log.
3. Run the existing core suite to prove no regression.

## Rules
- No installs; the workspace already has dependencies installed.
- No commits, no subagents, no providers.
Report: the vendored API you relied on with file paths and line numbers, commands and exits, test counts, whether a real caller exists, sha256 of the new files, and anything unverified.
