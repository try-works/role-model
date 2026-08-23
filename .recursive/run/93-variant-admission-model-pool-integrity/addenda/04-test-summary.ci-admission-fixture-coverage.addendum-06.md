Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `4-test-summary`
Artifact: `04-test-summary.md`
Addendum: `06`
Status: `LOCKED`
LockedAt: `2026-08-22T12:34:33Z`
LockHash: `9c735f6d3743cf9ad49949b6ebdd599b91e1a590b5d6fa4b874418808976f0a8`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/04-test-summary.md`
- CI run `32571990515`, build-test failure log
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- Hermetic admission-readiness handling for existing host-bridge provider fixtures.
Scope note: Test-only CI repair. Production admission probing remains mandatory whenever a remote endpoint is added to the configured pool.

## Purpose

Repair the full host-bridge suite after Run 93 correctly added a real readiness probe to remote endpoint admission. Historical strict fetch and Codex-adapter fixtures interpreted the new probe as a user execution request, degrading their activated endpoint and making unrelated execution tests report no eligible target.

## TODO

- [x] Keep the production admission probe unchanged.
- [x] Make affected OpenAI-compatible fixture fetchers recognize only the exact readiness-probe body and return a hermetic successful response.
- [x] Make affected Codex subscription adapter fixtures recognize only `admission-` requests and avoid counting them as user executions.
- [x] Re-run the entire host-bridge index suite and repository lint.

## TDD Compliance Log

TDD Mode: strict (CI RED, fixture GREEN).

**RED evidence:** CI build-test run `32571990515` failed 17 existing host-bridge execution tests. The new endpoint-admission request was sent to the same provider URL as an ordinary request, so strict test doubles either rejected its probe body or counted it as execution. The resulting lifecycle state was degraded and execution failed with `No execution target is currently eligible`.

**GREEN implementation:** Added test-only exact-probe responders. The OpenAI-compatible helpers match only the admission prompt body. The Codex helpers match only the production `admission-` request-ID namespace. User request assertions, failure semantics, and production probe behavior remain unchanged.

**GREEN verification:**

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --reporter=dot` — PASS: 208/208 tests in 170.36s.
- `corepack pnpm lint` — PASS: Biome, cargo fmt, and clippy.
- `git diff --check` — PASS.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
