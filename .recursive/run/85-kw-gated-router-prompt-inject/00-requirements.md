Run: `/.recursive/run/85-kw-gated-router-prompt-inject/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-28T01:13:51Z`
LockHash: `e99dc0a1f4aba37407cd71fecb15b2696290cebe6a7f90fdcbd00e49a4ac31d2`
CapturedAt: `2026-07-28T09:04:00+08:00`
RevisedAt: `2026-07-28T09:04:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-28): requirements must be **comprehensive, thorough, verifiable, specific, future-proof, extensible, systematic**, use **strict TDD**, and include **verification of the runtime**; **unlock and update as needed**.
- Prior user direction (2026-07-28): gated router prompt-inject when KW is ON; Phase 5 must include rebuilt packaged runtime proof **and** a live `pi` CLI request with storage correctness.
- Repo AS-IS (post run-84 merge to `dev`; feature worktrees under parent `.worktrees/`):
  - Private KW: ceremony ON / soft OFF; `query.plane` shadow|production retrieve gate; `evaluateWithProductionKnowledge`; durable sessions; **`productionPromptInjection` hard-`false`**; TB10/probe cover retrieve/consumer.
  - Public host/UI: Prepare / Production ON / Soft OFF; durable Track B `productionActivation` (structural host checks; HMAC private).
  - UI honesty still claims **production prompt injection remains locked**.
  - **No** live-router insertion of KW production knowledge today.
  - Host durable activation ≠ private `#productionActivation` without an explicit join.
- Prior control-plane + memory: `STATE.md`, `DECISIONS.md`, `MEMORY.md`, `domains/direct-track-b.md`, skill issues (`anticipatory-phase-docs`, `launch-packaged-runtime-argv-equals`, `worktree-must-be-in-parent`)
- Predecessor: `84-kw-ui-toggle-gated-retrieve-eval` (`OOS3`/`E6` deferred inject); substrate `79`–`83`, `00`
Outputs:
- `/.recursive/run/85-kw-gated-router-prompt-inject/00-requirements.md` (private + public mirrors)
- Draft retained at `.cursor/spec-drafts/85-kw-gated-router-prompt-inject.00-requirements.md`
Scope note: Authoritative Phase 0 for **unlocking gated live-router production prompt injection** under ceremony-backed KW ON + successful gated production retrieve; **updating** honesty/export/capability surfaces that still say “locked”; proving inject under **strict TDD** and **Phase 5 rebuilt packaged runtime** (OFF refuse + ON apply receipts on that artifact) plus live `--track=dev` and live `pi` CLI+storage. No ambient always-on. No ceremony removal. No training unlock. No stage/main auto-promotion. No live `--track=production`.

## TODO

- [x] Elicit requirements from user direction + post-84 AS-IS
- [x] Align run id `85-kw-gated-router-prompt-inject`
- [x] Author comprehensive sequential `R1`–`R26` with Description + observable ACs
- [x] Elevate **unlock** + **runtime verification** as co-required themes with normative checklists
- [x] Add FDs, U#, vocabulary, state machine, invariants, refuse taxonomy, consistency cross-check
- [x] Add extensibility contracts + verification matrix + phase ownership
- [x] Document OOS (`OOS1`–`OOS20`)
- [x] Quality-bar revision pass (thorough/verifiable/specific/future-proof/extensible/systematic/TDD/runtime)
- [x] User approve this draft
- [x] recursive-init + write into dual in-parent `.worktrees/`
- [x] Coverage/Approval gates on repo artifact; lock Phase 0

## Background

### Goal

After this run, **all** of the following are true together (no partial theme PASS):

