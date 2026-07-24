Run: `/.recursive/run/79-extension-control-and-recommendations-qa/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-24T07:28:21Z`
LockHash: `921c3135c451cce43b9cf3068f63b31c2864ed8320fd1f3eb60a66e21640fbe4`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User-approved next-run proposal (2026-07-24): public extension enable/disable mutation API + Extensions UI wiring + live recommendations apply/dismiss QA; KW `productionActivation` remains hard-off
- Public run numbering: highest existing public run `78-dev-stage-main-cicd-runtime-channels` → this run id is `79`
- `D:/DEV/role-model-internal/.recursive/STATE.md`
- `D:/DEV/role-model-internal/.recursive/DECISIONS.md`
- `D:/DEV/role-model-internal/.recursive/memory/MEMORY.md`
- `D:/DEV/role-model-internal/.recursive/memory/domains/direct-track-b.md`
- Closed proposal corpus authorities for host mutation and recommendations:
  - `.../proposals/crowdsourced-evals/docs/guidance/02_extension_ui_manifest_host.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/15_crowdsourced_learning_client.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/16_crowdsourced_evidence_recommendations.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/17_server_return_artifacts_client_usage.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/product-defaults.json`
  - `.../proposals/crowdsourced-evals/docs/guidance/product-state-transitions.json`
  - `.../proposals/crowdsourced-evals/docs/guidance/server-return-contracts.schema.json`
- Predecessor run OOS / limitations: `00-direct-track-b-v1-1-implementation` (no public enable/disable mutation API; recommendations apply/dismiss against live service pending; KW productionActivation locked off)
Outputs:
- `/.recursive/run/79-extension-control-and-recommendations-qa/00-requirements.md`
Scope note: Defines the requirements for unlocking first-party extension enable/disable (mode) control in the public runtime, wiring the Extensions UI to that authority, closing live signed-recommendation apply/dismiss verification against bound cloud, and proving the result on a rebuilt packaged runtime under strict TDD. Does not unlock Knowledge Worker production activation.

## TODO

- [x] Elicit requirements from user/context and post-v1.1 proposal
- [x] Align run id with public repo highest run (`78` → `79`)
- [x] Define requirement identifiers (`R1`–`R7`)
- [x] Write observable acceptance criteria for each requirement
- [x] Require strict TDD and rebuilt packaged-runtime verification
- [x] Document out of scope items (`OOS1`–`OOS8`)
- [x] List constraints and assumptions
- [x] User approves this draft (2026-07-24)
- [x] Create run folders in public + private worktrees via `recursive-init`
- [x] Replace scaffolded `00-requirements.md` with this approved content
- [x] Complete Coverage Gate checklist after approval
- [x] Complete Approval Gate checklist after approval

## Background

### Goal

Operators using the public runtime can enable, disable, and set first-party extension modes through a real host/runtime API and the Extensions UI, and can complete the signed recommendations pull → verify → apply and dismiss/reject flow against a bound cloud track. All of that is proven with failing-first tests and against a freshly rebuilt packaged runtime—not only against source-level unit tests.

### Problem

Run `00-direct-track-b-v1-1-implementation` shipped the Direct Track B substrate and a diagnostics-only Extensions UI. Documented limitations remain:

1. No public first-party extension enable/disable mutation API (UI reports host lifecycle only).
2. Recommendations list/download/apply client paths exist, but live apply/dismiss against a bound recommendation service was never closed as release evidence; dismiss is not yet a first-class public API.
3. Knowledge Worker / route-package production activation remains intentionally hard-off and must stay that way.

### Scope

- Public repository `try-works/role-model` and private repository `try-works/role-model-internal`.
- Run id `79-extension-control-and-recommendations-qa` mirrored in both repos.
- Implementation branches stay on `dev` until the user explicitly promotes to `stage` or `main`.
- Current activity: requirements drafting only until this document is user-approved and the run is initialized.

## Requirements

### `R1` Public first-party extension enable/disable (mode) mutation API

Description:
Expose a first-party, audited public host/runtime HTTP API that mutates per-extension enablement and `enabledMode` for installed first-party extensions. The API is the sole public mutation authority for this surface; the UI must not invent a parallel state store. Behavior follows product-state independent axes and Guidance 02 dependency rules (hard/mode deps block; soft deps degrade).

