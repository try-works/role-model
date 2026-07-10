Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `03`
Status: `LOCKED`
LockedAt: `2026-07-08T00:54:14Z`
LockHash: `5906afbe345e0126dd039822865c19665eff26f72036ba69b9c8059b9912328a`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03.5-code-review.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-02.md` (LOCKED)
- operator follow-up on `2026-07-08` requiring Pi and Craft rebuilt-runtime requests to prove routing by calling aliases, not only direct model ids
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-03.md`
Scope note: Narrow plan-refinement addendum for run 62. It updates the effective rebuilt-runtime verification contract so authoritative Pi and Craft routing proof must come from alias-routed requests, while exact-target requests become supplemental compatibility diagnostics only.

## TODO

- [x] Re-read the locked base plan and the two existing run-62 plan addenda
- [x] Identify where the current rebuilt-runtime matrix still allows direct-target proof to stand in for alias-routing proof
- [x] Amend the effective rebuilt-runtime contract so alias-routed Pi and Craft traffic is mandatory
- [x] Keep the TDD and rebuilt-runtime hard-gate language consistent with addendum 02
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: `R4`, `R9`, `R10`, and `R11` require real routed behavior, not only provider compatibility on exact targets.
- `03.5-code-review.md`: the locked code review already established that proof quality is part of the gap, not just code shape.
- `08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`: the original follow-up plan correctly required Pi/Craft emitter-path proof, but it did not state strongly enough that the routing proof must use aliases.
- `02-to-be-plan.audit-remediation.addendum-02.md`: the current effective plan makes rebuilt-runtime verification mandatory, but `Q-B1` and `Q-B3` can still be read as compatible direct-target checks rather than alias-routing checks.

## Problem Statement

The current effective plan is still too permissive in one place: it requires actual Pi and Craft emitter paths, but it does not make alias invocation the explicit routing trigger for the authoritative rebuilt-runtime proof.

That leaves a loophole:

- a Pi or Craft request could hit an exact model or exact endpoint target
- the request could succeed
- the run could claim rebuilt-runtime success without proving that alias-based routing selected the expected execution family or endpoint

For this run, that is not acceptable. The authoritative rebuilt-runtime proof must demonstrate routing behavior, not only direct provider compatibility.

## Plan Delta

This addendum refines addendum 02 with one new rule:

### Alias-Routing Proof Rule

For rebuilt-runtime closeout:

1. **All authoritative Pi and Craft verification cases that are meant to prove routing must call an alias.**
2. **Direct model-id or exact-endpoint requests are allowed only as supplemental compatibility diagnostics.**
3. **No requirement-closeout claim for routing behavior may cite a direct-target request as its primary proof.**

Implications:

- Pi rebuilt-runtime cases must use configured aliases when the case is proving family selection, capability routing, continuation routing, retry routing, or reroute behavior.
- Craft rebuilt-runtime cases must also use configured aliases when the case is proving tool-capable routing, non-text routing, retry routing, or reroute behavior.
- Exact-target Pi/Craft requests may still be run to isolate provider behavior, but those receipts are secondary and may not replace alias-routed proof.

## Updated Rebuilt-Runtime Verification Contract

### Authoritative Routing Proof

The authoritative rebuilt-runtime proof must show that:

- the downstream client called a configured alias
- the runtime resolved that alias through normal routing logic
- the selected execution family or endpoint was chosen from routing constraints and capability metadata
- the resulting request-detail and router-decision receipts preserve the alias context and final selection outcome

### Supplemental Exact-Target Checks

Direct-target checks may still be used for:

- isolating provider-family compatibility regressions
- debugging whether a failure belongs to alias resolution versus provider execution
- confirming exact-target behavior after alias-routed proof is already green

But they must be labeled `supplemental` in future implementation, test, or QA receipts.

## Updated Slice Obligations

### SP62-I — Pi/Craft Ingress Fidelity

Add this mandatory verification consequence:

- the RED/GREEN ingress tests must include alias-bearing Pi and Craft request fixtures where the alias identity survives ingress translation into request-detail or routing metadata

### SP62-K — Rebuilt-Runtime Pi/Craft Verification Harness

Add these mandatory harness requirements:

1. The harness must support alias-routed Pi requests as first-class cases, not only exact-target Pi requests.
2. The harness must support alias-routed Craft requests as first-class cases, not only exact-target Craft requests.
3. The machine-readable per-request evidence must record:
   - requested alias
   - any allowed endpoint set or family constraint derived from that alias
   - actual selected execution family
   - actual selected endpoint id
