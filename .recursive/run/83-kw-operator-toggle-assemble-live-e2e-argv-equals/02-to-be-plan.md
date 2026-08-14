Run: `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-25T01:13:34Z`
LockHash: `9aa6195572cfe3d80aff503cd7fe682594ffcee295cf7bdd993f582dee22b597`
Workflow version: `recursive-mode-audit-v2`
CapturedAt: `2026-07-25T09:15:00+08:00`
Inputs:
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md`
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-worktree.md`
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/direct-track-b.md`
- `/.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md`
Outputs:
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md`
Scope note: ExecPlan for (A) shadow-ready default + soft OFF + ceremony-retained ON + KW correctness, (B) equals-form launch argv, (C) full Playwright assemble + coherent freeze, under strict TDD with Phase 5 rebuilt SEA, live cloud track=dev, and live pi storage verification. Planning/control-plane only; no product implementation in this phase.

## TODO

- [x] Read locked Phase 0/1 artifacts and Direct Track B memory
- [x] Lock normative decisions for U1–U8
- [x] Define soft OFF / shadow-ready bootstrap / operator surface
- [x] Define equals-form argv parse contract and precedence
- [x] Define assemble + freeze procedure (no proof-only-only closeout)
- [x] Map R1–R19 to implementation/verification/QA surfaces
- [x] Define strict-TDD sub-phases, commands, Manual QA, recovery
- [x] Complete Plan Drift Check, self-audit, Coverage, Approval, Audit PASS

## Fixed Design Decisions

These decisions resolve Phase 1 unknowns and are normative for Phase 3+.

### `U1` — Operator toggle surface (normative)

Minimal operator path for this run:

1. Capabilities: keep `knowledge:activate` and `knowledge:rollback`; **add** `knowledge:deactivate` for soft OFF.
2. Packaged probe (`run81-kw-activation-probe.mjs` evolved, or a run-83 successor) proves ON / soft OFF / rollback matrix.
3. Public Extensions honesty copy updated (`R5`) so operators can read the state machine.
4. **No new Extensions UI button required** this run if capability + probe + honesty satisfy operator-facing ON/OFF (`FD2`).

Rationale: existing activate ceremony is API/capability-shaped; adding a UI switch without host wiring would invent surface without closing ACs.

### `U2` — Soft OFF semantics (normative)

| Action | Effect |
|---|---|
| Soft deactivate (`deactivate()` / `knowledge:deactivate`) | `productionActivation=false`; **retain** shadow candidates/index (return to shadow-ready) |
| Destructive rollback (`rollback()` / `knowledge:rollback`) | `productionActivation=false`; **clear** candidates (and retain existing rollback semantics) |

TB10 must cover both paths. Soft OFF is the default OFF story for operators.

### `U3` — Activate/deactivate schema (normative)

- Keep **activationPolicyVersion = 1** ceremony fields for ON (attestation + verified receipt + shadow + digest bind). Do not drop digest bind.
- Soft deactivate uses a small versioned request: `deactivationPolicyVersion = 1` + `operatorAttestation = "deactivate-production"` (unknown fields refuse).
- Future modes ship as additive versions (`FD15`/`FD19`); unknown fields refuse.

### `U4` — Public pin retarget (normative)

Default: leave public pin + lock path unchanged unless assemble/validators force retarget after product drift. Private re-freeze after Themes A/C is expected.

### `U5` — Live `pi` provider/marker (normative)

Reuse assemble / `local-runtime-and-pi` lead: `pi --provider role-model-run00 --model deepseek-chat` (or the current assemble-recorded equivalent). Exact argv recorded in Phase 5 evidence; secrets omitted.

### `U6` — Storage correctness checks (normative)

`R17` asserts at least:

1. One **local** storage plane (e.g. `local_graph_storage` / local correlation receipt fields).
2. One **cloud-bound** plane when cloud E2E is exercised (e.g. `aggregate_upload` / history correlation).

Presence alone is insufficient; correctness fields/hashes/schema must match the marker (secret-free).

### `U7` — Permanent-dev redeploy (normative)

Prefer existing permanent-dev workers. Redeploy only if Phase 5 / `cloud-track-e2e` shows worker drift that blocks `R16`.

### `U8` — Shadow-ready bootstrap (normative)

Product default posture is shadow-ready without ambient production:

