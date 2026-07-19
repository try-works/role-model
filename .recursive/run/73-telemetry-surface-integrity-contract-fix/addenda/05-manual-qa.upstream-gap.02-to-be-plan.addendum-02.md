Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-16T20:42:42Z`
LockHash: `c1dff67f3788d44e3851713644749344ba9251d334ba81cc2438abca05725433`
Workflow version: `recursive-mode-audit-v2`
Addendum type: `upstream-gap plan amendment`
Prior artifact with gap: `02-to-be-plan.md`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/04-test-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/05-manual-qa.md` (DRAFT)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` (DRAFT)
Outputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`

Scope note: This addendum amends the locked Phase 2 plan with the work required to resolve audit findings `A73-01` through `A73-08`. It narrows execution to the original R1-R9 contract and does not add unrelated functionality.

## TODO

- [x] Define canonical workflow recovery before code repair
- [x] Split remediation into independently testable implementation slices
- [x] Require strict RED-GREEN-REFACTOR evidence for every production repair
- [x] Define deterministic browser regression data and geometry assertions
- [x] Define rebuilt-runtime verification on a non-`:3456` port
- [x] Map every repair slice to R1-R9 and audit findings
- [x] Define completion and rollback gates
- [x] Complete the addendum coverage and approval gates

## Plan Amendment Summary

The original plan underestimated four cross-layer obligations:

1. prompt-cache synthesis must occur at a capability-aware boundary and include a deterministic message-hash fallback
2. token provenance and availability must persist through the canonical usage and telemetry contracts rather than being reconstructed in the UI
3. chart geometry needs data-dependent axis sizing plus deterministic rendered-geometry tests, not only fixed margin changes
4. browser and rebuilt-runtime verification must execute and pass before R8 or R9 can be marked verified

The remediation sequence below replaces the remaining Phase 5-only path. Phase 5 is blocked until workflow recovery, implementation repair, and Phase 4 reverification are complete.

## Execution Discipline

- TDD Mode: `strict`
- Iron law: no repair production code may be written before its owning failing test is executed and captured.
- Unverified chart, design-system, and request-detail edits from the current worktree must be returned to their pre-change behavior before their replacement RED tests are authored. Reapplication occurs only after the RED evidence exists.
- Each sub-phase follows:
  1. add or tighten the smallest owning test
  2. run it and capture RED output under `evidence/logs/red/remediation/`
  3. implement the minimum production repair
  4. rerun and capture GREEN output under `evidence/logs/green/remediation/`
  5. refactor without changing behavior
  6. rerun the focused test and affected package suite
- A passing pre-existing test is not RED evidence.
- A compiler or syntax error introduced by production editing is not RED evidence.
- Browser tests are required automated verification for R8; rebuilt-runtime browser QA remains a separate R9 gate.

## SP0 Workflow Recovery and Root-Cause Gate

Purpose: restore the recursive lock chain before modifying product code.

Steps:

1. Keep the runtime on `:3456` untouched.
2. Reopen Phase 2 with the canonical tool so the missing mandatory Phase 1.5 gate can be inserted before planning:

```powershell
python .agents/skills/recursive-mode/scripts/recursive-lock.py `
  --run-id 73-telemetry-surface-integrity-contract-fix `
  --artifact 02-to-be-plan.md `
  --repo-root . `
  --reopen
```

3. Create `01.5-root-cause.md` using the recursive-debugging contract. It must trace the failure boundaries across L1-L5 and include deterministic reproductions for all eight audit findings.
4. Lock `01.5-root-cause.md` only after its audit, coverage, and approval gates pass.
5. Update the reopened Phase 2 artifact to list both audit addenda as effective inputs and reconcile this amended plan.
6. Relock Phase 2 with `recursive-lock.py`.
7. Reopen Phase 3 with `recursive-lock.py --reopen`; this invalidates downstream receipts.
8. Treat the base requirements, root-cause artifact, reopened plan, and both addenda as effective Phase 3 inputs.
9. Do not resume Phase 5 until repaired Phase 3 and Phase 4 are locked in order.

Acceptance gate:

- `01.5-root-cause.md` is lock-valid.
- Phase 2 is lock-valid and cites both addenda.
- Phase 3 is the single active phase.
- No later phase receipt is treated as current.

## SP1 Capability-Aware Prompt-Cache Contract

Findings: `A73-01`

Requirements: R1, R4, R7

RED tests first:

- explicit `prompt_cache_key` remains authoritative and unchanged
- known runtime conversation/session id takes precedence for synthesis
- requests without a continuity id receive a deterministic SHA-256 key derived from canonical system prompt plus ordered messages
- identical canonical messages produce the same key; order or content changes produce a different key
- raw prompt/message content is not exposed in the synthesized key or diagnostics
- synthesis is disabled when the selected transport capability reports `promptCaching.supported: false`
- exact-model and alias-backed routes preserve the same contract
- final provider wire request includes the synthesized key only for a capable target
- persisted request detail or telemetry exposes `explicit` versus `synthesized` provenance

