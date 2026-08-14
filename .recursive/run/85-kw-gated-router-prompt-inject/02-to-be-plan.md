Run: `/.recursive/run/85-kw-gated-router-prompt-inject/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-28T11:04:18Z`
LockHash: `2b7c3a5c06ef5522716110b976c48cca6f261683d5dcecac2e0aa1eec228087d`
CapturedAt: `2026-07-28T19:00:00+08:00`
RevisedAt: `2026-07-28T19:00:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/85-kw-gated-router-prompt-inject/00-requirements.md`
- `/.recursive/run/85-kw-gated-router-prompt-inject/00-worktree.md`
- `/.recursive/run/85-kw-gated-router-prompt-inject/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/direct-track-b.md`
Outputs:
- `/.recursive/run/85-kw-gated-router-prompt-inject/02-to-be-plan.md`
Scope note: ExecPlan for unlocking gated live-router production prompt injection under ceremony-backed KW ON + successful gated production retrieve; updating honesty/export/capability surfaces; host↔private join; one locked insertion surface; strict TDD; Phase 5 rebuilt SEA inject hops + live `--track=dev` + live `pi`; binder and paired closeout. No product implementation is claimed by this phase.

## TODO

- [x] Read locked Phase 0 and Phase 1 artifacts
- [x] Re-read STATE, DECISIONS, MEMORY, and Direct Track B memory
- [x] Lock normative decisions `U1`–`U13` matching exploration
- [x] Define inject contract, payload, receipt, refuse codes, capability, join, and insertion surface
- [x] Define planned private/public files and `publicChange`/`serverChange`
- [x] Map every `R1`–`R26` to implementation, verification, and QA
- [x] Define ordered `SP1`–`SP7` with checklists, commands, pass, and recovery
- [x] Define strict TDD, rebuilt SEA inject harness, cloud, `pi`, freeze, and binder strategy
- [x] Complete Plan Drift Check, self-audit, RCS, Coverage, Approval, and Audit PASS

## Fixed Design Decisions

These locks resolve Phase 1 measured `U1`–`U13` and are normative for Phase 3+.

### `U1` — Host↔private join (normative)

1. **Mutate-time sync:** on host `activate_production` / `deactivate_production` success, sync private KW via `run({ sessionId, capability: "knowledge:activate"|"knowledge:deactivate", ... })` using the same session key the host binds for the runtime session.
2. **Request-time payload authority:** live-router inject may apply only after private `retrieve({ plane: "production", ... })` and/or `evaluateWithProductionKnowledge` succeeds for that request; host ON alone never injects.
3. Divergence (host ON without private ON, or private retrieve refuse) → refuse inject with `kw_prompt_inject_join_unsatisfied` or the more specific FD31 code applicable to the failure branch; no production knowledge in prompts.

### `U2` — Auto-arm (normative)

Auto-arm inject when KW production is ON (`FD8`). No second operator inject toggle and no additive inject-only attestation in this run.

### `U3` — Primary insertion surface (normative)

Exactly one primary surface: **`applyRequestedRoleExecutionPolicy` system-message prepend** in `role-model-router/apps/runtime-host-bridge/src/index.ts`, shared by `mapChatCompletionsRequest` and `mapResponsesRequest`.

Explicitly **not** primary:
- `buildControllerSystemPrompt` / controller routing JSON guidance
- `assembleContextEnvelope`

ON + retrieve PASS prepends a single bounded KW inject system message (or equivalent system role content) ahead of existing role-policy messages. OFF / refuse leaves messages free of production KW payload.

### `U4` — Payload composition (normative)

- Schema id: `role-model.kw-prompt-inject.v1`
- `injectContractVersion: 1`
- Required fields: `schemaId`, `injectContractVersion`, `plane: "production"`, `productionActivation: true`, correlation ids (`sessionId` and/or request id), bounded `semanticAdvantages` and/or hit `artifactRef` summaries from gated production retrieve
- Max bounds: ≤8 semantic tips, ≤5 hit refs, ≤2000 characters total inject body text
- Content drawn only from gated production retrieve / eval consumer production plane; no corpus dump

### `U5` — Trigger cadence (normative)

On each eligible live chat/responses mapping through `mapChatCompletionsRequest` / `mapResponsesRequest` when inject is armed (KW ON + join satisfied): attempt request-time production retrieve/eval; apply or refuse with receipt. Soft OFF → inject OFF for subsequent mappings.

### `U6` — Ceremony fields (normative)

Retain activation policy v1 (receipt + verified claims + shadow + digest bind + `operatorAttestation: "activate-production"`). No ceremony weakening. Inject join does not add required ceremony fields beyond existing activation v1.

### `U7` — Refuse codes (normative)

