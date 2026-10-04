Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 06 Decisions Update
Status: `LOCKED`
LockedAt: `2026-10-04T22:07:37Z`
LockHash: `aff99b0e29e34210a0f28bca0b78241d7dc29f988a96d63d77919af491475197`
Workflow version: recursive-mode-audit-v2
Inputs:
- /.recursive/run/106-client-neutral-model-effort-routing/02-to-be-plan.md
- /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/06-decisions-update.md
Scope note: Concise delta receipt pointing at /.recursive/DECISIONS.md.

## TODO

- [x] Record run-106 decisions in /.recursive/DECISIONS.md
- [x] Complete Coverage and Approval gates

## Decisions Changes Applied

- Client-neutral model-effort routing: resolve model first, then apply reasoning effort (`strict`/`preferred`/`router`) within the executable arm pool.
- Effort-policy vocabulary `strict | preferred | router`; omitted -> router, legacy scalar -> preferred, explicit -> authoritative.
- Four lossless effort states (`named | disabled | provider-default | no-client-preference`) preserved end to end; occurrence boundary keeps a binary `effort_source` vocabulary, decision keeps the four-state.
- Effort-scoped evidence with borrowed/related-effort priors (never exact).
- SP8/SP9 are Phase 5 verification (not Phase 3 subphases) and are now DONE, not deferred.

## Rationale

The effort-routing defect root causes are fully addressed by SP1-SP7 + SP3b/SP4b + batch 1/2/3 wiring; no requirement remains deferred.

## Resulting Decision Entry

Delta for /.recursive/DECISIONS.md: client-neutral model-effort routing; borrowed sibling-effort prior (neutral regression) in getQualityMetric; four-state effort-source vocabulary; packaged SEA + real-Pi Phase 5 QA on `:3462`.

## Traceability

R1 -> SP1 + SP4b -> normalization/resolution wired
R2 -> SP2 -> arm expansion wired
R3 -> SP4 + SP4b -> policy resolution wired
R4 -> SP1-SP3 + R4 batch -> four-state vocabulary wired
R5 -> SP3 + SP3b + producer -> borrowed/related-effort prior wired
R6 -> SP4 + R6 batch -> arm-aware lifecycle wired
R7 -> SP5 -> turn-aware difficulty wired
R8 -> SP6 -> non-inferiority wired
R9 -> SP7 -> discovery union/intersection wired
R10 -> SP7 + R10 batch -> canonical provenance wired
R11 -> SP8 -> UI truthfulness wired
R12 -> SP9 -> packaged SEA verified
R13 -> SP1-SP7 TDD -> verified
R14 -> delegated reviewers/auditors -> verified
R15 -> Phase 5 isolated packaged runtime + Pi -> verified

## Coverage Gate

- [x] Decisions recorded and pointed at /.recursive/DECISIONS.md.

Coverage: PASS

## Approval Gate

- [x] Concise delta receipt.

Approval: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: in-session subagents available; closeout receipts summarize already-locked phase evidence.
Delegation Decision Basis: Phases 6-8 are concise delta receipts over locked artifacts; a delegated audit would re-read the same locked inputs without new information.
Delegation Override Reason: closeout receipts only point at already-locked control-plane deltas; delegation adds no independent verification value.
Audit Inputs Provided: 00-worktree.md, 03-implementation-summary.md, 05-manual-qa.md.

## Effective Inputs Re-read

- 00-worktree.md, 03-implementation-summary.md, 05-manual-qa.md

## Earlier Phase Reconciliation

Phases 0-5 are LOCKED; this receipt carries their verified dispositions unchanged.

## Subagent Contribution Verification

Reviewed Action Records: none
Main-Agent Verification Performed: `/.recursive/run/106-client-neutral-model-effort-routing/06-decisions-update.md`
Acceptance Decision: accepted
Refresh Handling: none
Repair Performed After Verification: none

## Worktree Diff Audit

Baseline type: remote ref
Baseline reference: origin/dev
Comparison reference: working-tree
Normalized baseline: 701b8b8fc0b0eeebdfe818b757f5702f50021488
Normalized comparison: working-tree
Normalized diff command: git diff --name-only 701b8b8fc0b0eeebdfe818b757f5702f50021488
Actual changed files reviewed:
- `.gitignore`
- `packages/conformance/src/run106-effort-source-schema-compat.test.ts`
- `packages/conformance/src/run91-effort-schema.test.ts`
- `packages/protocol-types/src/generated.ts`
- `pnpm-lock.yaml`
- `protocol/fixtures/downstream-openai/downstream-openai-discovery-basic.json`
- `protocol/schemas/downstream-openai-discovery.schema.json`
- `protocol/schemas/router-decision.schema.json`
- `protocol/schemas/trace-event.schema.json`
- `protocol/schemas/trace-span.schema.json`
- `protocol/schemas/usage-event.schema.json`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-arm-preference-expansion.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-canonical-effort-emission.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-discovery-effort-projection.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-effort-aware-cache-continuity.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-normalization.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-pool-application.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-resolution.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run106-turn-aware-difficulty.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run116-alias-effort-bias.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run91-effort-instance-identity.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/effort-truth.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/effort-truth.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/adapter-execution/test/run106-arm-execution-mapping.test.ts`
- `role-model-router/packages/catalog/src/index.ts`
- `role-model-router/packages/catalog/src/reasoning.ts`
- `role-model-router/packages/core/src/reason-codes.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/core/test/routing-intent.test.ts`
- `role-model-router/packages/core/test/run106-borrowed-quality-prior.test.ts`
- `role-model-router/packages/core/test/run106-canonical-decision-provenance.test.ts`
- `role-model-router/packages/core/test/run106-effort-source-vocabulary.test.ts`
- `role-model-router/packages/core/test/run106-effort-union-intersection.test.ts`
- `role-model-router/packages/core/test/run106-non-inferiority-ranking.test.ts`
- `role-model-router/packages/core/test/run106-non-inferiority.test.ts`
- `role-model-router/packages/core/test/run106-phase35-review-fixes.test.ts`
- `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`
- `role-model-router/packages/endpoint-registry/src/index.ts`
- `role-model-router/packages/endpoint-registry/test/run106-arm-expansion.test.ts`
- `role-model-router/packages/endpoint-registry/test/run106-registry-arm-expansion.test.ts`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/packages/profile-aggregator/src/index.ts`
- `role-model-router/packages/profile-aggregator/test/run106-related-effort-borrow.test.ts`
- `role-model-router/packages/protocol-routing/src/index.ts`
- `role-model-router/packages/runtime-observability/package.json`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/runtime-observability/src/otel.ts`
- `role-model-router/packages/runtime-observability/test/run106-effort-source-roundtrip.test.ts`
- `role-model-router/packages/runtime-observability/test/run91-effort-otel.test.ts`
- `role-model-router/packages/sqlite-memory/package.json`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/run106-effort-source-migration.test.ts`
- `role-model-router/packages/trace/package.json`
- `role-model-router/packages/trace/src/index.ts`
- `role-model-router/packages/trace/test/run106-lineage-effort-source.test.ts`
- `role-model-router/packages/usage/src/index.ts`
- `role-model-router/packages/usage/test/run91-effort-lineage.test.ts`
- `.recursive/DECISIONS.md`
Unexplained drift: none

