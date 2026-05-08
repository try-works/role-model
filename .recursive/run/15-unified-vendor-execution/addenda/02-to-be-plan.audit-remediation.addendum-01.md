Run: `/.recursive/run/15-unified-vendor-execution/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T19:45:43Z`
LockHash: `f4984348ef66463294fbc70ed787946fd8486eb2f6829b7bfb1b3c8496edb149`
Workflow version: `recursive-mode-audit-v1`
Addendum: `01`
Inputs:
- `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`
- `/.recursive/run/15-unified-vendor-execution/09-requirements-audit.md`
- User scope decision: remediation must use strict TDD and browser verification
- Observed hybrid routing probe on `2026-05-08`
Outputs:
- `/.recursive/run/15-unified-vendor-execution/addenda/02-to-be-plan.audit-remediation.addendum-01.md`
Scope note: This addendum converts the post-audit findings into a concrete remediation plan without rewriting the locked base plan. It narrows the next implementation pass around the actual remaining deficits: supervisor hardening, streaming/provisioning/distribution gaps, external contract gaps, and real end-to-end verification. It also requires strict TDD and browser-backed verification for every remediation slice.

## TODO

- [x] Translate the audit findings into a concrete remediation sequence
- [x] Reconcile the plan against an observed end-to-end routing probe
- [x] Record strict TDD requirements for the remediation pass
- [x] Record browser verification requirements for the remediation pass
- [x] Capture the updated validation and closeout expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Baseline

- The locked run-15 implementation audit failed against both the repo-local and external requirement contracts.
- The highest-confidence unfinished areas are:
  - `R2`: `process-supervisor` still lacks structured logs, restart/backoff, and bounded shutdown escalation
  - `R3`: `vendor-abstraction` still lacks the full streamed execution and richer health/result contract surface
  - `R4`: `vendor-llama-swap` still lacks role-model-owned release download/cache provisioning
  - `R5`: `vendor-litellm` still lacks role-model-owned `uv` tool-dir provisioning and the external cost/header contract
  - `R8`: validation and receipts still overstate end-to-end completeness because the current vendor validator runs managed mock vendors rather than real llama-swap and LiteLLM

## Observed Routing Probe

The remediation plan is grounded in a live hybrid probe rather than only the audit narrative.

Observed on `2026-05-08`:

- Browser verification:
  - `browser-use open http://127.0.0.1:8893/healthz`
  - `browser-use screenshot ...run15-routing-healthz.png`
- Direct bridge probes:
  - `GET /healthz`: PASS
  - `GET /v1/models`: PASS
  - `POST /v1/responses` local model: PASS
  - `POST /v1/responses` remote model: PASS
  - `POST /v1/chat/completions` local model: PASS
  - `POST /v1/chat/completions` remote model: PASS
  - `POST /v1/chat/completions` remote model with `stream: true`: PASS

Observed soft gaps from the same probe:

- The mock hybrid path proves that bridge dispatch is already working for the managed test harness; remediation should not reopen passing routing without a requirement-driven reason.
- `/healthz` still returns the softer top-level shape:
  - `status: "ok"`
  - `executionMode`
  - `vendors`
  - no external-style `inactiveVendors`
  - no degraded vs healthy top-level summary
- Successful routed responses still expose only:
  - `x-role-model-endpoint-id`
  - `x-role-model-adapter-family`
- The externally expected headers remain absent in the observed path:
  - `x-role-model-routing-decision-id`
  - `x-role-model-cost-usd`
- The probe still uses managed mock vendors, so it does not close the audit gaps for real vendor provisioning, real vendor execution, or receipt honesty.

## Remediation Target

The next pass must make run 15 acceptable as a completed requirement by:

1. hardening the bridge-owned contract surfaces that the routing probe already showed are close but incomplete
2. finishing the missing lifecycle/provisioning responsibilities in the new vendor packages
3. replacing mock-only completion claims with real vendor evidence and refreshed receipts

## Execution Discipline

- TDD Mode: `strict`
- Non-negotiable rule:
  - no production code change lands before the corresponding failing test or validator exists