Implementation direction:

- Move the final synthesis decision to a boundary that has the selected target and negotiated capability matrix.
- Represent continuity input separately from the final provider cache request if routing occurs before capability negotiation.
- Add a canonical stable serializer and SHA-256 helper for the system prompt and ordered messages fallback.
- Preserve provider-local cache-domain continuity and explicit-key authority.
- Carry cache-key source into runtime observability and request-detail contracts without persisting raw prompt material.

Owning surfaces:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- persistence/API types required to expose provenance

Acceptance gate:

- All RED cases pass after implementation.
- Unsupported targets do not receive a key and do not report `promptCacheRequested: true`.
- Exact and alias paths have deterministic regression proof.

## SP2 Extensible Usage Extraction and Final-Wire Contract

Findings: `A73-07`

Requirements: R2, R7

RED tests first:

- top-level streamed `usage`
- nested `choices[0].usage` with `finish_reason: "stop"`
- nested `choices[0].usage` with `finish_reason: "tool_calls"`
- non-streamed completion `usage`
- supported-zero cache miss remains supported zero
- cached-token and cache-write-token fields remain normalized without total rewriting
- final streamed Kimi-compatible wire request contains `stream: true`, the capable synthesized `prompt_cache_key`, and the capability-declared usage-enabling request fields
- existing OpenAI-family response shapes remain green

Implementation direction:

- Introduce one ordered usage-extractor list or helper instead of embedding fallback paths in the stream loop.
- Preserve the last valid usage-bearing final chunk without losing nested cache fields.
- Add `stream_options.include_usage` only when the active provider capability and official transport contract require/support it; do not hard-code it globally.

Owning surfaces:

- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- capability metadata or request-shaping types if usage-enabling fields are added

Acceptance gate:

- The complete R2 matrix passes.
- Both ordinary and tool-calling final chunks produce non-zero normalized usage when supplied upstream.
- Final-wire assertions prove cache and usage request shaping together.

## SP3 Canonical Token Truth, Availability, and Provenance

Findings: `A73-02`

Requirements: R3, R4, R7, R8

RED tests first:

- measured provider usage persists as measured
- normalized compatible usage persists as normalized when transformation is required
- absent usage produces an estimate from the actual outbound provider request capture, including tools and provider-wire structure
- estimate failure persists an unavailable state, not a false measured zero
- genuine zero remains distinguishable from unavailable
- estimated or unavailable rows cannot silently corrupt `cacheHitTokenRate` or other supported-row aggregates
- request detail renders measured, normalized, estimated, and unavailable states from backend truth without local inference
- activity/summary consumers use the same canonical fact where they already display request size

Implementation direction:

- Extend the protocol usage schema and generated types with canonical token-source and availability semantics.
- Decide whether input and output need separate source fields or one usage-level source; document the choice and preserve future extensibility.
- Derive estimates from `ProviderRequestCapture.body` or provider-wire bytes with a documented provider-family policy.
- Carry provenance through adapter execution, usage events, runtime observability, SQLite persistence, host APIs, runtime-ui API types, and request-detail rendering.
- Exclude unavailable token values from aggregates instead of treating compatibility zeros as measured input.
- Remove request-detail fallback logic that infers `measured` from numeric presence.

Owning surfaces:

- `protocol/schemas/usage-event.schema.json`
- generated protocol types and schema fixtures/tests
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- owning package and route tests

Acceptance gate:

- Provenance survives a full request from provider normalization to browser-visible request detail.
- No operator surface labels an estimated value as measured.
- Unavailable values do not render as zero and do not enter supported-token denominators.

## SP4 Data-Dependent Shared Chart Layout Contract

Findings: `A73-05`, `A73-06`

Requirements: R5, R6, R7

RED tests first:

- exported contract exposes `leftAxisGutter`, `rightAxisReserve`, `legendInset`, `plotMargin`, and `plotHeight`
- single-axis line chart renders one axis with no negative margin
- dual-axis line, area, and bar charts render true left/right axes
- multi-digit and wide formatted left ticks fit within the computed gutter
- fractional and zero right ticks fit without fixed excess reserve
- legend inset is observable for single-series and multi-series charts
- single-axis plot centering remains within an explicit tolerance
- dual-axis plot right reserve is derived from formatted labels
- the contract's `plotHeight` controls rendered height
- ranking-chart bottom legend remains readable after shared legend changes

Implementation direction:

