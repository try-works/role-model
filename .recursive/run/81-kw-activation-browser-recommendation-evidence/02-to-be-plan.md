Run: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-24T20:32:39Z`
LockHash: `71e856754d9a32995348d26ac7abd5fb4a50ddc8e945c0ae282c013fb1fb8dfb`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/direct-track-b.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md` (style reference)
Outputs:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`
Scope note: ExecPlan-grade TO-BE plan for a fail-closed, instance-local Knowledge Worker activation policy and rollback lifecycle plus mandatory browser-driven signed-recommendation Download → preview → Apply and Download → preview → Dismiss evidence on a freshly rebuilt public SEA bound to live Cloudflare `--track=dev`. This phase changes planning/control-plane files only; it does not implement product code.

## TODO

- [x] Read locked `00-requirements.md`, `00-worktree.md`, and `01-as-is.md`
- [x] Read run-80 Phase 2 style reference and relevant current state, decisions, and memory
- [x] Resolve `U1` to a normative version-1 activation policy
- [x] Resolve `U2` as KW-only with route-package/Profile Learner flags unchanged
- [x] Resolve `U3` as `serverChange: not-required`
- [x] Fix the run-81 Playwright filename, live base URL, seed scope, and rebuilt-SEA evidence shape
- [x] Define strict-TDD sub-phases with concrete files, tests, commands, acceptance, and recovery
- [x] Evolve TB10 without deleting default-off regression coverage
- [x] Define Extensions UI honesty copy/testing without adding an activation control
- [x] Map `R1`–`R14` to implementation, verification, and QA surfaces
- [x] Define manual QA, idempotence, rebuilt-runtime gate, and evidence binder paths
- [x] Complete plan drift check, self-audit, Coverage, Approval, and Audit PASS

## Fixed Design Decisions

These decisions resolve the remaining Phase 1 unknowns and are normative for Phase 3.

### `U1` — Activation policy schema version 1

The only accepted version-1 policy shape is:

```json
{
  "activationPolicyVersion": 1,
  "operatorAttestation": "activate-production",
  "receipt": { /* verified KnowledgeEvidenceAuthority knowledge_validation receipt */ }
}
```

Normative behavior:

1. `KnowledgeWorker.static productionActivation` remains `false`. It continues to advertise that ungated/class-wide always-on activation is unavailable. Phase 3 must not turn it into a mutable class default.
2. Each `KnowledgeWorker` instance gains private instance state `#productionActivation`, initialized to `false`. Only a successful `activate(policy)` transition may set it to `true`.
3. `activate(policy)` succeeds only when all of these checks pass:
   - `policy` is present and is an object;
   - `policy.activationPolicyVersion === 1`;
   - `policy.operatorAttestation === "activate-production"`;
   - the instance's `KnowledgeEvidenceAuthority.verify(policy.receipt)` succeeds;
   - the verified receipt has `kind === "knowledge_validation"`;
   - the verified receipt claims have `holdoutPassed === true`, `reviewed === true`, `safetyReviewed === true`, and `redacted === true`;
   - at least one shadow candidate already exists on that same instance.
4. Version 1 rejects unknown top-level policy fields. A future additive field must be introduced under a new policy version or an approved compatible-schema addendum; unsigned convenience semantics are not inferred.
5. Missing, malformed, unsupported-version, wrongly attested, tampered, wrong-kind, incomplete-claim, or candidate-empty policy attempts fail closed. Their thrown error messages must match `/refused|prohibited/i`; state and candidates remain unchanged.
6. A valid `activate(policy)` returns a success object containing `productionActivation: true`. Calling it again while active is idempotent and returns success with `productionActivation: true`; it still validates the supplied policy and candidate preconditions so missing/invalid policy never becomes an active-state bypass.
7. `rollback()` clears all candidates and sets instance `#productionActivation` to `false`. It is non-destructive and successful when already inactive.
8. `health().productionActivation` reports the instance state, not the static class default.
9. `run({ capability: "knowledge:activate", policy })` passes the envelope's `policy` unchanged to `activate(policy)`. `knowledge:rollback` reaches the same rollback transition.
10. Extension enablement/Set mode and recommendation apply/dismiss do not call `activate`, do not manufacture a policy, and do not mutate the KW instance activation flag.
11. Derived candidates remain `state: "shadow"` and `productionPromptInjection: false`. Successful activation in run 81 sets only the activation readiness flag; it does not rewrite candidates and does not automatically inject prompts. Wiring safety-filtered production prompt injection is intentionally outside this run.

The selected state machine is:

```text
new instance
  -> #productionActivation=false
  -> derive(valid knowledge_validation receipt) creates >=1 shadow candidate
  -> activate(valid v1 policy over verified receipt) sets flag true
  -> activate(valid v1 policy) again returns idempotent true
  -> rollback() clears candidates and sets flag false

Any invalid/missing policy at any point:
  -> throw refused/prohibited
  -> preserve existing state
```

An extension disabled at the host boundary cannot receive capability dispatch. Disabling/stopping an active instance makes that instance unavailable rather than claiming it is still usable; a newly constructed/re-enabled instance starts inactive. This keeps host enablement and local activation independent without adding a shared persistence flag.

### `U2` — Route-package and Profile Learner independence

The run changes only `extensions/knowledge-worker/index.mjs` activation state. Route-package remains candidate attribution/scope data and does not satisfy or inherit KW activation. `extensions/profile-learner/index.mjs` and every other package-level `productionActivation` flag remain unchanged under `OOS12`.

### `U3` — Server decision

`serverChange: not-required`.

Activation authority is local to the KW instance and its existing `KnowledgeEvidenceAuthority`; it needs no Cloudflare attestation endpoint. Browser recommendation evidence uses the existing permanent-dev recommendation workers, existing public download/apply/dismiss APIs, and run-80 seed/lifecycle/binding helpers. No worker, server-return schema, host-bridge route, or new public activation endpoint is planned.

