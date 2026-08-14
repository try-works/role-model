Run: `/.recursive/run/80-signed-recommendation-cloud-lifecycle/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-24T11:05:08Z`
LockHash: `df224086abb6d0e6587032da2314420e26e43e4ebe09ea463c888335e2eba1a5`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md`
- Public worktree: `D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle`
- Private worktree: `D:/DEV/role-model-internal/.worktrees/80-signed-recommendation-cloud-lifecycle`
Outputs:
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`
Scope note: ExecPlan-grade TO-BE plan for closing the live bound-cloud signed recommendation lifecycle on Cloudflare `--track=dev` under strict TDD, with acceptance proven on a freshly rebuilt packaged runtime, while keeping Knowledge Worker `productionActivation` hard-off.

## TODO

- [x] Read locked Phase 0 requirements, Phase 0 worktree, and Phase 1 AS-IS
- [x] Resolve AS-IS unknowns into fixed design decisions (track bind, harness shape, evidence layout)
- [x] Specify concrete public + private file changes
- [x] Define Implementation Steps in sequence
- [x] Design Testing Strategy with exact commands (offline + rebuild + live)
- [x] Document Playwright Plan (Tier A/B against rebuilt SEA when UI exercised)
- [x] Define Manual QA Scenarios
- [x] Document Idempotence and Recovery
- [x] Define Implementation Sub-phases SP1–SP5 with checklists and test commands
- [x] Write Requirement Mapping (preserve AS-IS Source Quotes)
- [x] Write Plan Drift Check
- [x] Review prior recursive evidence under `.recursive/`
- [x] Assemble Audit Context (self-audit with Delegation Override Reason)
- [x] Complete Source Requirement Inventory (exact quotes from `00-requirements.md`)
- [x] Complete Requirement Completion Status
- [x] Complete Traceability / Coverage / Approval gates with `Audit: PASS`

## Fixed Design Decisions

These close the AS-IS known unknowns and are authoritative for Phase 3:

1. **Live PASS track (R1–R4):** Cloudflare `--track=dev` only (`channel=development`, `https://recommendations-dev.role-model.dev`). `--track=production` refused by harness. Stage evidence optional additive only.

2. **Prefer existing APIs (FD2):** `POST /recommendations/download|apply|dismiss` and `GET /recommendations/active-pack`. No parallel unsigned convenience endpoints for live PASS.

3. **Harness parameterization (R10 / SP1):** update `scripts/track-b/launch-packaged-runtime.mjs` to accept `--public-root` (or env) and `--track=dev|stage` → channel `development|staging`; live mode does not require material-file injection. Add `scripts/track-b/run80-live-recommendation-lifecycle.mjs` as the run-scoped live hop driver.

4. **Material probe (R1):** reuse `pnpm test:cloud:e2e -- --track=dev` and/or the run80 wrapper to publish/resolve; store secret-free ids/hosts under `evidence/other/material-probe-dev.json`.

5. **Offline trust + opt-out (R5/R6 / SP2):** expand offline contract/unit tests for channel mismatch, dismiss/apply terminal rules as needed, and contribution opt-out independence without live cloud.

6. **Rebuild gate (R9 / SP3):** private `pnpm build:run00-runtime` when Track B dist inputs change; public `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=<private>/dist/run00-dev pnpm runtime:package-sea`; live hops target only that fresh artifact via `RUNTIME_LIVE_BASE_URL` / launch helper.

7. **Live hops (R2–R4 / SP4):** against rebuilt SEA with `ROLE_MODEL_RECOMMENDATION_SERVICE_URL`, `ROLE_MODEL_RECOMMENDATION_CHANNEL=development`, and verification key from vault (never committed): download → preview/list → apply + active-pack; separate dismiss path → `dismissed` + apply refused.

8. **Evidence binder (R11 / SP5):** write `evidence/binder.json` with required pins, rebuild hashes, hosts/ids/channel, offline + live commands/exit codes, RED/GREEN paths, and explicit non-substitution statement for PCR/local proofs.

9. **TDD Mode: strict (R8)** — RED tests first for every product/harness behavior change; quarantined/skipped tests cannot satisfy gates.

10. **KW hard-off (R7):** no unlock; TB10 remains green; recommendation apply ≠ production prompt injection.

11. **Sub-phases:** SP1 harness parameterization → SP2 offline trust/opt-out tests → SP3 rebuild SEA → SP4 live track=dev hops → SP5 binder.

## Planned Changes by File

Public worktree root: `D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle`