4. Future summaries must distinguish:
   - alias-routed proof cases
   - exact-target supplemental compatibility cases

## Updated Phase 5 Rebuilt-Runtime Verification Matrix

The following cases replace the authoritative interpretation from addendum 02.

| ID | Scenario | Required path | Pass criteria | Required evidence |
| --- | --- | --- | --- | --- |
| `Q-B1A` | Pi alias-routed tool-bearing Codex-capable turn | actual `@try-works/pi-role-model` path calling a configured alias | alias request routes to the expected Codex-capable family or endpoint based on capability metadata; tool-bearing semantics and request correlation survive ingress | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-B2` | Pi alias-routed continuation with session affinity and transport preference | actual Pi continuation path calling the alias | alias context, `sessionAffinity.sessionId`, `x-client-request-id`, continuation metadata, and bounded hop-growth facts are visible in receipts | request bundle + request-detail + telemetry-row + hop summary |
| `Q-B3A` | Craft alias-routed declared-tools ask-mode request | repo-owned Craft fixture/harness path calling a configured alias | alias request stays tool-capable, routes to the expected family, and retains declared tools in request-detail evidence | request bundle + request-detail + router-decision + telemetry-row + endpoint-profile |
| `Q-B4` | Craft alias-routed inline-image request | repo-owned Craft inline-image path calling the alias | alias request triggers non-text routing, excludes incompatible endpoints, and selects an eligible family | request bundle + router-decision + telemetry-row + endpoint-profile |
| `Q-B5` | Pi alias-routed transient retry case | Pi path calling the alias against deterministic transient-failure harness | alias request succeeds after same-endpoint retry with `retryCount >= 1`, `rerouteCount = 0`, and no duplicate side effect | request bundle + request-detail + telemetry-row + top-level summary inclusion |
| `Q-B6` | Craft alias-routed reroute case | Craft path calling the alias against deterministic first-endpoint failure | alias request succeeds after reroute with `rerouteCount >= 1`, changed endpoint, and visible failure/reroute facts | request bundle + request-detail + telemetry-row + router-decision + top-level summary inclusion |
| `Q-B7` | Alias-routed tool replay guard case | Pi or Craft tool-bearing path calling the alias with deterministic post-tool failure | alias-routed receipts show replay-blocking `idempotencyDecision` and `toolSideEffectState`, with no duplicate tool side effect | request bundle + request-detail + telemetry-row + tool receipt evidence + top-level summary inclusion |

Supplemental-only cases:

- exact Pi Codex-target request
- exact Craft DeepSeek-target request

Those may still be run, but they must not be the primary proof for `R4`, `R9`, or `R10`.

## Updated Requirement Mapping

| Requirement / finding | Mandatory primary proof after this addendum |
| --- | --- |
| `R4` | alias-routed Pi or Craft cases proving capability-sensitive selection, not direct-target success alone |
| `R9` | corpus plus alias-routed rebuilt-runtime representative cases for both downstream clients |
| `R10` | alias-routed Pi and Craft rebuilt-runtime requests, including tool-bearing, non-text, and recovery scenarios |
| `R11` | the same alias-routed rebuilt-runtime proof plus GitHub CI on the follow-up change set |

## Out Of Scope

- changing the locked code-review findings
- forbidding supplemental exact-target diagnostics entirely
- introducing a new routing contract beyond “alias-routed requests are the authoritative proof”

## Coverage Gate

- [x] The addendum closes the proof-quality loophole left by addendum 02
- [x] The rebuilt-runtime contract now explicitly requires alias-routed Pi and Craft proof cases
- [x] Exact-target requests are clearly demoted to supplemental diagnostics only
- [x] The updated matrix still fits the strict-TDD and rebuilt-runtime gate structure already established

Coverage: PASS

## Approval Gate

- [x] The refinement is specific enough to guide the next implementation and QA pass
- [x] The addendum updates the effective plan without editing locked earlier artifacts
- [x] The effective rebuilt-runtime proof contract is now aligned with the user’s routing-verification requirement

Approval: PASS

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the current tool surface still exposes multi-agent tools, but no delegated planning was requested in this turn`
- Delegation Decision Basis: `this was a narrow plan-language correction, not a delegated review candidate`
- Delegation Override Reason: `the user requested a direct plan update`
- Audit Inputs Provided:
  - `00-requirements.md`
  - `03.5-code-review.md`
  - `addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-02.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the locked base plan and both run-62 plan addenda, then reconciled the rebuilt-runtime matrix against the user’s alias-routing proof requirement
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-03.md`

Audit: PASS
