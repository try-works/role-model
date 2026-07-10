Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `02`
Status: `LOCKED`
LockedAt: `2026-07-08T00:51:31Z`
LockHash: `85d2c5c32cbc061f5d7b7bce08f788e7d057e3c04f0c208dfd8ebdf9c17a70dc`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03.5-code-review.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/04-test-summary.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/08-memory-impact.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/review-bundles/03-5-code-review-controller-self-review.md`
- operator request on `2026-07-08` to update the addenda plan so TDD and rebuilt-runtime verification are explicit hard gates
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
Scope note: Follow-up implementation-plan addendum after the locked Phase 3.5 audit. This addendum does not replace the locked base plan or the locked Phase 8 upstream-gap addendum; it refines the effective plan so strict TDD and rebuilt-runtime verification are explicit execution gates for the next remediation pass.

## TODO

- [x] Re-read the locked requirements, root-cause, base plan, Phase 3.5 review, and prior plan addendum
- [x] Convert the locked review findings into a tighter effective implementation plan
- [x] Make strict RED/GREEN evidence mandatory for every remediation slice
- [x] Make rebuilt-runtime verification through Pi and Craft emitter paths a hard closeout contract
- [x] Define the local verification floor and the rebuilt-runtime verification matrix in one plan artifact
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: `R1`, `R2`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, and `R11` remain the governing requirements for the follow-up work.
- `01.5-root-cause.md`: the original debugging run already identified the ingress-semantics, payload-growth, recovery-receipt, and continuation-risk families that still govern the repair strategy.
- `02-to-be-plan.md`: the locked base plan remains the architectural base but did not force the proof quality now required by the audit.
- `03.5-code-review.md`: the locked review formally deferred `R1`, `R2`, and `R4`-`R11`, and it established that hop accounting, ingress fidelity, recovery receipts, and rebuilt-runtime proof quality are the exact unresolved seams.
- `08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`: the prior addendum already introduced SP62-H through SP62-K, strict-TDD intent, and a rebuilt-runtime matrix; this addendum makes those obligations more explicit and mechanically verifiable.
- `05-manual-qa.md`: the earlier rebuilt-runtime flow is still the baseline harness, but its local-HTTP and degraded-primary caveats must not be reused as closeout proof.

## Problem Statement

The locked Phase 3.5 review proved that the follow-up plan must do more than describe the next code changes. It must also make two execution rules non-optional:

1. **Strict TDD is the implementation gate.**
   - No production TypeScript, runtime harness, or verification-helper code lands without a focused failing test or failing harness assertion first.
   - Each remediation slice must carry named RED and GREEN evidence paths that can be cited by the next implementation and test receipts.

2. **Rebuilt-runtime verification is the proof gate.**
   - No requirement-closeout claim for `R5`, `R6`, `R8`, `R9`, `R10`, or `R11` is valid until the rebuilt runtime is re-executed from this worktree and the repaired Pi/Craft agent-path cases succeed with the expected receipts.
   - Local HTTP probes remain diagnostic only; actual Pi and Craft emitter paths are the authoritative proof.

## Plan Delta From Addendum 01

`08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md` already identified the four remediation slices:

- `SP62-H` hop accounting and corpus truth
- `SP62-I` Pi/Craft ingress fidelity
- `SP62-J` actual retry/reroute/idempotency receipts
- `SP62-K` rebuilt-runtime Pi/Craft verification harness

This addendum strengthens that plan in three ways:

1. It promotes strict RED/GREEN evidence from guidance to a hard execution contract.
2. It makes the rebuilt-runtime re-verification matrix the required closeout proof, not a suggested follow-up.
3. It ties each slice to specific Phase 4 and Phase 5 verification obligations so the next implementation pass cannot overclaim partial proof.

## Strict TDD Execution Contract

TDD Mode: `strict`

The Iron Law for this follow-up remains absolute:

- no production TypeScript change before a failing test
- no runtime verification-helper change before a failing harness assertion
- no request-corpus contract change before a failing corpus-validator assertion

Required per slice:

1. Create one or more failing tests or failing harness assertions that isolate the exact missing behavior.
2. Run the focused RED command and write the output to the slice RED log.
3. Implement the minimum code to make the failing assertions pass.
4. Run the focused GREEN command and write the output to the slice GREEN log.
5. Only after GREEN passes may the slice expand to broader validation commands.

Allowed exception policy:

- none for the planned TypeScript and harness work in this addendum
- live-provider variability may affect Phase 5 interpretation, but it does not waive RED/GREEN requirements for deterministic tests or harness logic

## Rebuilt-Runtime Verification Contract

The rebuilt-runtime re-verification for this follow-up is mandatory and must be executed from the run-62 worktree.

### Preconditions

Before any Phase 5 closeout pass:

1. The slice-local RED and GREEN logs for `SP62-H`, `SP62-I`, `SP62-J`, and `SP62-K` must all exist.
2. The Phase 4 verification floor defined below must be green.
3. The runtime must be rebuilt from the current worktree, at minimum with:
   - `corepack pnpm --filter @role-model-router/runtime-ui build`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
4. The runtime must be launched from the worktree against an isolated temp state root, and the exact launch command used must be recorded in the next Phase 5 receipt.
5. The isolated runtime must be seeded with the required remote provider accounts and endpoint activation state before any Pi/Craft request is executed.

### Authoritative Proof Rule

The follow-up run may not claim rebuilt-runtime closure using:

- hand-authored local HTTP requests alone
- summary-only evidence with missing per-request receipts
- degraded-primary pre-dispatch family removal as if it were retry or reroute proof

The authoritative proof must come from:

- actual Pi-originated traffic through the `@try-works/pi-role-model` emitter path
- actual Craft-originated traffic through the repo-owned Craft fixture/harness path
- rebuilt-runtime request-detail, telemetry-row, router-decision, and endpoint-profile receipts captured per representative case

## Implementation Slices

### SP62-H — Canonical Hop Accounting And Corpus Truth

**RED-first targets**

- failing receipt tests proving ingress, translated, provider-canonical, and provider-wire byte facts are distinct fields
- failing corpus-validator assertions proving `translated`, `providerCanonical`, and `providerWire` are not populated from one reused measurement
- failing continuation-growth assertions for the retry/continuation cases used to judge `R5`

**GREEN target**

- persist explicit hop facts through `runtime-observability`, `sqlite-memory`, request-detail, and corpus writer paths without creating a second trace store

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-02/sp62-h-hop-accounting.red.log`
- GREEN: `evidence/logs/addendum-02/sp62-h-hop-accounting.green.log`