1. **Unlock:** gated live-router prompt injection is **actually unlocked** when KW is ceremony-backed ON and gated production retrieve succeeds — not honesty-only, not unit-only, not “export false forever.”
2. **Update:** all operator-visible and contract-visible surfaces that currently claim inject is locked / `productionPromptInjection === false` always are **updated** to match unlock reality (UI copy, status/export, TB10 assertions, package/product-contracts, probe honesty).
3. **Fail-closed when OFF:** soft OFF, missing join/activation, retrieve refuse/fail, unsupported contract → **no** production knowledge in prompts; refuse codes + receipts are observable.
4. **Distinct but dependent axis:** inject ≠ Set-mode ≠ recommendation ≠ `productionActivation` ≠ production retrieve; inject **requires** activation join + production retrieve success.
5. **Host↔private join:** UI/host ON alone cannot fake inject; private production retrieve remains payload authority.
6. **Versioned contract + bounded payload + receipt** (`injectContractVersion`, payload schema, refuse taxonomy); unknown fields refuse; additive future modes only.
7. **One Phase-2-locked insertion surface** wired in the live router/runtime path.
8. **Run-84 invariants remain green** (ceremony, soft OFF, retrieve gate, eval consumer, argv, evidence-root, in-parent worktrees).
9. **Systematic verification planes all green:**
   - strict TDD RED→GREEN
   - packaged probe inject matrix
   - **Phase 5 rebuilt packaged runtime** OFF refuse + ON apply (sha-bound SEA)
   - live `--track=dev` recommendation hop (axis independence)
   - live `pi` CLI request + storage presence/correctness
   - pin/freeze honesty if tip advances
10. **Future-proof:** training unlock, ambient on, ceremony removal, stage/main, `--track=production`, multi-surface inject remain explicit later runs.

### Problem

- Run 84 deferred full live-router inject (`OOS3`/`E6`) while shipping UI toggle + gated retrieve + eval consumer.
- Unlock is incomplete today: `productionPromptInjection` hard-false; UI says “remains locked”; no insertion surface; host flag and private retrieve can diverge.
- Without systematic runtime verification, unit/probe PASS would falsify “unlocked in the product operators actually run.”

### Scope

| Axis | In scope |
|---|---|
| Repos | private KW/contract/TB10/probe + public host insertion/honesty/runtime/`pi`/e2e |
| Run id | `85-kw-gated-router-prompt-inject` |
| Branch | `dev` only unless later authorized |
| Theme A | **Unlock** inject contract + arm/apply path when ON+retrieve PASS |
| Theme B | **Update** honesty/export/status/capability/product-contracts/TB10 for unlock |
| Theme C | Fail-closed refuse taxonomy + receipts |
| Theme D | Host↔private activation join |
| Theme E | One Phase-2-locked live-router insertion surface |
| Theme F | Bounded tip-safe payload + budget/envelope precedence |
| Theme G | Axis independence + preserve run-84 retrieve/consumer |
| Theme H | **Strict TDD** for all in-scope production edits |
| Theme I | **Runtime verification** (packaged probe + Phase 5 rebuilt SEA inject hops) |
| Theme J | Live `--track=dev` + live `pi` CLI+storage + pin/freeze + dual-repo closeout |
| Server | Only if Phase 1/2 proves required (`FD11`); default `not-required` |

### Non-goals (summary)

See **Out of Scope**. Notably: ambient on; ceremony removal; GRPO/training unlock; stage/main auto-promote; live `--track=production`; Set-mode/recs ⇒ inject; ungated OFF inject; unbounded dumps; unit-only “unlock” claims; proof-only-only freeze.

### Success definition (run-level)

Phase 4/5 may claim PASS only when **all** hold:

