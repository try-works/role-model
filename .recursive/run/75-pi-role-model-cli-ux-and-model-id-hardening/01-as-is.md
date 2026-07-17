Run: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-17T07:12:35Z`
LockHash: `45ff7bf466d98f8d31055dd4bdfca5bc56c826bfe75bc8f692519d5c44cf4181`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-worktree.md` (LOCKED)
- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/commands.ts`
- `packages/pi-role-model/src/downstream-openai.ts`
- `packages/pi-role-model/src/provider-registration.ts`
- `packages/pi-role-model/src/runtime-discovery.ts`
- `packages/pi-role-model/src/config.ts`
- `packages/pi-role-model/src/types.ts`
- `packages/pi-role-model/README.md`
- `packages/pi-role-model/skills/role-model/SKILL.md`
- `apps/docs-site/content/docs/integrations/pi.mdx`
- `packages/pi-role-model/test/commands.test.ts`
- `packages/pi-role-model/test/downstream-openai.test.ts`
- `packages/pi-role-model/test/extension.test.ts`
- `packages/pi-role-model/test/runtime-discovery.test.ts`
- Local Pi source/docs at `D:/pi/node_modules/@earendil-works/pi-coding-agent/**`
- Real local runtime and Pi CLI observations captured on `2026-07-17`
Outputs:
- This file.
Scope note: This artifact records the authoritative current-state matrix for Pi command invocation, provider execution, model-id guidance, and invalid endpoint/model handling before run-75 remediation.

## TODO

- [x] Re-read locked requirements and worktree baseline
- [x] Re-read the affected Pi package source, tests, docs, and skill guidance
- [x] Reproduce the supported provider prompt path and the observed unsupported/non-actionable paths
- [x] Build the source-requirement inventory for R1-R9
- [x] Record current behavior with concrete code and runtime evidence
- [x] Separate repo-owned defects from upstream Pi defects
- [x] Record gaps, ownership boundaries, and worktree diff basis
- [x] Complete audited-phase gates

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no route inventory was refreshed into this worktree and this phase is dominated by local source/runtime inspection.
- Delegation Decision Basis: direct inspection is sufficient because the affected scope is a small repo-owned package plus local Pi/runtime behavior that must be verified firsthand.
- Delegation Override Reason: N/A
- Audit Inputs Provided:
  - locked run-75 requirements and worktree artifacts
  - current `pi-role-model` package source, tests, README, and skill
  - docs-site Pi integration page
  - local Pi extension/provider documentation and type declarations
  - live Role-Model runtime responses and live Pi CLI reproductions

## Effective Inputs Re-read

- `00-requirements.md` defines R1-R9 and fixes four key decisions for this phase: provider-relative model ids are canonical for `--provider role-model`; print/noninteractive slash-command support must be proven rather than assumed; Windows Pi assertion fallout is out of scope; deterministic base errors are required before any optional controller advisory.
- `00-worktree.md` establishes the isolated branch `recursive/75-pi-role-model-cli-ux-and-model-id-hardening` at base commit `788c18eec021230a5c0c925931d610875993f65c`.
- Baseline package checks already pass in this worktree: `corepack pnpm --filter @try-works/pi-role-model build` and `corepack pnpm --filter @try-works/pi-role-model test`.
- Live runtime evidence on `2026-07-17` confirms `http://127.0.0.1:3456` is reachable, `/api/version` reports commit `788c18eec021230a5c0c925931d610875993f65c`, and `/v1/models` plus `/api/role-model/downstream/openai` expose provider-relative ids such as `baseline.remote-only`.
- Live Pi evidence on `2026-07-17` confirms:
  - `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."` succeeds
  - `pi --no-session --provider role-model --model gpt-4o -p "Reply with ok."` fails with a generic `400 no_eligible_target`
  - `pi --no-session -p "/role-model status"` exits `0` with no output
  - `pi list` and `pi --list-models role-model` both print useful output and then hit a Windows assertion
- The currently installed Pi package points to `D:\DEV\role-model\.worktrees\59-observe-taxonomy-analytics-completion\packages\pi-role-model`, so Phase 5 must reinstall from this worktree before final QA.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/00-requirements.md` and downstream artifacts: established the original package/runtime ownership boundary and interactive command surfaces.
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md` and `01-as-is.md`: established trust/auth fail-closed behavior, richer discovery, and alias-selection behavior, but did not resolve run-75 command-truth or canonical-id drift.
- `/.recursive/run/59-observe-taxonomy-analytics-completion/01.5-root-cause.md`: relevant only as context that the currently installed Pi package points at another worktree and therefore cannot be the final QA source of truth for this run.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: Establish the real Pi command and provider surface matrix | Summary: interactive slash commands, print-mode slash-command attempts, and explicit provider prompts must be separated by proven behavior and ownership; current reality is interactive command support plus a healthy explicit provider prompt path, with print-mode slash-command behavior unsupported in practice | Owner: `src/extension.ts`, local Pi docs/types, live Pi CLI evidence
- `R2` | Disposition: `in-scope` | Source Quote: Repo-owned command paths must be truthful and non-silent | Summary: the package must not imply a supported command path that produces no visible output; current command emission depends entirely on `ui.notify` and is truthful only in interactive contexts | Owner: `src/extension.ts`, `src/commands.ts`, docs/skill guidance
- `R3` | Disposition: `in-scope` | Source Quote: Canonical Role-Model model-id guidance must be consistent | Summary: live runtime/provider surfaces use provider-relative ids such as `baseline.remote-only`, but docs/tests/examples still drift toward prefixed ids | Owner: `src/downstream-openai.ts`, docs-site, package README, tests/fixtures
- `R4` | Disposition: `in-scope` | Source Quote: Invalid model selection must fail with actionable guidance | Summary: foreign ids such as `gpt-4o` under provider `role-model` must be explained and redirected to valid aliases; current provider prompt path still falls through to generic Pi/runtime errors | Owner: provider prompt seam, command diagnostics, docs
- `R5` | Disposition: `in-scope` | Source Quote: The working provider execution path must remain healthy | Summary: the valid provider-relative prompt path already works and must be preserved while diagnostics are tightened | Owner: `src/downstream-openai.ts`, `src/provider-registration.ts`, live Pi CLI evidence
- `R6` | Disposition: `in-scope` | Source Quote: `status` and `doctor` diagnostics must expose a minimum actionable fact set | Summary: current status/doctor output covers endpoint/version/basic alias data, but not canonical provider-call model-id guidance, unsupported invocation mode, or detailed invalid-model classes | Owner: `src/commands.ts`, `src/runtime-discovery.ts`
- `R7` | Disposition: `in-scope` | Source Quote: Docs and skill guidance must match real behavior | Summary: docs/skills must stop implying unsupported print-mode slash commands and must adopt provider-relative ids as the primary guidance | Owner: docs-site page, package README, Pi skill
- `R8` | Disposition: `in-scope` | Source Quote: Invalid endpoint and model selections must fail with actionable guidance | Summary: command discovery already classifies endpoint failures, but the supported provider prompt path lacks repo-owned invalid-model and downstream-error shaping today | Owner: `src/config.ts`, `src/runtime-discovery.ts`, provider registration seam
- `R9` | Disposition: `in-scope` | Source Quote: Real Pi QA must cover both command truth and prompt truth | Summary: final QA must reinstall from this worktree and prove valid, invalid, and unsupported paths against real Pi behavior; current repo coverage is unit-only | Owner: run artifacts, live Pi install state, Phase 5 QA

## Current Behavior by Requirement

### R1 - Real Pi command and provider surface matrix

Current command/provider behavior is split across three materially different paths:

| Path | Evidence | Current result | Ownership |
| --- | --- | --- | --- |
| Interactive slash command inside Pi | `packages/pi-role-model/src/extension.ts:131-136` registers one `role-model` command; local Pi types document command context actions as interactive-only at `D:/pi/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:1143` | Supported in interactive Pi contexts through `ctx.ui.notify(...)` | repo-owned |
| Print/noninteractive slash command via `pi -p "/role-model ..."` | `pi --no-session -p "/role-model status"` exited `0` with no output on `2026-07-17`; package command handler only notifies UI (`extension.ts:133-135`) | Unsupported in practice and currently silent | mixed: repo-owned silence on top of Pi-mode limitation |
| Explicit provider prompt path via `--provider role-model --model <id>` | `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."` returned `ok.` on `2026-07-17` | Supported and healthy for valid Role-Model ids | repo-owned integration + runtime routing |
| Model listing via `pi --list-models role-model` | live CLI lists provider-relative ids, then hits Windows assertion | Useful output is correct; post-output crash is upstream | upstream Pi defect after successful output |

The repo already has enough evidence to stop treating `pi -p "/role-model ..."` as a supported diagnostic path. The provider execution path is the only proven prompt path.

### R2 - Repo-owned command paths are truthful and non-silent

The package registers `/role-model` as a command whose handler always writes through `context?.ui?.notify?.(...)` and never returns visible text via a non-UI channel (`packages/pi-role-model/src/extension.ts:131-136`). This is sufficient for interactive Pi, but it produces a repo-owned silent outcome whenever the invocation mode does not provide `ui.notify`.

The command implementation itself returns structured text (`packages/pi-role-model/src/commands.ts:37-43`, `:213-392`), so the silence is not in command computation. The silence occurs at the final emission seam.

Current docs/skill guidance do not truthfully narrow supported command usage to the interactive path:

- docs-site tells users simply to run `/role-model setup`, `/role-model status`, `/role-model doctor` "Inside Pi" (`apps/docs-site/content/docs/integrations/pi.mdx:44-58`)
- package README lists commands but does not distinguish interactive slash commands from print-mode prompts
- package skill tells the user to check `/role-model status` first without warning that `pi -p "/role-model status"` is not a supported path

### R3 - Canonical Role-Model model-id guidance

Live runtime and live Pi provider registration currently converge on provider-relative ids such as `baseline.remote-only`:

- `createPiModelSelection(...)` returns `id: model.id` with no `role-model/` prefixing (`packages/pi-role-model/src/downstream-openai.ts:126-146`)
- `mapDiscoveryToProviderConfig(...)` registers models with `id: model.id` (`packages/pi-role-model/src/downstream-openai.ts:148-182`)
- live `/v1/models` and `/api/role-model/downstream/openai` expose ids such as `baseline.remote-only`
- live `pi --list-models role-model` prints provider-relative ids

However the repo still has canonical-id drift:

- docs-site says `/role-model alias use <alias>` switches to matching `role-model/<alias>` (`apps/docs-site/content/docs/integrations/pi.mdx:71-72`)
- docs-site also says registered ids are shaped as `role-model/<alias>` (`apps/docs-site/content/docs/integrations/pi.mdx:74-80`)
- package fixtures and many tests still center prefixed ids like `role-model/auto` (`packages/pi-role-model/test/fixtures.ts:5-67`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/downstream-openai.test.ts`, `packages/pi-role-model/test/extension.test.ts`)
- `resolveAliasId(...)` deliberately accepts both prefixed and unprefixed forms (`packages/pi-role-model/src/commands.ts:142-155`), but the package does not currently label one form as canonical and the other as compatibility-only

### R4 - Invalid model selection guidance

The explicit provider path currently gives poor guidance for foreign ids:

- `pi --no-session --provider role-model --model gpt-4o -p "Reply with ok."` produced:
  - `Warning: Model "gpt-4o" not found for provider "role-model". Using custom model id.`
  - `400 no_eligible_target: no targets for model gpt-4o satisfy the inferred request capabilities.`

That message does not explain that `gpt-4o` is a foreign provider id under provider `role-model`, does not point to `alias list`, and does not provide the recommended replacement id.

Repo command surfaces can help after the fact:

- `status` reports alias count and selected alias (`packages/pi-role-model/src/commands.ts:243-268`)
- `alias list` and `alias recommended` expose valid ids (`packages/pi-role-model/src/commands.ts:327-345`)

But the supported provider prompt path itself has no repo-owned preflight or response shaping for foreign ids today.

### R5 - Working provider execution path remains healthy

The healthy path is confirmed:

- `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."` succeeded on `2026-07-17`
- provider registration maps discovery models directly and uses the runtime's downstream OpenAI endpoint (`packages/pi-role-model/src/downstream-openai.ts:148-182`)
- runtime discovery and model listing agree on the same provider-relative id family

The package must preserve this seam while improving diagnostics. The Windows assertion after `pi list` / `pi --list-models role-model` is downstream of the successful output and is not evidence that the provider path is broken.

### R6 - `status` and `doctor` minimum actionable facts

Current `status` is richer than early runs but still incomplete for run-75 requirements. It reports:

- state, endpoint, runtime version/build
- alias count
- selected alias and stored alias drift
- provider registered/not registered
- auth placeholder/required
- local/remote trust
- fallback flag
- warnings

Evidence: `packages/pi-role-model/src/commands.ts:243-268`.

Missing from `status` relative to run-75 requirements:

- explicit canonical provider-call model-id guidance
- explicit recommended alias in the status body
- invocation-mode truth such as interactive-only command path
- richer failure taxonomy for model validation and unsupported mode

Current `doctor` is mostly a happy-path checklist plus discovery failure passthrough (`packages/pi-role-model/src/commands.ts:271-290`). It does not classify:

- unknown model id
- foreign model id under `role-model`
- known alias with no eligible target
- unsupported command invocation mode
- invalid endpoint subclasses beyond whatever `RoleModelDiscoveryError` exposes

`formatDiscoveryError(...)` is limited to runtime-discovery failures (`packages/pi-role-model/src/commands.ts:157-167`).

### R7 - Docs and skill guidance match real behavior

Current docs/skill behavior is partially correct on runtime ownership and trust/auth boundaries, but incomplete or inconsistent on run-75 concerns:

- docs-site correctly explains external runtime ownership and trust/auth boundaries (`apps/docs-site/content/docs/integrations/pi.mdx:27-42`)
- package README correctly keeps runtime ownership narrow and avoids auth-file coupling
- package skill correctly frames Role-Model as routing authority and points runtime install requests back to the repo README

But guidance gaps remain:

- docs-site still teaches `role-model/<alias>` as the registered model-id form (`pi.mdx:71-80`)
- none of the docs distinguish the supported interactive command path from the unsupported print-mode slash-command path
- none of the docs explain that the supported prompt path is `--provider role-model --model <provider-relative-id>`
- none of the docs explain the generic `gpt-4o` failure class and its remedy
- current guidance does not frame raw HTTP use as debug-only fallback versus the primary supported Pi integration path

### R8 - Deterministic invalid endpoint and model diagnostics

Endpoint classification is partially present today for command-driven discovery:

- `config.ts` classifies `invalid-endpoint`, `remote-blocked`, `remote-untrusted`, and local/remote-allowed trust states (`packages/pi-role-model/src/config.ts:34-73`)
- `runtime-discovery.ts` classifies `unavailable`, `timeout`, `incompatible`, `blocked-remote`, and `auth-required` (`packages/pi-role-model/src/runtime-discovery.ts:12-38`, `:174-266`)

That endpoint classification is only surfaced through command discovery failures. It does not currently extend to the explicit provider prompt path.

Model-failure handling is the main missing seam:

- package provider registration currently passes only static OpenAI-compatible config (`packages/pi-role-model/src/provider-registration.ts:10-16`, `packages/pi-role-model/src/types.ts:92-117`)
- local Pi supports custom provider `streamSimple` hooks for provider-owned error handling (`D:/pi/node_modules/@earendil-works/pi-coding-agent/docs/custom-provider.md:372`, `:600`, `:641-644`)
- local Pi also documents `after_provider_response` as an inspection hook (`D:/pi/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md:297-298`, `:649-654`)
- current package types do not model `streamSimple` or `after_provider_response`, and current package code does not use either seam

As a result, provider prompt failures currently bubble up as raw Pi/runtime messages instead of deterministic repo-owned help.

### R9 - Real Pi QA coverage

Current repository coverage is unit-only:

- tests assert command formatting, provider registration mapping, and discovery behavior
- tests do not prove live Pi command invocation behavior
- tests do not cover real invalid foreign-id prompts
- tests do not cover invalid endpoint prompt behavior
- tests do not cover the installed-package/worktree mismatch now present in the local Pi environment

Phase 5 therefore still needs:

- explicit reinstall from this worktree
- interactive command proofs
- model-list proof
- unsupported print-mode slash-command proof
- valid provider prompt proof
- invalid foreign-id prompt proof
- invalid-endpoint proof

## Relevant Code Pointers

- `packages/pi-role-model/src/extension.ts`
  - startup discovery and command registration: `27-137`
  - command output seam is `context?.ui?.notify(...)`: `131-136`
- `packages/pi-role-model/src/commands.ts`
  - help text and command dispatcher: `22-35`, `213-392`
  - discovery error formatting: `157-167`
  - status output: `243-268`
  - doctor output: `271-290`
  - alias resolution compatibility behavior: `142-155`
  - alias list/recommended/use paths: `327-388`
- `packages/pi-role-model/src/downstream-openai.ts`
  - fail-closed auth validation: `30-56`
  - provider-relative active-model selection: `126-146`
  - provider registration model ids: `148-182`
- `packages/pi-role-model/src/provider-registration.ts`
  - provider registration is a thin pass-through today: `4-16`
- `packages/pi-role-model/src/config.ts`
  - endpoint trust classification: `34-73`
- `packages/pi-role-model/src/runtime-discovery.ts`
  - discovery failure states and error mapping: `12-38`, `174-266`
- `packages/pi-role-model/src/types.ts`
  - local package Pi type surface currently omits `streamSimple` and `after_provider_response`: `92-127`
- `apps/docs-site/content/docs/integrations/pi.mdx`
  - command guidance: `44-58`
  - alias-use wording and registered model-id wording drift: `71-80`
- `packages/pi-role-model/README.md`
  - command list and runtime ownership guidance
- `packages/pi-role-model/skills/role-model/SKILL.md`
  - command-first troubleshooting guidance without noninteractive-mode caveat
- Local Pi docs/types
  - extension command contexts are interactive-only: `D:/pi/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:1143`
  - provider custom-stream seam exists: `D:/pi/node_modules/@earendil-works/pi-coding-agent/docs/custom-provider.md:372`, `:600`, `:641-644`

## Known Unknowns

- Whether the repo should use Pi's `streamSimple` seam, `after_provider_response`, a `message_end` rewrite, or a request-time preflight combination to own invalid-model/provider errors on the prompt path.
- Whether the installed Pi package from worktree 59 differs behaviorally from this worktree beyond the already-observed command/model-id issues; Phase 5 must eliminate this uncertainty by reinstalling from the run-75 worktree.
- Whether any additional Pi command surfaces beyond interactive slash commands and print-mode prompts are worth documenting for Role-Model users; Phase 1 found no repo-owned evidence that such a surface is currently required.

## Evidence

- Live runtime health/version/discovery observed on `2026-07-17` at `http://127.0.0.1:3456`
- Live provider prompt success:
  - `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."` -> `ok.`
- Live invalid foreign-id failure:
  - `pi --no-session --provider role-model --model gpt-4o -p "Reply with ok."` -> warning + `400 no_eligible_target`
- Live unsupported slash-command proof:
  - `pi --no-session -p "/role-model status"` -> exit `0` with no output
- Live model-list proof:
  - `pi --list-models role-model` lists provider-relative ids and then hits a Windows assertion
- Live install-path proof:
  - `pi list` shows installed package path under worktree `59-observe-taxonomy-analytics-completion`

## Reproduction Steps (Novice-Runnable)

1. Run a valid provider-relative prompt:

```bash
pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."
```

Expected current result: `ok.`

2. Run a foreign model id under provider `role-model`:

```bash
pi --no-session --provider role-model --model gpt-4o -p "Reply with ok."
```

Expected current result: Pi warning about custom model id, then `400 no_eligible_target`.

3. Attempt a print-mode slash command:

```bash
pi --no-session -p "/role-model status"
```

Expected current result: exit `0` with no visible output.

4. List registered provider models:

```bash
pi --list-models role-model
```

Expected current result: provider-relative ids such as `baseline.remote-only`, then a Windows assertion after output.

## Gaps Found

None. Phase 1 identified no analysis gaps beyond the mapped current-state defects already captured above. The remaining work is remediation, not additional AS-IS discovery.

## Earlier Phase Reconciliation

- `00-requirements.md` remains valid and fully aligned with the observed runtime/provider matrix. No requirement widening was needed during AS-IS analysis.
- `00-worktree.md` remains valid. Base commit and worktree diff basis are unchanged.
- No addenda exist yet for run 75.

## Subagent Contribution Verification

- No subagent was used for this phase.
- Main-agent verification consisted of direct source inspection, live CLI reproduction, and cross-checking against local Pi docs/types.
- Acceptance Decision: N/A
- Repair Performed After Verification: none

## Repair Work Performed

- No production code, tests, or docs were changed in this phase.
- This artifact records current behavior only.

## Requirement Completion Status

- `R1` | Status: blocked | Rationale: the command/provider surface matrix is now proven, but unsupported noninteractive slash-command behavior remains unremediated | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R2` | Status: blocked | Rationale: repo-owned command emission is truthful only in interactive UI contexts; unsupported silent path still exists | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R3` | Status: blocked | Rationale: canonical provider-relative ids are not yet consistent across docs/tests/examples | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R4` | Status: blocked | Rationale: invalid foreign ids still fail with generic runtime/Pi output | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R5` | Status: blocked | Rationale: the healthy provider path is confirmed, but preservation plus companion diagnostics still require implementation and QA | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R6` | Status: blocked | Rationale: status/doctor outputs are still below the required diagnostic fact set | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R7` | Status: blocked | Rationale: docs and skill guidance do not yet match the proven invocation/model-id truth | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R8` | Status: blocked | Rationale: invalid endpoint/model diagnostics are incomplete and not surfaced on the provider prompt path | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`
- `R9` | Status: blocked | Rationale: real Pi QA is not yet worktree-local and does not cover the required transcript matrix | Blocking Evidence: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md`

## Traceability

- `R1`, `R2` -> `src/extension.ts` command registration/output seam + local Pi interactive-only command context contract
- `R3`, `R7` -> `src/downstream-openai.ts` provider-relative ids + docs/test drift
- `R4`, `R8` -> provider execution seam currently lacking repo-owned error shaping
- `R5` -> live valid provider prompt proof + direct provider-relative model registration
- `R6` -> current `status` / `doctor` output scope in `src/commands.ts`
- `R9` -> installed-package mismatch and missing real-Pi transcript set

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `788c18eec021230a5c0c925931d610875993f65c`
- Comparison reference: `working-tree`
- Normalized baseline: `788c18eec021230a5c0c925931d610875993f65c`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 788c18eec021230a5c0c925931d610875993f65c`
- Planned or claimed changed files: this Phase 1 artifact only
- Unexplained drift: none

## Audit Verdict

Audit: PASS

The current-state matrix is now explicit: the valid provider prompt path works, the print-mode slash-command path is not truthfully supported, canonical provider-relative ids are not yet documented consistently, and invalid provider/model failures do not yet return repo-owned help.

## Coverage Gate

- [x] R1-R9 are each mapped to concrete current-state evidence
- [x] Supported and unsupported invocation paths are explicitly separated
- [x] Repo-owned defects are distinguished from the upstream Windows assertion
- [x] Worktree-local diff basis remains clean for Phase 2+

Coverage: PASS

## Approval Gate

- [x] The AS-IS artifact is specific enough to drive root-cause analysis and implementation planning
- [x] No requirement contradictions remain
- [x] Audit passed

Approval: PASS