**Rebuilt-runtime proof dependency**

- `Q-B2`, `Q-B5`, and `Q-B6` must show non-aliased hop facts in rebuilt-runtime receipts.

### SP62-I — Pi/Craft Ingress Fidelity

**RED-first targets**

- failing host-bridge request-parsing tests for `session-id`, `x-client-request-id`, transport preference, and continuation metadata
- failing request-mapping tests for Pi-shaped and Craft-shaped ingress payloads
- failing provider request-shaping tests proving the ingress fields do not reach the provider surfaces today

**GREEN target**

- preserve session, correlation, transport, and continuation semantics through shared runtime ingress without introducing a Pi-only path

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/provider-litellm/test/index.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-02/sp62-i-ingress-fidelity.red.log`
- GREEN: `evidence/logs/addendum-02/sp62-i-ingress-fidelity.green.log`

**Rebuilt-runtime proof dependency**

- `Q-B1`, `Q-B2`, and `Q-B3` must show preserved request correlation and session/continuation facts in the rebuilt-runtime receipts.

### SP62-J — Actual Retry/Reroute/Idempotency Receipts

**RED-first targets**

- failing execution-semantics tests proving retry/reroute/cooldown/idempotency facts default today
- failing deterministic fault-harness tests for same-endpoint retry, post-failure reroute, and replay-guard behavior
- failing summary assertions proving recovery cases cannot be omitted from the top-level rebuilt-runtime summary

**GREEN target**

- persist actual recovery behavior into the canonical observation and telemetry surfaces, and require recovery cases in the corpus and rebuilt-runtime summaries

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-02/sp62-j-recovery-receipts.red.log`
- GREEN: `evidence/logs/addendum-02/sp62-j-recovery-receipts.green.log`

