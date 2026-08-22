Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `4-test-summary`
Artifact: `04-test-summary.md`
Addendum: `04`
Status: `LOCKED`
LockedAt: `2026-08-22T11:59:46Z`
LockHash: `5ac8202d3edfaefe619cb6c2c068ddf69632565d55c0fb1529fa5ebbc73475a6`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/04-test-summary.md`
- CI run `32571263826`, runtime-router job `97026937615`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Outputs:
- Hermetic restart-admission fixture regression coverage.
Scope note: This addendum repairs only test-harness isolation after the approved Run 93 admission behavior; it does not alter production behavior.

## Purpose

Record the post-PR CI regression caused by Run 93's intentional remote endpoint admission probe and its hermetic test-fixture repair. No production admission or network behavior changed in this addendum.

## TODO

- [x] Replace stale fetcher assumptions with an explicit, synthetic admission response.
- [x] Re-run affected restart and validation coverage.

## TDD Compliance Log

TDD Mode: strict (CI RED, then fixture-only GREEN).

### Restart rehydration fixtures

**RED evidence:** CI job `97026937615` failed four restart cases because their synthetic OAuth fetchers rejected the new admission `*/chat/completions` call as unexpected. The failures were the stale bridge-token repair, stale standalone-token repair, stored-device refresh, and readiness-summary rehydration paths.

**GREEN implementation:** `restart-rehydration.test.ts` now uses one deterministic 200 chat-completion response only inside its fixture fetchers. This preserves an explicit successful admission probe and prevents any test access to a live provider.

**GREEN verification:**

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts test/validate-restart-rehydration.test.ts --reporter=verbose --testNamePattern="restores activated endpoints|repairs stale bridge|repairs stale standalone|refreshes Kimi OAuth|rehydrates activated endpoints"` — 5 passed, 0 failed.
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts test/validate-restart-rehydration.test.ts --reporter=dot` — completed successfully after the complete restart suite.
- `corepack pnpm run lint` — PASS: Biome and Rust `fmt`/`clippy` clean.
- `git diff --check` — PASS.

## Scope and Safety

- Changed file: `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`.
- Production code is unchanged by this correction.
- The test response is synthetic, contains no provider credential, and only answers the admission-probe path.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