- Replace fixed axis widths with a shared deterministic width resolver based on formatted labels, font metrics approximation, and bounded minimum/maximum values.
- Keep all line, area, and bar time-series charts on one resolver and contract.
- Add stable chart/card/axis/legend/plot test ids required for browser bounding-box assertions.
- Use the shared `plotHeight` value instead of hard-coded utility classes.
- Document the contract in `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` or `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`.

Owning surfaces:

- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- design-system tests and selected architecture documentation

Acceptance gate:

- All chart kinds share the same contract and width resolver.
- Unit tests cover wide, fractional, and zero tick cases plus legend and centering invariants.
- No route-local geometry override is introduced.

## SP5 Deterministic Browser Regression Harness

Findings: `A73-03`

Requirements: R6, R8

RED tests first:

- canonical QA startup produces deterministic populated telemetry with:
  - a wide left-axis value
  - fractional right-axis values
  - zero boundary values
  - one measured request
  - one estimated request
  - one unavailable request if the canonical contract supports deterministic failure injection
- browser test selects shared chart cards through stable test ids or accessible regions, not incorrect HTML tag assumptions
- bounding-box assertions prove left/right labels stay inside the card
- legend left coordinate satisfies the shared inset contract
- plot left/right free-space difference stays within an explicit centering tolerance
- request detail navigates by a deterministic seeded request id and asserts value plus provenance
- Overview single-axis, Overview/Observe dual-axis, and one additional line/area/bar consumer are covered

Implementation direction:

- Extend `start-for-qa.ts` and `testdata/router-runtime/fixtures` through the existing canonical QA seeding mechanism.
- Do not rely on ambient first-row ordering, external provider access, or screenshots alone.
- Retain screenshots as supplementary evidence after semantic and geometry assertions pass.
- Ensure the Playwright web server uses isolated `:3462` and shuts down cleanly after the suite.

Owning surfaces:

- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `testdata/router-runtime/fixtures`
- `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- Playwright helpers or selectors owned by the shared chart primitive

Acceptance gate:

- The new browser tests fail on the baseline defect and pass on the repaired implementation.
- All required surfaces render populated geometry.
- Browser execution is CI-safe and offline-safe.

## SP6 Phase 3 and Phase 4 Reverification

Findings: `A73-05`, `A73-08`

Requirements: R1-R8

Required verification:

```powershell
corepack pnpm --filter @role-model-router/provider-openai test
corepack pnpm --filter @role-model-router/adapter-execution test
corepack pnpm --filter @role-model-router/runtime-observability test
corepack pnpm --filter @role-model-router/sqlite-memory test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @role-model-router/runtime-ui test:browser
corepack pnpm run schemas:validate
corepack pnpm run runtime:validate-observability
```

Steps:

1. Update reopened `03-implementation-summary.md` with distinct RED and GREEN evidence for every production slice.
2. Audit requirement completion against R1-R8 and both addenda.
3. Lock Phase 3 only after strict TDD compliance, diff reconciliation, and all gates pass.
4. Reopen `04-test-summary.md` with the canonical reopen command.
5. Run the full verification matrix, record exact commands and exit codes, and repair any run-owned failure.
6. Do not mark R8 verified merely because test source exists; require an executed passing Playwright result.
7. Relock Phase 4 only after Phase 3 is lock-valid and all required automated tests pass.

Acceptance gate:

- Phase 3 and Phase 4 lock timestamps and receipts are monotonic.
- R1-R8 have concrete changed files, implementation evidence, and distinct verification evidence.
- Recursive lint and lock verification pass through Phase 4.

## SP7 Implementation Commit and Rebuilt-Runtime Browser QA

Findings: `A73-04`

Requirements: R9

Preconditions:

- R1-R8 are verified and Phase 4 is lock-valid.
- The repaired implementation exists in a named implementation commit.
- The current listener and PID on `:3456` are recorded before QA.

Steps:

1. Build the packaged runtime from the implementation commit:

```powershell
corepack pnpm run runtime:package-sea
```

2. Select and record a free verification port other than `3456`; prefer `3483` unless occupied.
3. Start the rebuilt runtime with an isolated state root and the selected port. Do not reuse, stop, restart, or rebind the runtime on `:3456`.
4. Generate deterministic Kimi or compatible request evidence for:
   - synthesized prompt-cache request and source
   - explicit prompt-cache request authority
   - measured nested streamed usage
   - estimated or unavailable request-size behavior
5. Visit and record exact routes for:
   - request detail
   - one single-axis chart
   - one dual-axis chart
   - one additional shared time-series consumer
6. Capture request ids, endpoint/model ids, startup command, port, screenshots, and browser observations under the run evidence directory.
7. Verify left/right labels, legend inset, plot centering, prompt-cache truth, token value, and provenance in the rebuilt runtime.
8. Stop only the test-port runtime and prove the original `:3456` PID/listener is unchanged.
9. Update and lock `05-manual-qa.md` according to its declared QA execution mode and sign-off requirements.

Acceptance gate:

- Rebuilt-runtime evidence comes from the implementation commit, not source preview or mocked UI.
- The verification port is not `3456`.
- The original runtime remains undisturbed.
- Every R9 scenario has concrete browser evidence and request identifiers.

## SP8 Closeout

Requirements: R1-R9

Steps:

1. Run strict recursive lint and lock verification.
2. Complete Phase 6 decisions receipt from final implementation reality.
3. Complete Phase 7 state receipt from final runtime truth.
4. Complete Phase 8 memory impact, including durable lessons about token provenance, chart geometry tests, and browser-fixture seeding.
5. Do not close the run while any R1-R9 disposition is `blocked`, `implemented`, or unsupported by verification evidence.

## Requirement Mapping

| Requirement | Repair slices | Final verification |
|---|---|---|
| R1 | SP1 | host tests, exact/alias tests, rebuilt request detail |
| R2 | SP2 | provider matrix, final-wire assertions, rebuilt compatible request |
| R3 | SP3 | schema/persistence/API/UI tests, rebuilt request detail |
| R4 | SP1, SP3 | observability and analytics regression suites |
| R5 | SP4 | shared contract tests and documentation |
| R6 | SP4, SP5 | unit geometry invariants and browser bounding boxes |
| R7 | SP1-SP6 | strict RED/GREEN evidence and complete regression matrix |
| R8 | SP5, SP6 | executed passing Playwright suite |
| R9 | SP7 | rebuilt-runtime browser evidence on isolated port |

## Rollback and Recovery

- If a RED test does not reproduce its finding, stop and revisit `01.5-root-cause.md`; do not add speculative production changes.
- If a repair changes unrelated behavior, revert only that repair slice to its pre-slice state and retain the failing evidence for diagnosis.
- If Playwright leaves its QA process running, identify the listener by the configured test port and stop only that process.
- If the preferred rebuilt-runtime port is occupied, choose another free non-`3456` port and record it.
- If Kimi is not routable, record the exact blocker and use the requirement-permitted compatible deterministic path for automated proof; do not overstate live Kimi verification.
- If any required rebuilt-runtime scenario cannot be executed, keep Phase 5 and R9 blocked.

## Effective-Input Rule

Until superseded by a later locked addendum, remediation must treat these as one effective plan:

- `00-requirements.md`
- `01.5-root-cause.md` once created
- `02-to-be-plan.md`
- `05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- this plan-amendment addendum