1. Add `bootstrapShadowReady(value)` (or equivalent) that runs the existing `derive(value)` path when no shadow candidate exists, leaving `productionActivation === false`.
2. Packaged probe + Phase 5 rebuilt-runtime hops **must** bootstrap (or derive) before claiming shadow-ready / attempting ceremony ON.
3. Unit TB10 covers: after bootstrap → candidates≥1 and productionActivation=false; ceremony ON immediate; soft OFF returns to candidates≥1 false.
4. Bare `new KnowledgeWorker()` without bootstrap may remain empty for isolated unit setup, but product/probe entrypoints must not leave permanent empty cold-start (`OOS` cold-start).

### Cross-cutting fixed decisions

| ID | Decision |
|---|---|
| Ceremony ON | Retain digest bind: `digest(policy.receipt) === candidate.validationReceiptHash` |
| Public change | `publicChange: required` for Extensions honesty (`R5`); no other public product churn unless Phase 5 forces it |
| Server change | `serverChange: not-required` unless `U7` redeploy fires |
| Phase 5 scope | Explicit `--scope-id=run83-dev` and `--track=dev` (equals-form preferred in recorded argv; discrete also PASS) |
| Launch default | When scope omitted, default remains `packaged-run00`; equals-form and discrete bind identically |
| Argv precedence | First match wins: equals-form `--name=value` OR discrete `--name value`; then env; then default. Documented in tests |
| TDD | `strict` for KW toggle/shadow-ready, launch argv, public honesty copy; freeze/assemble/evidence may be `pragmatic` with explicit rationale |
| Assemble | Full Playwright `assemble-run00-live-e2e.mjs` required; proof-only-only rebind is FAIL for `R1`/`R2` |
| Serial docs | No anticipatory Phase 3.5–8 batch-write (`FD17`) |
| Promotion | `dev` only; no auto stage/main |

## Planned Changes by File