If Phase 3 discovers a server change is actually necessary, implementation must stop and author an approved upstream-gap addendum; it must not silently expand this plan.

### Browser recommendation evidence

1. Add public Playwright spec `role-model-router/apps/runtime-ui/e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts`.
2. The spec requires `RUNTIME_LIVE_BASE_URL` and targets the Extensions route served by the freshly rebuilt packaged SEA. The mandatory evidence command must fail rather than silently skip when that variable is absent.
3. Seed authentic signed material through private `scripts/track-b/run80-seed-signed-recommendations.mjs` with Windows-safe scope `run81-dev`. Add a run-81 successor helper only if a RED test proves the existing parameterized helper cannot produce deterministic independent apply/dismiss candidates.
4. Cover two browser flows:
   - Download & validate latest → visible validated preview row → Validate & apply → applied/active-pack UI state.
   - Reseed/download a distinct non-applied row → visible preview → Dismiss → dismissed state and unavailable apply control.
5. Correlate screenshots/traces with SEA hash, `track=dev`, `channel=development`, host, scope `run81-dev`, and recommendation ids. Run-80 API evidence is predecessor evidence only.
6. Recommendation apply/dismiss must not invoke KW activation. Because KW activation has no public UI control in this run, this non-implication is proven by code path review plus private KW/default-off tests, not by inventing a browser activation endpoint.

### UI honesty

Update `extensions.tsx` copy from permanent hard-off wording to wording equivalent to:

> Knowledge Worker production activation is fail-closed by default and requires a separate verified policy plus operator attestation. Set mode and recommendation actions do not activate it.

Update `extensions.test.tsx` to assert the new fail-closed/gated wording and the distinction from Set mode/recommendation actions. No activation button, toggle, or new host API is required: truthful copy plus the private `health().productionActivation` and capability API satisfy `R4`.

### TB10 evolution

Preserve and evolve the named authority tests:

- `TB10-TEST-REGRESSION`: activation without a policy still throws; the message may change from `prohibited in v1.1` but must match `/refused|prohibited/i`.
- `TB10-TEST-MUTATION`: a new instance reports `health().productionActivation === false`, while `KnowledgeWorker.productionActivation === false` remains the ungated/class-default guard.
- GREEN additive tests:
  - valid version-1 policy + verified receipt + at least one shadow candidate activates successfully;
  - repeated valid activation is idempotent and remains true;
  - rollback clears candidates and returns health to false;
  - bad/tampered receipt refuses and preserves inactive state;
  - wrong version, wrong attestation, wrong receipt kind/claims, and no candidates refuse;
  - `knowledge:activate` forwards the envelope policy;
  - derived candidates retain `productionPromptInjection: false` before and after activation.

## Planned Changes by File

### File ownership table

