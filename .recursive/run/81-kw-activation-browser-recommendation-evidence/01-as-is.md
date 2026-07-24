Run: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-24T20:25:10Z`
LockHash: `9731da33014e9e2c618c5d58583ccb4e1dd4b2c5f1b840ecc1c8702c6dff9286`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/direct-track-b.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md`
Outputs:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
Scope note: Captures pre-change Knowledge Worker activation behavior and current browser recommendation evidence surfaces for `R1`–`R14` against the locked paired worktree baselines. This phase documents facts and gaps only; it does not define Phase 2 design or claim Phase 3 implementation.

## TODO

- [x] Read locked Phase 0 requirements and worktree artifacts
- [x] Re-read relevant run-80 closeout and Direct Track B memory
- [x] Document novice-runnable AS-IS probes
- [x] Inventory private KW activation and rollback surfaces
- [x] Inventory public recommendation UI and Playwright surfaces
- [x] Document current behavior and gap for every `R1`–`R14`
- [x] Resolve or explicitly retain requirements unknowns `U1`–`U5`
- [x] Record paired-worktree diff basis without substituting parent worktrees
- [x] Complete self-audit, traceability, Coverage, and Approval gates

## Worktree Context

- Private controller worktree: `D:/DEV/.wt/81-kw` (short external path required by Windows MAX_PATH)
- Public implementation worktree: `D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence`
- Branch in both worktrees: `recursive/81-kw-activation-browser-recommendation-evidence`
- Private baseline: `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef`
- Public baseline: `9a94a5a187974941045dda732bfc8d2ba6eac327`
- Phase 1 rule: inspect and document these worktrees only; do not treat parent `dev` working trees as the comparison basis.

## Reproduction Steps (Novice-Runnable)

Prerequisites: use the run-81 worktrees above. These commands prove the starting state; they do not satisfy run-81 implementation or live-browser acceptance.

### A. Prove KW is immutable hard-off today (`R1`–`R3`)

```bash
cd D:/DEV/.wt/81-kw
node --test tests/track-b/tb10.test.mjs
```

Expected baseline: PASS. Relevant assertions show:

- `KnowledgeWorker.productionActivation === false`
- `activate()` throws `production activation prohibited in v1.1`
- derived candidates remain `state: "shadow"` with `productionPromptInjection: false`
- rollback clears candidates, but there is no active-to-inactive lifecycle because activation cannot succeed

Phase 0 captured the passing command at `evidence/logs/baseline-private-tb10.log`.

### B. Inspect the public recommendation UI (`R4`, `R7`–`R9`)

Open:

`D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/app/routes/extensions.tsx`

Observe:

- **Download & validate latest**
- per-row **Validate & apply**
- per-row **Dismiss**
- visible signature and policy status
- extension-boundary copy saying `Knowledge Worker productionActivation stays hard-off`

The controls exist, but source inspection is not live evidence against a rebuilt SEA or Cloudflare `--track=dev`.

### C. Prove current public offline contracts are green (`R7`–`R10`)

```bash
cd D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/extensions.test.tsx
```

Expected baseline: PASS. Phase 0 logs are:

- private controller mirror: `evidence/logs/baseline-public-ops.log`
- private controller mirror: `evidence/logs/baseline-public-extensions-ui.log`

These prove offline API/UI behavior only. They do not prove browser-driven Download → Apply or Download → Dismiss on a fresh live-bound SEA.

### D. Inspect the existing Playwright live entry (`U4`, `R7`–`R9`)

Open:

`role-model-router/apps/runtime-ui/e2e/recursive-79-extension-control-and-recommendations-qa.sp4.spec.ts`

It:

- requires `RUNTIME_LIVE_BASE_URL`, otherwise it skips
- exercises extension mutation
- dismisses only when a recommendation row already exists
- treats absence of downloaded packs as acceptable
- does not click **Download & validate latest**
- does not exercise **Validate & apply**
- does not prove `--track=dev`, channel `development`, a fresh SEA hash, or durable browser traces/screenshots

The older generic `e2e/track-b-live.spec.ts` can click Download and Apply when a live base URL is supplied, but it does not close run-81 evidence: it has no dismiss branch, no run-81 rebuilt-SEA/track receipt, and no durable run-81 browser evidence.

### E. Confirm run 80 is API-live predecessor evidence, not browser substitution

Read:

- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json`

Run 80 proved API-driven download/apply/dismiss against a freshly rebuilt SEA on `--track=dev`. Its Phase 5 explicitly records browser UI evidence as optional and unexercised. Therefore it is valid predecessor trust evidence but cannot satisfy run-81 `R7`–`R9`.

## AS-IS Surfaces

### Private Knowledge Worker

`extensions/knowledge-worker/index.mjs` currently has one hard-off authority:

- class-level `static productionActivation = false`
- `activate()` always throws `production activation prohibited in v1.1`
- `health()` always returns `productionActivation: false`
- `run({ capability: "knowledge:activate" })` reaches the same throwing method and accepts no policy input
- `run({ capability: "knowledge:rollback" })` only clears candidates and returns `{ rolledBack: true }`
- each derived candidate is forced to `state: "shadow"` and `productionPromptInjection: false`

Useful pre-existing policy ingredients exist, but they are derivation guards rather than activation policy:

- `KnowledgeEvidenceAuthority` signs and verifies HMAC receipts
- `derive()` requires a `knowledge_validation` receipt
- receipt claims require review, safety review, redaction, and holdout pass
- evidence groups require provenance and positive/negative examples
- training, holdout, replay, and eval sets must be non-empty and disjoint
- generic and prompt-injection-like tips are rejected

No current code promotes those validated shadow candidates into production activation.

### TB10 Authority

`tests/track-b/tb10.test.mjs` is the current regression authority:

- `TB10-TEST-REGRESSION never activates production` asserts the throw
- `TB10-TEST-MUTATION activation guard is immutable` asserts static false
- `TB10-TEST-INTEGRATION derives shadow candidates` confirms shadow state
- `TB10-TEST-ROLLBACK discards derived candidates` confirms candidate clearing
- review tests verify receipt integrity, disjoint evidence, provenance, and prohibited-tip rejection

The test suite has no valid-policy activation success, active health, double-activate, disable-after-activate reconciliation, or rollback-from-active case.

### Route-package and Adjacent Attribution

Route-package data is currently an attribution/scope dimension, not an activation authority:

- KW candidate scope may contain `routePackage`
- Profile Learner estimates keep `routePackage` as an attribution dimension
- Profile Learner has its own shadow candidate field `productionActivation: false` and health hard-off
- no shared mutable route-package activation flag or paired `knowledge:activate` surface was found in private scripts or the public router

Phase 1 therefore resolves `U2` as **independent**: route-package attribution does not share KW activation state. `R3` must preserve explicit non-implication, while unlocking Profile Learner or other package flags remains `OOS12`.

### Public Extensions UI

`role-model-router/apps/runtime-ui/app/routes/extensions.tsx` currently:

- fetches recommendations and active pack on load
- calls existing download/apply/dismiss API helpers
- displays signature-valid and policy-allowed state
- disables apply for invalid, policy-blocked, applied, dismissed, or non-`preview_and_apply` rows
- disables dismiss for applied/dismissed rows
- keeps Set mode and recommendation controls visually and behaviorally separate
- states that KW production activation remains locked/hard-off

There is no KW activation control. Public source search finds no `knowledge:activate`, `knowledge:rollback`, or truthful dynamic `productionActivation` field beyond static hard-off copy.

### Browser Automation

The run-79 SP4 Playwright spec is a live-base-URL smoke test for mutation plus opportunistic dismiss. It does not download recommendations and does not apply them. Because it skips without `RUNTIME_LIVE_BASE_URL`, ordinary local/CI runs can remain green without exercising a packaged runtime.

The generic `track-b-live.spec.ts` contains a Download → Apply UI path, also skipped without `RUNTIME_LIVE_BASE_URL`. It is broad run-00-style QA, does not exercise dismiss, and has no run-81 correlation to:

- a freshly rebuilt SEA hash
- `--track=dev`
- channel `development`
- recommendation ids
- screenshots/traces under the run-81 evidence tree

No current Playwright artifact closes the complete run-81 Download → preview → Apply and Download → preview → Dismiss requirement.

### Run-80 Predecessor

Run 80 closed the live recommendation API lifecycle on a rebuilt SEA:

- authentic permanent-dev material
- channel `development`
- API download/validate/import
- API apply and active-pack
- reseed then API dismiss
- secret-free binder and rebuild receipt

Run 80 deliberately left browser UI live evidence optional. Its API evidence remains useful for trust and seeding mechanics but is non-substituting for run-81 browser UI acceptance.

## Current Behavior by Requirement

### `R1` Explicit KW activation policy

- **Today:** immutable static false; `activate()` has no arguments and always throws. Derivation has strong signed-receipt and evidence guards, but there is no versioned activation policy contract or transition.
- **Gap:** all gated policy behavior, stable policy-refusal contract, and independence regressions for Set mode and recommendation actions.

### `R2` Successful gated activation

- **Today:** no successful path exists. Health is always false and all candidates force production prompt injection false.
- **Gap:** valid-policy success semantics, observable active state, idempotence/already-active decision, and safety-filtered post-activation behavior.

### `R3` Rollback and fail-closed matrix

- **Today:** no-policy activation refuses; rollback clears shadow candidates. There is no active state to roll back from. Route-package attribution is independent and has no shared activation flag.
- **Gap:** the full named transition matrix, especially tampered policy, double activation, active rollback, inactive rollback semantics, and disable-after-active reconciliation.

### `R4` Public/host/UI honesty

- **Today:** UI correctly separates Set mode and recommendation controls, but its permanent hard-off wording matches only the current stub. No public activation control or dynamic activation status exists.
- **Gap:** copy/status must become truthful if gated activation lands; packaged-accessible health visibility remains absent. Whether the UI gains controls is not decided by Phase 1.

### `R5` Packaged-runtime activation verification

- **Today:** private TB10 proves the hard-off source baseline. Public packaged activation probe/API is absent.
- **Gap:** run-81 fresh private distribution/public SEA evidence for default-off, refusal, and gated success through the actual surface selected later.

### `R6` Additive server-side support if required

- **Today:** KW activation is private/local and accepts no remote attestation. No public/server activation endpoint or server attestation contract exists. Existing recommendation server APIs are sufficient for run-80 API lifecycle.
- **Gap:** `serverChange: required | not-required` cannot be finalized until the activation policy authority is selected. No AS-IS evidence requires server churn for browser recommendation UI alone.

### `R7` Browser UI live download and preview

- **Today:** UI control and preview rows exist; offline tests exist; run 80 proved API download. The run-79 SP4 live spec does not click download.
- **Gap:** mandatory browser-driven download/preview on a fresh SEA bound to live `--track=dev`, with ids, hash, screenshots/trace, and no silent skip.

### `R8` Browser UI live apply

- **Today:** UI apply control and generic live Playwright path exist; run 80 proved API apply.
- **Gap:** no run-81 browser apply evidence correlated to fresh SEA hash, dev host/channel, and recommendation id; no explicit assertion that apply leaves KW inactive.

### `R9` Browser UI live dismiss

- **Today:** UI dismiss exists. Run-79 SP4 dismisses only if a row already exists and accepts no-row as success; run 80 proved API dismiss.
- **Gap:** no browser-driven download/reseed → dismiss evidence on the rebuilt dev-bound SEA, no UI terminal/idempotence evidence, and no explicit KW non-activation assertion.

### `R10` Recommendation trust and opt-out regressions

- **Today:** run-80 trust, channel, policy, signature, dismiss/apply terminal states, and opt-out independence are established; Phase 0 public operations baseline is green.
- **Gap:** run-81 must preserve and re-verify these while adding browser evidence; existing predecessor proof does not automatically verify future deltas.

### `R11` Strict TDD

- **Today:** locked requirements mandate strict mode, but no run-81 RED/GREEN/REFACTOR evidence exists because implementation has not begun.
- **Gap:** every later product/harness change needs requirement-linked RED and GREEN evidence; live browser evidence remains a separate mandatory layer.

### `R12` Rebuilt packaged-runtime gate

- **Today:** run 80 has a historical fresh SEA receipt and reusable launch/seed helpers. Run 81 has baseline installs/tests only.
- **Gap:** no post-change run-81 rebuild receipt, SEA hash, current private Track B distribution note, live start URL, or browser execution against that artifact.

### `R13` Evidence binder

- **Today:** Phase 0 baseline logs exist. No run-81 `binder.json`, activation-policy summary, browser screenshots/traces, or rebuild receipt exists.
- **Gap:** all machine-checkable closeout fields remain open.

### `R14` Dual-repo paired delivery

- **Today:** paired run folders/worktrees, matching branch name, run id, and locked Phase 0 artifacts exist. Work remains isolated from parent `dev`.
- **Gap:** no paired product/harness delivery or final pin/merge-readiness evidence exists; no stage/main promotion is authorized.

## Known Unknowns

### `U1` Exact activation policy inputs — partially resolved; true design unknown remains

Phase 1 identifies reusable machine authorities already present:

- verified `knowledge_validation` receipt
- receipt-bound evidence-group digest
- reviewed, safety-reviewed, redacted, holdout-passed claims
- complete provenance
- disjoint training/holdout/replay/eval sets
- prohibited generic/prompt-injection tip checks

These are facts and likely policy inputs, not a complete activation schema. Still unresolved for later design: policy version, operator attestation, extension enabled/installed prerequisite, channel restriction, receipt freshness/replay handling, candidate selection, unknown-field behavior, and idempotence. Phase 1 does not choose them.

### `U2` Route-package coupling — resolved

Route-package is an attribution/scope dimension. No shared KW/route-package activation authority exists. Profile Learner and other shadow flags remain independent and `OOS12`. Required carry-forward: KW activation must not imply route-package/Profile Learner activation, and route-package attribution must not satisfy KW policy.

### `U3` Server attestation requirement — unresolved, bounded

Current KW activation is private/local; no server attestation or public activation API exists. Browser recommendation completion does not itself require a new server contract because run 80 already proved the live dev API lifecycle. Whether activation needs server authorization remains a genuine policy-authority choice. Per `FD9`, no server change is justified until a later locked design proves a local policy cannot satisfy an acceptance criterion.

### `U4` Exact Playwright entry — resolved at the AS-IS level

The closest existing targeted entry is:

`role-model-router/apps/runtime-ui/e2e/recursive-79-extension-control-and-recommendations-qa.sp4.spec.ts`

It uses `RUNTIME_LIVE_BASE_URL` and the Extensions route, but lacks download/apply and treats dismiss as optional. `track-b-live.spec.ts` supplies a reusable Download → Apply selector sequence but lacks dismiss and run-81 evidence correlation. The exact run-81 spec filename/composition is a later planning choice; the route, env entry, and missing behaviors are now known.

### `U5` Stage browser evidence — resolved

No `--track=stage` browser evidence is present or required for run-81 PASS. Stage remains optional additive evidence only and cannot replace mandatory `--track=dev`.

## Relevant Code Pointers

Private controller worktree (`D:/DEV/.wt/81-kw`):

- `extensions/knowledge-worker/index.mjs` — hard-off static, derivation guards, activation throw, rollback, health
- `extensions/profile-learner/index.mjs` — independent shadow `productionActivation: false`
- `tests/track-b/tb10.test.mjs` — current activation guard and evidence-safety authority
- `scripts/track-b/launch-packaged-runtime.mjs` — reusable packaged runtime launch surface from run 80
- `scripts/track-b/run80-recommendation-bindings.mjs` — dev/stage channel binding and production refusal
- `scripts/track-b/run80-seed-signed-recommendations.mjs` — reusable permanent-dev material seed
- `scripts/track-b/run80-live-recommendation-lifecycle.mjs` — predecessor API lifecycle, not browser UI
- `docs/testing.md` / `docs/cloudflare-cloud-path.md` — operator track rules
- `/.recursive/DECISIONS.md` — dedicated KW policy/lifecycle follow-up and optional run-80 browser residual

Public implementation worktree:

- `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` — recommendation controls, preview, hard-off copy, Set-mode separation
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` — UI download/apply/dismiss helpers
- `role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` — offline UI coverage
- `role-model-router/apps/runtime-ui/e2e/recursive-79-extension-control-and-recommendations-qa.sp4.spec.ts` — mutate + optional dismiss live smoke
- `role-model-router/apps/runtime-ui/e2e/track-b-live.spec.ts` — generic live Download → Apply path, no dismiss/run-81 binder
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — existing recommendation HTTP routes and env binding
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` — import/apply/dismiss authority
- `role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts` — offline recommendation contract baseline

## Evidence

- Phase 0 private TB10 baseline: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/baseline-private-tb10.log`
- Phase 0 public operations baseline: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/baseline-public-ops.log`
- Phase 0 public UI baseline: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/baseline-public-extensions-ui.log`
- Run-80 live API predecessor: `/.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json`
- Run-80 QA statement that browser UI was optional/unexercised: `/.recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md`

