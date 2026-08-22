Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `4-test-summary`
Artifact: `04-test-summary.md`
Addendum: `05`
Status: `LOCKED`
LockedAt: `2026-08-22T12:04:10Z`
LockHash: `417e9d45646536af4eea6df6759abd65df2fc4ab86c7042251c3267d220ecd29`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/04-test-summary.md`
- CI run `32571779920`, build-test job `97028126224`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- Current runtime-refresh shell contract assertion.
Scope note: This is an assertion-only CI repair for the already-shipped refresh-stream rename; it does not alter runtime UI behavior.

## Purpose

Repair the full-workspace CI assertion that still named the removed `subscribeTelemetryStream` symbol, while the shell correctly uses the broader `subscribeRuntimeRefreshStream` event stream to update sidebar and page state.

## TODO

- [x] Replace the obsolete implementation-name assertion with the current refresh-stream contract.
- [x] Re-run the focused runtime UI test and repository lint.

## TDD Compliance Log

TDD Mode: strict (CI RED, assertion-only GREEN).

**RED evidence:** CI build-test job `97028126224` failed `runtime design system > shell header owns route metadata without duplicate page headers` at `design-system.test.ts:2129`: expected source to contain `subscribeTelemetryStream`; received source imports and calls `subscribeRuntimeRefreshStream`.

**GREEN implementation:** Updated the assertion to verify `subscribeRuntimeRefreshStream`, which is the concrete subscribed source used by the shell.

**GREEN verification:**

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts --reporter=verbose` — completed successfully.
- `corepack pnpm run lint` — PASS: Biome and Rust checks clean.
- `git diff --check` — PASS.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