**Rebuilt-runtime proof dependency**

- `Q-B5`, `Q-B6`, and `Q-B7` must show non-default retry/reroute/idempotency facts in rebuilt-runtime receipts and in the top-level summary.

### SP62-K — Rebuilt-Runtime Pi/Craft Verification Harness

**RED-first targets**

- failing harness assertions proving Pi and Craft agent-path requests are not yet executed against the rebuilt runtime
- failing evidence-shape assertions requiring request JSON, response JSON, request-detail, telemetry-row, router-decision, endpoint-profile, and summary coverage per representative case
- failing scenario assertions for the required recovery cases and non-text routing case

**GREEN target**

- repo-owned rebuilt-runtime verification helpers that execute actual Pi/Craft emitter paths and produce a stable machine-readable receipt set

**Primary files**

- `packages/pi-role-model/**` when harness wiring is needed
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `scripts/operator-inspect-craft-agent-payload.ts` or a new repo-owned Craft emitter helper
- new rebuilt-runtime verification helpers under `scripts/` if required

**Evidence**

- RED: `evidence/logs/addendum-02/sp62-k-agent-path-runtime.red.log`
- GREEN: `evidence/logs/addendum-02/sp62-k-agent-path-runtime.green.log`

**Rebuilt-runtime proof dependency**

- `Q-B1` through `Q-B7` are owned by this slice and must all execute against the rebuilt runtime.

## Phase 4 Verification Floor

Run from `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`.

Focused commands:

- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-litellm exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts test/craft-ask-difficulty.test.ts test/alias-capability-routing.test.ts test/validate-vendors.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model run test`

Broader validation after focused suites:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Aggregate evidence:

- `evidence/logs/addendum-02/phase4-verification-floor.green.log`

Pass criteria:

- distinct hop accounting is asserted and green
- ingress fidelity is asserted and green
- recovery receipts are asserted and green
- validator and packaging/runtime validation are green before rebuilt-runtime QA begins

## Phase 5 Rebuilt-Runtime Verification Matrix

All cases below must run against a rebuilt runtime launched from the run-62 worktree with isolated temp state.

| ID | Scenario | Required path | Pass criteria | Required evidence |
| --- | --- | --- | --- | --- |
| `Q-B1` | Pi exact Codex tool-bearing turn | actual `@try-works/pi-role-model` path | native Codex family selected; tool-bearing semantics preserved; request correlation survives ingress | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-B2` | Pi continuation with session affinity and transport preference | actual Pi continuation path | `sessionAffinity.sessionId`, `x-client-request-id`, continuation metadata, and bounded hop-growth facts are visible in receipts | request bundle + request-detail + telemetry-row + hop summary |
| `Q-B3` | Craft declared-tools ask-mode request | repo-owned Craft fixture/harness path | tool-capable request remains tool-capable and retains declared tools in request-detail evidence | request bundle + request-detail + router-decision + telemetry-row |
| `Q-B4` | Craft inline-image request | repo-owned Craft inline-image path | non-text routing excludes incompatible endpoints and selects an eligible family | request bundle + router-decision + telemetry-row + endpoint-profile |
| `Q-B5` | Pi transient retry case | Pi path against deterministic transient-failure harness | success after same-endpoint retry with `retryCount >= 1`, `rerouteCount = 0`, and no duplicate side effect | request bundle + request-detail + telemetry-row + top-level summary inclusion |
| `Q-B6` | Craft reroute case | Craft path against deterministic first-endpoint failure | success after reroute with `rerouteCount >= 1`, changed endpoint, visible failure/reroute facts | request bundle + request-detail + telemetry-row + router-decision + top-level summary inclusion |
| `Q-B7` | Tool replay guard case | Pi or Craft tool-bearing path with deterministic post-tool failure | receipts show replay-blocking `idempotencyDecision` and `toolSideEffectState`, with no duplicate tool side effect | request bundle + request-detail + telemetry-row + tool receipt evidence + top-level summary inclusion |

### Rebuilt-Runtime Summary Requirements