| Repository / owner | File | Planned change |
|---|---|---|
| Private KW | `extensions/knowledge-worker/index.mjs` | Add `deactivate` / soft OFF; add `bootstrapShadowReady`; capability `knowledge:deactivate`; keep ceremony activate + rollback |
| Private KW tests | `tests/track-b/tb10.test.mjs` | RED→GREEN: shadow-ready bootstrap, soft OFF, ceremony ON retained, while-on correctness, axis separation |
| Private probe | `scripts/track-b/run81-kw-activation-probe.mjs` (evolve or run83 successor) | Prove bootstrap shadow-ready, ceremony ON, soft OFF, rollback, while-on correctness |
| Private probe tests | `tests/track-b/run81-kw-activation-probe.test.mjs` | RED-first contracts for toggle/shadow-ready matrix |
| Private launch scope | `scripts/track-b/packaged-launch-scope.mjs` | Parse equals-form `--scope-id=` |
| Private launch helper | `scripts/track-b/launch-packaged-runtime.mjs` | Parse equals-form for `--track` / `--scope-id` / related flags via shared `arg` helper |
| Private launch tests | `tests/track-b/packaged-launch-scope.test.mjs` (+ extend as needed) | Equals-form ≡ discrete; default preserved; no silent substitution |
| Private skill issue | `.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md` | Mark resolved/updated after GREEN |
| Private assemble | `scripts/track-b/assemble-run00-live-e2e.mjs` + `evidence/live-e2e/**` | Full Playwright assemble refresh (not proof-only-only) |
| Private freeze | `evidence/source-set/tb00-release-source-lock.json` | Advance private pin after product tip; assemble coherently |
| Private validators | refresh only as validators require | TB11 / system-proof / paired-release / interop as needed |
| Public UI | paired public `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Honesty: shadow-ready default, ceremony ON, soft OFF, KW works when on, ≠ Set mode |
| Private decisions | `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/other/` | `public-change-decision.json` required; `server-change-decision.json` not-required (unless U7) |
| Run evidence | `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/**` | RED/GREEN, assemble, rebuild, cloud E2E, pi storage, binder |
| Later control plane | `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `.recursive/memory/**` | Phases 6–8 only |

Private controller root: `D:/DEV/.wt/83-kw`  
Public implementation root: `D:/DEV/role-model/.worktrees/83-kw-operator-toggle-assemble-live-e2e-argv-equals`

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "Regenerate TB00 live-e2e via `scripts/track-b/assemble-run00-live-e2e.mjs` so freeze/TB11 no longer depend on proof-only-only rebind." | Implementation Surface: `scripts/track-b/assemble-run00-live-e2e.mjs`, `evidence/live-e2e/run00-live-e2e-manifest.json` | Verification Surface: assemble PASS log + fresh capturedAt + TB11 live-e2e PASS | QA Surface: M1, M6
- `R2` | Coverage: direct | Source Quote: "After product + assemble evidence land, freeze integrity is CI-honest on a clean tree." | Implementation Surface: `evidence/source-set/tb00-release-source-lock.json`, `tests/track-b/pin-freeze-gate.test.mjs` | Verification Surface: pin-freeze PASS + gate-status + binder SHAs | QA Surface: M1, M6
- `R3` | Coverage: direct | Source Quote: "Provide an explicit operator-facing ON/OFF path for instance `productionActivation`." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `scripts/track-b/run81-kw-activation-probe.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: TB10 + probe GREEN for activate/deactivate | QA Surface: M2, M5
- `R4` | Coverage: direct | Source Quote: "Lock OFF semantics (`U2`): preferred soft deactivate back to shadow-ready; optional destructive rollback." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: soft OFF retains candidates; rollback clears | QA Surface: M2
- `R5` | Coverage: direct | Source Quote: "UI/API/docs/probe must describe shadow-ready default, ceremony-bound ON, explicit OFF, and KW working when on — not bare switch, hard-off forever, always-production, or broken KW." | Implementation Surface: `scripts/track-b/run81-kw-activation-probe.mjs`, `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md` | Verification Surface: public Extensions honesty diff + probe wording | QA Surface: M5
- `R6` | Coverage: direct | Source Quote: "Default KW posture is shadow-ready: validated knowledge present as shadow candidate(s) while production remains off." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: bootstrap shadow-ready RED/GREEN | QA Surface: M2
- `R7` | Coverage: direct | Source Quote: "Retain run-81/82 unlock ceremony for ON so the production flag binds to a specific validated candidate." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: digest-bind still PASS; mismatch refuse | QA Surface: M2
- `R8` | Coverage: direct | Source Quote: "After ceremony-backed ON, derive/rebuild/retrieve remain correct and enforced." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: while-on correctness cases GREEN | QA Surface: M2, M7
- `R9` | Coverage: direct | Source Quote: "`launch-packaged-runtime.mjs` (and shared parsers) bind equals-form and discrete-form identically." | Implementation Surface: `scripts/track-b/packaged-launch-scope.mjs`, `scripts/track-b/launch-packaged-runtime.mjs`, `tests/track-b/packaged-launch-scope.test.mjs` | Verification Surface: equals-form RED/GREEN logs | QA Surface: M1, M3
- `R10` | Coverage: direct | Source Quote: "Toggle must not collapse Set-mode, recommendation apply/dismiss, or contribution opt-out into production activation." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: axis-separation assertions + honesty | QA Surface: M5
- `R11` | Coverage: direct | Source Quote: "When private packaging inputs change, rebuild private dist and package public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`." | Implementation Surface: `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/other/`, `scripts/track-b/launch-packaged-runtime.mjs` | Verification Surface: rebuild receipt sha matches on-disk SEA | QA Surface: M1
- `R12` | Coverage: direct | Source Quote: "Activate/deactivate uses a versioned schema so future operator-auth modes can be added without ambient unlock, ceremony removal, or KW-correctness loss (`FD15`, `FD19`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: unknown-field refuse + versioned deactivate | QA Surface: M2
- `R13` | Coverage: direct | Source Quote: "Run evidence is durable, correlatable, and secret-free." | Implementation Surface: `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/` | Verification Surface: binder secretsOmitted + path audit | QA Surface: M8
- `R14` | Coverage: direct | Source Quote: "Phase 3 uses `TDD Mode: strict` for KW shadow/toggle/ceremony/correctness, launch argv parsing, and any public helper/UI/API touched." | Implementation Surface: `tests/track-b/tb10.test.mjs`, `tests/track-b/packaged-launch-scope.test.mjs` | Verification Surface: evidence/logs/red/, evidence/logs/green/ | QA Surface: not-applicable-with-rationale — process gate audited in Phase 3/4
- `R15` | Coverage: direct | Source Quote: "QA against freshly rebuilt artifacts: shadow-ready/toggle/ceremony, equals-form launch, KW correctness-while-on, and one recommendation trust hop." | Implementation Surface: `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: rebuild receipt + Phase 5 hop logs | QA Surface: M1, M2, M3, M7
- `R16` | Coverage: direct | Source Quote: "Prove live cloud write/resolve path on permanent-dev." | Implementation Surface: `scripts/track-b/cloud-track-e2e.mjs`, `evidence/live-e2e/cloud-track-dev.json` | Verification Surface: fresh cloud-track-dev PASS for this run | QA Surface: M4
- `R17` | Coverage: direct | Source Quote: "Live `pi` requests through the router/runtime must prove storage presence/absence and correctness (`FD18`)." | Implementation Surface: `evidence/live-e2e/local-runtime-and-pi.json`, `scripts/track-b/assemble-run00-live-e2e.mjs` | Verification Surface: pi storage presence+correctness receipt | QA Surface: M4, M7
- `R18` | Coverage: direct | Source Quote: "Binder ties every `R#` to concrete evidence and records the multi-plane matrix." | Implementation Surface: `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/` | Verification Surface: evidence/binder.json | QA Surface: M8
- `R19` | Coverage: direct | Source Quote: "Ship private+public feature branches; Phases 6–8 update DECISIONS/STATE/memory." | Implementation Surface: `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-worktree.md` | Verification Surface: paired SHAs/diffs in binder + Phase 6–8 receipts | QA Surface: not-applicable-with-rationale — delivery/process gate

## Implementation Steps

1. **SP1 — KW shadow-ready + soft OFF + ceremony retain (strict TDD):** failing TB10 cases → `bootstrapShadowReady` + `deactivate` + capability wiring → evolve probe/tests → GREEN; retain digest-bind activate and while-on correctness.
2. **SP2 — Equals-form argv (strict TDD):** failing packaged-launch-scope / launch helper cases → shared equals-form parse → GREEN; update skill issue.
3. **SP3 — Public honesty (strict TDD / UI contract):** update Extensions KW copy; prove axes remain independent; GREEN any public UI/host tests touched.
4. **SP4 — Full assemble + coherent re-freeze (pragmatic evidence):** after product tip clean, advance private pin, run full Playwright assemble, refresh validator failures only, prove pin-freeze + TB11 green. Proof-only-only rebind = FAIL.
5. **SP5 — Rebuild + Phase 5 hops + live cloud + pi:** rebuild private dist + public SEA; launch with equals-form `--track=dev --scope-id=run83-dev`; packaged KW probe; recommendation trust hop; live `cloud-track-e2e` track=dev; live pi storage correctness; write rebuild + plane receipts.
6. **SP6 — Binder + decisions + closeout prep:** write public/server decision JSONs; `binder.json`; full CI logs; hand off to serial Phase 3.5+ after real work only.

## Testing Strategy

TDD Mode: `strict` for KW, launch argv, and public honesty/UI production edits.

Every SP1–SP3 production edit requires:

- RED evidence under `evidence/logs/red/`
- GREEN evidence under `evidence/logs/green/`
- optional REFACTOR under `evidence/logs/refactor/`

SP4 assemble/freeze is pragmatic: cite validator commands and before/after pin SHAs; no fake RED for evidence-only JSON. Assemble must be full Playwright per `FD10`.

### Exact private commands (controller worktree)

```powershell
cd D:/DEV/.wt/83-kw
node --test tests/track-b/tb10.test.mjs
node --test tests/track-b/run81-kw-activation-probe.test.mjs
node --test tests/track-b/packaged-launch-scope.test.mjs
node --test tests/track-b/pin-freeze-gate.test.mjs
node scripts/track-b/assemble-run00-live-e2e.mjs
node --test tests/track-b/tb11.test.mjs
node scripts/track-b/system-proof.mjs
node --test tests/track-b/*.test.mjs
corepack pnpm test:cloud
corepack pnpm test:cloud:e2e -- --track=dev
corepack pnpm test:track-a-exclusion
```

Launch / Phase 5 (after rebuild; prefer equals-form):

```powershell
node scripts/track-b/launch-packaged-runtime.mjs --track=dev --scope-id=run83-dev --public-root D:/DEV/role-model/.worktrees/83-kw-operator-toggle-assemble-live-e2e-argv-equals
node scripts/track-b/run81-kw-activation-probe.mjs --distribution-root D:/DEV/.wt/83-kw/dist/run00-dev --evidence-out D:/DEV/.wt/83-kw/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/other/kw-packaged-toggle-probe.json
```

Confirm helper CLI flags with `--help` before execution; record exact argv in rebuild receipt.

### Exact public commands

```powershell
cd D:/DEV/role-model/.worktrees/83-kw-operator-toggle-assemble-live-e2e-argv-equals
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
corepack pnpm ci:check
```

## Playwright Plan (if applicable)

- **Mandatory for Theme B (`R1`):** full Playwright assemble via `scripts/track-b/assemble-run00-live-e2e.mjs` (not proof-only-only).
- **Phase 5 default:** packaged KW probe + API recommendation trust hop on rebuilt SEA with `run83-dev` / track=dev.
- **Browser contingency:** reuse/adapt prior recursive KW browser evidence only if API hop cannot close `R15` hop under the new scope/honesty.
- Live cloud E2E and pi storage are separate planes (`R16`/`R17`), not substitutes for assemble.

## Manual QA Scenarios

| ID | Scenario | Expected |
|---|---|---|
| `M1` | Fresh rebuild + equals-form launch `--track=dev --scope-id=run83-dev` | Rebuild receipt sha matches SEA; launch listens; binder records scope/URL/sha |
| `M2` | Packaged KW toggle probe | Shadow-ready bootstrap; ceremony ON; soft OFF→shadow-ready; rollback clears; mismatch refuse |
| `M3` | Recommendation trust hop on rebuilt SEA | API apply or dismiss succeeds for `run83-dev` on track=dev |
| `M4` | Live cloud E2E + pi storage | `cloud-track-dev` PASS; pi presence+correctness PASS (U5/U6) |
| `M5` | Honesty + axis separation | Extensions copy states shadow-ready/ceremony/soft OFF; Set-mode ≠ activation |
| `M6` | CI continuity | pin-freeze + TB11 green after full assemble; no proof-only-only closeout |
| `M7` | KW correctness while on | derive/rebuild/retrieve success+refuse still hold after ON |
| `M8` | Binder completeness | `evidence/binder.json` maps every R#; `secretsOmitted: true` |

QA Execution Mode: `agent-operated` (user sign-off not required unless mode changes to human/hybrid).

## Idempotence and Recovery

- Re-running matching ceremony activate remains idempotent success.
- Soft deactivate is idempotent when already off and shadow-ready.
- Mismatch/unbound activate never mutates state.
- Full assemble may be re-run after correcting lock/evidence; never claim PASS via proof-only-only rebind alone.
- Failed Phase 5 hop against stale SEA sha ≠ rebuild receipt ⇒ FAIL; rebuild and rerun.
- Do not widen to ambient ON, ceremony removal, or server churn without an approved addendum.

## Implementation Sub-phases

### `SP1` — KW shadow-ready + soft OFF + ceremony retain (`R3`–`R8`, `R10`, `R12`, `R14`)

Scope: KW API + TB10 + probe evolution.

Checklist:

- [ ] RED TB10: empty cold-start not product-ready; bootstrap → shadow-ready; soft OFF; ceremony ON retained; while-on correctness
- [ ] Implement bootstrapShadowReady + deactivate + knowledge:deactivate
- [ ] GREEN TB10 + prior digest-bind/refuse/rollback cases
- [ ] Evolve probe/tests; GREEN
- [ ] Store RED/GREEN logs

Pass: shadow-ready default via bootstrap; soft OFF; ceremony ON; KW correctness while on.

Recovery: revert KW/probe edits; keep failing tests until green.

### `SP2` — Equals-form argv (`R9`, `R14`)

Scope: packaged-launch-scope + launch-packaged-runtime arg parser + tests + skill issue.

Checklist:

- [ ] RED: equals-form still falls through to default
- [ ] Implement equals-form parse with documented precedence
- [ ] GREEN equals ≡ discrete; default preserved
- [ ] Update skill issue status
- [ ] Store RED/GREEN logs

Pass: `--track=dev` and `--scope-id=run83-dev` bind.

Recovery: revert parser; keep RED until green.

### `SP3` — Public honesty (`R5`, `R10`)

Scope: Extensions KW honesty copy (+ any forced public test updates).

Checklist:

- [ ] Update honesty text for shadow-ready / ceremony ON / soft OFF / KW-when-on
- [ ] Preserve Set-mode ≠ productionActivation
- [ ] Public ops / ci:check GREEN
- [ ] Record publicChange required decision

Pass: M5.

Recovery: revert UI copy; keep honesty RED evidence until green.

### `SP4` — Full assemble + coherent private re-freeze (`R1`–`R2`)

Scope: pin + Playwright assemble + validator refresh (pragmatic evidence).

Checklist:

- [ ] Confirm private product pathset clean at product tip
- [ ] Advance private lock revision
- [ ] Run full assemble-run00-live-e2e (Playwright)
- [ ] Refresh failing validator artifacts only
- [ ] pin-freeze PASS; TB11 live-e2e PASS; system-proof PASS
- [ ] Explicitly refuse proof-only-only as sole closeout

Pass: M6.

Recovery: if assemble fails, repair via supported scripts — do not string-only rewrite.

### `SP5` — Rebuilt SEA + cloud + pi (`R11`, `R15`–`R17`)

Scope: rebuild, launch run83-dev, KW probe, trust hop, cloud E2E, pi storage.

Checklist:

- [ ] Rebuild private distribution; package public SEA with ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT
- [ ] Write rebuild receipt (path, sha256, URL)
- [ ] Launch with equals-form track/scope
- [ ] Packaged toggle probe PASS
- [ ] Recommendation trust hop PASS
- [ ] Live cloud-track-e2e track=dev PASS (redeploy only if U7)
- [ ] Live pi storage presence+correctness PASS (U5/U6)
- [ ] Store logs without secrets

Pass: M1–M4, M7.

Recovery: rebuild on source change; never PASS against stale sha.

### `SP6` — Binder, decisions, delivery prep (`R13`, `R18`, `R19`)

Scope: closeout evidence + decisions.

Checklist:

- [ ] Full private CI logs under run evidence
- [ ] Write public/server decision JSONs
- [ ] Write binder.json mapping every R#
- [ ] Confirm paired worktree delivery readiness
- [ ] Hand off to serial Phase 3.5+ after real work (no anticipatory docs)

Pass: M8.

## Plan Drift Check

- Every Phase 1 source-inventory item `R1`–`R19` has one Requirement Mapping entry with preserved Source Quotes.
- `U1` locked to capability activate/deactivate + probe + honesty (no mandatory new UI button).
- `U2` locked to soft OFF → shadow-ready; rollback remains destructive.
- `U3` locked to keep v1 activate ceremony; additive deactivate v1; unknown fields refuse.
- `U4` locked to leave public pin unless validators force retarget.
- `U5`/`U6` locked to pi provider lead + ≥1 local + ≥1 cloud-bound correctness check.
- `U7` locked to prefer no redeploy.
- `U8` locked to bootstrapShadowReady + product/probe entrypoint bootstrap.
- `OOS` intact: no ambient production-on, no ceremony removal, no proof-only-only freeze closeout, no stage/main auto-promote, no live production track.
- Diff basis unchanged from locked `00-worktree.md`: private `6fd8c68e89d8d2aa1a06681bf8ff4d3552a34755`; public `d72fc2a19c0849c4adf2ad15931d515c5ea37f8d`.
- No merged obligations requiring lossless-combination rationale; each `R#` mapped direct.
- publicChange is **required** (honesty), superseding run-82 not-required default for this run only.

## Effective Inputs Re-read

- Locked `00-requirements.md`, `00-worktree.md`, `01-as-is.md`
- STATE / DECISIONS / MEMORY / domains/direct-track-b.md / launch-argv skill issue
- No addenda present

## Earlier Phase Reconciliation

- Phase 0: Themes A–E co-required; ceremony retained; shadow-ready + soft OFF required.
- Phase 1: gaps confirmed (soft OFF missing, empty cold start, equals-form fallthrough, assemble residual); ceremony present and retained.
- This plan converts Phase 1 preferred stances into normative U1–U8 locks without contradicting Phase 0 FDs.

## Prior Recursive Evidence Reviewed

- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/01-as-is.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/02-to-be-plan.md`
- `.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md`
- `.recursive/memory/domains/direct-track-b.md`
- `extensions/knowledge-worker/index.mjs`
- `scripts/track-b/packaged-launch-scope.mjs`
- `scripts/track-b/assemble-run00-live-e2e.mjs`

## Worktree Diff Audit

### Private controller

- Baseline type: `local commit`
- Baseline reference: `6fd8c68e89d8d2aa1a06681bf8ff4d3552a34755`
- Comparison reference: `working-tree`
- Normalized baseline: `6fd8c68e89d8d2aa1a06681bf8ff4d3552a34755`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6fd8c68e89d8d2aa1a06681bf8ff4d3552a34755`
- Planned or claimed changed files this phase:
  - `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md`
- Actual changed files reviewed: run-83 recursive plan + evidence scaffolding dirs only
- Unexplained drift: none; no product implementation in Phase 2

### Paired public implementation

- Baseline type: `local commit`
- Baseline reference: `d72fc2a19c0849c4adf2ad15931d515c5ea37f8d`
- Comparison reference: `working-tree`
- Normalized baseline: `d72fc2a19c0849c4adf2ad15931d515c5ea37f8d`
- Normalized comparison: `working-tree`
- Normalized diff command: `git -C "D:/DEV/role-model/.worktrees/83-kw-operator-toggle-assemble-live-e2e-argv-equals" diff --name-only d72fc2a19c0849c4adf2ad15931d515c5ea37f8d`
- Planned changed files this phase: mirrored `02-to-be-plan.md` only
- Unexplained drift: none product-blocking

## Phase-Scoped Diff Ownership

Phase 2 owns this plan and expected product/worktree change surface. It does not implement code, assemble, or freeze commits.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Task/explore available; not used for Phase 2 authoring
Delegation Override Reason: Phase 2 ExecPlan is derived directly from locked Phase 1 measurements and Phase 0 FDs; controller holds the complete context bundle for U1–U8 locks
Delegation Decision Basis: self-audit chosen to keep soft-OFF / shadow-ready / equals-form / assemble decisions atomic with the plan text
Audit Inputs Provided:
- locked Phase 0/1 artifacts
- fixed decisions above
- planned file table and requirement mapping
- diff basis from `00-worktree.md`

## Gaps Found

- None blocking Phase 2 completeness or audit.

## Repair Work Performed

- Locked soft OFF to retain candidates; rollback stays destructive.
- Locked shadow-ready via bootstrapShadowReady + product/probe entrypoint requirement (not ambient production).
- Locked equals-form argv precedence and Phase 5 equals-form preferred argv.
- Locked full Playwright assemble as sole acceptable freeze honesty path for R1/R2.
- Locked publicChange required for honesty (unlike run-82 not-required).

## Requirement Completion Status

- `R1 | Status: planned | Implementation Surface: scripts/track-b/assemble-run00-live-e2e.mjs, evidence/live-e2e/run00-live-e2e-manifest.json | Verification Surface: assemble PASS + fresh capturedAt + TB11 | QA Surface: M1, M6`
- `R2 | Status: planned | Implementation Surface: evidence/source-set/tb00-release-source-lock.json, tests/track-b/pin-freeze-gate.test.mjs | Verification Surface: pin-freeze PASS + binder SHAs | QA Surface: M1, M6`
- `R3 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, scripts/track-b/run81-kw-activation-probe.mjs, tests/track-b/tb10.test.mjs | Verification Surface: activate/deactivate GREEN | QA Surface: M2, M5`
- `R4 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: soft OFF retains candidates | QA Surface: M2`
- `R5 | Status: planned | Implementation Surface: scripts/track-b/run81-kw-activation-probe.mjs, .recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md | Verification Surface: public honesty diff + probe wording | QA Surface: M5`
- `R6 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: bootstrap shadow-ready RED/GREEN | QA Surface: M2`
- `R7 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: digest-bind retained | QA Surface: M2`
- `R8 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: while-on correctness GREEN | QA Surface: M2, M7`
- `R9 | Status: planned | Implementation Surface: scripts/track-b/packaged-launch-scope.mjs, scripts/track-b/launch-packaged-runtime.mjs, tests/track-b/packaged-launch-scope.test.mjs | Verification Surface: equals-form RED/GREEN | QA Surface: M1, M3`
- `R10 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: axis-separation assertions | QA Surface: M5`
- `R11 | Status: planned | Implementation Surface: .recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/other/, scripts/track-b/launch-packaged-runtime.mjs | Verification Surface: rebuild receipt | QA Surface: M1`
- `R12 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: versioned deactivate + unknown-field refuse | QA Surface: M2`
- `R13 | Status: planned | Implementation Surface: .recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/ | Verification Surface: binder secretsOmitted | QA Surface: M8`
- `R14 | Status: planned | Implementation Surface: tests/track-b/tb10.test.mjs, tests/track-b/packaged-launch-scope.test.mjs | Verification Surface: evidence/logs/red/, evidence/logs/green/ | QA Surface: not-applicable-with-rationale — process gate`
- `R15 | Status: planned | Implementation Surface: scripts/track-b/launch-packaged-runtime.mjs, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: rebuild receipt + Phase 5 hops | QA Surface: M1, M2, M3, M7`
- `R16 | Status: planned | Implementation Surface: scripts/track-b/cloud-track-e2e.mjs, evidence/live-e2e/cloud-track-dev.json | Verification Surface: fresh cloud-track-dev PASS | QA Surface: M4`
- `R17 | Status: planned | Implementation Surface: evidence/live-e2e/local-runtime-and-pi.json, scripts/track-b/assemble-run00-live-e2e.mjs | Verification Surface: pi storage presence+correctness | QA Surface: M4, M7`
- `R18 | Status: planned | Implementation Surface: .recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/ | Verification Surface: evidence/binder.json | QA Surface: M8`
- `R19 | Status: planned | Implementation Surface: .recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-worktree.md | Verification Surface: binder paired SHAs + Phase 6-8 | QA Surface: not-applicable-with-rationale — delivery gate`

## Audit Verdict

- Audit summary: Plan locks soft OFF→shadow-ready, bootstrapShadowReady, ceremony-retained ON, equals-form argv, full Playwright assemble, public honesty required, rebuilt SEA Phase 5, live cloud track=dev, and pi storage correctness under strict TDD for product code.
- Follow-up before Phase 2 lock: none.
- Audit: PASS

## Subagent Contribution Verification

- Reviewed Action Records: none for Phase 2
- Main-Agent Verification Performed: plan cross-checked against locked AS-IS U1–U8 and requirements FD/R matrix
- Discrepancies found after delegated work: n/a
- Acceptance decision: accept

## Traceability

- `R1` -> SP4 full Playwright assemble | Evidence: assemble-run00-live-e2e.mjs
- `R2` -> SP4 private pin + pin-freeze | Evidence: tb00-release-source-lock.json
- `R3` -> SP1 activate/deactivate capabilities + probe | Evidence: knowledge-worker + probe
- `R4` -> SP1 soft OFF vs rollback | Evidence: tb10
- `R5` -> SP3 public honesty + probe wording | Evidence: extensions honesty + probe
- `R6` -> SP1 bootstrapShadowReady | Evidence: knowledge-worker + tb10
- `R7` -> SP1 retain digest bind | Evidence: tb10
- `R8` -> SP1/SP5 while-on correctness | Evidence: tb10 + Phase 5
- `R9` -> SP2 equals-form argv | Evidence: packaged-launch-scope + launch helper
- `R10` -> SP1/SP3 axis separation | Evidence: tb10 + honesty
- `R11` -> SP5 rebuild receipt | Evidence: evidence/other
- `R12` -> SP1 versioned deactivate | Evidence: knowledge-worker
- `R13` -> SP6 evidence hygiene | Evidence: evidence/
- `R14` -> SP1–SP3 RED/GREEN | Evidence: evidence/logs/red|green
- `R15` -> SP5 rebuilt hops | Evidence: rebuild receipt + probe + trust hop
- `R16` -> SP5 cloud-track-e2e track=dev | Evidence: cloud-track-dev.json
- `R17` -> SP5 pi storage correctness | Evidence: local-runtime-and-pi.json
- `R18` -> SP6 binder | Evidence: evidence/binder.json
- `R19` -> paired delivery + Phases 6–8 | Evidence: 00-worktree + closeout

## Coverage Gate

- Effective inputs reviewed: locked Phase 0/1, requirements FDs, AS-IS unknowns
- Requirement coverage check: `R1`–`R19` mapped direct with surfaces
- Out-of-scope confirmation: ambient on / ceremony removal / proof-only-only / production track / stage-main auto-promote unchanged
- Plan Drift Check: PASS

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - U1–U8 decided
  - Strict TDD + full assemble path explicit
  - Phase 5 rebuilt SEA + equals-form run83-dev explicit
  - Live cloud + pi storage planes explicit
  - No product code claimed in this phase
- Remaining blockers: none for Phase 2 lock

Approval: PASS

## Audit

Audit: PASS
