Run: `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-25T11:30:03Z`
LockHash: `4d9c67ec90dd80dffae05b38d7fc6c77489b3f081540980e390d19dd3a3948e7`
Workflow version: `recursive-mode-audit-v2`
CapturedAt: `2026-07-25T19:36:00+08:00`
Inputs:
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-requirements.md`
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-worktree.md`
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/direct-track-b.md`
Outputs:
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/02-to-be-plan.md`
Scope note: ExecPlan for ceremony-preserving KW host/UI ON/OFF, durable activation, versioned shadow/production retrieve, an eval-shaped first-party gated consumer, preservation of run-83 invariants, strict TDD, rebuilt SEA browser/API proof, live cloud/`pi`, conditional full assemble, binder, and paired closeout. Product implementation already partially exists as Phase 3 WIP; Phase 2 plans and reconciles that pathset but does not claim it implemented.

## TODO

- [x] Read locked Phase 0 and Phase 1 artifacts
- [x] Re-read STATE, DECISIONS, MEMORY, and Direct Track B memory
- [x] Lock normative decisions `U1`–`U10`
- [x] Define API, durability, retrieve vocabulary, consumer, and refusal contracts
- [x] Define planned private/public files and `publicChange`/`serverChange`
- [x] Map every `R1`–`R22` to implementation, verification, and QA
- [x] Define ordered `SP1`–`SP6` with checklists, commands, pass, and recovery
- [x] Define strict TDD, Playwright, rebuilt SEA, cloud, `pi`, freeze, and binder strategy
- [x] Reconcile post-measurement Phase 3 WIP without claiming implementation
- [x] Complete Plan Drift Check, self-audit, RCS, Coverage, Approval, and Audit PASS

## Fixed Design Decisions

These locks resolve Phase 1 `U1`–`U10` and are normative for Phase 3+.

### `U1` — Ceremony material in UI (normative)

`bootstrap_shadow_ready` validates/bootstrap-derives the candidate and stores its structural ceremony receipt in the public runtime session state. `activate_production` uses that stored receipt when no explicit receipt is supplied, or validates an explicit receipt supplied in the action payload. The UI sequence is Prepare shadow-ready → Production ON; it never manufactures an attestation-only or bare-boolean unlock. The host records which receipt source was used without persisting secrets.

### `U2` — Durable activation binding (normative)

1. Public host state stores per-runtime-session KW `productionActivation`, shadow-ready metadata, and stored bootstrap receipt alongside the existing lifecycle record.
2. Private `run(input)` requires/accepts `sessionId` for operator/retrieve/consumer calls and reuses a `KnowledgeWorker` instance from a session map.
3. Same-session status, retrieve, and consumer calls observe activation until soft OFF or process restart.
4. Restart is an explicit boundary: state returns safely to shadow-ready/off and must not silently resume production ON.

### `U3` — First-party consumer (normative)

Add `evaluateWithProductionKnowledge` and expose it as capability `knowledge:eval-consumer`. It calls the production retrieve contract, emits an eval-shaped structured trace identifying production-plane use, fails closed while OFF, succeeds on valid knowledge while ON, and fails closed again after soft OFF. This is not Profile Learner/GRPO training and does not unlock router prompt injection.

### `U4` — Retrieve vocabulary (normative)

`query.plane` is `"shadow" | "production"`:
- missing `plane` defaults to `"shadow"` and remains usable while OFF;
- `"production"` requires instance `productionActivation === true`;
- unknown planes refuse;
- `gateContractVersion` defaults to `1`; unsupported versions and unknown contract fields refuse;
- a shadow response cannot claim or expose production-plane use.

### `U5` — Host API actions (normative)

Extend the existing audited `mutateExtension` API with KW-only actions:
- `bootstrap_shadow_ready`
- `activate_production`
- `deactivate_production`

They are distinct from `enable`, `disable`, and `set_mode`. Existing enablement remains the sole Set-mode authority. Non-KW targets refuse these actions. Receipts retain `who=local-operator` (or the existing audited equivalent), what, when, result, and safe ceremony identifiers.

### `U6` — Versioning (normative)

- Activation policy version `1` is retained unchanged: receipt + verified claims + shadow candidate + digest bind + `operatorAttestation: "activate-production"`.
- Host action payloads are additive wrappers; they do not weaken activation v1.
- Retrieve uses `gateContractVersion: 1` plus `query.plane`; defaulted v1 is allowed for compatibility, but unsupported versions/unknown fields refuse.
- Future auth modes, planes, and consumers require additive versions.

### `U7` — Stable refusal observables (normative)

- production retrieve while OFF: `kw_production_retrieve_requires_activation`
- eval consumer without successful production retrieve: `kw_consumer_requires_production_retrieve`
- unsupported retrieve plane/version/field: namespaced `kw_retrieve_contract_refused` with structured reason
- ceremony failures: retain existing refused/prohibited family and no activation mutation
- refused results contain no production knowledge payload