- the addendum-02 rebuilt-runtime summary must include `Q-B1` through `Q-B7`
- recovery cases may not live only in per-request folders
- any case used for retry/reroute proof must show non-default facts in both `request-detail.json` and `telemetry-row.json`
- the final Phase 5 receipt must distinguish:
  - pre-dispatch degraded-family selection
  - same-endpoint retry
  - post-failure reroute

## Implementation Order

1. `SP62-H` first so the hop-accounting contract exists before corpus or rebuilt-runtime proof is evaluated.
2. `SP62-I` second so Pi/Craft ingress semantics survive into the rebuilt-runtime receipts.
3. `SP62-J` third so recovery semantics are truthful before live re-verification.
4. `SP62-K` fourth so the rebuilt-runtime harness proves the repaired semantics through actual emitter paths.
5. Re-run the Phase 4 verification floor.
6. Rebuild the runtime from the worktree and execute `Q-B1` through `Q-B7`.
7. Keep `R11` open until the follow-up change set also clears GitHub CI.

## Requirement Delta

| Requirement / finding | Effective slice | Mandatory proof |
| --- | --- | --- |
| `R1`, `R2`, `F2` | `SP62-I`, `SP62-K` | RED/GREEN ingress tests plus `Q-B1` to `Q-B3` |
| `R4`, `F2` | `SP62-I`, `SP62-K` | native Codex agent-path rebuilt-runtime proof |
| `R5`, `F1` | `SP62-H`, `SP62-K` | hop-accounting tests plus `Q-B2`, `Q-B5`, `Q-B6` |
| `R6`, `F3` | `SP62-J`, `SP62-K` | recovery tests plus `Q-B5`, `Q-B6`, `Q-B7` |
| `R7`, `F2` | `SP62-I`, `SP62-K` | tool-bearing ingress and continuation proof in Pi/Craft cases |
| `R8`, `F1`, `F3` | `SP62-H`, `SP62-J`, `SP62-K` | canonical request-detail/telemetry receipts with non-default facts |
| `R9`, `F1` | `SP62-H`, `SP62-J` | deterministic corpus truth plus family coverage and recovery-case inclusion |
| `R10`, `F3`, `F4` | `SP62-J`, `SP62-K` | rebuilt-runtime proof through actual Pi/Craft emitters |
| `R11`, `F4` | `SP62-K` | rebuilt-runtime proof plus GitHub CI on the follow-up change set |

## Out Of Scope

- editing locked base run artifacts outside this addendum path
- reclassifying shaped local HTTP probes as authoritative proof
- patching Pi upstream or Craft upstream to compensate for runtime defects
- unrelated provider onboarding or runtime-ui work outside the verification helpers needed for rebuilt-runtime proof

## Coverage Gate

- [x] The addendum incorporates the locked Phase 3.5 findings into the effective plan
- [x] Strict RED/GREEN evidence is now explicit for every remediation slice
- [x] Rebuilt-runtime verification through Pi and Craft emitter paths is now an explicit closeout contract
- [x] The local verification floor and Phase 5 matrix are both concrete and reusable
- [x] The addendum supplements locked history instead of editing it

Coverage: PASS

## Approval Gate

- [x] The follow-up plan is explicit enough to start strict-TDD implementation
- [x] The rebuilt-runtime verification burden is specific enough to judge `R5`, `R6`, `R8`, `R9`, `R10`, and `R11`
- [x] This addendum can be used as the latest effective plan input alongside the locked base plan and addendum 01

Approval: PASS

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed multi-agent tools on `2026-07-08`, but the current tool contract only allows delegation when the user explicitly asks for subagent or parallel-agent work`
- Delegation Decision Basis: `this addendum is a run-local plan refinement derived from locked artifacts and did not need delegated code review`
- Delegation Override Reason: `the user requested a plan update, not delegated planning or review`
- Audit Inputs Provided:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03.5-code-review.md`
  - `05-manual-qa.md`
  - `08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the locked requirements, root-cause, plan, code-review, QA, and prior plan-addendum artifacts and reconciled the follow-up slices against the exact Phase 3.5 findings
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-02.md`

Audit: PASS