## Effective Inputs Re-read

- Locked `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- Locked `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, and current Direct Track B memory
- Relevant run-80 AS-IS and final QA
- No Phase 0 or Phase 1 addenda are present

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: "Unlock is gated, not ambient." | Summary: explicit, testable KW activation policy. | AS-IS Owner: private KW + TB10.
- `R2` | Disposition: `in-scope` | Source Quote: "When policy inputs are satisfied, activation may succeed and is observable." | Summary: gated success and active health/injection boundary. | AS-IS Owner: private KW.
- `R3` | Disposition: `in-scope` | Source Quote: "Activation must be reversible and must refuse unsafe transitions." | Summary: rollback and fail-closed transition matrix. | AS-IS Owner: private KW + TB10.
- `R4` | Disposition: `in-scope` | Source Quote: "Any public host or UI surfaces that mention KW activation must reflect the new policy honestly and must not equate enablement with activation." | Summary: public/host/UI activation honesty. | AS-IS Owner: public Extensions UI + host health.
- `R5` | Disposition: `in-scope` | Source Quote: "Prove activation default-off and gated success/refusal on a freshly rebuilt packaged public runtime (and private Track B distribution when private KW packaging inputs change)." | Summary: packaged activation verification. | AS-IS Owner: private distribution + public SEA.
- `R6` | Disposition: `in-scope` | Source Quote: "If Phase 1/2 determines activation policy or browser recommendation binding needs server/worker/contract changes, land the minimum additive server-side support." | Summary: server change only if demonstrated necessary. | AS-IS Owner: policy boundary + existing server contracts.
- `R7` | Disposition: `in-scope` | Source Quote: "Browser UI live recommendation download + preview" | Summary: browser live download/preview. | AS-IS Owner: public UI/Playwright + private live harness.
- `R8` | Disposition: `in-scope` | Source Quote: "Browser UI live recommendation apply" | Summary: browser live apply. | AS-IS Owner: public UI/Playwright.
- `R9` | Disposition: `in-scope` | Source Quote: "From rebuilt SEA UI, dismiss a non-applied recommendation without applying it." | Summary: browser live dismiss. | AS-IS Owner: public UI/Playwright + reseed support.
- `R10` | Disposition: `in-scope` | Source Quote: "Browser work and any host fixes must not regress run-80 trust/opt-out guarantees." | Summary: preserve trust and opt-out independence. | AS-IS Owner: public host tests + run-80 evidence.
- `R11` | Disposition: `quality-gate` | Source Quote: "Phase 3 uses `TDD Mode: strict`." | Summary: RED/GREEN/REFACTOR for all later deltas. | AS-IS Owner: later implementation evidence.
- `R12` | Disposition: `quality-gate` | Source Quote: "Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime (and private Track B distribution when private packages/sidecar inputs change)." | Summary: stale binaries fail. | AS-IS Owner: packaging/launch evidence.
- `R13` | Disposition: `quality-gate` | Source Quote: "Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R12` without chat context." | Summary: machine-checkable binder. | AS-IS Owner: run evidence tree.
- `R14` | Disposition: `in-scope` | Source Quote: "Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories." | Summary: paired dual-repo delivery without auto-promotion. | AS-IS Owner: both worktrees + closeout.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md` — predecessor API/live gaps and hard-off KW baseline
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md` — live dev API lifecycle PASS; browser UI explicitly unexercised/optional
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json` — predecessor rebuilt SEA/API evidence
- `/.recursive/memory/domains/direct-track-b.md` — current run-79/run-80 product truth and non-implication rule
- `/.recursive/DECISIONS.md` — dedicated KW policy/lifecycle follow-up and browser live residual
- No unrelated runs 01–78 were reread because they do not govern this KW activation plus run-80 browser-residual scope.

## Earlier Phase Reconciliation

- `00-requirements.md`: every `R1`–`R14` has an AS-IS statement and source inventory entry.
- Unknowns: `U2`, `U4`, and `U5` are resolved at Phase 1; `U1` is bounded but exact schema remains open; `U3` remains conditional on the later policy authority.
- `00-worktree.md`: private/public paths, branches, baselines, and normalized diff commands are reused exactly.
- No addenda alter the locked effective inputs.

## Worktree Diff Audit

### Private controller

- Baseline type: `local commit`
- Baseline reference: `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef`
- Comparison reference: `working-tree`
- Normalized baseline: `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only cf3da6bb4f93c86adae562c6fbaa4903066bf2ef`
- Base branch: `origin/dev`
- Worktree branch: `recursive/81-kw-activation-browser-recommendation-evidence`
- Planned or claimed changed files:
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
- Actual changed files reviewed:
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/**`
  - `.recursive/run/81-kw-activation-browser-recommendation-evidence/locks/**`
