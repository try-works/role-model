Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `05 Manual QA — live vendor verification addendum`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/05-manual-qa.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/02-to-be-plan.md` (LOCKED)
- current rebuilt worktree and isolated Phase 5 runtime evidence
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.phase5-live-vendor-verification.addendum-01.md`
Scope note: Records the narrow live-vendor compatibility repair and its Phase 5 evidence without altering locked historical phase artifacts.

## Scope

This receipt records the Phase 5 live path discovered after the locked closeout: LiteLLM's generated configuration uses canonical configured model IDs while upstream-compatible clients may send the provider-local alias.  Without a unique, fail-closed translation, a real Pi request reached the vendor but LiteLLM rejected the model as invalid.

The repair is deliberately narrow: translate only a provider-local alias that maps to exactly one configured canonical model. Canonical requests remain unchanged; ambiguous aliases remain unmodified and fail at the vendor boundary.

## TDD evidence

- **RED:** `@role-model-router/vendor-litellm` forwarded `deepseek-v4-flash` unchanged although the configured mapping was `deepseek/deepseek-v4-flash`.
- **GREEN:** `corepack.cmd pnpm --filter @role-model-router/vendor-litellm test -- -t "maps an unprefixed upstream model alias"` — 14 passing tests.
- **Build:** `corepack.cmd pnpm --filter @role-model-router/vendor-litellm build` — PASS.
- Owning files: `packages/vendor-litellm/src/index.ts` and `packages/vendor-litellm/test/index.test.ts`.

## Rebuilt-runtime Phase 5 evidence

The clean, isolated source runtime used `127.0.0.1:3502` and a D-drive temporary state root. It was not the user runtime on ports 3456/3492.

1. Pi CLI 0.84.2 sent `baseline.remote-only` and received exactly `RUN92_CLEAN_ALIAS_OK` through the real DeepSeek/LiteLLM path. Persisted request: `req-a0928334-0eee-4594-9d68-2d10bd776ad3` (HTTP 200).
2. A real quick benchmark run `eaecea0c-c7ea-4676-8d3e-c270fd67e9de` executed exactly the two configured candidates, Flash and Pro, and completed 2/2. Both profile records were bound to their endpoint and membership revision.
3. Pi CLI then sent `controller.remote-only` and received exactly `RUN92_PROFILE_ROUTE_OK`. Persisted request: `req-791f488f-de32-44dc-bcdc-d39f98988b1c` (HTTP 200). Its routing-decision ledger selected Pro with profile revision `sha256:c8503dbea12b6b84212ee2f83fcc123c927eaf29f47f91e9cc57f2bd14d6274c` from the completed benchmark.
4. The rebuilt SEA executable passed `runtime:validate-packaging`; manifest SHA-256: `bf0ed08512097e104ba8a469a5767f018f6734eb399c34aae56be89f691c32f4`.

## Extension verification and boundary

The runtime reported all thirteen registered extensions as installed and ready. Twelve were active; `knowledge-worker` was explicitly shadow-only and was not represented as production active. The persisted live observation linked message/conversation, context artifacts, routing handoff, retrieval, trace, usage, and observed-performance records. Existing Track-B contract commands passed for product state, extension boundaries, capture degradation, router continuity, projections, routing training, route learning, and authorization.

This source-runtime bridge does **not** load the packaged Track-B post-observation sidecar: `/api/role-model/track-b/shadow-receipts` is unavailable and cloud contribution authorization remains `pending_disclosure`. Therefore this receipt verifies the 13 extension registrations, persistence/linkage, and their regression contracts; it does not falsely claim a real cloud contribution/recommendation upload from this local Phase 5 run.

## Browser verification

The rebuilt runtime browser was verified after the live requests and benchmark. Candidate inventory showed exactly the two configured canonical endpoints with their CAP cards and independent live p50 samples. The routing-decision ledger showed both Pi request IDs and the post-benchmark Pro decision's exact profile revision. The request-detail page showed the selected endpoint, vendor/adapter path, persisted telemetry, strict redaction, cost audit, live operational profile, and expandable routing/capture receipts.

## Acceptance

- [x] Vendor canonicalization is unique and fail-closed.
- [x] Real Pi alias request is persisted and routable through the rebuilt runtime.
- [x] Benchmark profile attribution is used by a later controller decision.
- [x] Packaged executable validation completed.
- [x] Extension state and regression boundaries are explicitly recorded.
- [x] Browser candidate, decision-ledger, and request-detail interactions verify the same persisted evidence.

Audit: `PARTIAL PASS — the packaged Track-B sidecar live contribution remains a separate verification gate.`
