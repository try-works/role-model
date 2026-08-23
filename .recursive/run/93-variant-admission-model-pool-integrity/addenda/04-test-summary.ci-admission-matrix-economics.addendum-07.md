Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `4-test-summary`
Artifact: `04-test-summary.md`
Addendum: `07`
Status: `LOCKED`
LockedAt: `2026-08-22T12:44:13Z`
LockHash: `b6a9b16f3b14a16cb39f49fbc6856219ee4fb57ae48f0ba13c87633e55bf5ed3`
Inputs:
- CI run `32573384653`, build-test job output
- `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-catalog-economics.ts`
Outputs:
- Hermetic Codex matrix admission responses and a hermetic catalog-economics remote admission path.
Scope note: Test and validation-harness repair only. Runtime endpoint admission remains mandatory in production.

## Purpose

Repair the remaining full-workspace CI failures after readiness admission became mandatory for remote pool additions.

## TODO

- [x] Exclude synthetic Codex admission calls from matrix user-request assertions.
- [x] Keep the catalog-economics validator hermetic by using its existing local mock peer for the synthetic remote endpoint.
- [x] Run the affected matrices and lint.

## TDD Compliance Log

TDD Mode: strict (CI RED, fixture/harness GREEN).

**RED evidence:** CI build-test run `32573384653` failed `openai-codex-subscription-matrix.test.ts` because its request capture included one `admission-` call per configured model, and failed `validate-catalog-economics.test.ts` because the validation harness used a fake Moonshot credential with a real Moonshot base URL. The readiness probe therefore left the synthetic remote endpoint ineligible.

**GREEN implementation:** Matrix adapters now return a successful response only for the existing production admission request-ID namespace and do not record it as user traffic. The economics validation's synthetic remote account uses the already-started local mock peer rather than an external provider URL.

**GREEN verification:**

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts test/validate-catalog-economics.test.ts --reporter=dot` — PASS: 10/10 tests in 32.56s.
- `corepack pnpm lint` — PASS: Biome, cargo fmt, and clippy.
- `git diff --check` — PASS.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