- Unexplained drift: none; all private drift is Phase 0/1 control-plane and baseline evidence. No product implementation is present or claimed.

### Paired public implementation

- Baseline type: `local commit`
- Baseline reference: `9a94a5a187974941045dda732bfc8d2ba6eac327`
- Comparison reference: `working-tree`
- Normalized baseline: `9a94a5a187974941045dda732bfc8d2ba6eac327`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 9a94a5a187974941045dda732bfc8d2ba6eac327`
- Worktree branch: `recursive/81-kw-activation-browser-recommendation-evidence`
- Actual changed files reviewed: untracked mirrored run-81 control-plane folder only
- Unexplained drift: none; no public product implementation is present or claimed.

## Phase-Scoped Diff Ownership

Phase 1 owns this AS-IS document only. It does not own product code, tests, harness changes, cloud changes, rebuilt binaries, or final evidence binders.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: unavailable
Subagent Capability Probe: this drafting task is already executing as a bounded subagent under a parent controller; nested subagent spawning is prohibited for this task
Delegation Decision Basis: performed the required audit locally against the locked requirements/worktree artifacts, exact paired baselines, current private/public source files, baseline logs, and relevant run-80 evidence
Audit Inputs Provided:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- private normalized diff basis `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef` → `working-tree`
- public normalized diff basis `9a94a5a187974941045dda732bfc8d2ba6eac327` → `working-tree`
- changed file: `.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
- targeted private code: `extensions/knowledge-worker/index.mjs`, `extensions/profile-learner/index.mjs`, `tests/track-b/tb10.test.mjs`
- targeted public code: `extensions.tsx`, run-79 SP4 Playwright spec, `track-b-live.spec.ts`, host recommendation operations/tests
- prior evidence: run-80 AS-IS, Phase 5, binder, Direct Track B memory, STATE, DECISIONS