The addendum corrects omissions in the original plan without weakening or widening R1-R9.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: SP1 | Verification Surface: SP1 and SP6 | QA Surface: SP7
- R2 | Status: planned | Implementation Surface: SP2 | Verification Surface: SP2 and SP6 | QA Surface: SP7
- R3 | Status: planned | Implementation Surface: SP3 | Verification Surface: SP3 and SP6 | QA Surface: SP7
- R4 | Status: planned | Implementation Surface: SP1 and SP3 | Verification Surface: SP6 | QA Surface: SP7
- R5 | Status: planned | Implementation Surface: SP4 | Verification Surface: SP4 and SP6 | QA Surface: SP7
- R6 | Status: planned | Implementation Surface: SP4 and SP5 | Verification Surface: SP5 and SP6 | QA Surface: SP7
- R7 | Status: planned | Implementation Surface: SP1-SP5 | Verification Surface: SP6 | QA Surface: SP7
- R8 | Status: planned | Implementation Surface: SP5 | Verification Surface: SP6 | QA Surface: SP7
- R9 | Status: planned | Implementation Surface: not-applicable, verification requirement | Verification Surface: SP7 | QA Surface: SP7

## Audit Verdict

Addendum audit: PASS

The amended plan addresses every audit finding and requirement with an ordered implementation, verification, and rebuilt-runtime QA path.

## Coverage Gate

- [x] `A73-01` through `A73-08` each have an owning repair slice
- [x] R1-R9 are mapped to implementation, verification, and QA surfaces
- [x] Strict TDD recovery is explicit
- [x] Deterministic browser regression protection is explicit
- [x] Rebuilt-runtime QA on a non-`:3456` port is explicit
- [x] Workflow recovery and closeout sequencing are explicit

Coverage: PASS

## Approval Gate

- [x] The plan is executable without relying on chat context
- [x] The plan preserves the original locked requirement scope
- [x] Phase 5 cannot proceed before repaired Phase 3 and Phase 4 gates pass
- [x] Every completion claim requires concrete evidence

Approval: PASS
