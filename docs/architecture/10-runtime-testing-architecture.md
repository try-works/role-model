# Runtime Testing Architecture

## Purpose

This document defines the canonical testing taxonomy for the role-model runtime surfaces. Future runs and contributors should use it to determine which test layers exist, what each layer is responsible for, and which kinds of failures each layer is expected to catch.

## Testing Layers

### 1. Unit Tests

- **Purpose:** Verify individual functions, types, and pure logic in isolation.
- **Runner:** Vitest, config-driven discovery via `vitest.config.ts` (host-bridge) or `vite.config.ts` (runtime-ui).
- **Dependencies:** No external services, no network, no real SQLite persistence beyond in-memory or temp-dir fixtures.
- **Runtime cost:** Seconds.
- **Evidence expectation:** Green Vitest output cited in recursive run Phase 4 receipts.
- **Command:** `corepack pnpm --filter @role-model-router/runtime-host-bridge test` or `corepack pnpm --filter @role-model-router/runtime-ui test`

### 2. Integration Tests

- **Purpose:** Verify multi-component runtime behavior using real bridge backends, SQLite persistence, and seeded fixture data without external network calls.
- **Runner:** Vitest, same config-driven discovery as unit tests but exercising `createRuntimeBridgeBackend` and HTTP surfaces.
- **Dependencies:** Temp-dir runtime state, fixture data under `testdata/router-runtime/fixtures/`, no live provider credentials.
- **Runtime cost:** Tens of seconds to minutes.
- **Evidence expectation:** Green Vitest output with test counts cited in Phase 4.
- **Command:** Included in the package `test` script; focused subsets via `test:critical`.

### 3. Validator Tests

- **Purpose:** Prove specific runtime surfaces work end-to-end through real bridge HTTP routes, seeded state, and deterministic assertions.
- **Runner:** Vitest test files under `test/validate-*.test.ts` plus CLI entrypoints via `runtime:validate-*` root scripts.
- **Dependencies:** Same as integration tests; no external network by default.
- **Runtime cost:** Seconds to tens of seconds per validator.
- **Evidence expectation:** JSON output from the validator CLI or green Vitest output.
- **Commands:**
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-tools`
  - `corepack pnpm run runtime:validate-catalog-economics`
  - `corepack pnpm run runtime:validate-operations`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-packaging`

### 4. Browser E2E Tests

- **Purpose:** Verify operator-facing runtime UI workflows against a rebuilt runtime surface with real HTTP data, not a frontend-only dev preview.
- **Runner:** Playwright, Chromium-only by default (Edge on local Windows).
- **Dependencies:** Built runtime UI assets, seeded QA bridge via `scripts/start-for-qa.ts`, no live provider credentials.
- **Runtime cost:** Tens of seconds.
- **Evidence expectation:** Playwright trace, screenshot on failure, green test output.
- **Command:** `corepack pnpm run runtime:test-browser`

### 5. Rebuilt-Runtime Verification

- **Purpose:** Confirm that operator-facing changes work against the actual packaged runtime artifact, not only against a dev server or test harness.
- **Runner:** Manual or agent-operated QA using `start-for-qa.ts` or the packaged SEA binary.
- **Dependencies:** Built runtime UI, optional packaged SEA binary, seeded fixture data.
- **Runtime cost:** Minutes.
- **Evidence expectation:** Screenshots, route-sweep snapshots, or structured observations cited in Phase 5 receipts.
- **When required:** Whenever operator-facing UI or runtime-host behavior changes. See the changed-path regression matrix in `docs/operations/04-runtime-testing-matrix.md`.

### 6. Packaged-Runtime Verification

- **Purpose:** Confirm that the packaged SEA binary launches, serves the UI, and exposes key runtime APIs without regressions.
- **Runner:** `corepack pnpm run runtime:validate-packaging` or the `build-binaries.yml` workflow.
- **Dependencies:** Full build toolchain, Go toolchain for vendored host, mock OpenAI-compatible upstream.
- **Runtime cost:** Minutes to tens of minutes.
- **Evidence expectation:** Validator JSON output, workflow success, or manual launch proof.
- **When required:** Whenever the packaging path, SEA configuration, or runtime artifact composition changes.

## Deterministic vs Credential-Bearing Verification

| Category | Deterministic (CI-safe) | Credential-Bearing (manual/agent) |
| --- | --- | --- |
| Unit tests | Yes | No |
| Integration tests | Yes | No |
| Validator tests | Yes | No |
| Browser E2E | Yes (local) | No |
| Rebuilt-runtime verification | Yes (local) | Optional (live providers) |
| Packaged-runtime verification | Yes (mock upstream) | No |

Default CI and local development must remain deterministic and offline-safe. Live secrets, real OAuth, and external-provider network dependencies are not allowed in the default CI floor.

## Named Root Commands

| Command | Tier | CI-safe | Description |
| --- | --- | --- | --- |
| `runtime:test-critical` | Critical regression | Yes | Focused host + UI tests plus `runtime:validate-ui` and `runtime:validate-observability` |
| `runtime:test-router` | Router-focused regression | Yes | Curated router-backend tests, trace/usage package tests, plus `runtime:validate-routing` and `runtime:validate-observability` |
| `runtime:test-validators` | Validator coverage | Yes | UI, observability, tools, and catalog-economics validators |
| `runtime:test-browser` | Browser E2E | Yes (local) | Playwright rebuilt-runtime browser regression |
| `runtime:test-full` | Full runtime regression | Yes (local) | Critical regression plus browser E2E |
| `runtime:validate-packaging` | Packaged-runtime | Yes (mock) | Build SEA, launch, and verify packaged runtime behavior |

## TDD Discipline

All production and testing-infrastructure code changes must follow TDD:

- **Strict mode:** Write a failing test first, implement minimal code to pass, refactor while green.
- **Pragmatic mode:** Use for configuration-only changes (package.json scripts, workflow YAML, docs) where no meaningful failing unit test exists. Record the exception reason, the executable command that proves the wiring, and the broader validator or lint command that covers the change.

See `docs/operations/04-runtime-testing-matrix.md` for the changed-path regression matrix and contributor workflow guidance.