## Gaps Found

- None blocking Phase 1 completeness or audit.
- The pre-change product state and later-phase acceptance work are documented under `## Current Behavior by Requirement`, `## Known Unknowns`, and `## Requirement Completion Status`.

## Repair Work Performed

- Distinguished derivation receipt guards from a nonexistent activation policy so AS-IS does not claim a policy already exists.
- Distinguished generic `track-b-live.spec.ts` Download → Apply coverage from the targeted run-79 mutate/optional-dismiss spec and from missing run-81 evidence.
- Resolved route-package coupling as independent after checking KW scope, Profile Learner attribution, private scripts, and public router surfaces.

## Requirement Completion Status

- `R1 | Status: blocked | Rationale: immutable hard-off exists; no explicit activation policy or transition contract exists. | Blocking Evidence: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs`
- `R2 | Status: blocked | Rationale: activate always throws and health always reports false; no valid-policy success path exists. | Blocking Evidence: extensions/knowledge-worker/index.mjs`
- `R3 | Status: blocked | Rationale: only no-policy refusal and candidate clearing exist; active rollback and the required transition matrix do not. | Blocking Evidence: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs`
- `R4 | Status: blocked | Rationale: public copy truthfully says hard-off today but no dynamic activation status/control exists for the gated future state. | Blocking Evidence: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/app/routes/extensions.tsx`
- `R5 | Status: blocked | Rationale: no run-81 fresh packaged activation refusal/success evidence exists. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `R6 | Status: blocked | Rationale: serverChange decision depends on the unresolved activation policy authority; no current browser recommendation gap requires server churn. | Blocking Evidence: extensions/knowledge-worker/index.mjs, .recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `R7 | Status: blocked | Rationale: UI/download surface exists but no run-81 live dev browser download/preview evidence exists. | Blocking Evidence: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/e2e/recursive-79-extension-control-and-recommendations-qa.sp4.spec.ts, .recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md`
- `R8 | Status: blocked | Rationale: generic live apply code and run-80 API apply do not provide run-81 rebuilt-SEA browser evidence or KW non-activation assertion. | Blocking Evidence: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/e2e/track-b-live.spec.ts, .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json`
- `R9 | Status: blocked | Rationale: targeted dismiss is opportunistic and accepts missing rows; no browser download/reseed/dismiss evidence exists. | Blocking Evidence: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/e2e/recursive-79-extension-control-and-recommendations-qa.sp4.spec.ts`
- `R10 | Status: blocked | Rationale: predecessor trust/opt-out behavior is green, but run-81 deltas and final regressions do not exist yet. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/baseline-public-ops.log`
- `R11 | Status: blocked | Rationale: strict mode is required but no Phase 3 RED/GREEN/REFACTOR evidence exists. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `R12 | Status: blocked | Rationale: no post-change run-81 rebuild receipt, SEA hash, or live browser target exists. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `R13 | Status: blocked | Rationale: baseline logs exist but the required run-81 binder and browser/rebuild evidence do not. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/`
- `R14 | Status: blocked | Rationale: paired worktrees/run folders exist, but paired product delivery and closeout remain future work. | Blocking Evidence: .recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`