### `U8` — Public freeze pin (normative)

Leave the public freeze pin unchanged unless public product-tip validation proves a retarget is required. Record the decision. Private tip drift is measured after Phase 3; if pin-freeze/TB11 fails, use the supported full Playwright assemble.

### `U9` — Live `pi` marker (normative)

Reuse the run-83 provider/model and marker/correlation approach from `evidence/live-e2e/local-runtime-and-pi.json` and current router config. Phase 5 records exact sanitized argv, at least one local storage assertion, and at least one cloud-bound/history correctness assertion where exercised.

### `U10` — Permanent-dev workers (normative)

Use existing permanent-dev workers. Redeploy only if fresh run-84 `cloud-track-e2e --track=dev` proves worker drift blocks `R18`; otherwise `serverChange: not-required`.

### Cross-cutting fixed decisions

| ID | Decision |
|---|---|
| Safe default | static class flag false; process restart returns shadow-ready/off |
| Ceremony | no bare boolean, fake receipt, attestation-only ON, or digest-bind removal |
| Axis separation | Set mode ≠ recommendation apply/dismiss ≠ contribution opt-out ≠ activation ≠ production retrieve |
| Consumer | eval-shaped helper is first-party and must consume production retrieve |
| Public change | `publicChange: required` for host API, runtime API, and Extensions UI |
| Server change | `serverChange: not-required` unless `U10` drift is proven |
| Launch | `--track=dev --scope-id=run84-dev --evidence-root=<run84>`; equals/discrete remain equivalent |
| TDD | strict for all SP1–SP4 production edits and probe/package contract edits |
| Playwright | run-84 browser spec proves visible UI invokes activation API on rebuilt SEA |
| Freeze | full assemble only if pin/TB11 drift; proof-only-only closeout is FAIL |
| Promotion | dev feature branches only; no stage/main auto-promotion or production-track writes |
| Serial docs | Phase 3.5–8 authored only after their real work |

## Planned Changes by File

