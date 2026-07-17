Run: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-17T06:40:42Z`
LockHash: `2cd2aec61bb37be5839189b80583f92d73e87f264b2a382c96134a9765b28032`
Workflow version: `recursive-mode-audit-v2`
User approval: `2026-07-17` (requirements approved for run creation)
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/commands.ts`
- `packages/pi-role-model/src/downstream-openai.ts`
- `packages/pi-role-model/src/provider-registration.ts`
- `apps/docs-site/content/docs/integrations/pi.mdx`
Outputs:
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md`
Scope note: Improve the Pi integration UX around Role-Model command execution, model-id guidance, and invalid endpoint/model failures so supported paths are truthful, failures are actionable, and repo-owned behavior is clearly separated from upstream Pi defects.

## TODO

- [x] Ground the draft in current recursive control-plane docs and relevant Pi/runtime memory
- [x] Re-read the current `pi-role-model` package and Pi integration docs
- [x] Separate repo-owned defects from upstream Pi defects
- [x] Lock the canonical Pi CLI model-id form in Phase 00 rather than deferring it
- [x] Carry forward auth, trust, and secret-safety invariants from the existing Pi integration baseline
- [x] Define supported command-path and prompt-path requirements
- [x] Define minimum actionable `status` and `doctor` diagnostics
- [x] Define canonical model-id guidance requirements
- [x] Define deterministic invalid endpoint/model error requirements
- [x] Require QA to prove unsupported invocation-mode behavior, not only supported flows
- [x] Capture user approval of this requirement before creating the run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `integration bugfix`
- Primary subsystems:
  - `packages/pi-role-model/**`
  - `apps/docs-site/content/docs/integrations/pi.mdx`
- Secondary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `protocol/fixtures/downstream-openai/**`
- User-visible outcome:
  - Pi users get one truthful command path for Role-Model diagnostics, one truthful prompt path for Role-Model execution, and actionable errors when they use an invalid endpoint or model.

## Relevant Prior Runs

- `54-alias-capability-discovery-contract`
- `55-pi-role-model-package`
- `56-pi-role-model-gap-closure`
- `59-observe-taxonomy-analytics-completion`
- `68-codex-subscription-tool-call-parity`

## Problem Summary

The current Pi integration has three user-facing gaps:

1. slash-command behavior is not truthfully defined across Pi invocation modes, so users can hit zero-output behavior and conclude routing is broken
2. Role-Model model-id guidance is inconsistent, so users try foreign ids such as `gpt-4o` under provider `role-model` and get misleading `no_eligible_target` failures
3. invalid endpoint and model failures are not turned into descriptive repo-owned help, so users do not get clear recovery guidance

This run must make the supported Pi paths explicit, keep the working provider path healthy, align model-id guidance, and return actionable errors for invalid endpoint/model usage.

## Fixed Decisions

1. This run stays within repo-owned Role-Model surfaces and does not attempt to patch upstream Pi core.
2. The Windows Pi exit assertion is an external Pi bug; this run may document and detect it, but not fix it here.
3. Role-Model remains an external runtime and the routing authority.
4. Foreign upstream ids such as `gpt-4o` are not valid canonical model ids under provider `role-model`.
5. For explicit Pi provider invocations such as `--provider role-model`, the canonical user-facing model-id form is the provider-relative Role-Model id that Pi lists for that provider, for example `baseline.remote-only`.
6. If Pi or package internals also accept a fully qualified compatibility form such as `role-model/<alias>`, that form is compatibility-only guidance unless a Pi API explicitly requires it for active-model storage or display.
7. If a Pi invocation mode cannot execute package commands because of Pi-core limitations, the repo must treat that as an explicit limitation, not as silent implied support.
8. Remote endpoints remain blocked by default unless an existing trusted-remote setting from the Pi integration contract is explicitly enabled.
9. Auth-required runtime discovery or provider use remains fail-closed unless an already-supported token source is configured.
10. Error and help output must never print raw token values, credential material, or sensitive local auth-cache paths.
11. Invalid endpoint and invalid model errors must have deterministic repo-owned diagnostics.
12. Controller-generated explanation may be additive, but must never be required for the user to receive a useful error.
13. Phase 3 must use `TDD Mode: strict`.
14. Phase 5 must use real local Pi verification.

## Requirements

### `R1` Establish the real Pi command and provider surface matrix

Description:
Phase 1 must verify which Pi invocation paths actually execute package commands, which paths only send model prompts, and which paths are unsupported or Pi-core-limited.

Acceptance criteria:
- Phase 1 records the behavior of interactive slash commands, any Pi RPC command path, `pi -p` or print-mode slash-command attempts, and `--provider role-model` prompt execution.
- Phase 1 identifies which observed failures are repo-owned versus upstream Pi-owned.
- Phase 1 maps each supported or unsupported path to the exact files and tests that own it.

### `R2` Repo-owned command paths must be truthful and non-silent

Description:
The package must not leave users with a repo-owned "did nothing" outcome when using supported command surfaces.

Acceptance criteria:
- supported command paths return visible package-owned output for `setup`, `status`, `doctor`, and alias commands
- if Pi-core does not actually invoke package commands in print or noninteractive mode, repo docs and skill guidance explicitly mark that path unsupported
- package docs and QA stop treating unsupported slash-command paths as supported
- no supported repo-owned command path may appear to succeed while emitting no actionable output

### `R3` Canonical Role-Model model-id guidance must be consistent

Description:
Users need one clear answer for which model ids are valid with `--provider role-model`.

Acceptance criteria:
- package output, docs, skill guidance, and QA consistently use the canonical provider-relative Role-Model model-id form for explicit Pi provider calls, for example `baseline.remote-only`
- any alternate accepted form such as `role-model/<alias>` is documented as compatibility-only, not as competing primary guidance
- examples and smoke commands use real Role-Model ids, not foreign provider ids
- alias list and recommended-alias output expose the exact ids users should pass to Pi

### `R4` Invalid model selection must fail with actionable guidance

Description:
A user who tries `--provider role-model --model gpt-4o` must get a clear explanation and recovery path rather than an unexplained routing failure.

Acceptance criteria:
- package docs and skill guidance explicitly explain that foreign ids such as `gpt-4o` are not canonical Role-Model provider ids
- the supported command path exposes a valid recommended alias and a discoverable alias list
- expected failure behavior for invalid foreign ids is documented together with the remedy
- QA includes at least one invalid-foreign-id proof and one valid-Role-Model-id proof

### `R5` The working provider execution path must remain healthy

Description:
The run must preserve the part that already works: prompting Pi through `--provider role-model` with a valid Role-Model model id.

Acceptance criteria:
- real Pi prompt execution through `--provider role-model` and a valid Role-Model id succeeds
- runtime request receipts prove the request reached Role-Model
- rich discovery and compact model-list behavior remain internally consistent with the chosen canonical id guidance
- if output listing changes, related tests, fixtures, and docs are updated together

### `R6` `status` and `doctor` diagnostics must expose a minimum actionable fact set

Description:
Supported diagnostic commands must surface enough structured facts to debug invocation-mode, endpoint, discovery, and model-id problems without requiring source inspection.

Acceptance criteria:
- `/role-model status` reports at minimum the configured endpoint, endpoint trust state, runtime reachability, discovery state or failure class, canonical model-id guidance for explicit provider calls, alias count, recommended alias, and active or selected alias state when available
- `/role-model doctor` reports failing checks as classified categories rather than raw exception text alone
- doctor output includes explicit remediation for at least invalid endpoint, auth-required-without-supported-token-source, unknown model id, foreign model id under `role-model`, known alias with no eligible target, and unsupported command invocation mode
- diagnostic output is secret-safe and does not expose raw token values, credential material, or sensitive local auth-cache paths
- tests cover at least one healthy output and one failing output for each major diagnostic category

### `R7` Docs and skill guidance must match real behavior

Description:
The repo must stop teaching users invocation paths that are unsupported or misleading.

Acceptance criteria:
- `apps/docs-site/content/docs/integrations/pi.mdx`, package README content, and `skills/role-model/SKILL.md` explain the supported command invocation path, the supported prompt invocation path, the canonical provider-relative Role-Model model-id form for explicit provider calls, how to discover valid aliases, and why raw HTTP fallback is debug-only rather than the primary path
- guidance distinguishes external Pi bugs from Role-Model integration bugs
- docs do not imply that `pi -p "/role-model ..."` is supported unless Phase 1 proves that it is

### `R8` Invalid endpoint and model selections must fail with actionable guidance

Description:
When Pi or an agent attempts to use an unknown, blocked, unreachable, incompatible, or non-routable endpoint or model, the integration must return a descriptive repo-owned error that explains what failed and how to recover.

Acceptance criteria:
- invalid endpoint failures distinguish at least malformed endpoint URL, blocked remote endpoint by trust policy, endpoint unreachable or timeout, runtime reachable but incompatible, and runtime requiring auth without a supported configured token source
- invalid model failures distinguish at least unknown model id, foreign provider model id used under `role-model`, known alias with no eligible target, and known alias removed or no longer discoverable
- every error includes what input was rejected, why it failed, whether the runtime was reached, and one or more concrete recovery actions
- recovery guidance references supported discovery surfaces such as alias list, recommended alias, current endpoint status, and the supported invocation mode when relevant
- error and help output redact raw token values, credential material, and sensitive local auth-cache paths
- controller-generated advisory text is optional only: it may enrich a classified error when a healthy controller path exists, but it must not be required to produce the base error
- failure to generate advisory text must not hide or replace the deterministic base error
- tests cover each failure class and verify stable user-visible messages

### `R9` Real Pi QA must cover both command truth and prompt truth

Description:
Phase 5 must verify the corrected guidance against real local Pi behavior.

Acceptance criteria:
- Phase 5 verifies the supported command path for `setup`, `status`, `doctor`, `alias list`, and `alias recommended`
- Phase 5 verifies that `status` and `doctor` include the minimum diagnostic fact set required by `R6`
- Phase 5 verifies `pi --list-models role-model` or the owning equivalent model-list surface
- Phase 5 verifies at least one unsupported slash-command path such as `pi -p "/role-model status"` or the actual current unsupported mode and confirms that docs and diagnostics describe that limitation truthfully
- Phase 5 verifies one valid Role-Model prompt path and one invalid foreign-id path
- Phase 5 verifies at least one invalid-endpoint path
- Phase 5 cross-checks Pi behavior against Role-Model runtime receipts
- if the Windows Pi exit assertion still appears after successful output, Phase 5 records it as an upstream Pi defect rather than misclassifying the provider path as broken

## Out of Scope

- fixing Pi's Windows libuv/assertion bug upstream
- adding managed runtime ownership to `pi-role-model`
- changing Role-Model routing semantics or benchmark behavior
- making foreign model ids such as `gpt-4o` become valid canonical ids under provider `role-model`
- bypassing Pi as the primary supported integration path by blessing raw `curl` as the normal user workflow

## Constraints

- keep Role-Model as the routing and metadata authority
- keep automated tests deterministic and offline-safe by default
- use strict TDD for code changes
- if Pi-core makes a path impossible, fail clearly in docs and QA rather than pretending support
- preserve existing working provider execution behavior while tightening diagnostics and guidance
- preserve the existing fail-closed auth and blocked-remote trust boundaries from earlier Pi integration runs
- keep all diagnostics and help text secret-safe; never print raw token values, credential material, or sensitive local auth-cache paths
- do not invoke the controller to explain failures until the error has already been locally classified
- do not let advisory generation mutate the failure class or hide the raw validation facts

## Late-Phase Requirements

- Phase 6 updates `/.recursive/DECISIONS.md` with the canonical provider-relative Pi model-id form, the supported versus unsupported invocation-mode matrix, the deterministic invalid endpoint/model error contract, and any remaining accepted Pi-core limitations.
- Phase 7 updates `/.recursive/STATE.md` to reflect the supported command path, the supported prompt path, the canonical provider-relative model-id form for explicit provider calls, and the final deterministic diagnostic behavior.
- Phase 8 reviews `/.recursive/memory/domains/pi-role-model-package.md` and `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` because the run changes durable Pi integration guidance and error-handling expectations.

## Required Evidence

- Phase 1 command/provider path matrix covering supported and unsupported invocation modes
- explicit proof of the canonical provider-relative model-id form and any retained compatibility-only forms
- RED and GREEN logs for each code-bearing implementation slice
- automated test logs for diagnostics, invalid endpoint handling, and invalid model handling
- docs and skill diff proof for canonical model-id guidance and unsupported-mode guidance
- Pi transcripts for the supported command path, model listing, an unsupported slash-command path, a valid provider prompt, an invalid foreign-id prompt, and an invalid-endpoint case
- Role-Model health/version/discovery snippets and runtime request receipts with secrets redacted
- no-secret-output evidence for diagnostic and error paths

## Coverage Gate

- [x] `R1` covers supported versus unsupported Pi command and provider surfaces
- [x] `R2` covers visible non-silent behavior for supported command paths
- [x] `R3` covers canonical Role-Model model-id guidance
- [x] `R4` covers actionable invalid foreign-model handling
- [x] `R5` covers preserving the working provider execution path
- [x] `R6` covers minimum actionable `status` and `doctor` diagnostics
- [x] `R7` covers docs and skill alignment
- [x] `R8` covers deterministic invalid endpoint/model diagnostics plus optional controller advisory
- [x] `R9` covers real Pi QA for valid, invalid, and unsupported invocation paths

Coverage: PASS

## Approval Gate

- [x] the scope is limited to repo-owned Pi integration UX, guidance, and error handling
- [x] upstream Pi bugs remain documented but out of scope
- [x] deterministic base errors are required before any optional controller-generated advisory
- [x] acceptance criteria are observable and suitable for later audited phases
- [x] the user approved this requirement for run creation on `2026-07-17`

Approval: PASS