1. Every `R1`–`R26` is RCS `verified` (or addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R17` RED/GREEN exists for every in-scope production surface (strict TDD).
3. Unlock surfaces updated: `R7`, `R8`, `R13` (honesty/export/contracts) verified.
4. Runtime verification checklist (`R18`–`R20`) PASS on sha-bound rebuilt artifact.
5. `R21` live `--track=dev` PASS; `R22` live `pi` CLI+storage PASS.
6. `R24` binder secret-free and complete.
7. Invariants `I1`–`I16` hold; contracts `E1`–`E10` not violated.

### Runtime verification definition (normative)

“Verification of the runtime” for this run means **all** of:

| Plane | Required proof |
|---|---|
| Packaged/dist probe | Inject matrix on Track B dist / packaged load path (`R19`) |
| Rebuilt public SEA | Fresh package with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`; rebuild receipt binds sha256 (`FD14`, `R18`) |
| Live inject hop on that SEA | OFF refuse + ON apply (receipted) via locked insertion surface — **not unit-substituted** (`R18`, `R20`) |
| Live recommendation | `--track=dev` apply/dismiss; does not imply inject (`R21`) |
| Live `pi` | Real CLI request + storage presence + storage correctness (`R22`) |

Unit/TB10 PASS alone is **insufficient** to claim unlock (`OOS17`).

## Quality Bar (normative)

| Attribute | Enforcement |
|---|---|
| Comprehensive | Themes A–J co-required; unlock+update+runtime+`pi`+closeout |
| Thorough | Refuse taxonomy; join; payload bounds; tip-safety; budget; consistency matrix |
| Verifiable | Per-`R#` commands/artifacts; RCS `verified` needs distinct verification evidence |
| Specific | Seed refuse codes; contract version `1`; Phase 5 hop set named; one insertion surface |
| Future-proof | `I1`–`I16`, `E1`–`E10`, OOS walls against ambient/training/stage-main |
| Extensible | Versioned inject/payload/receipt; unknown refuse; additive surfaces/auth later |
| Systematic | State machine; phase ownership; verification matrix; consistency cross-check |
| TDD | `FD10` + `R17` strict RED→GREEN with log paths |
| Runtime | Normative runtime definition + `R18`–`R20` + `OOS17` |
| Unlock | `FD2`/`FD30`/`R7`/`R8`/`R13` explicitly unlock and update locked-era claims |

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Themes A–J co-required; `publicChange: required` expected. |
| `FD2` | Soft-closes run-84 deferred live-router inject (`OOS3`/`E6`) **and** honesty “remains locked” **for gated inject defined here**. |
| `FD3` | Ceremony ON retained (v1 or additive `U6`): attestation `activate-production` + verified receipt + shadow + digest bind. |
| `FD4` | Soft OFF → shadow-ready; inject OFF after soft OFF. |
| `FD5` | Class/static `productionActivation` remains `false`. |
| `FD6` | Set-mode = enablement only; recommendation apply/dismiss ≠ activation ≠ inject. |
| `FD7` | Inject requires (a) Phase-2 join says ON (`U1`) **and** (b) production retrieve PASS for that request. |
| `FD8` | Default: auto-arm inject when KW ON; no second operator toggle unless `U2` forces additive attestation. |
| `FD9` | Exactly one primary insertion surface locked in Phase 2 (`U3`). |
| `FD10` | Phase 3 `TDD Mode: strict` for inject, join, insertion, honesty, probe, contract updates. |
| `FD11` | Server change default `not-required`; additive+track-safe only if proven necessary. |
| `FD12` | `dev` only; no auto stage/main. |
| `FD13` | Live cloud required plane `--track=dev`; production refused. |
| `FD14` | Phase 5 uses freshly rebuilt private dist (as needed) + public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`. Stale binary = FAIL. |
| `FD15` | Non-run80 scopes require `--evidence-root`; do not overwrite run-80/83/84 receipts. |
| `FD16` | Tip drift → full Playwright assemble (not proof-only-only). |
| `FD17` | Secrets omitted from git/evidence; binder `secretsOmitted: true`. |
| `FD18` | Serial phase docs after real work; no anticipatory 3.5–8. |
| `FD19` | Versioned schemas; unknown fields refuse; default shadow-ready + production off + inject off. |
| `FD20` | Later stronger auth / extra surfaces / training unlock only via new explicit runs preserving `I*`. |
| `FD21` | Discrete + equals-form argv bind identically. |
| `FD22` | Live `pi` = CLI request + storage presence + correctness (not exit-only). |
| `FD23` | Merge operator-requested unless authorized in-run. |
| `FD24` | Axes: installed ≠ Set-mode ≠ recs ≠ activation ≠ retrieve ≠ **inject**. |
| `FD25` | Private worktrees under parent `.worktrees/` only. |
| `FD26` | Bounded payload (max items/tokens/fields Phase-2-locked). |
| `FD27` | Tip jailbreak protections retained; no unconstrained system override from refused tips. |
| `FD28` | Eval consumer remains green; inject does not replace it. |
| `FD29` | `productionPromptInjection` (or successor) **unlocks to true** only under inject contract satisfaction; TB10 must be updated (hard-false-forever = FAIL after unlock). |
| `FD30` | **Unlock is product-real:** claiming unlock without Phase 5 runtime OFF/ON inject evidence = FAIL (`OOS17`). |
| `FD31` | Seed refuse codes (Phase 2 may refine names but must remain stable/observable): `kw_prompt_inject_requires_activation`, `kw_prompt_inject_requires_production_retrieve`, `kw_prompt_inject_contract_unsupported`, `kw_prompt_inject_join_unsatisfied`. |
| `FD32` | Runtime inject proof must exercise the **locked insertion surface** on the rebuilt SEA (host API harness and/or packaged completion path Phase-2-locked) — mock-only insertion = FAIL. |

## Open Unknowns (must resolve before related PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Host↔private join mechanism | Phase 1/2 locks one join; divergence refuses inject |
| `U2` | Separate inject attestation vs auto-arm | Prefer auto-arm (`FD8`); document if attestation added |
| `U3` | Primary insertion surface | Lock exactly one; defer others explicitly |
| `U4` | Payload composition | Lock bounded composition + filters |
| `U5` | Trigger cadence | Lock deterministic rule; test OFF/ON/soft-OFF |
| `U6` | Ceremony additive fields for join | Additive only; keep digest/shadow/receipt |
| `U7` | Final refuse code strings | Start from `FD31`; lock in Phase 2 |
| `U8` | Public freeze pin advance? | Measure; advance only if honesty requires |
| `U9` | `pi` provider/model/marker | From assemble/runtime config; sanitize evidence |
| `U10` | Cloud redeploy needed? | Prefer permanent-dev; redeploy only if drift |
| `U11` | Capability name | Lock + update product-contracts |
| `U12` | Budget/envelope precedence | Lock truncation/refuse + receipt |
| `U13` | Exact runtime hop harness (HTTP completion vs host test harness vs packaged probe-driven completion) | Phase 2 locks harness that still counts as **runtime** on rebuilt SEA (`FD32`) |

## Vocabulary

| Term | Meaning |
|---|---|
| `unlock` | Inject path is implemented, honesty/export/contracts updated, and runtime-verified — not merely planned |
| `update` | Change locked-era claims (`productionPromptInjection` hard-false, UI “remains locked”, stale contracts) to match unlock |
| `shadow-ready` | Shadow candidate(s) present while production off |
| `productionActivation` | Ceremony-gated KW ON flag (joined host+private under `U1`) |
| `production retrieve` | `query.plane: "production"` requiring ON |
| `prompt inject` / `router inject` | Bounded KW production knowledge inserted into locked live-router surface |
| `inject contract` | Versioned authorization (`injectContractVersion`) |
| `inject payload` | Bounded structured content from gated retrieve |
| `inject receipt` | Success/refuse observability record |
| `fail-closed inject` | No production knowledge in prompts + explicit refuse/receipt |
| `insertion surface` | Single Phase-2-locked mutation site |
| `runtime verification` | See normative definition table above |
| `Set mode` | Enablement only |
| `eval consumer` | Run-84 `evaluateWithProductionKnowledge` (retained) |
| `productionPromptInjection` | Export/status true only when inject contract satisfied |

## Normative state machine

```
[cold] --bootstrap--> [shadow-ready, inject=OFF, export productionPromptInjection=false]
[shadow-ready] --ceremony ON--> [production ON, inject=ARMED]
[ARMED] --eligible runtime completion + production retrieve PASS--> [inject=APPLIED + receipt + export may be true]
[ARMED] --retrieve FAIL/refuse or join unsatisfied--> [inject=REFUSED + receipt] (no production knowledge in prompt)
[ON|ARMED|APPLIED] --soft OFF--> [shadow-ready, inject=OFF, export false]
[any] --unsupported contract / unknown fields--> REFUSE
[any] --Set-mode / recommendation alone--> does NOT arm/apply/unlock
```

Class/static `productionActivation` remains `false` always.

## Invariants

| ID | Invariant |
|---|---|
| `I1` | Default: shadow-ready + production off + inject off. |
| `I2` | Class/static `productionActivation === false`. |
| `I3` | Ceremony retained for ON. |
| `I4` | Soft OFF → shadow-ready and inject off. |
| `I5` | Production retrieve gated while OFF. |
| `I6` | Inject requires join ON + production retrieve success. |
| `I7` | Set-mode ≠ activation ≠ recommendation ≠ inject. |
| `I8` | No silent inject while OFF. |
| `I9` | Eval consumer remains gated and available. |
| `I10` | Equals-form argv + evidence-root hygiene. |
| `I11` | Unknown fields refuse. |
| `I12` | Payload bounded + tip-safe. |
| `I13` | Honesty/export match unlock state. |
| `I14` | Private worktrees in-parent `.worktrees/`. |
| `I15` | Unlock claims require runtime verification (`FD30`). |
| `I16` | Single primary insertion surface only (unless later run adds more). |

## Refuse / failure taxonomy

| Condition | Required outcome |
|---|---|
| Inject while OFF / soft-OFF | Refuse `kw_prompt_inject_requires_activation` (or Phase-2 lock); no production knowledge in prompt |
| Join unsatisfied | Refuse `kw_prompt_inject_join_unsatisfied`; no inject |
| ON but production retrieve fails/refuses | Refuse `kw_prompt_inject_requires_production_retrieve`; no inject |
| Unsupported/unknown contract/fields | Refuse `kw_prompt_inject_contract_unsupported` |
| Set-mode enable alone | No arm/apply |
| Recommendation apply alone | No arm/apply |
| Stale SEA for Phase 5 | FAIL |
| Proof-only-only freeze after tip drift | FAIL |
| Unlock claimed via unit tests only | FAIL (`OOS17`) |
| `pi` exit-only | FAIL (`OOS18`) |
| Honesty still says “remains locked” after unlock ship | FAIL (`R13`) |
| TB10 still asserts hard-false forever after unlock | FAIL (`R7`) |

## Requirements

### `R1` Inject contract v1

Description: Versioned inject contract authorizing gated unlock without ambient on.

Acceptance criteria:
- Phase 2 locks `injectContractVersion: 1` (or documented successor).
- Unknown version/fields refuse with `FD31` codes.
- Additive-only (`E1`).
- Unit tests: accept v1 / refuse unknown.

### `R2` Fail-closed inject when OFF

Description: OFF/soft-OFF must not inject production knowledge.

Acceptance criteria:
- OFF → refuse + receipt; insertion surface free of production KW payload.
- Soft OFF → refuse again.
- Silent empty success = FAIL.
- TB10/probe RED→GREEN.

### `R3` ON inject requires production retrieve success

Description: ON alone is insufficient; retrieve must PASS (`FD7`).

Acceptance criteria:
- ON + retrieve PASS → apply + success receipt.
- ON + retrieve FAIL → refuse; no production knowledge in prompt.
- Uses `query.plane: "production"`.
- Tests cover both branches.

### `R4` Host↔private join

Description: Join host durable ON and private retrieve authority (`U1`).

Acceptance criteria:
- Phase 2 documents join.
- Host-only ON without private retrieve success → no inject success.
- Private retrieve without join ON → no live-router inject unlock.
- Divergence tests refuse inject.

### `R5` Bounded inject payload

Description: Versioned bounded payload from gated retrieve (`FD26`, `U4`).

Acceptance criteria:
- Schema id locked (e.g. `role-model.kw-prompt-inject.v1`).
- Includes plane=`production`, activation true, correlation fields, Phase-2 content composition.
- Bounds enforced; over-bound truncate/refuse receipted (`U12`).
- Unit tests for required fields + bounds.

### `R6` Inject receipts

Description: Every attempt yields secret-free success/refuse receipt.

Acceptance criteria:
- Success: injected=true, plane, surface/roles, correlation ids.
- Refuse: injected=false + stable code.
- Probe/tests assert fields.

### `R7` Unlock export/status `productionPromptInjection`

Description: **Unlock/update** export/status boolean (`FD29`).

Acceptance criteria:
- Before unlock conditions: false.
- When contract satisfied and armed/applied per Phase 2: may be true.
- TB10 **updated** — hard-false-forever assertions removed/replaced.
- Status/UI can read honest signal.

### `R8` Unlock capability + product-contracts

Description: **Unlock/update** declared capabilities and generated contracts (`U11`).

Acceptance criteria:
- Capability name locked.
- `package.json` permissions + `product-contracts` updated (no stale derive-only honesty for inject path).
- Undeclared capability in production path = FAIL.
- Contract/depth tests PASS.

### `R9` Insertion surface wiring

Description: Wire exactly one Phase-2-locked live-router surface (`FD9`).

Acceptance criteria:
- Phase 2 names surface + owning modules.
- ON+retrieve success mutates surface with bounded payload.
- OFF leaves surface clean.
- Host/unit tests PASS; unwired claim = FAIL.

### `R10` Budget / envelope precedence

Description: Deterministic budget behavior (`U12`).

Acceptance criteria:
- Phase 2 locks precedence/truncation.
- Over-budget receipted.
- ≥1 over-budget test.

### `R11` Tip-safety retention

Description: No jailbreak promotion via inject (`FD27`).

Acceptance criteria:
- Derive tip refusals remain.
- Inject does not promote refused tips to unconstrained system overrides.
- ≥1 regression test.

### `R12` Axis independence

Description: Independence matrix (`FD24`).

Acceptance criteria:
- Set-mode alone ≠ inject.
- Recommendation apply/dismiss alone ≠ inject.
- Retrieve alone without join ON ≠ live-router inject unlock.
- Probe/tests cover matrix.

### `R13` Unlock honesty copy (UI/status/docs/probe)

Description: **Update** operator-visible locked-era wording.

Acceptance criteria:
- Remove/replace “production prompt injection remains locked” once unlock ships.
- Copy states: inject requires ceremony ON + gated production retrieve; ≠ Set mode; ≠ recommendation apply.
- Probe honesty phrases updated.
- UI unit tests cover wording.

### `R14` Versioned schema refuse-unknown

Description: Unknown fields on inject policy/payload refuse (`FD19`).

Acceptance criteria:
- Unknown-field refuse tests PASS.
- Additive v2 possible later without breaking v1 fail-closed default.

### `R15` Preserve run-84 retrieve gate + eval consumer

Description: No regression (`FD28`).

Acceptance criteria:
- TB10 retrieve gate + eval consumer + durable session PASS.
- Soft OFF still fail-closes retrieve/consumer.
- Probe matrix green (extended for inject).

### `R16` Idempotent soft OFF clears inject

Description: Soft OFF clears arm/apply and export.

Acceptance criteria:
- After soft OFF: inject refuse; export false; subsequent runtime completion does not carry prior production inject payload.
- Tests cover ON→apply→OFF→refuse.

### `R17` Strict TDD

Description: Strict RED→GREEN for in-scope production edits (`FD10`).

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`.
- RED logs before implement for inject/join/insertion/honesty/contract surfaces.
- GREEN logs for same tests after.
- Missing RED for a production surface = FAIL for that surface.

### `R18` Phase 5 rebuilt packaged runtime — identity + bind

Description: Fresh SEA identity binding for runtime verification (`FD14`).

Acceptance criteria:
- Rebuild receipt records SEA sha256 + distribution root usage.
- Phase 5 hops cite that sha.
- Stale/unrelated binary = FAIL.

### `R19` Packaged probe inject matrix on dist

Description: Dist/packaged probe covers OFF→ON→OFF inject (+ retrieve-fail refuse).

Acceptance criteria:
- Probe loads packaged/dist KW/runtime path.
- Asserts receipts/codes not only booleans.
- Probe tests PASS.

### `R20` Phase 5 runtime inject hop on rebuilt SEA (mandatory unlock proof)

Description: Prove inject on the rebuilt runtime via locked insertion surface (`FD30`, `FD32`, `U13`).

Acceptance criteria:
- On sha-bound SEA: OFF completion/harness → inject refuse receipt; no production KW payload on surface.
- On same SEA after ceremony ON + valid retrieve path: inject apply receipt; production payload present on locked surface (bounded).
- Soft OFF then refuse again on same SEA session rules Phase-2-locked.
- Evidence logs under run-85 evidence root; unit tests cannot substitute this hop.
- Harness may be host API / packaged completion / Phase-2-locked equivalent — must still be **runtime on rebuilt SEA**.

### `R21` Live `--track=dev` recommendation hop

Description: Live recs PASS; do not imply inject unlock.

Acceptance criteria:
- Seed+apply+dismiss PASS with `--evidence-root` under run 85.
- Binder/QA asserts axis independence from inject.

### `R22` Live `pi` CLI request + storage correctness

Description: Live `pi` against rebuilt runtime (`FD22`).

Acceptance criteria:
- Live CLI request recorded (sanitized).
- Storage presence PASS + correctness PASS in secret-free receipt.
- Exit-only = FAIL.
- Correlation ids recorded as applicable.

### `R23` Assemble / pin-freeze if tip advances

Description: Freeze honesty (`FD16`).

Acceptance criteria:
- Pin-freeze + TB11 + system-proof PASS after required tip advance.
- Proof-only-only alone = FAIL.
- Assemble uses enabled Validate & apply + live base URL hygiene.

### `R24` Binder + RCS

Description: Machine-checkable RCS + secret-free binder.

Acceptance criteria:
- Every `R1`–`R26` dispositioned; verified cites distinct verification evidence.
- Binder maps SEA sha, scope id, unlock/runtime/`pi`/cloud paths; `secretsOmitted: true`.
- `publicChange`/`serverChange` recorded.

### `R25` Soft-close prior inject residual in DECISIONS

Description: Phase 6 soft-closes run-84 inject lock residual for gated unlock only.

Acceptance criteria:
- DECISIONS states soft-close of `OOS3`/`E6`/honesty locked claim.
- Does not soft-close training unlock, ambient on, or stage/main.

### `R26` Dual-repo delivery + control-plane closeout

Description: Ship private+public; Phases 6–8 update DECISIONS/STATE/memory.

Acceptance criteria:
- Mirrored run artifacts.
- STATE/memory record unlock, insertion surface, join, runtime/`pi` proofs.
- No anticipatory 6–8 (`FD18`).
- Merge operator-requested unless authorized (`FD23`).

## Extensibility & future-proofing

| ID | Contract |
|---|---|
| `E1` | Inject contract versioned; unknown refuse; additive only. |
| `E2` | Payload schema versioned; new content kinds additive. |
| `E3` | Refuse codes stable/versioned; additive OK. |
| `E4` | Extra insertion surfaces require new run/version — no silent multi-write. |
| `E5` | Stronger inject auth may add fields; must not drop activation+retrieve prerequisites unless superseding `I6`. |
| `E6` | Training/GRPO unlock = new explicit run. |
| `E7` | Stage/main or `--track=production` = new explicit run. |
| `E8` | Ambient on / ceremony removal forbidden unless superseding `I1`–`I3`. |
| `E9` | Baseline remains shadow-ready + production off + inject off. |
| `E10` | Export/status unlock semantics remain fail-closed by default for unknown future modes. |

## Soft-close of prior decisions (Phase 6)

- Soft-close run-84 deferred full live-router production prompt-injection (`OOS3`/`E6`).
- Soft-close honesty/export residual that inject “remains locked” / hard-false forever **after** unlock proven.
- Do **not** soft-close training unlock, ambient on, ceremony removal, stage/main promotion.

## Out of Scope

| ID | OOS |
|---|---|
| `OOS1` | Ambient always-on / class-static true |
| `OOS1a` | Weakening KW correctness while ON |
| `OOS1b` | Removing unlock ceremony |
| `OOS2` | Auto-promote stage/main |
| `OOS3` | Profile Learner / GRPO training unlock |
| `OOS4` | Live `--track=production` |
| `OOS5` | Replacing Set-mode as enablement authority |
| `OOS6` | Recommendation apply ⇒ KW ON or inject |
| `OOS7` | Ungated inject while OFF/soft-OFF |
| `OOS8` | Silent multi-surface inject |
| `OOS9` | Unbounded corpus dump into prompts |
| `OOS10` | Cloudflare reprovision/rename program |
| `OOS11` | Proposal-corpus rewrite |
| `OOS12` | TB11 maxItems schema redesign |
| `OOS13` | Knowledge-store hard-off copy rewrite |
| `OOS14` | Freeze PASS via proof-only rebind alone |
| `OOS15` | Second unrelated knowledge product |
| `OOS16` | Silent CI weakening |
| `OOS17` | Claim unlock/inject PASS via unit tests only (no rebuilt runtime hop) |
| `OOS18` | Claim `pi` PASS via CLI exit without storage correctness |
| `OOS19` | Leave UI/TB10/contracts claiming locked/hard-false after unlock ships |
| `OOS20` | Host-flag-only inject without private production retrieve success |

## Constraints

- Dual worktrees `recursive/85-kw-gated-router-prompt-inject` from paired `origin/dev` (post-84).
- Private path: `role-model-internal/.worktrees/85-kw-gated-router-prompt-inject`.
- Run-85 evidence root; no overwrite of 80/83/84 history.
- `--evidence-root` for non-run80 scopes.
- Serial phase docs; SEA packaging with distribution root for Phase 5.
- Diff basis in `00-worktree.md`.

## Consistency cross-check (normative)

| Check | Rule |
|---|---|
| Unlock completeness | `FD2`+`FD29`+`FD30` ↔ `R7`+`R8`+`R13`+`R20` all required |
| Runtime completeness | Runtime definition table ↔ `R18`+`R19`+`R20` (+`R21`+`R22`) |
| No ambient | `FD5`/`I2` ↔ OOS1 ↔ refuse taxonomy |
| Ceremony retained | `FD3`/`I3` ↔ no OOS1b language in R# |
| Axis independence | `FD6`/`FD24`/`R12` ↔ OOS6 |
| TDD | `FD10`/`R17` ↔ every production surface |
| Soft-close precision | Soft-close inject lock only; training/stage-main remain OOS |
| Worktrees | `FD25`/`I14` |

## Verification matrix

| `R#` | Primary evidence | Assertion focus |
|---|---|---|
| `R1` | TB10/unit | contract v1 / unknown refuse |
| `R2` | TB10/probe | OFF fail-closed |
| `R3` | TB10/probe | retrieve required |
| `R4` | host+private tests | join |
| `R5` | payload unit | bounds |
| `R6` | probe receipts | observability |
| `R7` | TB10 export/status | unlock boolean |
| `R8` | package/contracts | capability unlock |
| `R9` | host unit | insertion wiring |
| `R10` | budget tests | precedence |
| `R11` | tip-safety test | anti-jailbreak |
| `R12` | independence matrix | axes |
| `R13` | UI unit + probe honesty | copy unlock/update |
| `R14` | unknown-field tests | versioning |
| `R15` | TB10 retrieve/consumer | no regression |
| `R16` | OFF after apply tests | clear inject |
| `R17` | red/green logs | strict TDD |
| `R18` | rebuild receipt | SEA identity |
| `R19` | packaged probe | dist matrix |
| `R20` | Phase 5 runtime logs | SEA inject OFF/ON |
| `R21` | lifecycle logs | live dev recs |
| `R22` | pi CLI + storage receipt | live pi |
| `R23` | assemble/pin/TB11 | freeze honesty |
| `R24` | binder + RCS | mapping |
| `R25` | DECISIONS | soft-close |
| `R26` | DECISIONS/STATE/memory | closeout |

## Phase ownership (seed)

| Phase | Owns |
|---|---|
| 0 | This requirements lock |
| 1 | AS-IS inject/join/surfaces; measure `U1`–`U13` |
| 2 | Lock contract/payload/receipt/surface/join/trigger/harness; ExecPlan |
| 3 | Implement `R1`–`R17` (+ probe) under strict TDD |
| 3.5 | Optional if inject/security risk warrants |
| 4 | Tests; assemble/pin if needed (`R23`) |
| 5 | `R18`–`R22`, binder `R24` |
| 6–8 | `R25`–`R26` |

## Coverage Gate

- [x] Goal/problem/scope/success + runtime verification definition
- [x] Unlock + update elevated as co-required themes
- [x] FDs/U#/vocabulary/state machine/invariants/refuse taxonomy/consistency cross-check
- [x] `R1`–`R26` with observable ACs
- [x] OOS + constraints + verification matrix + phase ownership + extensibility
- [x] Quality bar: comprehensive/thorough/verifiable/specific/future-proof/extensible/systematic/TDD/runtime/unlock

Coverage: PASS

## Approval Gate

- Objective readiness: revised draft user-approved 2026-07-28; recursive-init completed into dual in-parent worktrees
- Remaining blockers: none

Approval: PASS
Audit: PASS
Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: available; requirements user-approved
Delegation Decision Basis: self-audit selected
Delegation Override Reason: user-approved draft installed into dual worktrees; no delegated rewrite
Effective Inputs Re-read: user approval message; STATE/DECISIONS post-84; quality-bar mandate
Reviewed Subagent Action Records: none
