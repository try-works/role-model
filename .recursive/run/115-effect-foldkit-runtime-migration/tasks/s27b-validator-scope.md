# S27b make packaging validation pass against the packaged channel context (public, R22/R33)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
`pnpm run runtime:validate-packaging` fails at startup with `reader runtime channel context scope mismatch`. I proved the released v0.0.20 fails identically, so the defect is pre-existing: `validate-packaging.ts` passes `--scope-id runtime-sea-validation`, and the packaged runtime rejects any scope that differs from the channel context it was built with (`standalone-runtime-dev` for the development channel).

## Required work
1. Confirm the mismatch is exactly scope: read `negotiatePackagedTrackBStartup`/`negotiateRuntimeChannelStartup` and show which expected/observed values differ. Do not guess.
2. Fix the VALIDATOR, not the product's channel enforcement: the harness must launch the packaged runtime with a scope the package's own channel context declares (derive it from the packaged manifest/channel profile rather than hardcoding), or omit the override and assert the packaged default. Keep the enforcement itself intact - a runtime that starts with a foreign scope must still fail.
3. Prove both directions: (a) the validator launches with a compatible scope and the packaged runtime reaches `/healthz` healthy; (b) a test that the validator would still FAIL if given a foreign scope (so the fix is not 'disable the check').
4. Then run the full `runtime:validate-packaging` once against the existing packaged artifact and report the complete validation result (health, summary, execution, taxonomy, extension catalog) - or the next honest blocker if a later step fails.

## Files you may write
`role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts` and its tests; `evidence/logs/s27b-*`; `evidence/other/s27b-tdd.json`.

No packaging or channel-enforcement weakening. No installs, no commits, no subagents, no operator ports (ephemeral only). Do not delete `role-model-router/dist/release` - it is the artifact under validation.

## Strict TDD
RED for the compatible-scope launch and for the foreign-scope refusal, then GREEN. Report: the differing values, the fix, both proofs, the validation output, commits untouched, counts and typecheck.