Exact stable codes (`FD31`):
- `kw_prompt_inject_requires_activation`
- `kw_prompt_inject_join_unsatisfied`
- `kw_prompt_inject_requires_production_retrieve`
- `kw_prompt_inject_contract_unsupported`

### `U8` — Public freeze pin (normative)

Leave the public freeze pin unchanged unless public product-tip validation proves a retarget is required. Private tip drift → full Playwright assemble if pin-freeze/TB11 fails; never proof-only-only.

### `U9` — Live `pi` marker (normative)

Reuse prior assemble/runtime provider/model/marker pattern. Phase 5 records sanitized argv, storage presence, and storage correctness (`FD22`).

### `U10` — Permanent-dev workers (normative)

Prefer existing permanent-dev workers. Redeploy only if fresh run-85 `cloud-track-e2e --track=dev` proves drift; otherwise `serverChange: not-required`.

### `U11` — Capability (normative)

Capability name: **`knowledge:prompt-inject`**. Update private KW `package.json` permissions and generated `product-contracts` / public contract surfaces so the production path does not call an undeclared capability.

### `U12` — Budget / envelope precedence (normative)

1. Validate inject contract/version/fields first → unsupported → `kw_prompt_inject_contract_unsupported`.
2. Enforce tip/hit/char bounds by **truncation** (deterministic order: tips then hits) with receipt `truncated: true`.
3. Do not refuse solely for over-budget when truncation can satisfy bounds.
4. Tip-safety filters from derive remain; refused tips never promoted to unconstrained system overrides.

### `U13` — Runtime hop harness (normative)

Phase 5 unlock proof on sha-bound rebuilt SEA must exercise the locked insertion surface (`FD32`):
- Preferred: host bridge test harness invoking `mapChatCompletionsRequest` / `mapResponsesRequest` (or equivalent packaged completion path) against the rebuilt runtime with KW OFF refuse + ON apply receipts.
- Packaged probe inject matrix (`R19`) is additional required evidence, not a substitute for the SEA hop (`R20`).
- Mock-only insertion without the live mapping surface = FAIL.

### Cross-cutting fixed decisions

| ID | Decision |
|---|---|
| Contract | `injectContractVersion: 1`; unknown version/fields refuse |
| Auto-arm | ON arms inject; soft OFF clears arm/export |
| Surface | only `applyRequestedRoleExecutionPolicy` prepend |
| Join | mutate-time private sync + request-time retrieve authority |
| Capability | `knowledge:prompt-inject` |
| Export | `productionPromptInjection` may be true only when inject contract satisfied |
| Public change | `publicChange: required` (host insertion, join sync, honesty/UI, contracts) |
| Server change | `serverChange: not-required` unless `U10` drift |
| Launch | `--track=dev --scope-id=run85-dev --evidence-root=<run85>`; equals/discrete equivalent |
| TDD Mode | `strict` for all inject/join/insertion/honesty/contract/probe production edits (`FD10`, `R17`) |
| Freeze | full assemble only if pin/TB11 drift; proof-only-only FAIL |
| Promotion | `dev` feature branches only; no stage/main auto-promotion |
| Serial docs | Phase 3.5–8 only after real work (`FD18`) |

## Planned Changes by File