| Repository / owner | File | Planned change |
|---|---|---|
| Private KW | `extensions/knowledge-worker/index.mjs` | Plane/version validation, production gate, stable codes, session map, eval consumer, capability routing |
| Private contract | `extensions/knowledge-worker/package.json` | Declare production retrieve/eval consumer and retained activation capabilities |
| Private tests | `tests/track-b/tb10.test.mjs` | RED→GREEN gate, vocabulary, durability, consumer, ceremony/preserve/axis cases |
| Private probe | `scripts/track-b/run81-kw-activation-probe.mjs` | Evolve to full OFF→ON→OFF retrieve/consumer/durability sequence |
| Private probe tests | `tests/track-b/run81-kw-activation-probe.test.mjs` | RED→GREEN structured trace/codes/evidence-root contracts |
| Private packaging/launch | existing build + `scripts/track-b/launch-packaged-runtime.mjs` | Rebuild dist; launch `run84-dev` with run-84 evidence root |
| Private freeze/assemble | pin/assemble files only if gates require | Full assemble + coherent pin refresh; no proof-only-only |
| Public host | `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Durable KW state, stored receipt, three KW mutate actions, honest status |
| Public host tests | `role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts` | Ceremony refusal, bootstrap/ON/OFF/status durability, axes, audits |
| Public runtime API | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Type/call support for new actions and status |
| Public runtime API tests | `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts` | Request/response wiring and error observables |
| Public Extensions UI | `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Prepare shadow-ready, Production ON, Soft OFF, status, disabled/error honesty |
| Public UI tests | `role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` | Control presence/wiring, honest disabled states, axis separation/copy |
| Public browser test | `role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts` | Rebuilt SEA operator-visible activation sequence |
| Run evidence | `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/**` | RED/GREEN, rebuild, browser/API, cloud, `pi`, freeze decision, binder |
| Later control plane | `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `.recursive/memory/**` | Phases 6–8 only |

Private root: `D:/DEV/.wt/84-kw`  
Public root: `D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval`

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "Expose audited public/host API actions for Knowledge Worker ceremony-backed ON and soft OFF, distinct from `enable` / `disable` / `set_mode` (`U5`)." | Implementation Surface: `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: public operations API tests | QA Surface: M1, M3
- `R2` | Coverage: direct | Source Quote: "Host retains KW activation state for the packaged runtime session so UI/API toggles remain observable on subsequent status, production retrieve, and consumer calls (`U2`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: TB10 + host consecutive-call tests | QA Surface: M2, M3
- `R3` | Coverage: direct | Source Quote: "Host status surfaces expose enough KW activation + shadow-ready signal for UI and probes without requiring private-only inspection." | Implementation Surface: `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: host/runtime API/UI tests | QA Surface: M1, M3
- `R4` | Coverage: direct | Source Quote: "Extensions UI provides explicit KW `productionActivation` ON and soft OFF controls (not honesty-only), wired to `R1`/`R2`." | Implementation Surface: `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts` | Verification Surface: UI unit + run-84 Playwright | QA Surface: M1
- `R5` | Coverage: direct | Source Quote: "UI/API/docs/probe wording matches the state machine: shadow-ready default, ceremony ON, soft OFF, production retrieve gated / useful when on, ≠ Set mode, ≠ recommendation apply, no inject unlock claim." | Implementation Surface: `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: UI/probe tests | QA Surface: M1, M8
- `R6` | Coverage: direct | Source Quote: "Production retrieve requires instance `productionActivation === true` and uses Phase-2-locked vocabulary (`U4`, `FD6`, `FD7`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: TB10 OFF/ON/OFF tests | QA Surface: M2
- `R7` | Coverage: direct | Source Quote: "Phase 2 locks an explicit, versioned way to request production vs shadow retrieve so future callers cannot accidentally get production results while OFF (`U4`, `R12`)." | Implementation Surface: `query.plane`, `gateContractVersion` | Verification Surface: TB10 missing/unknown/production cases | QA Surface: M2
- `R8` | Coverage: direct | Source Quote: "At least one first-party consumer path depends on production retrieve and only succeeds when KW is ON (`U3`). This is the “KW is useful, not just toggled” proof." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `extensions/knowledge-worker/package.json` | Verification Surface: TB10 + probe + packaged hop | QA Surface: M2, M3
- `R9` | Coverage: direct | Source Quote: "Refuse paths for activation and production retrieve/consumer use stable, testable observables (`U7`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: exact-code assertions | QA Surface: M2, M3
- `R10` | Coverage: direct | Source Quote: "Extend KW probe (and/or new run-84 probe) for host/UI-equivalent matrix + retrieve gate + consumer proof; keep run-83 soft toggle matrix green." | Implementation Surface: `scripts/track-b/run81-kw-activation-probe.mjs`, `tests/track-b/run81-kw-activation-probe.test.mjs` | Verification Surface: probe RED/GREEN + packaged JSON | QA Surface: M3
- `R11` | Coverage: direct | Source Quote: "Package/contract surfaces declare activate/deactivate/retrieve (and any new production-retrieve) capabilities so UI/host are not calling undeclared capabilities." | Implementation Surface: private KW package.json + public action types | Verification Surface: contract/depth/public type tests | QA Surface: M3
- `R12` | Coverage: direct | Source Quote: "Activate/deactivate and production-retrieve gate use versioned schemas so future auth modes and consumers can extend without ambient unlock, ceremony removal, or silent production leakage (`FD19`, `FD20`, `E1`–`E5`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: unknown field/version refusal tests | QA Surface: M2
- `R13` | Coverage: direct | Source Quote: "This run must not regress run-83: ceremony ON, soft OFF → shadow-ready, KW correctness while on, equals-form argv, evidence-root hygiene." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `scripts/track-b/run81-kw-activation-probe.mjs`, `scripts/track-b/launch-packaged-runtime.mjs` | Verification Surface: TB10 + launch/probe regressions | QA Surface: M2, M3
- `R14` | Coverage: direct | Source Quote: "UI/API activation must not collapse Set-mode, recommendation apply/dismiss, or contribution opt-out into production activation / production retrieve." | Implementation Surface: `tests/track-b/tb10.test.mjs`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Verification Surface: axis-independence assertions | QA Surface: M1, M6
- `R15` | Coverage: direct | Source Quote: "Phase 3 uses `TDD Mode: strict` for KW gate, host API, UI production edits, and consumer gate wiring (`FD10`)." | Implementation Surface: `tests/track-b/tb10.test.mjs`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts`, `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` | Verification Surface: `evidence/logs/red/`, `evidence/logs/green/` | QA Surface: not-applicable-with-rationale — process gate
- `R16` | Coverage: direct | Source Quote: "When private packaging inputs change, rebuild private dist and package public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (`FD14`)." | Implementation Surface: `package.json`, public `package.json` | Verification Surface: rebuild receipt/hash/packaging validation | QA Surface: M3
- `R17` | Coverage: direct | Source Quote: "Agent-operated Phase 5 proves durable UI/API ON/OFF and gated retrieve/consumer on a freshly rebuilt packaged runtime." | Implementation Surface: `../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: SEA sha-bound sequence logs | QA Surface: M1–M3
- `R18` | Coverage: direct | Source Quote: "Retain live recommendation apply+dismiss hop on scoped run id against bound `--track=dev` (regression: KW/UI work must not break rec path; axes stay independent)." | Implementation Surface: `scripts/track-b/run80-live-recommendation-lifecycle.mjs`, `scripts/track-b/cloud-track-e2e.mjs` | Verification Surface: fresh run-84 PASS receipt | QA Surface: M6
- `R19` | Coverage: direct | Source Quote: "Live `pi` storage presence/correctness check remains green for this run’s packaged runtime (`FD22`)." | Implementation Surface: `scripts/track-b/assemble-run00-live-e2e.mjs`, `evidence/live-e2e/local-runtime-and-pi.json` | Verification Surface: fresh sanitized storage receipt | QA Surface: M7
- `R20` | Coverage: direct | Source Quote: "If private product tip advances enough to break pin-freeze/TB11, refresh with full Playwright assemble (not proof-only-only) (`FD16`)." | Implementation Surface: `evidence/source-set/tb00-release-source-lock.json`, `scripts/track-b/assemble-run00-live-e2e.mjs` | Verification Surface: pin-freeze + TB11 + assemble or no-drift receipt | QA Surface: M5
- `R21` | Coverage: direct | Source Quote: "Every `R1`–`R22` has machine-checkable RCS in Phases 3–5; binder maps evidence secret-free." | Implementation Surface: `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/` | Verification Surface: binder.json + phase RCS | QA Surface: M8
- `R22` | Coverage: direct | Source Quote: "Ship private+public feature branches; Phases 6–8 update DECISIONS/STATE/memory. Merge remains operator-requested unless user authorizes in-run (`FD23`)." | Implementation Surface: `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-worktree.md`, `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `.recursive/memory/` | Verification Surface: paired SHAs/diffs and locked Phases 6–8 | QA Surface: not-applicable-with-rationale — delivery gate

## Implementation Steps

1. **SP1 — Private gate + contract:** strict RED for `plane`, version, OFF/ON/OFF, stable codes, preserve cases; implement production retrieve gate and package declarations; GREEN.
2. **SP2 — Private durability + consumer + probe:** strict RED for session reuse/eval consumer/probe; implement `run(sessionId)` map, eval helper/capability, structured trace; GREEN.
3. **SP3 — Public host durability/API/status:** strict RED host tests; implement stored receipt, durable activation fields, three KW-only actions, honest status/audit; GREEN.
4. **SP4 — Public runtime API + Extensions UI + browser spec:** strict RED unit tests; implement controls/copy/wiring; add run-84 Playwright spec; GREEN unit tests.
5. **SP5 — Regressions, package, pin decision:** run private/public CI; measure pin-freeze/TB11; full assemble only if required; rebuild private dist and public SEA; bind receipt/hash.
6. **SP6 — Agent-operated Phase 5 + binder:** run SEA browser UI, packaged gate/consumer probe, live recommendation dev hop, `pi` storage correctness, decision JSONs, binder, then hand off serially.

## Testing Strategy

TDD Mode: `strict` for SP1–SP4 and any production contract/probe edit.

- Before each production edit, capture a targeted failing command under `evidence/logs/red/`.
- After minimal implementation, capture the same targeted command under `evidence/logs/green/`.
- Preserve prior tests; refactors may follow only after GREEN.
- SP5 evidence/pin/rebuild operations are pragmatic because generated receipts are not production logic; commands, before/after SHAs, and hashes are still recorded.
- Current Phase 3 WIP must be reconciled against existing RED logs; missing pre-change RED for any changed strict surface is a Phase 3 audit failure, not something Phase 2 may waive.

### Exact private commands

```powershell
cd D:/DEV/.wt/84-kw
node --test tests/track-b/tb10.test.mjs
node --test tests/track-b/run81-kw-activation-probe.test.mjs
node --test tests/track-b/packaged-launch-scope.test.mjs
node --test tests/track-b/pin-freeze-gate.test.mjs
node --test tests/track-b/tb11.test.mjs
node scripts/track-b/system-proof.mjs
node --test tests/track-b/*.test.mjs
corepack pnpm test:cloud
```

If pin-freeze/TB11 requires refresh:

```powershell
node scripts/track-b/assemble-run00-live-e2e.mjs
node --test tests/track-b/pin-freeze-gate.test.mjs
node --test tests/track-b/tb11.test.mjs
```

### Exact public commands

```powershell
cd D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/routes/extensions.test.tsx
corepack pnpm ci:check
```

Package with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=D:/DEV/.wt/84-kw/dist/run00-dev`, then run `corepack pnpm runtime:validate-packaging`. Record the exact environment-safe command and SEA hash in the rebuild receipt.

## Playwright Plan (if applicable)

- Add `role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts`.
- Run from `role-model-router/apps/runtime-ui` with:

```powershell
corepack pnpm test:browser -- e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts
```

- The spec targets the freshly rebuilt SEA and proves operator-visible Prepare shadow-ready → Production ON → status ON → Soft OFF → status shadow-ready/off.
- It asserts the control is separate from Set mode and that disabled/error state is honest when ceremony material is unavailable.
- API/probe setup may supply valid bootstrap material, but Playwright must click the UI activation control and observe the host transition; API-only evidence cannot satisfy `R4`/`R17`.
- Existing run-81/browser and Track B operations specs remain regression coverage; the run-84 file is the stable filter because tags are not required by the current setup.

## Manual QA Scenarios

| ID | Scenario | Expected |
|---|---|---|
| `M1` | Rebuilt SEA Extensions UI | Prepare, ON, status ON, Soft OFF, shadow-ready/off; distinct from Set mode |
| `M2` | Private KW gate matrix | shadow default works; production OFF refuses exact code; ON succeeds; OFF refuses again |
| `M3` | Session + eval consumer + probe | same session stays ON across calls; eval fails OFF, succeeds ON with production trace, fails after OFF |
| `M4` | Ceremony refusal/versioning | missing/mismatch/unknown fields/version refuse without mutation or payload |
| `M5` | Pin/freeze honesty | gates green without refresh, or full Playwright assemble + coherent pin; never proof-only-only |
| `M6` | Live recommendation `--track=dev` | apply+dismiss PASS; does not activate KW |
| `M7` | Live `pi` storage | sanitized local/cloud-bound presence and marker/schema/hash correctness |
| `M8` | Honesty/binder | no inject/training claim; every R mapped; `secretsOmitted: true`; decisions recorded |

QA Execution Mode: `agent-operated`; no user sign-off required unless later changed to human/hybrid.

## Idempotence and Recovery

- Repeated `bootstrap_shadow_ready` with equivalent material is idempotent and refreshes no production authority.
- Repeated valid activation in the same session is idempotent; mismatched ceremony never mutates state.
- Soft OFF is idempotent and retains candidates/stored safe shadow material.
- Unknown session IDs start safely shadow/off; process restart never resumes ON.
- Production retrieve/consumer refuse paths return no production payload.
- If a strict-surface WIP lacks RED evidence, reconstruct from baseline in evidence without reverting user work, then audit before acceptance.
- If SEA hash differs from rebuild receipt, rebuild and rerun all Phase 5 hops.
- If pin/freeze fails after tip change, use full assemble; do not repair by string-only/proof-only rewrite.
- Do not widen to server redeploy, inject unlock, training unlock, production track, or stage/main without an approved addendum.

## Implementation Sub-phases

### `SP1` — Private production retrieve gate (`R6`, `R7`, `R9`, `R11`–`R13`, `R15`)

Checklist:
- [ ] RED: production while OFF, unknown plane/version/field, payload absence, preserve ceremony/correctness
- [ ] Implement `query.plane`, gate v1, exact refusal codes
- [ ] Update package capabilities/contracts
- [ ] GREEN targeted TB10 and full TB10
- [ ] Store RED/GREEN logs

Pass: shadow remains safe/default; production OFF refuses exact code; valid ON succeeds; contract is versioned; run-83 cases stay green.

Recovery: repair only gate/contract surfaces; retain failing tests until GREEN.

### `SP2` — Private session durability + eval consumer + probe (`R2`, `R8`–`R10`, `R13`, `R15`)

Checklist:
- [ ] RED session continuity and restart/new-session safe default
- [ ] RED eval consumer OFF/ON/OFF and structured production trace
- [ ] Implement session map + `evaluateWithProductionKnowledge` / `knowledge:eval-consumer`
- [ ] Evolve probe and tests with run-84 evidence-root
- [ ] GREEN targeted and regression tests; store logs

Pass: one session retains ON across calls; consumer is fail-closed OFF and useful ON.

Recovery: clear only test session state; never promote singleton ambient ON.

### `SP3` — Public host API/status durability (`R1`–`R3`, `R9`, `R11`, `R12`, `R14`, `R15`)

Checklist:
- [ ] RED three KW-only actions, ceremony refusals, audited receipt, durable status, non-KW refusal
- [ ] Implement stored receipt + activation/shadow state in lifecycle record
- [ ] Wire bootstrap/activate/deactivate without changing Set-mode semantics
- [ ] GREEN host API tests and public contracts
- [ ] Record `publicChange: required`

Pass: same runtime session reports durable state; host preserves ceremony and axes.

Recovery: roll back host action wiring together; never leave UI-visible state without backend authority.

### `SP4` — Runtime API + Extensions UI + browser contract (`R4`, `R5`, `R14`, `R15`)

Checklist:
- [ ] RED runtime API and Extensions tests for controls/wiring/status/error/copy
- [ ] Implement Prepare, Production ON, Soft OFF controls using host status
- [ ] Add run-84 Playwright spec
- [ ] GREEN public unit tests and `ci:check`
- [ ] Preserve Set-mode and recommendation separation

Pass: unit tests prove wiring; browser spec is ready for rebuilt SEA and cannot be substituted by API-only evidence.

Recovery: keep controls disabled with honest error state if host contract is unavailable; do not invent UI-only state.

### `SP5` — Regression, freeze decision, rebuild (`R13`, `R15`, `R16`, `R20`)

Checklist:
- [ ] Full private/public targeted and CI suites green
- [ ] Measure pin-freeze/TB11 after product tip
- [ ] If required, run full Playwright assemble and coherent re-freeze
- [ ] Build private run00 distribution
- [ ] Package/validate public SEA with distribution root
- [ ] Write rebuild + public/server/freeze decision receipts

Pass: clean gates and SHA-bound complete SEA; proof-only-only never used as sole closeout.

Recovery: rebuild on any source change; rerun assemble only via supported script.

### `SP6` — Phase 5 planes + binder + delivery prep (`R17`–`R22`)

Checklist:
- [ ] Launch `--track=dev --scope-id=run84-dev --evidence-root=<run84>`
- [ ] Recheck SEA SHA immediately before hops
- [ ] Run UI Playwright transition and packaged gate/consumer probe
- [ ] Run live recommendation apply+dismiss and prove no KW activation
- [ ] Run live `pi` storage presence/correctness
- [ ] Write secret-free binder mapping `R1`–`R22`
- [ ] Hand off to serial Phase 3.5–8 only after actual work

Pass: M1–M8 green and binder complete.

Recovery: rerun failed plane after bounded repair; do not use stale artifacts or cross-run evidence roots.

## Plan Drift Check

- Every Phase 1 Source Requirement Inventory item `R1`–`R22` has exactly one Requirement Mapping entry and one planned RCS entry.
- `U1`: stored bootstrap receipt or explicit receipt; ceremony retained.
- `U2`: public lifecycle activation state plus private `run(sessionId)` session map; restart safely off.
- `U3`: `evaluateWithProductionKnowledge` / `knowledge:eval-consumer`.
- `U4`: `query.plane` shadow|production, default shadow, gate v1.
- `U5`: `bootstrap_shadow_ready|activate_production|deactivate_production`, distinct from Set mode.
- `U6`: activation policy v1 retained; additive host/retrieve contracts.
- `U7`: exact production/consumer codes plus namespaced contract refusal.
- `U8`–`U10`: leave public pin unless forced; run-83 `pi` lead; permanent-dev preferred.
- `R4` remains actual UI wiring; API-only PASS is forbidden.
- `R8` remains production-retrieve-dependent first-party eval proof, not silent empty success or training unlock.
- `R13`/`R14` preservation obligations are explicit in SP1–SP6.
- OOS remains intact: no ambient ON, ceremony removal, router inject unlock, training unlock, production track, stage/main promotion, proof-only-only, or UI-only state.
- Diff basis remains private `7a85d560…` and public `f52f8e30…`; current product files are expected Phase 3 WIP, not Phase 2 implementation claims.
- No obligations are merged lossily; each R maps direct.

## Effective Inputs Re-read

- Locked `00-requirements.md`, `00-worktree.md`, and `01-as-is.md`
- `.recursive/STATE.md`, `.recursive/DECISIONS.md`, `.recursive/memory/MEMORY.md`
- `.recursive/memory/domains/direct-track-b.md`
- Current private/public WIP path inventories for expected-surface reconciliation
- No addenda are present

## Earlier Phase Reconciliation

- Phase 0 requires all Themes A–G together; this plan keeps UI, host, durability, gate, consumer, preservation, packaging, cloud, `pi`, freeze, and closeout co-required.
- Phase 1 baseline gaps map to SP1–SP4; its not-started verification/delivery planes map to SP5–SP6.
- Phase 1’s preferred measurements become the exact user-directed U locks without ceremony or axis weakening.
- Product WIP that began after Phase 1 measurement is within the planned files; Phase 3 must still reconcile tests/evidence and may not cite this plan as proof of implementation.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/01-as-is.md`
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md`
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/binder.json`
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/binder.json`
- `/.recursive/memory/domains/direct-track-b.md`
- `evidence/live-e2e/local-runtime-and-pi.json`

## Worktree Diff Audit

### Private controller

- Baseline type: `local commit`
- Baseline reference: `7a85d560a30a49b33fe309d5a88f4fbbe86a14c0`
- Comparison reference: `working-tree`
- Normalized baseline: `7a85d560a30a49b33fe309d5a88f4fbbe86a14c0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 7a85d560a30a49b33fe309d5a88f4fbbe86a14c0`
- Phase 2-owned file: `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/02-to-be-plan.md`
- Expected Phase 3 WIP currently present: `extensions/knowledge-worker/index.mjs`, `extensions/knowledge-worker/package.json`, `scripts/track-b/run81-kw-activation-probe.mjs`, `tests/track-b/run81-kw-activation-probe.test.mjs`, `tests/track-b/tb10.test.mjs`
- Unexplained drift: none; product WIP is within SP1/SP2 expected scope but remains Phase 3-owned.

### Paired public implementation

- Baseline type: `local commit`
- Baseline reference: `f52f8e301f8e84b04f7103403207e4ebcf29271e`
- Comparison reference: `working-tree`
- Normalized baseline: `f52f8e301f8e84b04f7103403207e4ebcf29271e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git -C "D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval" diff --name-only f52f8e301f8e84b04f7103403207e4ebcf29271e`
- Phase 2-owned file: mirrored `02-to-be-plan.md`
- Expected Phase 3 WIP currently present: public host source/test, runtime API source/test, Extensions source/test listed in Planned Changes
- Planned but not yet observed at audit: run-84 Playwright spec
- Unexplained drift: none; existing product WIP is within SP3/SP4 scope.

## Phase-Scoped Diff Ownership

Phase 2 owns planning completeness and the expected private/public product pathset. It does not own or certify product WIP, RED/GREEN evidence, generated builds, freeze artifacts, Phase 5 receipts, binder, or later DECISIONS/STATE/memory changes.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: local subagent capability is available, but nested subagents are prohibited for this bounded assignment
Delegation Override Reason: this agent is already a bounded subagent and cannot delegate; the complete Phase 2 context bundle was re-read directly
Delegation Decision Basis: self-audit was required and cross-checked every U lock, R mapping, sub-phase, diff basis, WIP path, test plane, and gate
Audit Inputs Provided:
- locked Phase 0/1 artifacts
- exact user-directed U locks
- private/public planned file table
- requirement mappings and sub-phase checklists
- locked diff bases and current path inventories

## Gaps Found

- None blocking Phase 2 completeness or audit.
- Implementation, verification, and Phase 5 gaps are intentionally planned work, not unresolved plan-authoring gaps.

## Repair Work Performed

- Replaced the short draft with an ExecPlan-grade run-83-shaped artifact.
- Made all `U1`–`U10` choices normative and extensible.
- Added all `R1`–`R22` mappings, planned RCS entries, traceability, and Plan Drift Check.
- Added concrete private/public commands, Playwright file/filter, strict TDD evidence rules, manual QA, idempotence/recovery, and SP1–SP6 checklists.
- Reconciled current Phase 3 WIP without claiming it as Phase 2 implementation.

## Requirement Completion Status

- `R1 | Status: planned | Implementation Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts | QA Surface: M1, M3`
- `R2 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: tests/track-b/tb10.test.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts | QA Surface: M2, M3`
- `R3 | Status: planned | Implementation Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts | Verification Surface: public host/runtime API/UI tests | QA Surface: M1, M3`
- `R4 | Status: planned | Implementation Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts | Verification Surface: public unit tests + Playwright | QA Surface: M1`
- `R5 | Status: planned | Implementation Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: UI/probe tests | QA Surface: M1, M8`
- `R6 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R7 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R8 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: TB10 + probe tests + packaged hop | QA Surface: M2, M3`
- `R9 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: exact-code private/public tests | QA Surface: M2, M3`
- `R10 | Status: planned | Implementation Surface: scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: tests/track-b/run81-kw-activation-probe.test.mjs | QA Surface: M3`
- `R11 | Status: planned | Implementation Surface: extensions/knowledge-worker/package.json, public runtime API types | Verification Surface: contract/depth/public type tests | QA Surface: M3`
- `R12 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: unknown field/version refusal tests | QA Surface: M2, M4`
- `R13 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, scripts/track-b/run81-kw-activation-probe.mjs, scripts/track-b/launch-packaged-runtime.mjs | Verification Surface: TB10 + probe + launch regressions | QA Surface: M2, M3`
- `R14 | Status: planned | Implementation Surface: tests/track-b/tb10.test.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.tsx | Verification Surface: axis-independence assertions | QA Surface: M1, M6`
- `R15 | Status: planned | Implementation Surface: tests/track-b/tb10.test.mjs, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts, ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx | Verification Surface: .recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/logs/red/, .recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/logs/green/ | QA Surface: not-applicable-with-rationale — process gate`
- `R16 | Status: planned | Implementation Surface: package.json, D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/package.json | Verification Surface: run-84 rebuild receipt and SEA hash | QA Surface: M3`
- `R17 | Status: planned | Implementation Surface: ../../role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval/role-model-router/apps/runtime-ui/e2e/recursive-84-kw-ui-toggle-gated-retrieve-eval.spec.ts, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: SHA-bound Phase 5 logs | QA Surface: M1–M3`
- `R18 | Status: planned | Implementation Surface: scripts/track-b/run80-live-recommendation-lifecycle.mjs, scripts/track-b/cloud-track-e2e.mjs | Verification Surface: fresh run-84 dev lifecycle receipt | QA Surface: M6`
- `R19 | Status: planned | Implementation Surface: scripts/track-b/assemble-run00-live-e2e.mjs, evidence/live-e2e/local-runtime-and-pi.json | Verification Surface: fresh run-84 storage correctness receipt | QA Surface: M7`
- `R20 | Status: planned | Implementation Surface: evidence/source-set/tb00-release-source-lock.json, scripts/track-b/assemble-run00-live-e2e.mjs | Verification Surface: pin-freeze + TB11 + assemble/no-drift receipt | QA Surface: M5`
- `R21 | Status: planned | Implementation Surface: .recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/ | Verification Surface: .recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/binder.json | QA Surface: M8`
- `R22 | Status: planned | Implementation Surface: .recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-worktree.md, .recursive/DECISIONS.md, .recursive/STATE.md, .recursive/memory/ | Verification Surface: paired SHAs/diffs + locks | QA Surface: not-applicable-with-rationale — delivery gate`

## Audit Verdict

- Audit summary: Plan locks stored-or-explicit ceremony receipt, public lifecycle plus private session durability, eval consumer, default-shadow/explicit-production retrieve, three KW-only host actions, activation v1 retention, stable codes, leave-public-pin, run-83 `pi`, and permanent-dev workers. SP1–SP6 cover every requirement under strict TDD and rebuilt-runtime multi-plane verification.
- Follow-up required before Phase 2 lock: none.
- Audit: PASS

## Subagent Contribution Verification

- Reviewed Action Records: none; this bounded subagent authored and self-audited the plan
- Main-Agent Verification Performed: exact U-lock reconciliation, Phase 1 inventory mapping, run-83 template comparison, diff/path audit, command and Playwright surface discovery
- Discrepancies found after delegated work: n/a
- Acceptance decision: accept plan; require Phase 3 to verify current WIP and RED chronology independently

## Traceability

- `R1` -> SP3 host actions | Evidence target: public host tests
- `R2` -> SP2/SP3 dual durability | Evidence target: TB10 + consecutive host calls
- `R3` -> SP3 status | Evidence target: host/runtime API/UI tests
- `R4` -> SP4 actual UI + Playwright | Evidence target: unit + browser
- `R5` -> SP4/probe honesty | Evidence target: copy/structured assertions
- `R6` -> SP1 production gate | Evidence target: TB10 OFF/ON/OFF
- `R7` -> SP1 plane/version | Evidence target: vocabulary edge tests
- `R8` -> SP2 eval consumer | Evidence target: TB10/probe/Phase 5
- `R9` -> SP1/SP3 codes | Evidence target: exact-code assertions
- `R10` -> SP2 probe | Evidence target: probe test/JSON
- `R11` -> SP1/SP3 declarations | Evidence target: package/public contracts
- `R12` -> SP1/SP3 versioning | Evidence target: unknown version/field tests
- `R13` -> all SP regressions | Evidence target: TB10/launch/probe
- `R14` -> SP3/SP4/SP6 axes | Evidence target: unit + live recommendation
- `R15` -> SP1–SP4 strict TDD | Evidence target: red/green logs
- `R16` -> SP5 rebuild | Evidence target: rebuild receipt/SEA hash
- `R17` -> SP6 rebuilt UI/gate/consumer | Evidence target: browser/probe logs
- `R18` -> SP6 cloud dev | Evidence target: lifecycle receipt
- `R19` -> SP6 `pi` | Evidence target: storage receipt
- `R20` -> SP5 freeze decision | Evidence target: gates/assemble
- `R21` -> SP6 binder | Evidence target: binder.json
- `R22` -> paired delivery/serial closeout | Evidence target: SHAs + Phase 6–8 locks

## Coverage Gate

- [x] Locked Phase 0/1 and effective control-plane inputs re-read
- [x] `U1`–`U10` resolved normatively without weakening requirements
- [x] `R1`–`R22` mapped direct with implementation, verification, and QA surfaces
- [x] SP1–SP6 include scope, checklist, commands/strategy, pass, and recovery
- [x] Strict TDD, run-84 Playwright, rebuilt SEA, cloud dev, `pi`, conditional full assemble, binder, and paired delivery are explicit
- [x] Plan Drift Check PASS and current Phase 3 WIP reconciled
- [x] OOS/invariants remain intact

Coverage: PASS

## Approval Gate

- [x] ExecPlan is novice-runnable and repo-specific
- [x] UI wiring cannot be substituted by API-only proof
- [x] Consumer cannot pass through silent empty OFF behavior
- [x] Activation v1/digest ceremony and safe defaults are preserved
- [x] Every product change has a strict test/evidence path
- [x] No implementation or verification is falsely claimed by Phase 2
- [x] No blocker remains for Phase 2 lock

Approval: PASS

## Audit

Audit: PASS