## Audit Verdict

- Audit summary: AS-IS confirms KW is an immutable hard-off stub guarded by TB10, route-package attribution is independent, public recommendation controls exist, run 80 proved API—not browser—live lifecycle, and existing Playwright does not supply complete run-81 rebuilt-SEA dev browser evidence.
- Follow-up required before Phase 1 lock: none.
- Audit: PASS

## Subagent Contribution Verification

- Reviewed Action Records: none; no nested delegated contribution was used
- Main-Agent Verification Performed: self-audit re-read locked Phase 0 artifacts, current private/public code, exact diff bases, baseline logs, Direct Track B memory, DECISIONS/STATE, and run-80 AS-IS/QA evidence
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: clarified `U1`/`U3` as bounded true unknowns and `U2`/`U4`/`U5` as Phase 1 findings

## Traceability

- `R1` → Private KW policy AS-IS and unknown resolution | Evidence: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs`
- `R2` → Private KW successful-activation absence | Evidence: `extensions/knowledge-worker/index.mjs`
- `R3` → Private KW rollback/matrix AS-IS | Evidence: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs`
- `R4` → Public UI honesty AS-IS | Evidence: public `extensions.tsx`
- `R5` → Packaged activation gap | Evidence: locked requirements + absent run-81 rebuild receipt
- `R6` → Current local-only activation boundary and conditional `U3` | Evidence: KW source; no public activation route
- `R7` → UI download/preview exists, targeted live browser gap | Evidence: `extensions.tsx`, run-79 SP4 spec
- `R8` → UI apply exists, generic live path is non-substituting | Evidence: `track-b-live.spec.ts`, run-80 binder
- `R9` → UI dismiss exists but targeted spec is opportunistic | Evidence: run-79 SP4 spec
- `R10` → Predecessor trust/opt-out baseline | Evidence: baseline public operations log + run-80 binder
- `R11` → strict TDD process gap | Evidence: locked requirements; no Phase 3 evidence
- `R12` → fresh rebuild gap | Evidence: locked requirements; run-80 receipt historical only
- `R13` → binder gap | Evidence: Phase 0 baseline logs only
- `R14` → paired worktree setup present, delivery incomplete | Evidence: locked `00-worktree.md`

## Coverage Gate

- Effective inputs reviewed:
  - locked `00-requirements.md`
  - locked `00-worktree.md`
  - current KW/TB10 and public UI/Playwright surfaces
  - current STATE/DECISIONS/domain memory
  - run-80 AS-IS, QA, and binder predecessor evidence
- Requirement coverage check:
  - `R1`–`R14`: each has current behavior, gap, source inventory, completion status, and traceability
- Unknown coverage check:
  - `U1`: partially resolved; exact schema remains explicit
  - `U2`: resolved independent
  - `U3`: explicit conditional unknown
  - `U4`: current entry/surface resolved; later spec composition not invented
  - `U5`: resolved optional, not required
- Out-of-scope confirmation:
  - `OOS1`–`OOS12` unchanged
- No Phase 2/3 design or implementation is claimed.

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - novice-runnable reproduction steps present
  - all AS-IS surfaces and per-requirement gaps documented
  - full paths and paired baselines recorded
  - run-80 API evidence distinguished from mandatory browser UI evidence
  - true unknowns remain explicit without invented design
  - worktree diff contains no unexplained product implementation
- Remaining blockers:
  - none for Phase 1 AS-IS approval

Approval: PASS

## Audit

Audit: PASS