| Repository / owner | File | Planned change |
|---|---|---|
| Private KW product | `extensions/knowledge-worker/index.mjs` | Add instance-private activation state, strict v1 policy validation, verified-receipt claim checks, idempotent activate, rollback reset, truthful health, and capability policy forwarding; retain static false and shadow/no-injection behavior. |
| Private KW tests | `tests/track-b/tb10.test.mjs` | RED-first TB10 evolution and new success/refusal/idempotence/rollback/capability/no-injection cases. |
| Private packaged probe | `scripts/track-b/run81-kw-activation-probe.mjs` (new) | Load the current staged Track B KW distribution, execute default/refusal/valid-policy/rollback capability probes, and emit secret-free JSON evidence. |
| Private packaged probe tests | `tests/track-b/run81-kw-activation-probe.test.mjs` (new) | RED-first contract for staged-module selection, policy forwarding, result schema, and fail-closed missing distribution/policy behavior. |
| Private live seed | `scripts/track-b/run80-seed-signed-recommendations.mjs` | Reuse unchanged with `--track=dev --scope run81-dev`; change only if a RED portability/determinism test proves a run-81 successor is necessary. |
| Private launch/bind | `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/run80-recommendation-bindings.mjs` | Reuse unchanged for public-root, dev/development binding, and production refusal. |
| Public UI product | `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Replace hard-off copy with fail-closed default + separately gated activation wording; retain separation from Set mode and recommendation controls. |
| Public UI tests | `role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` | RED-first assertions for truthful gated-activation copy and non-implication. |
| Public browser evidence | `role-model-router/apps/runtime-ui/e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts` (new) | Mandatory live Download → preview → Apply and reseed/Download → preview → Dismiss against `RUNTIME_LIVE_BASE_URL`, with durable screenshots/traces and no absent-base silent PASS. |
| Public host/server | `role-model-router/apps/runtime-host-bridge/**`, `cloud/**` | No changes planned (`serverChange: not-required`); existing recommendation APIs/workers remain authority. |
| Run evidence | `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/**` | Later phases write strict RED/GREEN/REFACTOR logs, rebuild/probe/browser receipts, screenshots, traces, and `binder.json`. |
| Later control plane | `/.recursive/DECISIONS.md`, `/.recursive/STATE.md`, `/.recursive/memory/domains/direct-track-b.md` | Phase 6/7/8 only: close dedicated KW lifecycle and browser residual after verification; do not edit in Phase 3. |

Public implementation root: `D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence`.

Private/controller root: `D:/DEV/.wt/81-kw`.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "Unlock is gated, not ambient." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: TB10 RED/GREEN logs and activation policy receipt | QA Surface: M1, M2, M6
- `R2` | Coverage: direct | Source Quote: "When policy inputs are satisfied, activation may succeed and is observable." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: TB10 valid-policy/idempotence/health tests and packaged probe | QA Surface: M2
- `R3` | Coverage: direct | Source Quote: "Activation must be reversible and must refuse unsafe transitions." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: named refusal/rollback matrix logs | QA Surface: M3
- `R4` | Coverage: direct | Source Quote: "Any public host or UI surfaces that mention KW activation must reflect the new policy honestly and must not equate enablement with activation." | Implementation Surface: public `extensions.tsx`, private KW health/capability | Verification Surface: public `extensions.test.tsx`, TB10 health tests | QA Surface: M4
- `R5` | Coverage: direct | Source Quote: "Prove activation default-off and gated success/refusal on a freshly rebuilt packaged public runtime (and private Track B distribution when private KW packaging inputs change)." | Implementation Surface: `scripts/track-b/run81-kw-activation-probe.mjs`, private distribution + public packaging commands | Verification Surface: `evidence/other/kw-packaged-activation-probe.json`, rebuild receipt | QA Surface: M5
- `R6` | Coverage: direct | Source Quote: "If Phase 1/2 determines activation policy or browser recommendation binding needs server/worker/contract changes, land the minimum additive server-side support." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md` (normative not-required decision) | Verification Surface: `evidence/other/server-change-decision.json` plus public/private diff audit | QA Surface: M9
- `R7` | Coverage: direct | Source Quote: "Browser UI live recommendation download + preview" | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`, `scripts/track-b/run80-seed-signed-recommendations.mjs`, `scripts/track-b/launch-packaged-runtime.mjs` | Verification Surface: browser log, screenshot, trace, binder correlation | QA Surface: M7
- `R8` | Coverage: direct | Source Quote: "Browser UI live recommendation apply" | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md` (public spec path fixed under Planned Changes by File) | Verification Surface: applied-state screenshot/trace and active-pack assertion | QA Surface: M7
- `R9` | Coverage: direct | Source Quote: "From rebuilt SEA UI, dismiss a non-applied recommendation without applying it." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`, `scripts/track-b/run80-seed-signed-recommendations.mjs` | Verification Surface: dismissed-state screenshot/trace, disabled apply, idempotent API follow-up if hidden | QA Surface: M8
- `R10` | Coverage: direct | Source Quote: "Browser work and any host fixes must not regress run-80 trust/opt-out guarantees." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`, `/.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json` | Verification Surface: public operations API regression plus run-80 predecessor binder | QA Surface: M10
- `R11` | Coverage: direct | Source Quote: "Phase 3 uses `TDD Mode: strict`." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`, `tests/track-b/tb10.test.mjs` | Verification Surface: `evidence/logs/red/**`, `evidence/logs/green/**`, `evidence/logs/refactor/**` | QA Surface: not-applicable-with-rationale — process gate audited in Phase 3/4
- `R12` | Coverage: direct | Source Quote: "Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime (and private Track B distribution when private packages/sidecar inputs change)." | Implementation Surface: private `scripts/track-b/build-runtime-distribution.mjs`, private `scripts/track-b/launch-packaged-runtime.mjs`, public `package.json` | Verification Surface: `evidence/other/rebuild-receipt.json`, SEA hash and live base URL | QA Surface: M5, M7, M8
- `R13` | Coverage: direct | Source Quote: "Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R12` without chat context." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`, `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/` | Verification Surface: binder schema/path audit and secret scan | QA Surface: M11
- `R14` | Coverage: direct | Source Quote: "Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories." | Implementation Surface: `.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`, `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md` | Verification Surface: paired SHAs/diffs in binder and Phase 6/7 receipts | QA Surface: not-applicable-with-rationale — delivery/process gate

## Implementation Steps

1. **SP1 — KW policy lifecycle:** add failing TB10 policy/health/capability/rollback tests; implement only enough instance-local behavior to make them green; refactor with all TB10 guards green.
2. **SP2 — UI honesty:** add failing `extensions.test.tsx` wording/non-implication assertions; update `extensions.tsx` copy only; keep Set mode/recommendation controls unchanged.
3. **SP3 — Packaged probe and browser spec:** RED-first test the run-81 packaged activation probe; add the probe. Add the run-81 Playwright spec and prove its pre-live RED against predecessor/absent requirements without weakening its mandatory live-base contract.
4. **SP4 — Rebuild and live evidence:** rebuild private Track B distribution and public SEA, start the exact artifact with dev recommendation bindings, seed `run81-dev`, run packaged KW probe and browser Download/Apply/Dismiss spec, capture evidence.
5. **SP5 — Regression and binder:** run broader offline suites, reconcile paired diffs, create secret-free `server-change-decision.json`, activation-policy summary, rebuild/browser receipts, and `binder.json`.

## Testing Strategy

TDD Mode: `strict`.

Every production or harness edit in SP1–SP3 requires:

- RED: a focused failing test/log against predecessor behavior before implementation;
- GREEN: minimum implementation making the focused test pass;
- REFACTOR: focused and adjacent suites still green after cleanup;
- evidence paths under `evidence/logs/{red,green,refactor}/`.

Skipped, quarantined, `.only`, or structurally green-only tests cannot satisfy a gate. The Cloudflare/browser layer is separate from offline GREEN and remains mandatory for `R7`–`R9`.

### Exact private commands

Run from `D:/DEV/.wt/81-kw`:

```powershell
node --test tests/track-b/tb10.test.mjs
node --test tests/track-b/run81-kw-activation-probe.test.mjs
corepack pnpm build:run00-runtime
node scripts/track-b/run81-kw-activation-probe.mjs --distribution-root D:/DEV/.wt/81-kw/dist/run00-dev --evidence-out D:/DEV/.wt/81-kw/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/other/kw-packaged-activation-probe.json
corepack pnpm test:cloud
node --test tests/track-b/*.test.mjs
```

Live seed, only after credentials are available and the rebuilt SEA is ready:

```powershell
node scripts/track-b/run80-seed-signed-recommendations.mjs --track=dev --scope run81-dev
```

The actual helper CLI must be confirmed with `--help` before execution; if its existing parameter spelling differs, record the exact equivalent command in Phase 3/4 without changing the fixed `track=dev` and `scope=run81-dev` decisions.

### Exact public commands

Run from `D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence`:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/extensions.test.tsx
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='D:/DEV/.wt/81-kw/dist/run00-dev'
corepack pnpm runtime:package-sea
corepack pnpm runtime:validate-packaging
$env:RUNTIME_LIVE_BASE_URL='<URL printed by launch-packaged-runtime for the newly built SEA>'
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts --trace on
```

Start the freshly built SEA through private `scripts/track-b/launch-packaged-runtime.mjs` with:

- public root `D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence`;
- `--track=dev`;
- `ROLE_MODEL_RECOMMENDATION_SERVICE_URL` and `ROLE_MODEL_RECOMMENDATION_CHANNEL=development` supplied by the existing run-80 binding helper;
- verification key supplied through the operator environment, never written to evidence;
- `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=D:/DEV/.wt/81-kw/dist/run00-dev`.

Record the exact launch command emitted/accepted by the current helper in the rebuild receipt.

## Playwright Plan (if applicable)

- File: `role-model-router/apps/runtime-ui/e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts`
- Tags: `@recursive:81-kw-activation-browser-recommendation-evidence`, `@sp4`, `@smoke`
- Base: mandatory `RUNTIME_LIVE_BASE_URL` from the new SEA launch
- Track/channel: `dev` / `development`
- Seed scope: `run81-dev`
- Tier A: the single run-81 spec file
- Tier B: relevant existing runtime UI e2e plus public host recommendation API regression

The spec must:

1. Navigate to `/extensions`.
2. Click **Download & validate latest**.
3. Wait for at least one row whose visible state proves signature validity and policy allowance.
4. Save a download/preview screenshot.
5. Apply an eligible row, assert applied status and active-pack indicator when exposed, and save screenshot/trace.
6. Reseed or download a distinct recommendation after resetting only the run-scoped material/state needed for the dismiss branch.
7. Dismiss the non-applied row, assert dismissed state and unavailable apply control, and save screenshot/trace.
8. Record recommendation ids in logs/binder.
9. Never treat no rows, missing base URL, missing trust binding, or a skip as PASS.

Evidence is copied or linked into:

- `evidence/screenshots/browser-dev-download-preview.png`
- `evidence/screenshots/browser-dev-apply.png`
- `evidence/screenshots/browser-dev-dismiss.png`
- `evidence/traces/browser-dev-apply.zip`
- `evidence/traces/browser-dev-dismiss.zip`
- `evidence/logs/browser-dev-playwright.log`

## Evidence Binder Plan

Required paths:

```text
.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/
  binder.json
  logs/
    red/
      sp1-tb10-activation-red.log
      sp2-extensions-copy-red.log
      sp3-packaged-probe-red.log
      sp3-browser-contract-red.log
    green/
      sp1-tb10-activation-green.log
      sp2-extensions-copy-green.log
      sp3-packaged-probe-green.log
    refactor/
      sp1-tb10-refactor.log
      sp2-ui-refactor.log
      sp3-harness-refactor.log
    rebuild-private-run00.log
    rebuild-public-sea.log
    browser-dev-playwright.log
    public-ops-regression.log
    private-track-b-regression.log
  other/
    activation-policy-v1.md
    server-change-decision.json
    kw-packaged-activation-probe.json
    material-probe-dev.json
    rebuild-receipt.json
    browser-dev-receipt.json
  screenshots/
  traces/
```

`binder.json` must include:

- private/public baseline and verification SHAs;
- exact normalized diff bases from `00-worktree.md`;
- `activationPolicyVersion: 1`, operator-attestation name, receipt kind/claim requirements, and explicit no-secrets note;
- explicit `serverChange: "not-required"` and no server changed-files list;
- private distribution path/hash and public SEA path/hash;
- exact rebuild, launch, seed, probe, test, and browser commands with cwd/exit code;
- live host, `track: "dev"`, `channel: "development"`, scope `run81-dev`, and recommendation ids;
- RED/GREEN/REFACTOR, packaged probe, screenshot, and trace paths;
- explicit statements that run-80 API-only evidence was not substituted, ungated always-on activation is not shipped, recommendation actions did not activate KW, and prompt injection remained false/not wired;
- no token, key, private key, raw `.env`, or secret value.

## Manual QA Scenarios

### M1 — New-instance fail-closed default (`R1`, `R3`)

- Steps: construct KW; inspect class static and instance health; call `activate()` without policy.
- Expected: static false; health false; error matches `/refused|prohibited/i`; state unchanged.

### M2 — Valid gated activation and idempotence (`R1`, `R2`)

- Steps: derive at least one shadow candidate using a valid `knowledge_validation` receipt; call activate with exact v1 policy; call again with same valid policy; inspect health/candidates.
- Expected: both calls succeed with `productionActivation: true`; health true; candidate remains shadow with `productionPromptInjection: false`.

### M3 — Invalid policy and rollback matrix (`R3`)

- Steps: exercise bad version, attestation, tampered receipt, wrong kind/claims, no candidates; then activate validly and rollback twice.
- Expected: every invalid case refuses without mutation; rollback clears candidates and health false; second rollback remains non-destructive.

### M4 — Extensions UI honesty (`R4`)

- Steps: open Extensions page; inspect Set mode, recommendation controls, and activation copy.
- Expected: copy says fail-closed default + separate verified policy/operator attestation; no wording implies Set mode/apply activates KW; no activation control is required.

### M5 — Fresh packaging gate (`R5`, `R12`)

- Steps: rebuild private distribution, package/validate public SEA with that distribution, hash artifact, launch it, then run packaged KW probe.
- Expected: all commands exit 0; probe proves default/refusal/success/rollback from staged KW; receipt correlates to current hashes; stale artifact cannot satisfy PASS.

### M6 — Enable/apply non-implication (`R1`, `R4`)

- Steps: run source/contract tests for Set mode and recommendation apply paths plus KW new-instance health.
- Expected: neither path calls `knowledge:activate`; new KW remains false absent explicit policy.

### M7 — Browser download/preview/apply (`R7`, `R8`, `R12`)

- Steps: seed `run81-dev`; use rebuilt SEA Extensions UI to download; inspect validated row; apply; inspect applied/active-pack state.
- Expected: visible signature/policy preview then applied status; id/host/channel/SEA hash captured.

### M8 — Browser download/preview/dismiss (`R9`, `R12`)

- Steps: reseed distinct material; download; inspect non-applied row; dismiss; inspect controls; optionally re-dismiss by API if UI hides terminal control.
- Expected: dismissed state, apply unavailable, idempotent re-dismiss non-destructive; id/host/channel/hash captured.

### M9 — No server change (`R6`)

- Steps: diff public host/worker and private cloud server paths against locked baselines.
- Expected: no server product changes; `server-change-decision.json` says not-required with local-policy/existing-worker rationale.

### M10 — Recommendation trust/opt-out regression (`R10`)

- Steps: run public operations API tests covering signature/channel/policy and contribution opt-out independence.
- Expected: fail-closed trust remains green; opt-out alone does not revoke eligible imports.

### M11 — Evidence audit (`R11`, `R13`, `R14`)

- Steps: validate every binder path, ids/hashes/commands, paired SHAs, and secret exclusions.
- Expected: all referenced paths resolve, all required fields exist, no secrets, run-80 non-substitution explicit, no stage/main promotion.

## Idempotence and Recovery

- Repeated valid activation is idempotent true; repeated invalid activation never gains an active-state bypass.
- Rollback is safe when active or inactive; it always clears candidates and sets instance activation false.
- Derivation remains repeatable shadow work and never injects prompts.
- Run-81 seed uses isolated scope `run81-dev`; reseeding may produce new ids, and evidence records the ids actually used.
- Browser apply and dismiss use distinct recommendation ids. Never dismiss the applied id or call a missing-row branch PASS.
- Failed live trust binding, unavailable credentials, empty material, or missing `RUNTIME_LIVE_BASE_URL` blocks live PASS but does not weaken offline tests.
- Failed rebuild invalidates all later packaged/browser evidence; discard/rebuild and rerun SP4.
- If the existing run-80 seed helper cannot support `run81-dev`, first capture a failing test, then add a minimal run-81 successor preserving dev/stage parameterization and production refusal.
- Product rollback is branch-local: revert SP commits, discard generated SEA/dist artifacts, and do not promote to stage/main.

## Implementation Sub-phases

### `SP1` — KW activation policy and lifecycle (`R1`–`R3`, `R11`)

Scope and purpose:
At completion, KW has a tested instance-local, versioned, verified-receipt activation flag with fail-closed policy checks, idempotence, rollback, truthful health, and no prompt injection.

Implementation checklist:
- [ ] RED in `tests/track-b/tb10.test.mjs` for exact v1 valid success, invalid matrix, idempotence, rollback, capability forwarding, health, and unchanged prompt-injection flags
- [ ] Update `extensions/knowledge-worker/index.mjs` constructor/private state and policy validator
- [ ] Update `activate(policy)`, `rollback()`, `health()`, and `run()` capability dispatch
- [ ] Preserve `static productionActivation = false`, derivation filters, shadow state, and `productionPromptInjection: false`
- [ ] GREEN then refactor; save focused logs

Tests:

```powershell
node --test tests/track-b/tb10.test.mjs
```

Pass criteria: all named old/new TB10 cases pass; no skip; no Profile Learner changes.

Sub-phase acceptance: M1–M3 are observable from the source instance.

Rollback/recovery: revert KW/TB10 together; never leave a success path without the complete validation matrix.

### `SP2` — Public UI honesty (`R4`, `R11`)

Scope and purpose:
At completion, the Extensions page describes fail-closed/gated activation truthfully and keeps activation distinct from Set mode/recommendation actions, with no new activation UI/API.

Implementation checklist:
- [ ] RED in public `extensions.test.tsx` for new policy/attestation/default-off and non-implication wording
- [ ] Update only the relevant copy in public `extensions.tsx`
- [ ] Confirm controls and runtime API calls are unchanged and none call activate
- [ ] GREEN then refactor; save logs

Tests:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/extensions.test.tsx
```

Pass criteria: UI tests pass and assert both truthful activation wording and axis separation.

Sub-phase acceptance: M4 copy is visible without an activation control.

Rollback/recovery: revert copy and test together; do not add a misleading interim toggle.

### `SP3` — Packaged probe and run-81 browser spec (`R5`, `R7`–`R9`, `R11`)

Scope and purpose:
At completion, deterministic harnesses exist for staged KW activation probing and mandatory rebuilt-SEA browser recommendation evidence.

Implementation checklist:
- [ ] RED `tests/track-b/run81-kw-activation-probe.test.mjs` against absent probe behavior
- [ ] Add `scripts/track-b/run81-kw-activation-probe.mjs` with secret-free JSON output
- [ ] GREEN/refactor probe tests
- [ ] Add public `recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts`
- [ ] Capture browser-contract RED showing predecessor coverage lacks the mandatory run-81 sequence or the new spec fails before live prerequisites/implementation
- [ ] Reuse run-80 seed/launch/binding helpers unchanged unless a focused RED proves a minimal successor is needed

Tests:

```powershell
node --test tests/track-b/run81-kw-activation-probe.test.mjs
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts --list
```

Pass criteria: probe unit contract green; Playwright discovers both apply and dismiss paths; absent live base cannot be recorded as PASS.

Sub-phase acceptance: harnesses are runnable and name all required evidence outputs; live acceptance remains pending SP4.

Rollback/recovery: remove run-81 harness files together; retain unchanged run-80 helpers.

### `SP4` — Fresh rebuild and live dev browser evidence (`R5`, `R7`–`R9`, `R12`)

Scope and purpose:
At completion, the current private KW distribution and public SEA are rebuilt, activation is probed from staged material, and both UI recommendation flows pass against the exact live dev-bound SEA.

Implementation checklist:
- [ ] Build private `dist/run00-dev`; save log/hash
- [ ] Package and validate public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`; save log/hash
- [ ] Start exact SEA via run-80 launcher with `--track=dev`; record URL and binding names
- [ ] Run staged KW activation probe and write JSON evidence
- [ ] Seed signed material under `run81-dev`
- [ ] Run browser Download → preview → Apply and capture id/screenshots/trace
- [ ] Reseed distinct material and run Download → preview → Dismiss; capture id/screenshots/trace
- [ ] Confirm no skip, no production track, and no run-80 API substitution

Tests:

```powershell
corepack pnpm build:run00-runtime
corepack pnpm runtime:package-sea
corepack pnpm runtime:validate-packaging
node scripts/track-b/run81-kw-activation-probe.mjs --distribution-root D:/DEV/.wt/81-kw/dist/run00-dev --evidence-out D:/DEV/.wt/81-kw/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/other/kw-packaged-activation-probe.json
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts --trace on
```

Pass criteria: current hashes recorded; packaged probe passes all four states; both browser paths pass with durable artifacts and id correlation.

Sub-phase acceptance: M5, M7, and M8 pass against the same fresh build lineage.

Rollback/recovery: a failed rebuild, probe, seed, or browser flow blocks SP4; repair and rerun from rebuild when relevant sources changed.

### `SP5` — Regression, diff reconciliation, and binder (`R6`, `R10`, `R13`, `R14`)

Scope and purpose:
At completion, adjacent suites are green, server non-change is proven, all evidence is indexed, and paired delivery is ready for later review/closeout.

Implementation checklist:
- [ ] Run private Track B and cloud-offline regressions
- [ ] Run public UI and host operations regressions
- [ ] Diff both worktrees against locked baselines; confirm no server/Profile Learner drift
- [ ] Write `activation-policy-v1.md`, `server-change-decision.json`, rebuild/browser receipts, and `binder.json`
- [ ] Validate every binder path and secret exclusion
- [ ] Record Phase 6/7 handoff: close KW lifecycle and browser residual only after final verification; retain production refusal/no auto-promotion

Tests:

```powershell
node --test tests/track-b/*.test.mjs
corepack pnpm test:cloud
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/extensions.test.tsx
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
git diff --name-only cf3da6bb4f93c86adae562c6fbaa4903066bf2ef
git diff --name-only 9a94a5a187974941045dda732bfc8d2ba6eac327
```

Run each git diff from its owning worktree.

Pass criteria: suites green; all expected files accounted for; server/Profile Learner unchanged; binder complete and secret-free.

Sub-phase acceptance: M9–M11 pass; both branches remain isolated and unpromoted.

Rollback/recovery: correct stale binder paths from actual evidence; never fabricate missing live output or silently broaden server scope.

## Verification Matrix

| Requirement | Offline/unit | TB10/private | Packaged probe/rebuilt SEA | Live `--track=dev` | Browser UI | Binder evidence |
|---|---|---|---|---|---|---|
| `R1` | required | required | supporting | n/a | copy supporting | policy + RED/GREEN |
| `R2` | required | required | required private staged probe | n/a | n/a | activation probe |
| `R3` | required | required | required rollback cell | n/a | n/a | refusal matrix |
| `R4` | required UI | required health | rebuilt UI copy | n/a | required honesty | UI/probe refs |
| `R5` | supporting | required | required | n/a | optional | hashes/probe |
| `R6` | diff audit | n/a | n/a | existing worker only | n/a | not-required receipt |
| `R7` | UI contract | n/a | required host | required | required | preview artifacts |
| `R8` | host regression | n/a | required host | required | required | apply artifacts |
| `R9` | host regression | n/a | required host | required | required | dismiss artifacts |
| `R10` | required | supporting | optional | predecessor/live support | supporting | regression log |
| `R11` | RED/GREEN/REFACTOR | required | as changed | separate live gate | separate live gate | TDD paths |
| `R12` | n/a | distribution build | required | consumes build | consumes build | rebuild receipt |
| `R13` | schema/path audit | indexed | indexed | indexed | indexed | required |
| `R14` | paired diff audit | private SHA | public/private hashes | dev only | dev only | paired SHAs |

Interpretation: every `required` cell must have distinct evidence before the owning requirement may become `verified`.

## Plan Drift Check

- Every Phase 1 source-inventory item `R1`–`R14` has one direct Requirement Mapping entry; each obligation is planned independently, so a lossless-combination rationale is not applicable.
- `U1` is fully resolved to the exact version-1 policy, instance-local state, validation matrix, idempotence, rollback, capability forwarding, and no-injection boundary above.
- `U2` remains the Phase 1 independent decision; Profile Learner and route-package activation flags are unchanged (`OOS12`).
- `U3` is resolved to `serverChange: not-required`; existing permanent-dev workers and run-80 helpers are sufficient.
- `U4` is concretized as the new run-81 SP4 Playwright spec using `RUNTIME_LIVE_BASE_URL`.
- `U5` remains optional stage evidence; mandatory PASS is dev only.
- `OOS1`–`OOS12` remain intact except the explicitly authorized gated KW unlock in `R1`–`R5`; no ungated activation, automatic prompt injection, production-track write, stage/main promotion, Profile Learner unlock, or UI redesign is planned.
- Diff basis is unchanged from locked `00-worktree.md`: private `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef`; public `9a94a5a187974941045dda732bfc8d2ba6eac327`.
- No product code, test, harness, server, cloud, or browser implementation is claimed in this Phase 2 artifact.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: unavailable
Subagent Capability Probe: this Phase 2 drafting task is itself executing as a bounded subagent under a parent controller, and nested subagent spawning is prohibited
Delegation Decision Basis: performed the required audit locally against the locked upstream artifacts, fixed user decisions, exact paired diff bases, run-80 style reference, and current Direct Track B control-plane truth
Audit Inputs Provided:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
- private normalized diff basis `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef` → `working-tree`
- public normalized diff basis `9a94a5a187974941045dda732bfc8d2ba6eac327` → `working-tree`
- changed planning/session files: this `02-to-be-plan.md`, `.cursor/session.md`
- targeted private code: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs`, staged runtime/probe and run-80 seed/launch helpers
- targeted public code: `extensions.tsx`, `extensions.test.tsx`, new run-81 Playwright spec

## Effective Inputs Re-read

- Locked run-81 `00-requirements.md`, `00-worktree.md`, and `01-as-is.md`
- Current `STATE.md`, `DECISIONS.md`, `memory/MEMORY.md`, and `memory/domains/direct-track-b.md`
- Locked run-80 `02-to-be-plan.md` as structural/style reference
- No run-81 Phase 0/1 addenda are present

## Prior Recursive Evidence Reviewed

- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md` — fixed decisions, file planning, SP structure, test commands, audit, and completion-status form
- `/.recursive/STATE.md` and `/.recursive/DECISIONS.md` — permanent-dev recommendation lifecycle, seed scope conventions, rebuilt SEA packaging, production refusal, and browser residual
- `/.recursive/memory/domains/direct-track-b.md` — run-80 helpers, Windows-safe scopes, Track B distribution packaging, enablement/activation non-implication, and current trust path
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md` — run-80 API-live proof is non-substituting for mandatory run-81 browser evidence

## Earlier Phase Reconciliation

- `00-requirements.md`: all `R1`–`R14`, `FD1`–`FD12`, and `OOS1`–`OOS12` are preserved and concretely planned.
- `00-worktree.md`: exact worktree roots, branches, normalized baselines, and no-promotion rule are reused.
- `01-as-is.md`: immutable hard-off gaps become the instance-local policy design; route-package independence remains; conditional server unknown becomes not-required; incomplete Playwright surfaces become the run-81 SP4 spec.
- No locked earlier artifact requires correction or an addendum.

## Subagent Contribution Verification

- Reviewed Action Records: none; nested delegation was not available
- Main-Agent Verification Performed: self-audit reread all locked inputs, exact baselines, style reference, and relevant current control-plane/memory truth
- Acceptance Decision: accepted as a controller-consumable plan draft
- Refresh Handling: not applicable
- Repair Performed After Verification: made idempotence validate policy even while active; kept class static false distinct from instance state; explicitly bounded activation to a readiness flag with candidates still non-injecting; made server non-change and browser no-skip rules machine-auditable

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
- Planned or claimed changed files: private KW/TB10, new run-81 packaged probe/test, run evidence, and later Phase 6/7/8 control-plane updates listed above
- Actual changed files reviewed: run-81 Phase 0/1 artifacts/evidence/locks, this Phase 2 plan, and `.cursor/session.md`; no product implementation is present or claimed
- Unexplained drift: none for Phase 2 planning ownership

### Paired public implementation

- Baseline type: `local commit`
- Baseline reference: `9a94a5a187974941045dda732bfc8d2ba6eac327`
- Comparison reference: `working-tree`
- Normalized baseline: `9a94a5a187974941045dda732bfc8d2ba6eac327`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 9a94a5a187974941045dda732bfc8d2ba6eac327`
- Worktree branch: `recursive/81-kw-activation-browser-recommendation-evidence`
- Planned or claimed changed files: public `extensions.tsx`, `extensions.test.tsx`, new run-81 SP4 Playwright spec, mirrored run artifacts/evidence as required
- Actual changed files reviewed: mirrored run-81 control-plane folder only per locked Phase 1; no public product implementation is present or claimed
- Unexplained drift: none for Phase 2 planning ownership

Incidental runtime byproducts remain excluded unless tracked intentionally.

## Phase-Scoped Diff Ownership

- Phase 2 owns this plan and the expected private/public change surface.
- Phase 3/3.5/4 own actual product/test/harness drift and deviations.
- Phase 6 owns `/.recursive/DECISIONS.md`; Phase 7 owns `/.recursive/STATE.md`; Phase 8 owns `/.recursive/memory/**`.
- Later control-plane churn does not retroactively invalidate this plan.

## Gaps Found

- None blocking or unresolved for Phase 2 plan completeness.
- Live credentials/material, exact helper CLI spelling, staged-module loading, and Windows path length are execution prerequisites with explicit SP checks/recovery rules; they are not omitted design obligations and cannot become silent PASS conditions.

## Repair Work Performed

- Resolved Phase 1 `U1`/`U3` with the supplied fixed policy and no-server decisions.
- Reconciled the requirements' post-activation language with the fixed run scope: activation is observable readiness only; automatic prompt injection remains false/OOS.
- Added a staged-distribution activation probe so `R5` is not falsely claimed from source-only TB10.
- Split apply and dismiss onto distinct seeded ids and prohibited missing-row/browser skip success.
- Added explicit UI copy/testing without inventing a public activation control or endpoint.

## Requirement Completion Status

Phase 2 planning dispositions only:

- `R1 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: evidence/logs/red/sp1-tb10-activation-red.log, evidence/logs/green/sp1-tb10-activation-green.log | QA Surface: Manual QA M1, M2, M6`
- `R2 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: evidence/other/kw-packaged-activation-probe.json | QA Surface: Manual QA M2`
- `R3 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: evidence/logs/green/sp1-tb10-activation-green.log | QA Surface: Manual QA M3`
- `R4 | Status: planned | Implementation Surface: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/app/routes/extensions.tsx, extensions/knowledge-worker/index.mjs | Verification Surface: public extensions.test.tsx, private TB10 health tests | QA Surface: Manual QA M4, M6`
- `R5 | Status: planned | Implementation Surface: scripts/track-b/run81-kw-activation-probe.mjs, scripts/track-b/build-runtime-distribution.mjs, D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/package.json | Verification Surface: evidence/other/kw-packaged-activation-probe.json, evidence/other/rebuild-receipt.json | QA Surface: Manual QA M5`
- `R6 | Status: planned-indirectly | Implementation Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md, D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: evidence/other/server-change-decision.json, paired diff audit | QA Surface: Manual QA M9 | Rationale: local KW policy and existing run-80 recommendation lifecycle satisfy the obligation without server churn`
- `R7 | Status: planned | Implementation Surface: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts, scripts/track-b/run80-seed-signed-recommendations.mjs, scripts/track-b/launch-packaged-runtime.mjs | Verification Surface: evidence/screenshots/browser-dev-download-preview.png, evidence/traces/browser-dev-apply.zip | QA Surface: Manual QA M7`
- `R8 | Status: planned | Implementation Surface: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/e2e/recursive-81-kw-activation-browser-recommendation-evidence.sp4.spec.ts | Verification Surface: evidence/screenshots/browser-dev-apply.png, evidence/logs/browser-dev-playwright.log | QA Surface: Manual QA M7`
- `R9 | Status: planned | Implementation Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md, scripts/track-b/run80-seed-signed-recommendations.mjs | Verification Surface: evidence/screenshots/browser-dev-dismiss.png, evidence/traces/browser-dev-dismiss.zip | QA Surface: Manual QA M8`
- `R10 | Status: planned | Implementation Surface: D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts, D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts | Verification Surface: evidence/logs/public-ops-regression.log, .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json | QA Surface: Manual QA M10`
- `R11 | Status: planned | Implementation Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md, tests/track-b/tb10.test.mjs, D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx | Verification Surface: evidence/logs/red/**, evidence/logs/green/**, evidence/logs/refactor/** | QA Surface: not-applicable-with-rationale — audited Phase 3/4 process gate`
- `R12 | Status: planned | Implementation Surface: scripts/track-b/build-runtime-distribution.mjs, scripts/track-b/launch-packaged-runtime.mjs, D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/package.json | Verification Surface: evidence/other/rebuild-receipt.json | QA Surface: Manual QA M5, M7, M8`
- `R13 | Status: planned | Implementation Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/binder.json, .recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md | Verification Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/binder.json | QA Surface: Manual QA M11`
- `R14 | Status: planned | Implementation Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md, .recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md | Verification Surface: .recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/binder.json | QA Surface: not-applicable-with-rationale — delivery/process gate`

## Audit Verdict

- Audit summary: all `R1`–`R14` map to concrete files, strict-TDD sub-phases, exact verification surfaces, and manual QA. The plan normatively fixes v1 local activation, keeps static ungated false and prompt injection false, leaves Profile Learner/server contracts unchanged, and requires run-81 browser apply/dismiss evidence on a rebuilt dev-bound SEA.
- Follow-up required before lock: parent/controller review and explicit recursive-lock action; no product implementation is required in Phase 2.
- Audit: PASS

## Traceability

- `R1` → Fixed U1 policy + SP1 + M1/M6
- `R2` → valid activation/idempotence + SP1 + M2
- `R3` → refusal/rollback matrix + SP1 + M3
- `R4` → UI honesty + SP2 + M4/M6
- `R5` → staged KW probe + SP3/SP4 + M5
- `R6` → fixed `serverChange: not-required` + SP5/M9
- `R7` → run-81 SP4 browser download/preview + seed `run81-dev` + M7
- `R8` → run-81 SP4 browser apply + M7
- `R9` → run-81 SP4 browser dismiss + M8
- `R10` → public operations regression + M10
- `R11` → strict TDD evidence tree + SP1–SP3
- `R12` → private distribution/public SEA rebuild + SP4
- `R13` → binder plan + M11
- `R14` → paired worktrees/SHAs + SP5

## Coverage Gate

- Effective inputs reviewed:
  - locked run-81 Phase 0 requirements/worktree and Phase 1 AS-IS
  - run-80 Phase 2 style reference
  - current state, decisions, memory router, and Direct Track B domain memory
- Requirement coverage:
  - `R1`–`R14`: each has direct mapping, planned disposition, implementation surface, verification surface, and QA surface/rationale
- Unknown resolution:
  - `U1`: exact normative v1 schema and lifecycle fixed
  - `U2`: KW-only; adjacent flags unchanged
  - `U3`: `serverChange: not-required`
  - `U4`: run-81 SP4 Playwright against `RUNTIME_LIVE_BASE_URL`
  - `U5`: stage optional; dev mandatory
- Out-of-scope confirmation:
  - no ungated activation, automatic prompt injection, Profile Learner unlock, production-track writes, stage/main promotion, rich UI redesign, or full cloud reprovision

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - exact policy schema, errors, state ownership, idempotence, rollback, health, and capability forwarding specified
  - concrete private/public file ownership table present
  - SP1–SP5 include checklists, exact commands, pass criteria, acceptance, and recovery
  - TB10 evolution and public UI copy/test plan are explicit
  - rebuilt private distribution/public SEA and mandatory live browser evidence are first-class
  - `R1`–`R14` verification matrix and Manual QA M1–M11 present
  - evidence binder paths and secret exclusions specified
  - diff bases match locked `00-worktree.md`
  - no product code implemented or claimed
  - self-audit records `Audit: PASS`
- Remaining blockers:
  - none for Phase 2 plan draft completeness; locking remains a separate controller action

Approval: PASS

## Audit

Audit: PASS