- `role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts`
  - RED→GREEN additive trust-matrix / opt-out independence cases if gaps remain after AS-IS (channel mismatch, dismissed-cannot-apply, opt-out does not revoke eligible import).
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` (only if SP2 proves a product gap)
  - Minimal fail-closed / opt-out independence fix; no unsigned bypass.
- `role-model-router/apps/runtime-ui/e2e/track-b-operations.spec.ts` and/or new recursive-tagged specs
  - Optional browser evidence for apply or dismiss against `RUNTIME_LIVE_BASE_URL` when UI is exercised.
- `package.json` — invoke existing `runtime:package-sea` / `runtime:validate-packaging` as verification commands (no rename required).

Private worktree root: `D:/DEV/role-model-internal/.worktrees/80-signed-recommendation-cloud-lifecycle`

- `scripts/track-b/launch-packaged-runtime.mjs`
  - Parameterize `--public-root` / env; `--track=dev|stage` → channel mapping; refuse production for live track mode; keep local-cloud path intact.
- `scripts/track-b/run80-live-recommendation-lifecycle.mjs` (new)
  - Drive secret-free-logged live hops: material probe → bind env → download → apply and/or dismiss → write evidence logs.
- `tests/track-b/run80-launch-track.test.mjs` (new) and/or adjacent `scripts/track-b/*.test.mjs`
  - RED→GREEN for launch parameterization and production refuse.
- `tests/track-b/tb10.test.mjs` — keep green as R7 guardrail (no unlock).
- `extensions/knowledge-worker/index.mjs` — **no unlock**.
- `package.json` / `scripts/track-b/build-runtime-distribution.mjs` — rebuild via `pnpm build:run00-runtime` when private distribution inputs change.
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/**` — RED/GREEN logs, rebuild receipts, live hop logs, `binder.json`, material probe (created in later phases).
- `.recursive/STATE.md` / `.recursive/DECISIONS.md` — **owned by Phase 6/7**, not Phase 3 product edits; plan only that closeout clears run-79 live-deferral while KW activation remains OOS.

## Requirement Mapping

Public product files live in the paired public worktree (`D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle`) and are listed under Planned Changes by File. Implementation Surface backticks below cite private-controller-resolvable anchors (plan + evidence + private packages/scripts) so path validation succeeds from this repo.

- `R1` | Coverage: direct | Source Quote: "Make authentic signed recommendation / server-return material available and discoverable for the permanent-dev Cloudflare track so live client flows are not blocked by" | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `scripts/track-b/cloud-track-e2e.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/material-probe-dev.json`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | QA Surface: Manual QA Scenario M1
- `R2` | Coverage: direct | Source Quote: "Close the live download path: the rebuilt packaged runtime, bound to `--track=dev` trust env, downloads/resolves signed material and imports validated recommendation rows." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | QA Surface: Manual QA Scenario M2
- `R3` | Coverage: direct | Source Quote: "Close the live apply path: after download/validate, the operator can preview/inspect and apply when `recommendationAccess` / policy allows `preview_and_apply`." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log`, `.recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md` | QA Surface: Manual QA Scenario M3
- `R4` | Coverage: direct | Source Quote: "Close the live dismiss path using `POST /api/role-model/recommendations/dismiss` against bound `--track=dev` material" | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log`, `.recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md` | QA Surface: Manual QA Scenario M4
- `R5` | Coverage: direct | Source Quote: "Preserve and prove fail-closed trust behavior. A green live hop must never require weakening signature, channel, keyring, or policy checks." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log` | QA Surface: Manual QA Scenario M7 (offline trust matrix)
- `R6` | Coverage: direct | Source Quote: "Recommendation download/preview/apply eligibility remains independent of upload/contribution opt-out" | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md` | QA Surface: Manual QA Scenario M8 (opt-out independence)
- `R7` | Coverage: direct | Source Quote: "This run must not unlock Knowledge Worker / route-package production activation." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: `tests/track-b/tb10.test.mjs`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log` | QA Surface: Manual QA Scenario M5
- `R8` | Coverage: direct | Source Quote: "Phase 3 uses `TDD Mode: strict`." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log` | QA Surface: not-applicable-with-rationale — process gate verified by Phase 3/4 RED/GREEN evidence, not browser QA
- `R9` | Coverage: direct | Source Quote: "Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime" | Implementation Surface: `package.json`, `scripts/track-b/build-runtime-distribution.mjs`, `scripts/track-b/launch-packaged-runtime.mjs` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | QA Surface: Manual QA Scenario M6
- `R10` | Coverage: direct | Source Quote: "Keep a durable offline/local-cloud path so recommendation trust regressions fail in CI/dev without permanent-dev credentials" | Implementation Surface: `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/local-cloud-runtime.mjs`, `tests/track-b/run80-launch-track.test.mjs` | Verification Surface: `scripts/track-b/local-cloud-runtime.mjs`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | QA Surface: not-applicable-with-rationale — harness/process gate; offline suites + parameterized live bind
- `R11` | Coverage: direct | Source Quote: "Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R10` without chat context." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log` | QA Surface: not-applicable-with-rationale — binder/audit artifact gate
- `R12` | Coverage: direct | Source Quote: "Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories." | Implementation Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md` | Verification Surface: `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md` | QA Surface: not-applicable-with-rationale — delivery/process gate; no separate operator UI scenario beyond product QA

## Implementation Steps

1. **SP1 — Harness parameterization (strict TDD):** write failing tests for `--public-root` / `--track=dev` → `development` and production refuse; update `launch-packaged-runtime.mjs`; add `run80-live-recommendation-lifecycle.mjs` skeleton; GREEN; refactor.
2. **SP2 — Offline trust + opt-out regressions:** RED/GREEN additive contract/unit tests for R5 matrix gaps and R6 opt-out independence; keep apply/dismiss predecessor guards green; TB10 green.
3. **SP3 — Rebuild packaged runtime:** `pnpm build:run00-runtime` (as needed) + public `runtime:package-sea` with Track B root; record rebuild receipt for R9.
4. **SP4 — Live `--track=dev` hops:** material probe/publish; start fresh SEA; download → apply + active-pack; dismiss path; store live logs; refuse production track.
5. **SP5 — Binder + closeout wiring:** write `evidence/binder.json`; Phase 4/5 cite binder; Phase 6/7 clear run-79 live deferral and keep KW OOS; no stage/main promotion.

## Testing Strategy

TDD Mode: `strict`. Quarantined/skipped/structurally green-only tests cannot satisfy gates.

### New behavior tests

- Launch helper: `--public-root` resolution; `--track=dev` → channel `development`; `--track=stage` → `staging`; production refused for live track mode.
- Trust matrix additives: channel mismatch refuse; dismissed cannot apply; applied cannot dismiss (if gaps).
- Opt-out independence: contribution/upload off does not revoke eligible imported recommendation.
- Live (separate from offline GREEN): download validates; apply sets active-pack; dismiss terminates without apply.

### Regression / guardrail

- Private: `node --test tests/track-b/tb10.test.mjs` (R7).
- Public: existing apply/dismiss cases in `track-b-operations-api.test.ts` remain green.
- Historical PCR/local proofs cited only as predecessors, never as live PASS substitutes.

### Exact commands

Public worktree (`D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle`):

```bash
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/track-b-operations.spec.ts
set ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=D:/DEV/role-model-internal/.worktrees/80-signed-recommendation-cloud-lifecycle/dist/run00-dev
corepack pnpm runtime:package-sea
```

Private worktree (`D:/DEV/role-model-internal/.worktrees/80-signed-recommendation-cloud-lifecycle`):

```bash
node --test tests/track-b/tb10.test.mjs
node --test tests/track-b/run80-launch-track.test.mjs
corepack pnpm build:run00-runtime
pnpm test:cloud:e2e -- --track=dev
node scripts/track-b/run80-live-recommendation-lifecycle.mjs --track=dev --public-root D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle
```

Evidence destinations (Phase 3/4):

- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/logs/red/`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/logs/green/`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/logs/` (rebuild + live)
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/` (receipts/inventory/binder)

## Playwright Plan (if applicable)

- Directory: `role-model-router/apps/runtime-ui/e2e/`
- Tags: `@recursive:80-signed-recommendation-cloud-lifecycle`, `@sp4`, `@smoke`
- Prefer tagging new/changed specs; if tag filter is unreliable, use file globs `e2e/recursive-80-signed-recommendation-cloud-lifecycle.sp*.spec.ts`
- Browser coverage required for at least one operator-visible apply **or** dismiss path against rebuilt runtime when UI is exercised; if UI unchanged, API live evidence satisfies UI-or-API and the residual is recorded.

### Tier A (per sub-phase, fast loop)

- SP1–SP3: covered by node/vitest + rebuild commands; Playwright optional.
- SP4 command (against `RUNTIME_LIVE_BASE_URL` pointing at fresh SEA):
  ```bash
  corepack pnpm --filter @role-model-router/runtime-ui exec playwright test --grep @recursive:80-signed-recommendation-cloud-lifecycle --grep @sp4
  ```

### Tier B (broader regression)

```bash
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test e2e/track-b-operations.spec.ts
```

### Evidence outputs

- `playwright-report/`, `test-results/`
- Copy/summarize under `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/traces/` and `evidence/logs/` for Phase 4.

## Manual QA Scenarios

### M1 — Material probe/publish `--track=dev` (R1)

- Steps: run cloud-track e2e or run80 wrapper with `--track=dev`; record host, channel, recommendation/snapshot id(s), result code without secrets.
- Expected: at least one resolvable signed id from bound `dev` service (not solely material-file).

### M2 — Rebuilt SEA live download (R2)

- Steps: start fresh packaged runtime bound to development channel + verification key; `POST /recommendations/download`; inspect validated rows.
- Expected: `signatureValid` (or equivalent); non-applied until apply; missing trust env fails closed.

### M3 — Live apply + active-pack (R3)

- Steps: after M2, apply an eligible id; GET active-pack; attempt apply of dismissed/rejected id.
- Expected: status `applied` + active-pack populated; dismissed/rejected apply fails closed.

### M4 — Live dismiss without apply (R4)

- Steps: download a non-applied id; dismiss; re-dismiss; attempt apply after dismiss.
- Expected: status `dismissed`; no activePack for that id; idempotent re-dismiss; apply fails closed.

### M5 — KW productionActivation hard-off (R7)

- Steps: run TB10; confirm apply path does not flip KW activation.
- Expected: `productionActivation` false; activate fails closed.

### M6 — Rebuilt runtime gate (R9)

- Steps: rebuild SEA (+ private dist if needed); start only the new artifact; re-run M2–M4 against it.
- Expected: rebuild exit 0 with artifact path/hash recorded; verification not run against stale binary.

### M7 — Offline trust matrix (R5)

- Steps: run offline contract suite covering bad signature / wrong channel / policy block / dismissed-cannot-apply / applied-cannot-dismiss.
- Expected: all named required cells green without live cloud.

### M8 — Opt-out independence (R6)

- Steps: offline test sets contribution/upload off after import; assert eligible recommendation remains.
- Expected: opt-out alone does not revoke/force-dismiss.

## Idempotence and Recovery

- Re-running material probe/publish for `--track=dev` may create a new signed head; evidence records the ids actually used for live hops.
- Re-running download on already-imported compatible material is non-destructive (refresh/list) without claiming a second live PASS without evidence.
- Re-running dismiss on already-`dismissed` id is idempotent success without applying.
- Failed trust binds leave recommendation state unchanged (fail-closed).
- Rebuild recovery: if SEA rebuild fails, do not claim R9; fix packaging and rebuild before live QA.
- Rollback: revert recursive branch commits; discard bad SEA artifacts; do not partially promote to stage/main.

## Implementation Sub-phases

### `SP1` Harness parameterization (R10, R8, supports R1/R9)

Scope and purpose:
End of SP1: `launch-packaged-runtime.mjs` accepts `--public-root` and `--track=dev|stage` channel mapping, refuses production for live track mode, and `run80-live-recommendation-lifecycle.mjs` exists as the run-scoped driver skeleton. Covered: `R10`, `R8` (TDD for this seam), supports later `R1`/`R9`.

Implementation checklist:
- [ ] RED: add failing cases in `tests/track-b/run80-launch-track.test.mjs` (or equivalent)
- [ ] Update `scripts/track-b/launch-packaged-runtime.mjs` for public-root + track/channel + production refuse
- [ ] Add `scripts/track-b/run80-live-recommendation-lifecycle.mjs`
- [ ] GREEN + refactor; capture RED/GREEN logs under run evidence

Tests for this sub-phase:
```bash
node --test tests/track-b/run80-launch-track.test.mjs
node --test tests/track-b/tb10.test.mjs
```
Pass criteria: parameterization tests green; TB10 still PASS; no productionActivation unlock.

Sub-phase acceptance:
Launch helper can bind run-80 public root + development channel without PCR/run-00 hardcoding.

Rollback / recovery:
Revert SP1 commits; leave prior PCR defaults intact on older revisions.

### `SP2` Offline trust / opt-out tests (R5, R6, R7 guard, R8)

Scope and purpose:
End of SP2: offline suites cover required R5 cells and R6 opt-out independence; KW still hard-off. Covered: `R5`, `R6`, `R7` (non-regression), `R8`.

Implementation checklist:
- [ ] RED: additive cases in public `track-b-operations-api.test.ts` and/or private tests
- [ ] Implement minimal product fix only if a real gap is proven
- [ ] GREEN + refactor; keep predecessor apply/dismiss guards green

Tests for this sub-phase:
```bash
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
node --test tests/track-b/tb10.test.mjs
```
Pass criteria: new trust/opt-out cases green; TB10 green.

Sub-phase acceptance:
Offline matrix + opt-out independence evidenced without live cloud.

Rollback / recovery:
Revert SP2 commits; retain run 79 dismiss/apply baseline behavior.

### `SP3` Rebuild SEA (R9)

Scope and purpose:
End of SP3: public SEA (+ private dist if needed) rebuilt; rebuild receipt recorded. Covered: `R9`.

Implementation checklist:
- [ ] `corepack pnpm build:run00-runtime` from private worktree (or explicit unchanged note)
- [ ] `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=... pnpm runtime:package-sea` from public worktree
- [ ] Write rebuild receipt under run evidence

Tests for this sub-phase:
```bash
corepack pnpm build:run00-runtime
corepack pnpm runtime:package-sea
```
Pass criteria: rebuilds exit 0; artifact path/hash recorded.

Sub-phase acceptance:
Fresh packaged runtime ready for SP4; stale-binary gate armed.

Rollback / recovery:
Discard bad SEA artifacts; rebuild before any live PASS claim.

### `SP4` Live `--track=dev` hops (R1–R4, consumes R9)

Scope and purpose:
End of SP4: material available; live download/apply/dismiss evidenced against rebuilt SEA on `--track=dev`. Covered: `R1`, `R2`, `R3`, `R4`.

Implementation checklist:
- [ ] Material probe/publish secret-free evidence
- [ ] Start rebuilt SEA via parameterized launch helper
- [ ] Live download → apply + active-pack
- [ ] Live dismiss path (+ apply refused after dismiss)
- [ ] Store live logs under run evidence; refuse production track

Tests for this sub-phase:
```bash
pnpm test:cloud:e2e -- --track=dev
node scripts/track-b/run80-live-recommendation-lifecycle.mjs --track=dev --public-root D:/DEV/role-model/.worktrees/80-signed-recommendation-cloud-lifecycle
node --test tests/track-b/tb10.test.mjs
```
Pass criteria: live hop logs exist with ids/channel/runtime correlation; TB10 still PASS.

Sub-phase acceptance:
Live bound-cloud signed lifecycle closed on fresh SEA for `dev`.

Rollback / recovery:
Do not claim PASS if secrets missing; record residual; keep offline greens.

### `SP5` Binder (R11, R12 prep)

Scope and purpose:
End of SP5: `evidence/binder.json` lists required R11 fields; closeout handoff ready for Phase 4–7. Covered: `R11`, supports `R12`.

Implementation checklist:
- [ ] Write binder with pins, rebuild, hosts/ids/channel, offline+live commands, RED/GREEN paths, non-substitution statement
- [ ] Ensure no secrets in binder
- [ ] Document Phase 6/7 STATE/DECISIONS handoff (clear run-79 live deferral; KW OOS remains)

Tests for this sub-phase:
```bash
# binder presence / schema spot-check during Phase 4
```
Pass criteria: binder resolves cited evidence paths; secret-free.

Sub-phase acceptance:
Auditors can verify R1–R10 from binder without chat context.

Rollback / recovery:
Rewrite binder if paths drift; do not invent missing live evidence.

## Plan Drift Check

- No Phase 1 source-inventory items were dropped or vaguely umbrella-restated: each `R1`–`R12` has a direct Requirement Mapping entry with preserved Source Quotes.
- Coverage is direct for every inventory item; no combined-obligation Coverage entries were introduced, so no lossless-combination rationale is required.
- AS-IS unknowns resolved without inventing unsigned convenience endpoints: live track bind, harness parameterization, rebuild-before-live, and binder layout are fixed above.
- OOS1–OOS10 unchanged: no KW productionActivation unlock; no production-track harness; no stage/main auto-promotion; no Extensions UI redesign; no full Cloudflare reprovision epic.
- Diff basis unchanged from locked `00-worktree.md`: private normalized baseline `739ef35bcc2d3c747696c4a22d74e4718cf1229b`; public paired baseline `420770884be5999267992666a5f71913adb5a7c8`.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Task/subagent tooling is available in this Cursor session (parent can delegate), matching Phase 1 probe posture
Delegation Decision Basis: Phase 2 ExecPlan must be a single controller-owned durable artifact with fixed design decisions already supplied by the user/controller; delegating would risk dual narratives on harness/live-bind choices
Delegation Override Reason: user-supplied fixed design decisions already resolve AS-IS unknowns (SP1–SP5, live `--track=dev`, rebuilt SEA); self-audit keeps one authoritative plan file and avoids a second delegated draft competing with those decisions
Audit Inputs Provided:
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md`
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md`
- Changed files:
  - `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md` (this artifact)
- Targeted code references:
  - private `scripts/track-b/launch-packaged-runtime.mjs`
  - private `scripts/track-b/cloud-track-e2e.mjs`
  - private `scripts/track-b/local-cloud-runtime.mjs`
  - private `extensions/knowledge-worker/index.mjs`
  - private `tests/track-b/tb10.test.mjs`
  - public host-bridge recommendation routes (paired worktree)
  - public `track-b-operations-api.test.ts` (paired worktree)

## Effective Inputs Re-read

- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md` (LOCKED)
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md` (LOCKED)
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md` (DRAFT→lock with this sequence)
- No Phase 0/1 addenda present for this run

## Prior Recursive Evidence Reviewed

- `.recursive/memory/domains/direct-track-b.md` — recommendation trust path; KW productionActivation OOS
- `.recursive/run/00-direct-track-b-v1-1-implementation/evidence/remediation-2026-07-23/manual-qa/recommendations.md` — historical PCR/local signed-apply; non-substituting
- `.recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md` — live cloud signed-material apply/dismiss deferred
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json` — APIs present; live SEA gaps
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log` — R7 baseline PASS
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log` — offline ops baseline PASS
- Reused insight: APIs/dismiss exist; launch helper still PCR-shaped; this run closes live `--track=dev` on rebuilt SEA under strict TDD
- No-relevant-evidence justification for unrelated historical public runs 01–78: they do not define this run’s live bound-cloud SEA closeout

## Earlier Phase Reconciliation

- `00-requirements.md`:
  - each in-scope `R1`–`R12` planned via Requirement Mapping + SP1–SP5
  - OOS1–OOS10 explicitly preserved
  - strict TDD (`R8`) and rebuilt-runtime (`R9`) first-class in Testing Strategy / SP3–SP4
- `00-worktree.md`:
  - Diff basis reused: private normalized baseline `739ef35bcc2d3c747696c4a22d74e4718cf1229b`
  - Public paired baseline `420770884be5999267992666a5f71913adb5a7c8` recorded for cross-repo audits
  - Controller remains private worktree; public changes in public worktree
- `01-as-is.md`:
  - Gaps for R1–R6/R8–R11 converted into concrete plan surfaces
  - R7 already verified — plan preserves hard-off
  - R12 worktree/run init present — plan completes paired `dev` delivery without stage/main promotion
  - Unknowns (material head, key bind, UI preview depth, stage additive) resolved in Fixed Design Decisions / resolution rules

## Subagent Contribution Verification

- Reviewed Action Records: none durable under `subagents/` (self-audit; no delegated Phase 2 authoring)
- Main-Agent Verification Performed: re-read locked `00-requirements.md`, `00-worktree.md`, and Phase 1 AS-IS; verified planned private paths against existing `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/cloud-track-e2e.mjs`, `scripts/track-b/local-cloud-runtime.mjs`, and evidence files `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json`, `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log`
- Acceptance Decision: accepted as controller-authored plan
- Refresh Handling: no durable subagent action record required
- Repair Performed After Verification: rewrote Phase 2 plan to audited lock structure after reconciling AS-IS unknowns to SP1–SP5

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `739ef35bcc2d3c747696c4a22d74e4718cf1229b`
- Comparison reference: `working-tree`
- Normalized baseline: `739ef35bcc2d3c747696c4a22d74e4718cf1229b`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 739ef35bcc2d3c747696c4a22d74e4718cf1229b`
- Base branch: `origin/dev`
- Worktree branch: `recursive/80-signed-recommendation-cloud-lifecycle`
- Planned or claimed changed files (expected product/worktree surface for later phases; not implemented in Phase 2):
  - private `scripts/track-b/launch-packaged-runtime.mjs`
  - private `scripts/track-b/run80-live-recommendation-lifecycle.mjs` (new)
  - private `tests/track-b/run80-launch-track.test.mjs` (new)
  - private run evidence under `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/**` (later)
  - public `role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts` (if SP2 gaps)
  - public `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` (only if SP2 proves product gap)
  - public e2e specs under `role-model-router/apps/runtime-ui/e2e/` (optional SP4)
  - Phase 6/7 only: `.recursive/STATE.md`, `.recursive/DECISIONS.md`
- Actual changed files reviewed (this phase):
  - `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`
- Unexplained drift:
  - none product-code drift; Phase 2 owns planning only

Note: incidental runtime byproducts such as `__pycache__/`, `*.pyc`, `.pytest_cache/`, `.mypy_cache/`, and `.ruff_cache/` are excluded from meaningful diff audit unless the repository intentionally tracks them.

## Phase-Scoped Diff Ownership

- Phase 2 owns planning completeness plus the expected product/worktree change surface listed above.
- Phase 3 / 3.5 / 4 own actual product/worktree drift reconciliation against this plan.
- Phase 6 owns `.recursive/DECISIONS.md`; Phase 7 owns `.recursive/STATE.md`; Phase 8 owns `.recursive/memory/**`.
- Late control-plane or memory churn must not retroactively invalidate this locked (when locked) Phase 2 plan.

## Gaps Found

- none blocking Phase 2 plan completeness
- live `--track=dev` material/secret availability remains an execution risk for SP4/Phase 5 (acknowledged; offline trust/opt-out tests still mandatory)

## Repair Work Performed

- Rewrote Phase 2 artifact to match audited-phase lock structure (Requirement Mapping bullets, SP1–SP5, RCS planned/blocked only, diff basis fields) after prior draft failed lock validation

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: "Make authentic signed recommendation / server-return material available and discoverable for the permanent-dev Cloudflare track so live client flows are not blocked by" | Summary: bound-cloud signed material on `--track=dev`. | Owner: private cloud e2e/publish + run evidence.
- `R2` | Disposition: `in-scope` | Source Quote: "Close the live download path: the rebuilt packaged runtime, bound to `--track=dev` trust env, downloads/resolves signed material and imports validated recommendation rows." | Summary: live download/validate/import on rebuilt SEA. | Owner: public host-bridge + live harness.
- `R3` | Disposition: `in-scope` | Source Quote: "Close the live apply path: after download/validate, the operator can preview/inspect and apply when `recommendationAccess` / policy allows `preview_and_apply`." | Summary: live preview + policy-gated apply. | Owner: public host-bridge + UI + live evidence.
- `R4` | Disposition: `in-scope` | Source Quote: "Close the live dismiss path using `POST /api/role-model/recommendations/dismiss` against bound `--track=dev` material" | Summary: live dismiss without apply. | Owner: public host-bridge + UI + live evidence.
- `R5` | Disposition: `in-scope` | Source Quote: "Preserve and prove fail-closed trust behavior. A green live hop must never require weakening signature, channel, keyring, or policy checks." | Summary: fail-closed trust matrix. | Owner: public contract tests + optional live negatives.
- `R6` | Disposition: `in-scope` | Source Quote: "Recommendation download/preview/apply eligibility remains independent of upload/contribution opt-out" | Summary: contribution opt-out independence. | Owner: public/private contract tests.
- `R7` | Disposition: `in-scope` | Source Quote: "This run must not unlock Knowledge Worker / route-package production activation." | Summary: keep productionActivation hard-off. | Owner: private knowledge-worker + TB10 tests.
- `R8` | Disposition: `in-scope` | Source Quote: "Phase 3 uses `TDD Mode: strict`." | Summary: RED→GREEN→REFACTOR for product/harness changes. | Owner: Phase 3 implementation.
- `R9` | Disposition: `in-scope` | Source Quote: "Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime" | Summary: rebuilt SEA verification gate. | Owner: Phase 4/5 verification + packaging scripts.
- `R10` | Disposition: `in-scope` | Source Quote: "Keep a durable offline/local-cloud path so recommendation trust regressions fail in CI/dev without permanent-dev credentials" | Summary: extensible offline/local-cloud harness. | Owner: private launch/local-cloud scripts + tests.
- `R11` | Disposition: `in-scope` | Source Quote: "Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R10` without chat context." | Summary: machine-checkable evidence binder. | Owner: run evidence tree + Phase 4/5.
- `R12` | Disposition: `in-scope` | Source Quote: "Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories." | Summary: synced run 80 dual-repo delivery on dev. | Owner: both worktrees + closeout.

## Requirement Completion Status

Phase 2 planning dispositions (`planned` / `blocked`). AS-IS carry-forward note: Phase 1 recorded R7 as verified (`evidence/other/tb10-baseline.log` + KW module + TB10) and R12 as implemented (run folder / worktree artifacts). Phase 2 cannot use `verified`/`implemented` statuses; those become `planned` preservation/delivery surfaces here while R1–R6/R8–R11 remain `blocked` until Phase 3+ product/evidence exists.

- `R1 | Status: blocked | Rationale: material probe/publish procedure and run-80 secret-free evidence are planned but not yet executed; product/harness work not started. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json, .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `R2 | Status: blocked | Rationale: live SEA download against --track=dev remains open until SP3/SP4; plan is complete but product/harness evidence not started. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json, .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log`
- `R3 | Status: blocked | Rationale: live apply evidence on rebuilt SEA remains open until SP4. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json, .recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md`
- `R4 | Status: blocked | Rationale: live dismiss evidence on rebuilt SEA remains open until SP4. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json, .recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md`
- `R5 | Status: blocked | Rationale: additive offline trust-matrix completeness for this run is planned in SP2 but not yet implemented. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-ops-baseline.log, .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `R6 | Status: blocked | Rationale: explicit opt-out independence regression for this run is planned in SP2 but not yet implemented. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md, .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json`
- `R7 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/tb10-baseline.log, tests/track-b/tb10.test.mjs | QA Surface: Manual QA Scenario M5 | Audit Note: Phase 1 Status was verified against the same KW module and TB10 baseline; this plan preserves hard-off only (no unlock)`
- `R8 | Status: blocked | Rationale: Phase 3 strict TDD RED/GREEN evidence for run-80 product/harness work does not exist yet. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `R9 | Status: blocked | Rationale: packaging scripts exist but run-80 rebuilt-runtime acceptance evidence is not yet produced. | Blocking Evidence: package.json, scripts/track-b/build-runtime-distribution.mjs, scripts/track-b/launch-packaged-runtime.mjs`
- `R10 | Status: blocked | Rationale: launch/local-cloud helpers exist but run-80 parameterization (SP1) is not yet implemented. | Blocking Evidence: scripts/track-b/launch-packaged-runtime.mjs, .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json`
- `R11 | Status: blocked | Rationale: binder.json not yet produced; planned in SP5. | Blocking Evidence: .recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/other/public-surface-inventory.json, .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `R12 | Status: planned | Implementation Surface: .recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md, .recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md | Verification Surface: .recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md, .recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md | QA Surface: not-applicable-with-rationale — delivery/process gate | Audit Note: Phase 1 Status was implemented for paired worktree/run-folder init; remaining paired product delivery on dev (no stage/main promotion) is planned here`

## Audit Verdict

- Audit summary: Phase 2 ExecPlan maps all R1–R12 to concrete public/private files, SP1–SP5 (harness parameterization, offline trust/opt-out, rebuild SEA, live track=dev hops, binder), exact test/rebuild commands, and preserves KW productionActivation hard-off. Self-audit with explicit Delegation Override Reason. AS-IS unknowns closed without inventing unsigned live convenience paths.
- Follow-up required before lock: none for plan content (Status remains DRAFT until recursive-lock is explicitly requested)
- Audit: PASS

## Traceability

- `R1` -> Fixed Design Decisions + SP1/SP4 material probe | Evidence: cloud-track-e2e.mjs, run80-live-recommendation-lifecycle.mjs
- `R2` -> SP3/SP4 live download on rebuilt SEA | Evidence: launch-packaged-runtime.mjs, live logs plan
- `R3` -> SP4 live apply + Manual QA M3 | Evidence: apply route + active-pack
- `R4` -> SP4 live dismiss + Manual QA M4 | Evidence: dismiss route + live logs plan
- `R5` -> SP2 offline trust matrix | Evidence: track-b-operations-api.test.ts plan
- `R6` -> SP2 opt-out independence | Evidence: offline regression plan
- `R7` -> preserve KW hard-off + TB10 guardrail | Evidence: knowledge-worker, tb10-baseline.log
- `R8` -> TDD Mode strict + RED-first SP checklists | Evidence: Implementation Steps / SP1–SP2
- `R9` -> SP3 rebuild + fresh SEA QA | Evidence: package.json, build-runtime-distribution.mjs
- `R10` -> SP1 harness parameterization | Evidence: launch-packaged-runtime.mjs, run80-launch-track.test.mjs
- `R11` -> SP5 binder.json | Evidence: evidence/other plan
- `R12` -> paired worktrees/run id 80 + no stage/main promotion | Evidence: 00-worktree.md, this plan

## Coverage Gate

- Effective inputs reviewed:
  - locked `00-requirements.md`
  - locked `00-worktree.md`
  - Phase 1 AS-IS
  - prior run 00/79 evidence + run 80 baseline inventory
- Requirement coverage check:
  - `R1`: Covered in Fixed Design Decisions, SP1/SP4, Requirement Mapping
  - `R2`: Covered in SP3/SP4, Manual QA M2
  - `R3`: Covered in SP4, Manual QA M3
  - `R4`: Covered in SP4, Manual QA M4
  - `R5`: Covered in SP2, Manual QA M7
  - `R6`: Covered in SP2, Manual QA M8
  - `R7`: Covered in non-unlock rules, TB10 guardrail, Manual QA M5
  - `R8`: Covered in Testing Strategy + SP RED-first checklists
  - `R9`: Covered in SP3 + Testing Strategy rebuild commands
  - `R10`: Covered in SP1 + local-cloud retention
  - `R11`: Covered in SP5 binder
  - `R12`: Covered in dual-repo paths + delivery constraints
- Out-of-scope confirmation:
  - `OOS1`–`OOS10`: unchanged

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Concrete public + private file paths named
  - Exact test/rebuild/live commands specified
  - SP1–SP5 include checklists, tests, acceptance, rollback
  - Diff basis matches locked Phase 0 normalized baseline `739ef35bcc2d3c747696c4a22d74e4718cf1229b`
  - No product implementation claimed in this phase
  - `Audit: PASS` recorded
- Remaining blockers:
  - none for Phase 2 plan draft completeness (lock deferred until explicitly requested)

Approval: PASS

## Audit

Audit: PASS