Acceptance criteria:
- Public runtime exposes documented mutation endpoints (or equivalent typed host operations) for per-extension enable, disable, and mode change over `enabledMode` values `disabled | shadow | advisory | bounded | active`.
- Successful mutations persist across runtime restart for the active channel/scope and are visible on subsequent `GET /api/role-model/extensions` (or successor list API).
- Mutations emit durable audit/receipt evidence (who/what/when/mode/result) retrievable from runtime state or evidence logs recorded by the run.
- Hard or mode-required dependency failures refuse the mutation with a fail-closed error; soft dependency gaps may leave the target degraded without falsely reporting healthy active.
- Enabling an extension does not cascade `allowCloudUpload`, rich capture, `trainingUse`, or `externalRlExport` permissions.
- Enabling `knowledge-worker` or `knowledge-store` does not set or imply `productionActivation` / production prompt injection.
- Contract/unit tests cover happy path, unknown extension id, illegal mode, dependency block, and non-cascading axes.

### `R2` Wire Extensions UI to the mutation authority

Description:
Replace the Extensions page “no public enable/disable mutation API / diagnostics only” posture with operator controls that call the `R1` APIs. Keep lifecycle/health diagnostics. Preserve the Knowledge Worker shadow-only boundary in copy and behavior.

Acceptance criteria:
- `/app/system/extensions` exposes enable/disable (and mode where applicable) controls for installed first-party extensions.
- Controls call the public mutation API; UI state updates from the API response / refreshed list, not local-only toggles.
- Dangerous mode changes that affect network, data, or routing influence require an explicit confirmation step before mutation.
- Copy no longer claims the mutation API is absent for this release.
- Copy and tests assert that enabling knowledge packages is not narrated as production prompt injection / `productionActivation`.
- UI unit/component tests cover control presence, disabled states (busy, dependency blocked, managed lock if present), and the knowledge-boundary wording.

### `R3` Recommendations apply and dismiss against bound cloud

Description:
Close the live recommendations operator loop: download/verify signed server-return recommendations, apply when policy allows, and dismiss/reject when the operator declines. Add any missing public dismiss/reject API. Prove the flow against a bound cloud track (dev required; stage allowed).

Acceptance criteria:
- Public API supports apply (existing) and dismiss/reject (new if absent) for a recommendation id, recording operator action and resulting status.
- Apply remains blocked when signature invalid, local policy forbids apply, or `recommendationAccess` is not `preview_and_apply`.
- Dismiss/reject does not apply the pack and leaves an auditable non-applied terminal or dismissed status.
- Contribution opt-out alone does not revoke an already-imported compatible unexpired recommendation solely because upload stopped.
- Live evidence on bound cloud `--track=dev` shows: publish/resolve or download → list → apply success path, and dismiss/reject path; evidence stored under the run evidence tree.
- Optional stage track evidence may be recorded; production track harness remains refused.
- Offline/unit tests cover apply success, policy block, signature failure, and dismiss/reject without requiring live cloud.

### `R4` Keep Knowledge Worker production activation hard-off

Description:
This run must not unlock Knowledge Worker / route-package production activation. Shadow learning and enablement of the extension package remain distinct from production prompt injection.

Acceptance criteria:
- `KnowledgeWorker.productionActivation` remains `false` (or equivalent immutable guard).
- Any activate / inject / production prompt-injection path still fails closed with an explicit error.
- Regression tests (including the existing TB10 activation-guard style assertions) remain green.
- Extensions UI and API docs/copy introduced in this run do not claim production activation is available.
- System/product state after the run still lists KW production activation as out of scope / locked off in STATE/DECISIONS updates.

### `R5` Strict TDD for all in-scope product changes

Description:
Phase 3 uses `TDD Mode: strict`. No production implementation for `R1`–`R4` lands without a failing test first, then minimum green, then refactor with suites still green.

Acceptance criteria:
- Every in-scope production code change cites RED evidence (failing test against predecessor behavior), GREEN evidence (passing after minimal implementation), and REFACTOR confirmation.
- Unit and contract layers are mandatory for mutation API and recommendation dismiss/reject.
- UI component/route tests are mandatory for Extensions controls and knowledge-boundary copy.
- Integration or browser tests cover at least one enable→list round-trip and one recommendations apply or dismiss path.
- Quarantined, skipped, or structurally green-only tests cannot satisfy a requirement gate.
- Phase 3 artifact declares `TDD Mode: strict` and links RED/GREEN evidence paths under the run evidence tree.

### `R6` Verify against a rebuilt packaged runtime

Description:
Acceptance is not complete until the changed public runtime is rebuilt into the packaged distribution used for live operator verification, and the private Track B runtime distribution is rebuilt when private packages or sidecar paths change. Live/browser verification must target the rebuilt artifacts, not an stale binary.