## Gaps Found

None - all R1-R15 are verified; no deferred or blocked requirements remain.

## Repair Work Performed

None required.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `packages/protocol-types/src/generated.ts`, `protocol/fixtures/downstream-openai/downstream-openai-discovery-basic.json`, `protocol/schemas/downstream-openai-discovery.schema.json`, `protocol/schemas/router-decision.schema.json`, `protocol/schemas/trace-event.schema.json`, `protocol/schemas/trace-span.schema.json`, `protocol/schemas/usage-event.schema.json`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-normalization.test.ts`, `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/packages/catalog/src/reasoning.ts`, `role-model-router/packages/protocol-routing/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp1-effort-policy-normalization.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R2 | Status: verified | Changed Files: `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/packages/adapter-execution/test/run106-arm-execution-mapping.test.ts`, `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`, `role-model-router/packages/endpoint-registry/src/index.ts`, `role-model-router/packages/endpoint-registry/test/run106-arm-expansion.test.ts`, `role-model-router/packages/endpoint-registry/test/run106-registry-arm-expansion.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-registry-arm-expansion.green.txt`, `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp2-arm-expansion.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R3 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-arm-preference-expansion.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-pool-application.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-resolution.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp4-effort-policy-resolution.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R4 | Status: verified | Changed Files: `packages/conformance/src/run106-effort-source-schema-compat.test.ts`, `packages/conformance/src/run91-effort-schema.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run91-effort-instance-identity.test.ts`, `role-model-router/packages/core/src/reason-codes.ts`, `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/core/test/run106-effort-source-vocabulary.test.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/runtime-observability/src/otel.ts`, `role-model-router/packages/runtime-observability/test/run106-effort-source-roundtrip.test.ts`, `role-model-router/packages/runtime-observability/test/run91-effort-otel.test.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/packages/sqlite-memory/test/run106-effort-source-migration.test.ts`, `role-model-router/packages/trace/src/index.ts`, `role-model-router/packages/trace/test/run106-lineage-effort-source.test.ts`, `role-model-router/packages/usage/src/index.ts`, `role-model-router/packages/usage/test/run91-effort-lineage.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-effort-source-roundtrip.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R5 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`, `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/core/test/run106-borrowed-quality-prior.test.ts`, `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`, `role-model-router/packages/profile-aggregator/src/index.ts`, `role-model-router/packages/profile-aggregator/test/run106-related-effort-borrow.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp3-borrowed-quality-prior.green.txt`, `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp3-producer.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-effort-aware-cache-continuity.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run116-alias-effort-bias.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-effort-aware-cache-continuity.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-turn-aware-difficulty.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-turn-aware-difficulty.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R8 | Status: verified | Changed Files: `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/core/test/run106-non-inferiority-ranking.test.ts`, `role-model-router/packages/core/test/run106-non-inferiority.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-non-inferiority-ranking.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R9 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-discovery-effort-projection.test.ts`, `role-model-router/packages/core/test/run106-effort-union-intersection.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-discovery-effort-projection.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/test/run106-canonical-effort-emission.test.ts`, `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/core/test/run106-canonical-decision-provenance.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-canonical-effort-emission.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R11 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/lib/effort-truth.test.ts`, `role-model-router/apps/runtime-ui/app/lib/effort-truth.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts`, `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `role-model-router/apps/runtime-ui/app/routes/endpoints.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`, `role-model-router/apps/runtime-ui/app/routes/requests.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-candidates.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp8-effort-truth.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R12 | Status: verified | Changed Files: `.gitignore`, `pnpm-lock.yaml`, `role-model-router/packages/runtime-observability/package.json`, `role-model-router/packages/sqlite-memory/package.json`, `role-model-router/packages/trace/package.json` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
- R13 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-normalization.test.ts`, `role-model-router/packages/core/test/routing-intent.test.ts`, `role-model-router/packages/core/test/run106-phase35-review-fixes.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp1-effort-policy-normalization.green.txt`, `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/red/sp1-effort-policy-normalization.red.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R14 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-13f44730.md` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R15 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json`

## Audit Verdict

Audit: PASS