- Required RED -> GREEN -> REFACTOR loop for each remediation slice:
  1. add or tighten the failing test, validator, or browser-backed probe first
  2. capture the initial failing behavior
  3. implement the minimum production change that makes the slice pass
  4. rerun focused validation and browser verification
  5. only then proceed to the next slice
- Browser Verification: `required`
  - every slice that changes live request, health, or operator-facing runtime behavior must be rechecked through a real browser session
  - browser verification is not optional documentation polish; it is part of slice acceptance

## Remediation Slices

1. **SP1. Bridge contract and validator honesty repair**
   - Add RED coverage first for:
     - `/healthz` top-level status semantics and inactive-vendor reporting
     - routed response headers for routing-decision and cost exposure where required
     - any adapter/usage-event path needed to carry external-style actual cost
     - validator/receipt assertions that distinguish mock-vendor coverage from real-vendor coverage
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/packages/adapter-execution/src/index.ts`
     - `packages/protocol-types/src/generated.ts` or the owning schema/generation path if `cost_actual` is promoted
     - `role-model-router/apps/runtime-host-bridge/test/**`
   - Goal:
     - keep the already-working routed behavior intact while tightening the externally missing response/health contract

2. **SP2. Process supervisor hardening**
   - Add RED coverage first for:
     - structured child log capture
     - bounded shutdown escalation
     - restart/backoff behavior
     - Windows-safe termination semantics
   - Repair targets:
     - `role-model-router/packages/process-supervisor/src/index.ts`
     - `role-model-router/packages/process-supervisor/test/index.test.ts`
   - Goal:
     - close the current `R2` gap without changing bridge routing semantics

3. **SP3. Vendor abstraction and streamed vendor lifecycle**
   - Add RED coverage first for:
     - streamed vendor execution contract shape
     - latency-bearing health/result metadata
     - vendor-specific stream handling for llama-swap and LiteLLM
   - Repair targets:
     - `role-model-router/packages/vendor-abstraction/src/index.ts`
     - `role-model-router/packages/vendor-llama-swap/src/index.ts`
     - `role-model-router/packages/vendor-litellm/src/index.ts`
     - bridge tests and validation paths that exercise streamed execution
   - Goal:
     - make the abstraction and vendor packages match the stronger external contract instead of relying on bridge-only compatibility behavior

4. **SP4. Vendor provisioning and distribution repair**
   - Add RED coverage first for:
     - llama-swap release-binary download/cache behavior
     - LiteLLM `uv` acquisition plus `uv tool install --tool-dir ... litellm`
     - missing distribution surfaces
   - Repair targets:
     - `role-model-router/packages/vendor-llama-swap/src/index.ts`
     - `role-model-router/packages/vendor-litellm/src/index.ts`
     - `scripts/install.sh`
     - `docker-compose.yml`
     - run-owned install/troubleshooting docs tied to the packaged runtime flow
   - Goal:
     - close the provisioning/distribution gaps the audit identified, not just the code-path gaps

5. **SP5. Real vendor verification, browser verification, and receipt refresh**
   - Replace the current completion claim with a real verification chain:
     - at least one real llama-swap-backed request path
     - at least one real LiteLLM-backed request path
     - browser-backed verification against the live bridge endpoints after the runtime is started for each supported scenario
   - Refresh targets:
     - `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
     - `/.recursive/run/15-unified-vendor-execution/03-implementation-summary.md`
     - `/.recursive/run/15-unified-vendor-execution/04-test-summary.md`
     - `/.recursive/run/15-unified-vendor-execution/05-manual-qa.md`
   - Goal:
     - make the final receipts honest, reproducible, and aligned with both the locked run contract and the external requirement

## Browser Verification Plan

Browser verification is required for the remediation pass because the audit drift is partly about live contract shape rather than only unit behavior.

Required browser-backed checks after the relevant slices land:

1. open the live bridge origin in `browser-use`
2. verify `/healthz` from the browser against the expected top-level contract
3. issue same-origin fetch probes for:
   - `/v1/models`
   - `/v1/responses`
   - `/v1/chat/completions`
   - the streamed chat-completions path
4. confirm the expected response headers are present on successful routed requests
5. if a repo-owned runtime UI surface is used for the final operator flow, browse the relevant runtime/status page and confirm the surfaced health data matches `/healthz`

Important constraint carried forward from the observed probe:

- root `/` on the bridge is not a UI shell and should not be treated as the acceptance surface
- browser verification must target explicit bridge endpoints or the runtime UI, not assume a homepage exists

## Validation Plan

- Focused RED/GREEN package validation:
  - `corepack pnpm --filter @role-model-router/process-supervisor test`
  - `corepack pnpm --filter @role-model-router/vendor-abstraction test`
  - `corepack pnpm --filter @role-model-router/vendor-llama-swap test`
  - `corepack pnpm --filter @role-model-router/vendor-litellm test`
  - `corepack pnpm --filter @role-model-router/provider-litellm test`
  - `corepack pnpm --filter @role-model-router/adapter-execution test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- Focused build checks:
  - `corepack pnpm --filter @role-model-router/process-supervisor build`
  - `corepack pnpm --filter @role-model-router/vendor-abstraction build`
  - `corepack pnpm --filter @role-model-router/vendor-llama-swap build`
  - `corepack pnpm --filter @role-model-router/vendor-litellm build`
  - `corepack pnpm --filter @role-model-router/provider-litellm build`
  - `corepack pnpm --filter @role-model-router/adapter-execution build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- End-to-end runtime checks:
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-packaging`
  - direct routed requests against a live bridge instance for both local and remote models
- Browser verification commands:
  - `browser-use open http://127.0.0.1:<port>/healthz`
  - `browser-use screenshot <artifact-path>.png`
  - browser-side same-origin fetch probes for `/v1/models`, `/v1/responses`, `/v1/chat/completions`, and streaming chat
- Regression floor:
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
  - `corepack pnpm run runtime:validate-tools`
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run schemas:validate`

## Receipt And Closeout Expectations

- `03-implementation-summary.md` must explicitly distinguish:
  - contract repairs completed
  - provisioning/distribution completed
  - any still-deferred external requirement items
- `04-test-summary.md` must separate:
  - mock-harness validation
  - real-vendor validation
  - browser verification
- `05-manual-qa.md` must state whether QA is still agent-operated and must not overclaim real-vendor coverage when mocks were used
- If any external requirement remains intentionally deferred after remediation, the deferral must be explicit in the updated receipts rather than implied by silence

## Traceability

- `R2` -> SP2 process-supervisor hardening | Evidence: `## Audit Baseline`, `## Remediation Slices`, `## Validation Plan`
- `R3` -> SP3 vendor-abstraction and streamed vendor lifecycle repair | Evidence: `## Audit Baseline`, `## Remediation Slices`
- `R4` -> SP4 llama-swap provisioning repair plus SP5 real-vendor verification | Evidence: `## Remediation Slices`, `## Browser Verification Plan`
- `R5` -> SP1 contract repair, SP3 streaming/vendor contract repair, and SP4 LiteLLM provisioning repair | Evidence: `## Remediation Slices`, `## Validation Plan`
- `R8` -> observed routing probe, strict TDD discipline, browser verification, and receipt refresh requirements | Evidence: `## Observed Routing Probe`, `## Execution Discipline`, `## Receipt And Closeout Expectations`
- `R1`, `R6`, `R7` -> unchanged by scope except where SP1 and SP5 tighten external contract and verification quality | Evidence: `## Observed Routing Probe`, `## Remediation Target`

## Coverage Gate

- [x] Audit findings were translated into a concrete remediation sequence
- [x] The plan is reconciled against a live routing probe rather than audit text alone
- [x] Strict TDD is explicit and required
- [x] Browser verification is explicit and required
- [x] Validation and receipt-refresh obligations are captured

Coverage: PASS

## Approval Gate

- [x] The addendum preserves the locked base plan and only narrows the unfinished remediation scope
- [x] The next implementation pass has concrete slices and concrete validation commands
- [x] The plan focuses on observed remaining gaps instead of reopening already-passing routing
- [x] The addendum is ready to guide a follow-up implementation pass

Approval: PASS