Acceptance criteria:
- Public rebuild command `pnpm runtime:package-sea` (and `pnpm runtime:validate-packaging` when packaging contracts change) succeeds from the public worktree after implementation.
- Private rebuild command `pnpm build:run00-runtime` succeeds from the private worktree when private extension/sidecar distribution inputs change (or an explicit evidence note records why private distribution was unchanged).
- Packaged public runtime (`role-model-dev` / channel-appropriate SEA) is started from the freshly built artifact for verification.
- Browser/live verification for Extensions mutation controls and recommendations apply/dismiss runs against that rebuilt runtime (`RUNTIME_LIVE_BASE_URL` or equivalent), not against an older packaged binary.
- Evidence records include: rebuild command, exit code, artifact path or hash, runtime start metadata, and test command results.
- A stale binary (rebuild skipped while relevant sources changed) fails the verification gate.

### `R7` Dual-repo paired delivery on `dev` with synced run id

Description:
Land public contract/host/UI changes and private pins/tests as a paired delivery on `dev`, using the same run id in both repositories. Do not auto-promote to `stage` or `main`.

Acceptance criteria:
- Run folder `/.recursive/run/79-extension-control-and-recommendations-qa/` exists in both public and private repos after init.
- Public contract/host/UI changes merge (or are ready to merge) to public `dev` before private consumers pin that public revision when a pin is required.
- Private implementation pins the public revision when cross-repo contracts change.
- No promotion to `stage` or `main` is performed by this run unless the user explicitly authorizes it later.
- Phase 6/7 update DECISIONS/STATE so the former “no mutation API” limitation is cleared and KW activation remains listed as OOS.

## Out of Scope

- `OOS1`: Knowledge Worker / route-package `productionActivation` or production prompt injection (requires a later dedicated policy/lifecycle run).
- `OOS2`: Enabling rich capture, training-use, external RL export, or external archive by default.
- `OOS3`: Lifting the live Cloudflare harness ban on `--track=production`.
- `OOS4`: Building a full CD promotion pipeline beyond proving rebuilt-runtime verification for this run.
- `OOS5`: Capacity/performance CI gating and production benchmarking campaigns.
- `OOS6`: Track A residual code deletion / cleanup sweep.
- `OOS7`: Third-party / untrusted extension marketplace or sandbox isolation beyond first-party trusted bundles.
- `OOS8`: TB11 `predecessorReceipts` maxItems upstream schema fix (localized compensation remains as previously locked unless separately authorized).

## Constraints

- Machine authorities win for product axes and recommendation contracts: `product-defaults.json`, `product-state-transitions.json`, `server-return-contracts.schema.json`, destination-authorization contracts. Do not invent a UI-only enablement store.
- Independent axes remain independent: installed ≠ enabled ≠ capture ≠ upload ≠ training-use ≠ contribution tier ≠ recommendation access.
- Enabling an extension is never narrated or implemented as Knowledge Worker production activation.
- Live cloud E2E remains opt-in and limited to `dev` and `stage`; default `pnpm test` / CI stay offline-only unless this run adds an explicitly scoped offline suite.
- Work stays on `dev` until explicit user promotion.
- Diff basis for the run is recorded in `00-worktree.md` and not silently substituted later.
- Phase 3 `TDD Mode: strict` is mandatory (`R5`).
- Verification of operator-facing behavior requires rebuilt packaged runtime evidence (`R6`).

## Assumptions

- Cloud stage/production resources already provisioned by predecessor addenda remain available; this run does not re-provision Cloudflare infrastructure as a primary goal.
- Bound-cloud material/secrets for `--track=dev` are available to the operator/agent executing live verification (values stay out of git).
- Public highest run remains `78` at init time; if a newer public run appears before init, renumber to `max+1` before creating folders.
- Dismiss/reject semantics may map to a new `/api/role-model/recommendations/dismiss` (or equivalent) if no suitable endpoint exists today.

## Coverage Gate

- Effective inputs reviewed:
  - User-approved proposal for extension control + recommendations QA
  - Private STATE / DECISIONS / domain memory
  - Guidance 02, 15–17 and product-state / server-return authorities
  - Current public Extensions UI / runtime-api / host-bridge recommendation and extension list surfaces
- Requirement coverage check:
  - `R1`: mutation API
  - `R2`: UI wiring
  - `R3`: live recommendations apply/dismiss
  - `R4`: KW activation remains off
  - `R5`: strict TDD
  - `R6`: rebuilt packaged runtime verification
  - `R7`: dual-repo synced run id on `dev`
- Out-of-scope confirmation:
  - `OOS1`–`OOS8`: unchanged and explicit

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - User approved draft 2026-07-24
  - Run id synced to public max+1 (79)
  - TDD and rebuilt-runtime verification are first-class requirements
  - Acceptance criteria are observable
  - Paired worktrees created from clean origin/dev baselines
- Remaining blockers:
  - none for Phase 0 requirements lock

Approval: PASS