| Repository / owner | File | Planned change |
|---|---|---|
| Private KW | `extensions/knowledge-worker/index.mjs` | Inject contract/payload/receipt helpers; export unlock; tip-safe bounded composition; refuse codes; optional capability routing for `knowledge:prompt-inject` |
| Private contract | `extensions/knowledge-worker/package.json` | Declare `knowledge:prompt-inject` (+ retain activate/retrieve/eval surfaces) |
| Private contracts gen | `shared/generated/product-contracts.json` (via generate path) | Unlock inject capability honesty |
| Private tests | `tests/track-b/tb10.test.mjs` | RED→GREEN contract/OFF/ON/retrieve-fail/export unlock; remove hard-false-forever |
| Private probe | `scripts/track-b/run81-kw-activation-probe.mjs` | Extend OFF→ON→OFF inject matrix + retrieve-fail refuse |
| Private probe tests | `tests/track-b/run81-kw-activation-probe.test.mjs` | RED→GREEN inject receipts/codes |
| Private packaging/launch | existing build + `scripts/track-b/launch-packaged-runtime.mjs` | Rebuild dist; launch `run85-dev` with run-85 evidence root |
| Private freeze/assemble | pin/assemble only if gates require | Full assemble + coherent pin refresh |
| Public host bridge | `role-model-router/apps/runtime-host-bridge/src/index.ts` | Wire inject into `applyRequestedRoleExecutionPolicy`; request-time retrieve/join checks |
| Public host ops | `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Mutate-time private KW activate/deactivate sync with `sessionId` |
| Public host tests | `role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts` | Join sync, divergence refuse, axes |
| Public host routing tests | `role-model-router/apps/runtime-host-bridge/test/` (map/inject coverage; extend existing or add focused test) | OFF refuse / ON apply on locked surface |
| Public runtime API | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Status/export honesty for inject if exposed |
| Public Extensions UI | `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Replace “remains locked” with gated ON+retrieve honesty |
| Public UI tests | `role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` | Updated wording assertions |
| Public browser (optional if UI path needs SEA click) | `role-model-router/apps/runtime-ui/e2e/` run-85 spec if required for honesty/activation regression | Rebuilt SEA operator path; inject proof primarily via host map harness (`U13`) |
| Run evidence | `.recursive/run/85-kw-gated-router-prompt-inject/evidence/**` | RED/GREEN, rebuild, SEA inject, cloud, `pi`, freeze, binder |
| Later control plane | `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `.recursive/memory/**` | Phases 6–8 only |

Private root: `D:/DEV/role-model-internal/.worktrees/85-kw-gated-router-prompt-inject`  
Public root: `D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject`

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "Versioned inject contract authorizing gated unlock without ambient on." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: `tests/track-b/tb10.test.mjs` | QA Surface: M2
- `R2` | Coverage: direct | Source Quote: "OFF/soft-OFF must not inject production knowledge." | Implementation Surface: `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts`, `extensions/knowledge-worker/index.mjs` | Verification Surface: TB10 + host map tests | QA Surface: M2, M3
- `R3` | Coverage: direct | Source Quote: "ON alone is insufficient; retrieve must PASS (`FD7`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: TB10 + host tests | QA Surface: M2, M3
- `R4` | Coverage: direct | Source Quote: "Join host durable ON and private retrieve authority (`U1`)." | Implementation Surface: `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `extensions/knowledge-worker/index.mjs` | Verification Surface: host ops + KW session tests | QA Surface: M3
- `R5` | Coverage: direct | Source Quote: "Versioned bounded payload from gated retrieve (`FD26`, `U4`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: `tests/track-b/tb10.test.mjs` | QA Surface: M2
- `R6` | Coverage: direct | Source Quote: "Every attempt yields secret-free success/refuse receipt." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: probe + host tests | QA Surface: M2, M3
- `R7` | Coverage: direct | Source Quote: "When contract satisfied and armed/applied per Phase 2: may be true." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `tests/track-b/tb10.test.mjs` | Verification Surface: TB10 export/status | QA Surface: M2
- `R8` | Coverage: direct | Source Quote: "Capability name locked." | Implementation Surface: `extensions/knowledge-worker/package.json`, `shared/generated/product-contracts.json` | Verification Surface: contract/depth tests | QA Surface: M3
- `R9` | Coverage: direct | Source Quote: "Wire exactly one Phase-2-locked live-router surface (`FD9`)." | Implementation Surface: `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: host map/inject tests | QA Surface: M3, M4
- `R10` | Coverage: direct | Source Quote: "Deterministic budget behavior (`U12`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: budget unit tests in TB10 | QA Surface: M2
- `R11` | Coverage: direct | Source Quote: "No jailbreak promotion via inject (`FD27`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: tip-safety regression test | QA Surface: M2
- `R12` | Coverage: direct | Source Quote: "Independence matrix (`FD24`)." | Implementation Surface: `tests/track-b/tb10.test.mjs`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.tsx` | Verification Surface: axis-independence assertions | QA Surface: M1, M6
- `R13` | Coverage: direct | Source Quote: "Remove/replace “production prompt injection remains locked” once unlock ships." | Implementation Surface: `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.tsx`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: UI + probe honesty tests | QA Surface: M1, M8
- `R14` | Coverage: direct | Source Quote: "Unknown fields on inject policy/payload refuse (`FD19`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs` | Verification Surface: unknown-field tests | QA Surface: M2
- `R15` | Coverage: direct | Source Quote: "No regression (`FD28`)." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: TB10 + probe regressions | QA Surface: M2, M3
- `R16` | Coverage: direct | Source Quote: "Soft OFF clears arm/apply and export." | Implementation Surface: `extensions/knowledge-worker/index.mjs`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: ON→apply→OFF→refuse tests | QA Surface: M2, M3
- `R17` | Coverage: direct | Source Quote: "Strict RED→GREEN for in-scope production edits (`FD10`)." | Implementation Surface: `tests/track-b/tb10.test.mjs`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx` | Verification Surface: `.recursive/run/85-kw-gated-router-prompt-inject/evidence/logs/red/`, `.recursive/run/85-kw-gated-router-prompt-inject/evidence/logs/green/` | QA Surface: not-applicable-with-rationale — process gate
- `R18` | Coverage: direct | Source Quote: "Fresh SEA identity binding for runtime verification (`FD14`)." | Implementation Surface: `package.json`, `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/package.json` | Verification Surface: rebuild receipt/SEA hash | QA Surface: M4
- `R19` | Coverage: direct | Source Quote: "Dist/packaged probe covers OFF→ON→OFF inject (+ retrieve-fail refuse)." | Implementation Surface: `scripts/track-b/run81-kw-activation-probe.mjs` | Verification Surface: probe tests + packaged JSON | QA Surface: M3
- `R20` | Coverage: direct | Source Quote: "Prove inject on the rebuilt runtime via locked insertion surface (`FD30`, `FD32`, `U13`)." | Implementation Surface: `../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts`, launch/packaging scripts | Verification Surface: SHA-bound Phase 5 inject logs | QA Surface: M4
- `R21` | Coverage: direct | Source Quote: "Live recs PASS; do not imply inject unlock." | Implementation Surface: `scripts/track-b/run80-live-recommendation-lifecycle.mjs`, `scripts/track-b/cloud-track-e2e.mjs` | Verification Surface: fresh run-85 lifecycle receipt | QA Surface: M6
- `R22` | Coverage: direct | Source Quote: "Live `pi` against rebuilt runtime (`FD22`)." | Implementation Surface: `scripts/track-b/assemble-run00-live-e2e.mjs`, `evidence/live-e2e/local-runtime-and-pi.json` | Verification Surface: fresh storage correctness receipt | QA Surface: M7
- `R23` | Coverage: direct | Source Quote: "Freeze honesty (`FD16`)." | Implementation Surface: `evidence/source-set/tb00-release-source-lock.json`, `scripts/track-b/assemble-run00-live-e2e.mjs` | Verification Surface: pin-freeze + TB11 + assemble/no-drift receipt | QA Surface: M5
- `R24` | Coverage: direct | Source Quote: "Machine-checkable RCS + secret-free binder." | Implementation Surface: `.recursive/run/85-kw-gated-router-prompt-inject/evidence/` | Verification Surface: `.recursive/run/85-kw-gated-router-prompt-inject/evidence/binder.json` | QA Surface: M8
- `R25` | Coverage: direct | Source Quote: "Phase 6 soft-closes run-84 inject lock residual for gated unlock only." | Implementation Surface: `.recursive/DECISIONS.md` | Verification Surface: Phase 6 lock | QA Surface: not-applicable-with-rationale — Phase 6 ownership
- `R26` | Coverage: direct | Source Quote: "Ship private+public; Phases 6–8 update DECISIONS/STATE/memory." | Implementation Surface: `.recursive/run/85-kw-gated-router-prompt-inject/00-worktree.md`, `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `.recursive/memory/` | Verification Surface: paired SHAs/diffs + locks | QA Surface: not-applicable-with-rationale — delivery gate

## Implementation Steps

1. **SP1 — Inject contract + payload + refuse + export unlock (private):** strict RED for v1 accept/unknown refuse, bounds, export false→conditional true; implement helpers + TB10; GREEN.
2. **SP2 — Capability + probe matrix (private):** declare `knowledge:prompt-inject`; extend probe OFF→ON→OFF inject + retrieve-fail; RED→GREEN probe tests; preserve retrieve/consumer.
3. **SP3 — Host↔private join sync (public ops + private session):** RED divergence cases; implement mutate-time activate/deactivate sync with `sessionId`; GREEN.
4. **SP4 — Insertion surface wiring (public host index):** RED mapChat/mapResponses OFF refuse / ON apply / soft-OFF; wire `applyRequestedRoleExecutionPolicy` only; GREEN.
5. **SP5 — Honesty/UI/contracts unlock (public + generated):** RED Extensions/copy/contracts; replace locked-era wording; GREEN.
6. **SP6 — Regressions, freeze decision, rebuild:** full suites; pin-freeze/TB11; assemble if needed; rebuild private dist + public SEA; receipt sha256.
7. **SP7 — Phase 5 runtime+pi + binder:** SEA inject OFF/ON/soft-OFF on locked surface; packaged probe; live `--track=dev`; live `pi` CLI+storage; binder; hand off serially.

## Testing Strategy

TDD Mode: `strict` for SP1–SP5 and any production contract/probe edit.

- Before each production edit, capture a targeted failing command under `evidence/logs/red/`.
- After minimal implementation, capture the same targeted command under `evidence/logs/green/`.
- Preserve prior tests; refactors only after GREEN.
- SP6/SP7 packaging and live hops are pragmatic for generated receipts; still record commands, SHAs, and hashes.
- Missing RED for a changed strict surface = Phase 3 audit FAIL.

### Exact private commands

```powershell
cd D:/DEV/role-model-internal/.worktrees/85-kw-gated-router-prompt-inject
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
cd D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/track-b-operations-api.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/routes/extensions.test.tsx
corepack pnpm ci:check
```

Package with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` pointing at the private run00/dist output, then `corepack pnpm runtime:validate-packaging`. Record exact environment-safe command and SEA hash in the rebuild receipt.

## Playwright Plan (if applicable)

- Inject unlock proof for `R20` is primarily the Phase 5 host/map harness on rebuilt SEA (`U13`), not browser-only.
- If honesty/activation UI regressions require a browser hop, add `role-model-router/apps/runtime-ui/e2e/recursive-85-kw-gated-router-prompt-inject.spec.ts` and run:

```powershell
cd D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui
corepack pnpm test:browser -- e2e/recursive-85-kw-gated-router-prompt-inject.spec.ts
```

- Browser evidence cannot substitute the locked insertion-surface SEA inject hop.

## Manual QA Scenarios

| ID | Scenario | Expected |
|---|---|---|
| `M1` | Extensions honesty after unlock | No “remains locked”; states inject needs ceremony ON + production retrieve; ≠ Set mode; ≠ recommendation |
| `M2` | Private inject matrix | OFF refuse exact code; ON+retrieve apply; retrieve-fail refuse; soft OFF refuse; bounds/unknown refuse |
| `M3` | Join + insertion surface | Host-only ON without private sync cannot inject; mapChat/mapResponses prepend only via locked surface |
| `M4` | Phase 5 rebuilt SEA | Rebuild sha bound; OFF refuse + ON apply receipts on locked surface; soft OFF refuse again |
| `M5` | Pin/freeze honesty | Gates green or full Playwright assemble; never proof-only-only |
| `M6` | Live recommendation `--track=dev` | apply+dismiss PASS; does not imply inject |
| `M7` | Live `pi` | CLI request + storage presence + correctness |
| `M8` | Binder/RCS | Every R dispositioned; `secretsOmitted: true`; unlock/runtime/`pi` mapped |

QA Execution Mode: `agent-operated`; no user sign-off required unless later changed to human/hybrid.

### Phase 5 runtime + `pi` verification plan (normative)

1. Rebuild private dist as needed + public SEA with distribution root; write rebuild receipt with SEA sha256 (`R18`).
2. Launch packaged runtime with `--track=dev --scope-id=run85-dev --evidence-root=<run85>`.
3. On that SEA: exercise locked surface OFF → refuse `kw_prompt_inject_requires_activation` (or join/activation code as applicable); no production KW payload in messages (`R20`).
4. Ceremony ON + join sync + production retrieve success → apply receipt; bounded payload present on prepend surface (`R20`).
5. Soft OFF → refuse again on same session rules (`R16`/`R20`).
6. Packaged probe inject matrix PASS (`R19`).
7. Live `--track=dev` recommendation apply/dismiss PASS; assert axis independence (`R21`).
8. Live `pi` CLI + storage presence + correctness PASS (`R22`).
9. Binder maps SEA sha, unlock evidence, cloud, `pi`; `secretsOmitted: true` (`R24`).

## Idempotence and Recovery

- Repeated activate while already ON is idempotent; inject remains armed.
- Soft OFF is idempotent and clears inject arm/export.
- Unsupported contract never mutates prompts.
- If SEA hash differs from rebuild receipt, rebuild and rerun all Phase 5 inject hops.
- If pin/freeze fails after tip change, full assemble — not proof-only rewrite.
- Do not widen to ambient on, ceremony removal, training unlock, stage/main, or `--track=production` without approved addendum.

## Implementation Sub-phases

### `SP1` — Private inject contract/payload/export (`R1`, `R5`–`R7`, `R10`, `R11`, `R14`, `R17`)

Checklist:
- [ ] RED: unknown version/fields, bounds, hard-false forever replaced with conditional unlock tests
- [ ] Implement contract v1, payload schema, receipts, refuse helpers, tip-safe composition
- [ ] GREEN targeted + full TB10
- [ ] Store RED/GREEN logs

Pass: v1 accepted; unknown refused with `kw_prompt_inject_contract_unsupported`; export false by default; may be true only under satisfaction.

Recovery: repair contract helpers only; keep failing tests until GREEN.

### `SP2` — Capability + probe inject matrix (`R2`, `R3`, `R6`, `R8`, `R15`, `R19`, `R17`)

Checklist:
- [ ] Declare `knowledge:prompt-inject` and regenerate contracts as required
- [ ] RED/GREEN probe OFF→ON→OFF inject + retrieve-fail
- [ ] Preserve retrieve gate + eval consumer

Pass: probe asserts receipts/codes; run-84 cases remain green.

Recovery: do not weaken retrieve/consumer to make inject green.

### `SP3` — Join sync (`R4`, `R12`, `R16`, `R17`)

Checklist:
- [ ] RED host-only ON without private session cannot satisfy join
- [ ] Implement mutate-time private activate/deactivate with `sessionId`
- [ ] GREEN host ops tests

Pass: host and private agree after mutate; divergence refuses inject.

Recovery: roll back sync wiring together; never leave UI ON without private authority path.

### `SP4` — Insertion surface (`R2`, `R3`, `R9`, `R16`, `R17`)

Checklist:
- [ ] RED mapChat/mapResponses OFF/ON/soft-OFF
- [ ] Wire only `applyRequestedRoleExecutionPolicy` prepend
- [ ] Confirm controller prompt and context-envelope untouched as primary
- [ ] GREEN

Pass: production KW payload appears only on locked surface when contract satisfied.

Recovery: disable inject path fail-closed if join/retrieve unavailable.

### `SP5` — Honesty unlock (`R7`, `R8`, `R13`, `R17`)

Checklist:
- [ ] RED Extensions/copy/contracts for locked-era phrases
- [ ] Replace “remains locked” with gated ON+retrieve honesty
- [ ] GREEN UI/contract tests

Pass: operator-visible surfaces match unlock reality without claiming ambient on.

### `SP6` — Freeze + rebuild (`R15`, `R18`, `R23`)

Checklist:
- [ ] Full private/public suites green
- [ ] Measure pin-freeze/TB11; assemble if required
- [ ] Rebuild dist + SEA; write sha-bound receipt

Pass: clean gates and SHA-bound SEA.

### `SP7` — Phase 5 + binder (`R18`–`R22`, `R24`–`R26` prep)

Checklist:
- [ ] SEA inject OFF/ON/soft-OFF on locked surface
- [ ] Packaged probe inject matrix
- [ ] Live `--track=dev` recs
- [ ] Live `pi` CLI+storage
- [ ] Binder with `secretsOmitted: true`
- [ ] Hand off to serial 3.5–8 after real work

Pass: M1–M8 green for unlock+runtime+`pi`.

## Plan Drift Check

- Every Phase 1 Source Requirement Inventory item `R1`–`R26` has exactly one Requirement Mapping entry and one planned RCS entry.
- `U1` join: mutate-time private sync + request-time retrieve authority — no silent host-flag inject.
- `U2` auto-arm on ON; no second toggle.
- `U3` single surface `applyRequestedRoleExecutionPolicy`; controller prompt and envelope deferred.
- `U4`–`U7` payload/trigger/ceremony/codes locked including exact FD31 strings.
- `U8`–`U10` pin/`pi`/cloud preferences locked.
- `U11` capability `knowledge:prompt-inject`.
- `U12` truncate-with-receipt budget precedence.
- `U13` SEA harness must exercise locked surface (`FD32`).
- No lossy combination of unlock vs preserve vs verification planes; each R maps direct with explicit rationale that obligations remain separate.
- Diff basis remains private `b34691c…` and public `de7ed204…`.
- OOS intact: ambient on, ceremony removal, training unlock, stage/main, `--track=production`, unit-only unlock (`OOS17`).

## Effective Inputs Re-read

- Locked `00-requirements.md`, `00-worktree.md`, and `01-as-is.md`
- `.recursive/STATE.md`, `.recursive/DECISIONS.md`, `.recursive/memory/MEMORY.md`
- `.recursive/memory/domains/direct-track-b.md`
- Exploration-directed locks for surface/join/codes/capability/`U1`–`U13`
- No addenda are present

## Earlier Phase Reconciliation

- Phase 0 Themes A–J remain co-required; this plan keeps unlock, update, join, surface, TDD, runtime, `pi`, and closeout together.
- Phase 1 measured gaps map to SP1–SP5; not-started verification/delivery planes map to SP6–SP7.
- Phase 1 preferred measurements become the exact normative U locks without ceremony or axis weakening.
- No product implementation is claimed by Phase 2.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/85-kw-gated-router-prompt-inject/01-as-is.md`
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/02-to-be-plan.md`
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-requirements.md`
- `/.recursive/memory/domains/direct-track-b.md`
- Baseline TB10/extensions logs for run 85

## Worktree Diff Audit

### Private controller

- Baseline type: `local commit`
- Baseline reference: `b34691c376f7b267b2dcdf048ea5b5b17e06115b`
- Comparison reference: `working-tree`
- Normalized baseline: `b34691c376f7b267b2dcdf048ea5b5b17e06115b`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b34691c376f7b267b2dcdf048ea5b5b17e06115b`
- Phase 2-owned file: `.recursive/run/85-kw-gated-router-prompt-inject/02-to-be-plan.md`
- Also present: Phase 0/1 run artifacts and `01-as-is.md`
- Unexplained product drift: none; Phase 2 does not own product files

### Paired public implementation

- Baseline type: `local commit`
- Baseline reference: `de7ed20427a32277a6541fab22517a15238f6e74`
- Comparison reference: `working-tree`
- Normalized baseline: `de7ed20427a32277a6541fab22517a15238f6e74`
- Normalized comparison: `working-tree`
- Normalized diff command: `git -C "D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject" diff --name-only de7ed20427a32277a6541fab22517a15238f6e74`
- Phase 2-owned file: mirrored `02-to-be-plan.md`
- Unexplained product drift: none

## Phase-Scoped Diff Ownership

Phase 2 owns planning completeness and the expected private/public product pathset. It does not own or certify product WIP, RED/GREEN evidence, generated builds, freeze artifacts, Phase 5 receipts, binder, or later DECISIONS/STATE/memory changes.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: available; nested subagents prohibited for this bounded assignment
Delegation Decision Basis: self-audit selected; full Phase 2 context bundle re-read directly
Delegation Override Reason: nested delegation prohibited; every U lock, R mapping, sub-phase, and diff basis was cross-checked locally
Audit Inputs Provided:
- locked Phase 0/1 artifacts
- exact exploration-directed U locks
- private/public planned file table
- requirement mappings and sub-phase checklists
- locked diff bases

## Gaps Found

- None blocking Phase 2 completeness or audit.
- Implementation, verification, and Phase 5 gaps are intentionally planned work, not unresolved plan-authoring gaps.

## Repair Work Performed

- Authored ExecPlan-grade Phase 2 with normative `U1`–`U13` locks matching exploration.
- Mapped all `R1`–`R26` with implementation/verification/QA surfaces.
- Added SP1–SP7, strict TDD, Phase 5 runtime+`pi` plan, Plan Drift Check, and gates.

## Requirement Completion Status

- `R1 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R2 | Status: planned | Implementation Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts, extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs, host map tests | QA Surface: M2, M3`
- `R3 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2, M3`
- `R4 | Status: planned | Implementation Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts, extensions/knowledge-worker/index.mjs | Verification Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts | QA Surface: M3`
- `R5 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R6 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: scripts/track-b/run81-kw-activation-probe.mjs | QA Surface: M2, M3`
- `R7 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, tests/track-b/tb10.test.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R8 | Status: planned | Implementation Surface: extensions/knowledge-worker/package.json, shared/generated/product-contracts.json | Verification Surface: extensions/knowledge-worker/package.json | QA Surface: M3`
- `R9 | Status: planned | Implementation Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts | QA Surface: M3, M4`
- `R10 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R11 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R12 | Status: planned | Implementation Surface: tests/track-b/tb10.test.mjs, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.tsx | Verification Surface: axis tests | QA Surface: M1, M6`
- `R13 | Status: planned | Implementation Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.tsx, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx | QA Surface: M1, M8`
- `R14 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2`
- `R15 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2, M3`
- `R16 | Status: planned | Implementation Surface: extensions/knowledge-worker/index.mjs, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts | Verification Surface: tests/track-b/tb10.test.mjs | QA Surface: M2, M3`
- `R17 | Status: planned | Implementation Surface: tests/track-b/tb10.test.mjs, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-ui/app/routes/extensions.test.tsx | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/logs/red/, .recursive/run/85-kw-gated-router-prompt-inject/evidence/logs/green/ | QA Surface: not-applicable-with-rationale — process gate`
- `R18 | Status: planned | Implementation Surface: package.json, ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/package.json | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/ | QA Surface: M4`
- `R19 | Status: planned | Implementation Surface: scripts/track-b/run81-kw-activation-probe.mjs | Verification Surface: tests/track-b/run81-kw-activation-probe.test.mjs | QA Surface: M3`
- `R20 | Status: planned | Implementation Surface: ../../../role-model/.worktrees/85-kw-gated-router-prompt-inject/role-model-router/apps/runtime-host-bridge/src/index.ts, scripts/track-b/launch-packaged-runtime.mjs | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/ | QA Surface: M4`
- `R21 | Status: planned | Implementation Surface: scripts/track-b/run80-live-recommendation-lifecycle.mjs, scripts/track-b/cloud-track-e2e.mjs | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/ | QA Surface: M6`
- `R22 | Status: planned | Implementation Surface: scripts/track-b/assemble-run00-live-e2e.mjs, evidence/live-e2e/local-runtime-and-pi.json | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/ | QA Surface: M7`
- `R23 | Status: planned | Implementation Surface: evidence/source-set/tb00-release-source-lock.json, scripts/track-b/assemble-run00-live-e2e.mjs | Verification Surface: tests/track-b/pin-freeze-gate.test.mjs | QA Surface: M5`
- `R24 | Status: planned | Implementation Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/ | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/evidence/binder.json | QA Surface: M8`
- `R25 | Status: planned | Implementation Surface: .recursive/DECISIONS.md | Verification Surface: .recursive/DECISIONS.md | QA Surface: not-applicable-with-rationale — Phase 6 ownership`
- `R26 | Status: planned | Implementation Surface: .recursive/run/85-kw-gated-router-prompt-inject/00-worktree.md, .recursive/DECISIONS.md, .recursive/STATE.md, .recursive/memory/ | Verification Surface: .recursive/run/85-kw-gated-router-prompt-inject/00-worktree.md | QA Surface: not-applicable-with-rationale — delivery gate`

## Audit Verdict

- Audit summary: Plan locks mutate-time host↔private join, request-time retrieve authority, auto-arm on ON, single insertion surface `applyRequestedRoleExecutionPolicy`, exact FD31 refuse codes, capability `knowledge:prompt-inject`, bounded payload/budget, and Phase 5 SEA+`pi` harness. SP1–SP7 cover `R1`–`R26` under strict TDD without claiming implementation.
- Follow-up required before Phase 2 lock: none.
- Audit: PASS

## Subagent Contribution Verification

- Reviewed Action Records: none; this bounded subagent authored and self-audited the plan
- Main-Agent Verification Performed: U-lock reconciliation against exploration, Phase 1 inventory mapping, run-84 template comparison, diff basis reuse
- Discrepancies found after delegated work: n/a
- Acceptance decision: accept plan; Phase 3 must still produce RED chronology independently

## Traceability

- `R1` -> SP1 contract v1 | Evidence target: TB10
- `R2` -> SP2/SP4 OFF refuse | Evidence target: TB10/host
- `R3` -> SP2/SP4 retrieve required | Evidence target: TB10/host
- `R4` -> SP3 join sync | Evidence target: host ops tests
- `R5` -> SP1 payload | Evidence target: TB10
- `R6` -> SP1/SP2 receipts | Evidence target: probe/host
- `R7` -> SP1/SP5 export unlock | Evidence target: TB10
- `R8` -> SP2 capability | Evidence target: package/contracts
- `R9` -> SP4 surface | Evidence target: host map tests
- `R10` -> SP1 budget | Evidence target: TB10
- `R11` -> SP1 tip-safety | Evidence target: TB10
- `R12` -> SP3/SP5/SP7 axes | Evidence target: unit + live recs
- `R13` -> SP5 honesty | Evidence target: UI/probe
- `R14` -> SP1 unknown refuse | Evidence target: TB10
- `R15` -> SP2/SP6 preserve | Evidence target: TB10/probe
- `R16` -> SP3/SP4 soft OFF | Evidence target: OFF-after-apply
- `R17` -> SP1–SP5 strict TDD | Evidence target: red/green logs
- `R18` -> SP6 rebuild | Evidence target: rebuild receipt
- `R19` -> SP2/SP7 probe | Evidence target: packaged probe
- `R20` -> SP7 SEA inject | Evidence target: Phase 5 logs
- `R21` -> SP7 cloud | Evidence target: lifecycle receipt
- `R22` -> SP7 pi | Evidence target: storage receipt
- `R23` -> SP6 freeze | Evidence target: pin/assemble
- `R24` -> SP7 binder | Evidence target: binder.json
- `R25` -> Phase 6 soft-close | Evidence target: DECISIONS
- `R26` -> paired closeout | Evidence target: Phases 6–8

## Coverage Gate

- [x] Locked Phase 0/1 and effective control-plane inputs re-read
- [x] `U1`–`U13` resolved normatively matching exploration (measured)
- [x] `R1`–`R26` mapped direct with implementation, verification, and QA surfaces
- [x] SP1–SP7 include scope, checklist, pass, and recovery
- [x] Strict TDD, rebuilt SEA inject harness, cloud dev, `pi`, conditional full assemble, binder, and paired delivery are explicit
- [x] Plan Drift Check PASS
- [x] OOS/invariants remain intact

Coverage: PASS

## Approval Gate

- [x] ExecPlan is novice-runnable and repo-specific
- [x] Insertion surface and join cannot be substituted by honesty-only or unit-only unlock
- [x] Runtime verification plan for Phase 5 includes SEA inject + `pi`
- [x] Activation ceremony and safe defaults are preserved
- [x] Every product change has a strict test/evidence path
- [x] No implementation or verification is falsely claimed by Phase 2
- [x] No blocker remains for Phase 2 lock

Approval: PASS

## Audit

Audit: PASS
