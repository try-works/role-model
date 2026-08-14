Run: `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-25T11:18:05Z`
LockHash: `7590782dbf4fe6c39395ee8f294354280a3cddc6e7bb9eb01944a950f5795e83`
CapturedAt: `2026-07-25T19:08:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-25): next run must include (1) **Extensions UI control** for Knowledge Worker `productionActivation` ON/OFF (ceremony retained; soft OFF → shadow-ready), and (2) an **eval/replay/retrieve (or training) value path that only works when ceremony ON** — prove KW is useful when on, not merely toggled.
- Quality mandate (2026-07-25): requirements must be **thorough, consistent, detailed, extensible, and future-proof** (same bar as run 83).
- Repo AS-IS (post run-83 merge to `dev` @ private `7a85d56` / public `f52f8e30`):
  - KW: shadow-ready bootstrap, ceremony ON, soft OFF, digest bind; probe/TB10 cover toggle matrix; static/class `productionActivation === false`.
  - Extensions UI: honesty copy only — **no** KW activation control; Set-mode remains separate.
  - Public host mutate API: `enable` / `disable` / `set_mode` only — **no** KW activate/deactivate HTTP surface.
  - `derive` / `rebuild` / `retrieve` do **not** check `#productionActivation` (usefulness gate is greenfield).
  - `run()` constructs a fresh KW per capability call — instance flag is not host-persisted (UI toggle requires durable host binding).
  - Launch: discrete + equals-form argv bind; non-run80 scopes require `--evidence-root`.
- Prior control-plane: `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`, `/.recursive/memory/domains/direct-track-b.md`, `/.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md`, `/.recursive/memory/skills/issues/anticipatory-phase-docs.md`
- Predecessor runs: `83-kw-operator-toggle-assemble-live-e2e-argv-equals` (deferred UI `U1`); substrate `79`–`82`, `00-direct-track-b-v1-1-implementation`
Outputs:
- `/.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-requirements.md` (private + public mirrors)
- Approved source draft retained at `.cursor/spec-drafts/84-kw-ui-toggle-gated-retrieve-eval.00-requirements.md`
Scope note: Authoritative Phase 0 requirements for (A) operator Extensions UI + audited host API for ceremony-bound KW ON / soft OFF with **durable** activation state, and (B) **production retrieve** that refuses when OFF and succeeds when ON, plus one first-party **consumer usefulness proof** (eval preferred) — under strict TDD, rebuilt packaged SEA Phase 5, live `--track=dev` recommendation hop, and live `pi` storage correctness. Spec enforces consistency/extensibility/future-proof contracts below. No ambient always-on. No ceremony removal. No stage/main auto-promotion. No live `--track=production`. No full router prompt-injection unlock unless a later run explicitly supersedes.

## TODO

- [x] Elicit requirements from user direction + post-83 AS-IS
- [x] Align provisional run id with public max+1 (`83` → `84`)
- [x] Author comprehensive sequential `R1`–`R22` with Description + observable acceptance criteria
- [x] Add fixed decisions, open unknowns, vocabulary, normative state machine, invariants, refuse taxonomy
- [x] Add extensibility / future-proofing contracts + consistency cross-check
- [x] Add full verification matrix + phase ownership map
- [x] Document out of scope (`OOS1`–`OOS16`)
- [x] Consistency pass: FDs/`R#`/`U#`/`OOS`/`I#` cross-checked; no “retire ceremony” / “ambient on” / “Set-mode = activation” language
- [x] User approve this draft (2026-07-25)
- [x] recursive-init + write approved content into both repos’ run folders
- [x] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)
- [x] Lock Phase 0 via recursive-lock after worktree PASS

## Background

### Goal

After this run, **all** of the following are true together (no partial theme PASS):

1. **Operators can drive KW ON/OFF from Extensions UI** (not honesty-only), visually and semantically distinct from Set mode.
2. **Host exposes audited activate/deactivate APIs** that preserve run-83 ceremony (verified receipt + shadow candidate + digest bind) and soft OFF → shadow-ready.
3. **Activation state is durable** for the packaged runtime session across host capability/status/retrieve calls (UI toggle is not a no-op / lost-per-`run()`).
4. **Production retrieve is gated**: refuses when `productionActivation === false`; succeeds on valid input when ON; OFF cannot silently obtain production results.
5. **At least one first-party consumer path** (eval preferred; replay or eval-shaped packaged hop if Phase 1 proves better fit) refuses production knowledge advantage when OFF and succeeds when ON — proving KW is **useful**, not merely toggled.
6. **Run-83 invariants remain green**: shadow-ready default, ceremony ON, soft OFF, KW correctness while on, axis independence, equals-form argv, evidence-root hygiene.
7. **Axes stay independent**: installed ≠ Set-mode ≠ recommendation apply/dismiss ≠ `productionActivation` ≠ production retrieve.
8. **Multi-plane verification** green: strict TDD; rebuilt SEA Phase 5 (UI + gate + consumer); live cloud `--track=dev` hop; live `pi` storage correctness.
9. **Pin/CI honesty** retained after any required private tip advance (full Playwright assemble if freeze drifts; proof-only-only = FAIL).
10. **Schemas are versioned/additive** so future auth modes / consumers / inject unlock can extend without ambient on or ceremony removal.

### Problem

- Run 83 closed capability/probe toggle + honesty, but **deferred Extensions UI control** (run-83 `U1`: no mandatory UI button).
- `productionActivation` is **readiness-only** today: retrieve/eval/replay are not gated, so “KW works when on” is not an observable usefulness proof.
- Host has **no** KW activation HTTP surface and **no** durable KW instance binding for UI.
- Without an explicit production-vs-shadow retrieve vocabulary, gating “all retrieve” when OFF would either break shadow workflows or silently leak production results.

### Scope

| Axis | In scope |
|---|---|
| Repos | `try-works/role-model-internal` (primary KW/gate/tests/probes) + `try-works/role-model` (host API + Extensions UI + e2e/`pi`) |
| Run id | `84-kw-ui-toggle-gated-retrieve-eval` (mirrored) |
| Branch | `dev` only unless user later authorizes promotion |
| Theme A | Extensions UI ON/OFF + host activate/deactivate + durable activation + status honesty |
| Theme B | Production retrieve gate + refuse taxonomy + first-party consumer usefulness proof |
| Theme C | Axis separation (Set-mode ≠ KW activation ≠ recommendations) + honesty copy |
| Theme D | Preserve run-83 ceremony/shadow-ready/soft-OFF/KW-correctness/argv/evidence-root |
| Theme E | Strict TDD + Phase 5 rebuilt packaged runtime |
| Theme F | Live Cloudflare `--track=dev` hop + live `pi` storage correctness |
| Theme G | Pin/freeze honesty if tip advances + dual-repo closeout |
| Server | Only if Phase 1/2 proves local surfaces cannot satisfy an AC (`FD11`) |
| Verification | See Verification Matrix; every `R#` must be observable |

### Non-goals (summary)

See **Out of Scope**. Notably: ambient production-on; removing unlock ceremony; full live router prompt-injection unlock; Profile Learner / GRPO training product unlock; stage/main auto-promotion; live `--track=production`; collapsing Set-mode into activation; making recommendation apply imply KW ON; proof-only-only freeze closeout; silent CI weakening.

### Success definition (run-level)

Phase 4/5 may claim PASS only when **all** hold:

1. Every in-scope `R1`–`R22` reaches RCS `verified` (or an addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R15` RED/GREEN evidence exists for every in-scope production code change on strict surfaces.
3. `R1`–`R4` prove host API + durability + UI control (UI wiring not skipped).
4. `R6`–`R9` prove production retrieve gate + consumer usefulness (OFF refuse is fail-closed, not silent empty success).
5. `R17` rebuilt-runtime Phase 5 evidence exists; hops target that artifact (stale binary = FAIL).
6. `R18` live cloud `--track=dev` PASS; `R19` live `pi` storage PASS.
7. `R21` binder is secret-free and maps every `R#` to evidence.
8. Invariants `I1`–`I12` hold (see Invariants).
9. Extensibility contracts `E1`–`E8` are not violated by shipped schemas/APIs.

## Quality Bar (normative for this draft)

| Attribute | How this draft enforces it |
|---|---|
| Thorough | Themes A–G co-required; refuse taxonomy; durability; UI+host+KW agreement; consumer fail-closed; pin/cloud/`pi`/SEA planes |
| Consistent | Single KW state machine; sequential `R1`–`R22`; FDs/`R#`/OOS/`U#`/`I#`/`E#` cross-checked; no “retire ceremony”, “ambient on”, or “Set-mode = activation” language |
| Detailed | Vocabulary + state machine + invariants + per-`R#` Description + observable ACs + verification matrix + phase ownership |
| Verifiable | Each `R#` names commands/artifacts/assertions; PASS requires RCS `verified` with distinct verification evidence |
| Extensible | Versioned activation + retrieve-gate contracts (`R12`, `E1`–`E5`); refuse unknown fields; additive future auth/consumer/inject modes without dropping ceremony/shadow-ready |
| Future-proof | Invariants `I1`–`I12` + `FD19`/`FD20` + `E6`–`E8`; OOS blocks regressions (ambient on, ceremony removal, ungated production retrieve, inject unlock by stealth, training unlock by stealth) |

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Themes A–G are co-required for run PASS; public changes are **required** for UI/host (`publicChange: required` expected). |
| `FD2` | Ceremony for ON remains policy/toggle-request **v1** (or additive bump under `U6`) + `operatorAttestation: "activate-production"` + verified `knowledge_validation` receipt + shadow candidate + `digest(receipt) === candidate.validationReceiptHash` (run-83 invariants). Bare boolean / attestation-only ON is refused. |
| `FD3` | Soft OFF uses `deactivate-production` (or Phase-2-locked equivalent) → shadow-ready; candidates retained unless destructive rollback. |
| `FD4` | Static/class `KnowledgeWorker.productionActivation` remains `false`. No ambient always-on. |
| `FD5` | Set-mode mutate API remains sole **enablement** authority; KW activation is a **separate** axis with its own UI control and host API. |
| `FD6` | Normative usefulness gate for this run is **production retrieve** (and consumers of that retrieve). Shadow/bootstrap/derive remain available while production off. |
| `FD7` | OFF must not silently receive production retrieve results. Phase 2 locks explicit production-vs-shadow vocabulary (`U4`). |
| `FD8` | Full live router **production prompt injection** into routing remains OOS unless a later run explicitly supersedes (`OOS3`). This run may set candidate/export fields needed for gated retrieve but must **not** claim router inject unlock. |
| `FD9` | Profile Learner / GRPO training product unlock remain OOS (`OOS4`). Consumer proof must not be a stealth training unlock. |
| `FD10` | Phase 3 `TDD Mode: strict` for KW gate, host API, UI production edits, and consumer gate wiring. |
| `FD11` | Server changes allowed only if Phase 1/2 shows local surfaces cannot satisfy an AC; additive + track-safe. Default expectation: `serverChange: not-required`. |
| `FD12` | Work stays on `dev`; no auto-promotion to `stage`/`main`. |
| `FD13` | Live cloud write E2E required plane is `--track=dev`; production refused; stage optional extra only. |
| `FD14` | Phase 5 verifies freshly rebuilt private Track B dist (when needed) + public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`. Stale binary = FAIL. |
| `FD15` | Non-run80 scopes must pass `--evidence-root` / env (run-83 hygiene). Do not overwrite run-80/83 historical receipts. |
| `FD16` | If private tip advances enough to break pin-freeze/TB11, refresh via **full Playwright assemble** (not proof-only-only). |
| `FD17` | Secrets stay out of git; evidence cites hosts/ids/digests/paths/hashes only; binder `secretsOmitted: true`. |
| `FD18` | Phase docs are authored serially after real work (no anticipatory 3.5–8 batch-write). |
| `FD19` | Activation/auth and retrieve-gate schemas are **versioned**; future modes ship as additive versions; unknown fields refuse; default remains shadow-ready + production off. |
| `FD20` | Extensibility rule: later runs may add auth modes, additional consumers (replay/training), or inject unlock **only** via explicit new requirements that preserve `I1`–`I12` unless those invariants are explicitly superseded. |
| `FD21` | Launch helper continues to accept discrete and equals-form `--track` / `--scope-id` with identical effective bind. |
| `FD22` | Live `pi` verification asserts storage presence/absence **and** correctness, not CLI exit alone. |
| `FD23` | Merge to origin/`dev` remains operator-requested unless user authorizes in-run. |
| `FD24` | Axes remain independent: installed ≠ Set-mode ≠ recommendation apply/dismiss ≠ `productionActivation` ≠ production retrieve (`FD5`, `FD6`, `R14`). |

## Open Unknowns (must resolve before claiming related PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Ceremony material in UI (host-held shadow-ready receipt vs operator paste vs one-click using packaged bootstrap material) | Phase 1 inventory; Phase 2 locks **one** path that preserves ceremony without fake attestation or ambient on |
| `U2` | Durable activation store (host supervisor singleton vs keyed session store vs extension-host binding) | Phase 2 locks one durable binding; UI/API toggle must round-trip status/`health().productionActivation` across subsequent calls |
| `U3` | Exact first-party consumer (evaluation-core / evaluation-runner-local / replay-core / packaged eval-shaped hop) | Phase 1 picks the **smallest real** consumer that calls gated production retrieve; prefer eval if a thin hook exists; else packaged consumer with explicit eval-shaped contract and documented mapping |
| `U4` | Production-vs-shadow retrieve vocabulary (explicit `mode`/`plane`/`production: true` flag vs separate capability) | Phase 2 locks vocabulary so OFF cannot silently get production results; shadow/default path remains usable while off |
| `U5` | Host API shape (new endpoints vs extended mutate actions vs dedicated KW activation route) | Phase 2 locks names; must be audited, distinct from `enable`/`disable`/`set_mode`, and refuse ceremony violations |
| `U6` | Keep/extend v1 ceremony schema vs additive v2 for UI/host fields | Additive only; must not drop digest bind / shadow / verified receipt for ON |
| `U7` | Exact refuse error codes/strings for production retrieve OFF and consumer fail-closed | Phase 2 locks stable observable codes for tests/probes; do not return production payloads on refuse |
| `U8` | Whether public freeze pin must advance | Measure in Phase 1/3; advance only if public product tip honesty requires it |
| `U9` | Exact `pi` provider/model/marker prompt | Resolve from assemble/`local-runtime-and-pi` + router config; sanitize in evidence |
| `U10` | Whether live cloud hop needs redeploy | Prefer existing permanent-dev workers; redeploy only if Phase 1 shows drift |

## Vocabulary

| Term | Meaning for this run |
|---|---|
| `shadow-ready` | ≥1 shadow candidate bound to verified knowledge material while `productionActivation === false` |
| `operator toggle` | Explicit ON/OFF control for instance `productionActivation` (UI and/or host API) |
| `unlock ceremony` | ON prerequisites: verified `knowledge_validation` receipt + shadow candidate + digest bind |
| `soft OFF` / `soft deactivate` | OFF that returns to shadow-ready without clearing candidates/index |
| `destructive rollback` | Clears candidates and activation (retained if present; not the default OFF) |
| `durable activation` | Host-retained KW activation state across capability/status/retrieve calls for a runtime session |
| `production retrieve` | Retrieve path/mode that returns **production** knowledge advantage and **requires** ON |
| `shadow retrieve` | Non-production retrieve path/mode usable while OFF (Phase-2-locked under `U4`) |
| `consumer proof` | First-party eval/replay/packaged hop that **depends** on production retrieve for success |
| `fail-closed consumer` | OFF consumer result is an explicit refuse/failure — not silent empty success pretending production knowledge was used |
| `Set mode` | Extension enablement mode via mutate API — **not** KW activation |
| `toggle request` | Versioned activate/deactivate payload; ON includes ceremony fields |
| `retrieve-gate contract` | Versioned request/response schema for production vs shadow retrieve (`U4`, `R12`) |
| `useful when ON` | Observable production retrieve + consumer success that is impossible (refused) when OFF |
| `proof-only rebind` | Source-revision rewrite without regenerating hop proofs — insufficient alone for freeze honesty (`OOS12`) |
| `discrete form` | `--track` `dev`, `--scope-id` `run84-dev` |
| `equals form` | `--track=dev`, `--scope-id=run84-dev` |
| `effective bind` | Resolved track/scope recorded in runtime identity |
| `storage presence` | Observable record exists after a live request |
| `storage correctness` | Present record fields/hashes/schema match expected marker (secret-free) |

### Normative KW + UI + retrieve state machine

```text
[default] shadow-ready + productionActivation=false (class static false)
  --(UI/API ON + valid unlock ceremony)--> productionActivation=true (durable)
  --(UI/API ON missing/mismatched ceremony)--> refuse (stays false)
  --(UI/API soft OFF)--> productionActivation=false, shadow-ready (durable)
  --(destructive rollback)--> false + candidates cleared
  --(Set-mode enable alone)--> does NOT set productionActivation
  --(recommendation apply/dismiss alone)--> does NOT set productionActivation

while productionActivation=false:
  shadow/bootstrap/derive: available (run-83)
  production retrieve: REFUSE (R6)
  consumer depending on production retrieve: FAIL-CLOSED (R8)

while productionActivation=true:
  derive/rebuild/retrieve correctness rules still enforced (run-83 R8 / this R13)
  production retrieve: SUCCEED on valid input (R6)
  consumer depending on production retrieve: SUCCEED with evidence of production retrieve use (R8)
  full router production prompt injection: still NOT unlocked (OOS3 / I9)
```

## Invariants (must hold at ship)

| ID | Invariant | Verified by |
|---|---|---|
| `I1` | Production default off; static class flag false | TB10 + probe + host status |
| `I2` | Default path is shadow-ready before first ON | TB10 + probe + `R13` |
| `I3` | ON requires ceremony; mismatch refuses | TB10 + host API + `R1` |
| `I4` | Soft OFF returns shadow-ready; ON again possible | TB10 + UI/API + probe |
| `I5` | Activation is durable across subsequent status/retrieve/consumer calls | host tests + Phase 5 + `R2` |
| `I6` | Production retrieve refuses when OFF; succeeds when ON on valid input | TB10 + probe + `R6` |
| `I7` | Consumer fail-closed when OFF; useful when ON | consumer tests + Phase 5 + `R8` |
| `I8` | When on, KW correctness still holds (refuse unsafe inputs) | TB10 + Phase 5 + `R13` |
| `I9` | No router production prompt-injection unlock claimed | honesty + OOS + binder |
| `I10` | Set-mode / recommendation do not imply production ON | tests/probes + `R14` |
| `I11` | Equals-form and discrete argv still bind; evidence-root hygiene holds | unit + Phase 5 launch |
| `I12` | Freeze honesty uses full assemble when tip advances — not proof-only-only | assemble logs + TB11 + `R20` |

## Refuse / failure taxonomy (normative outcomes)

| Case | Required outcome |
|---|---|
| ON without verified receipt | refuse; `productionActivation` stays false |
| ON without shadow candidate | refuse; stays false |
| ON with digest mismatch | refuse; stays false |
| ON with unknown/unsupported version/fields | refuse; stays false |
| Production retrieve while OFF | refuse with Phase-2-locked observable code (`U7`); **no** production payload |
| Consumer while OFF | fail-closed; **no** silent empty success claiming production knowledge |
| Soft OFF then production retrieve | refuse |
| Set-mode enable without ceremony ON | does not unlock production retrieve |
| Recommendation apply without ceremony ON | does not unlock production retrieve |
| Stale SEA used for Phase 5 | FAIL (`FD14`) |
| Proof-only-only freeze closeout after tip drift | FAIL (`OOS12`, `R20`) |

## Requirements

### `R1` Host KW activation API (ceremony ON / soft OFF)

Description:
Expose audited public/host API actions for Knowledge Worker ceremony-backed ON and soft OFF, distinct from `enable` / `disable` / `set_mode` (`U5`).

Acceptance criteria:
- API ON succeeds only when unlock ceremony prerequisites hold (`FD2`).
- API ON refuses missing receipt, missing shadow, digest mismatch, unknown fields, unsupported versions (taxonomy above).
- API soft OFF yields durable `productionActivation === false` / shadow-ready without requiring ceremony materials.
- Audited operator identity recorded (compatible with existing `who=local-operator` pattern, or Phase-2-locked successor).
- Host/unit tests cover refuse / ON / OFF / idempotent soft OFF.
- Actions are not overloaded onto Set-mode semantics.

### `R2` Durable activation binding

Description:
Host retains KW activation state for the packaged runtime session so UI/API toggles remain observable on subsequent status, production retrieve, and consumer calls (`U2`).

Acceptance criteria:
- After ceremony ON, status/health reports `productionActivation: true` across ≥2 subsequent calls without re-activate.
- After soft OFF, subsequent production retrieve and consumer paths refuse/fail-closed.
- Phase 2 documents the binding mechanism; “fresh worker per call loses flag” is a FAIL for the operator path.
- Restart/session boundaries for durability are documented (session-scoped is acceptable if Phase 2 locks it; silent loss within session is not).

### `R3` Status / health exposure for UI and probes

Description:
Host status surfaces expose enough KW activation + shadow-ready signal for UI and probes without requiring private-only inspection.

Acceptance criteria:
- Status includes `productionActivation` boolean (or Phase-2-locked equivalent) for knowledge-worker.
- Status distinguishes shadow-ready (candidates present + production off) from production-on where feasible.
- UI reads status from host (not a parallel invented store).
- Unit tests cover status fields after ON and soft OFF.

### `R4` Extensions UI ON/OFF control

Description:
Extensions UI provides explicit KW `productionActivation` ON and soft OFF controls (not honesty-only), wired to `R1`/`R2`.

Acceptance criteria:
- From shadow-ready, operator can trigger ceremony-backed ON via UI (`U1`).
- Operator can soft OFF from UI back to shadow-ready.
- Control is visually and semantically distinct from Set mode.
- Disabled/unavailable states are honest when ceremony material is missing (no fake ON).
- Unit tests cover control presence + wiring; Playwright covers operator-visible control and successful state transition on rebuilt SEA (`R17`).
- Skipping UI wiring and claiming PASS via API-only = FAIL for `R4` (API may assist ceremony material, but UI must invoke the activation path).

### `R5` Honesty + copy consistency

Description:
UI/API/docs/probe wording matches the state machine: shadow-ready default, ceremony ON, soft OFF, production retrieve gated / useful when on, ≠ Set mode, ≠ recommendation apply, no inject unlock claim.

Acceptance criteria:
- Existing honesty regressions stay green or are updated intentionally with tests.
- Copy states that production retrieve / consumer usefulness requires ceremony ON.
- No wording that implies ambient on, hard-off forever, Set-mode = activation, recommendation = activation, or full router inject unlock.
- Probe assertions include honesty-critical phrases or structured status checks.

### `R6` Production retrieve gate (private KW)

Description:
Production retrieve requires instance `productionActivation === true` and uses Phase-2-locked vocabulary (`U4`, `FD6`, `FD7`).

Acceptance criteria:
- OFF: production retrieve refuses with explicit observable result (`U7`); no production payload.
- ON: production retrieve succeeds on valid indexed/derived knowledge under existing correctness rules.
- Shadow/bootstrap/derive remain available while OFF.
- Shadow retrieve (if retained) must not return production-plane results while OFF.
- TB10 RED→GREEN covers: OFF refuse, ON success, soft OFF refuse again, ceremony mismatch still blocks ON (hence blocks production retrieve).

### `R7` Production-vs-shadow retrieve vocabulary lock

Description:
Phase 2 locks an explicit, versioned way to request production vs shadow retrieve so future callers cannot accidentally get production results while OFF (`U4`, `R12`).

Acceptance criteria:
- Vocabulary documented in Phase 2 (mode/plane/flag/capability — one lock).
- Default/ambiguous requests have a documented fail-closed or shadow-safe behavior (no silent production).
- Unit tests cover vocabulary edge cases (missing mode, unknown mode, production while OFF).
- Extensibility: new planes/modes require additive schema version (`E2`).

### `R8` Consumer usefulness proof (eval-preferred)

Description:
At least one first-party consumer path depends on production retrieve and only succeeds when KW is ON (`U3`). This is the “KW is useful, not just toggled” proof.

Acceptance criteria:
- OFF: consumer path is fail-closed (explicit failure/refuse) — **not** silent empty success that pretends production knowledge was used.
- ON: consumer path succeeds and evidence shows production retrieve was used (receipt fields, hashes, or structured trace).
- Soft OFF then consumer: fail-closed again.
- Consumer is first-party (eval preferred; replay or packaged eval-shaped hop allowed only with Phase 2 rationale).
- Not a stealth Profile Learner / GRPO unlock (`OOS4`).
- Packaged Phase 5 hop records OFF refuse + ON success + soft OFF refuse (`R17`).

### `R9` Observable refuse codes / result contract

Description:
Refuse paths for activation and production retrieve/consumer use stable, testable observables (`U7`).

Acceptance criteria:
- Phase 2 locks error/result codes or structured fields for: ceremony refuse, production-retrieve-while-off, consumer-while-off.
- Tests assert codes/fields (not only “threw something”).
- Refuse responses do not include production knowledge payloads.
- Codes are versioned or namespaced for future additive errors (`E3`).

### `R10` Probe / harness evolution

Description:
Extend KW probe (and/or new run-84 probe) for host/UI-equivalent matrix + retrieve gate + consumer proof; keep run-83 soft toggle matrix green.

Acceptance criteria:
- Probe covers: shadow-ready → production retrieve refuse → ceremony ON → production retrieve PASS → consumer PASS → soft OFF → refuse again.
- Probe covers durability: status still ON across a subsequent call after activate.
- Evidence logs under run-84 evidence root with `--evidence-root`.
- Run-83 toggle/ceremony refuse cases remain green (no regressions).

### `R11` Permissions / contracts honesty

Description:
Package/contract surfaces declare activate/deactivate/retrieve (and any new production-retrieve) capabilities so UI/host are not calling undeclared capabilities.

Acceptance criteria:
- Declared permissions match the operator + consumer path.
- Contract/depth tests updated or explicitly justified with residual.
- Undeclared capability calls from the shipped operator path = FAIL.

### `R12` Extensible versioned activation + retrieve-gate contracts

Description:
Activate/deactivate and production-retrieve gate use versioned schemas so future auth modes and consumers can extend without ambient unlock, ceremony removal, or silent production leakage (`FD19`, `FD20`, `E1`–`E5`).

Acceptance criteria:
- Unknown fields / unsupported versions refuse ON and refuse production retrieve as applicable.
- Future auth modes require additive version — not ceremony removal.
- Future consumers may subscribe to the same retrieve-gate contract without forking a second ungated production path.
- TB10/host tests cover unknown-field refuse.

### `R13` Preserve run-83 KW correctness + ceremony + shadow-ready

Description:
This run must not regress run-83: ceremony ON, soft OFF → shadow-ready, KW correctness while on, equals-form argv, evidence-root hygiene.

Acceptance criteria:
- While ON: valid derive/rebuild/retrieve still succeed; invalid/unsafe inputs still refuse.
- Soft OFF returns shadow-ready; re-ON possible with ceremony.
- Static class flag remains false.
- Launch equals-form still binds; non-run80 scopes still require evidence-root.
- Regression suite (TB10 + launch-scope + probe) green.

### `R14` Preserve Track B axis independence

Description:
UI/API activation must not collapse Set-mode, recommendation apply/dismiss, or contribution opt-out into production activation / production retrieve.

Acceptance criteria:
- Set-mode enable alone does not set `productionActivation` and does not unlock production retrieve.
- Recommendation apply/dismiss alone does not set `productionActivation` and does not unlock production retrieve.
- Contribution opt-out behavior unchanged unless an explicit residual says otherwise.
- Regression tests/probes demonstrate independence.

### `R15` Strict TDD

Description:
Phase 3 uses `TDD Mode: strict` for KW gate, host API, UI production edits, and consumer gate wiring (`FD10`).

Acceptance criteria:
- RED evidence paths exist before GREEN for each strict surface.
- No production-only edits without a failing test first on those surfaces.
- RED/GREEN logs stored under run-84 evidence.

### `R16` SEA-complete packaging for Phase 5

Description:
When private packaging inputs change, rebuild private dist and package public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (`FD14`).

Acceptance criteria:
- Rebuild receipt records commands, timestamps, artifact hashes/paths.
- SEA with null `track_b_runtime` due to missing distribution root is rejected for Phase 5.
- Probe/consumer hops cover dist and/or packaged path for packaging fidelity.

### `R17` Phase 5 rebuilt-runtime UI + gate + consumer hops

Description:
Agent-operated Phase 5 proves durable UI/API ON/OFF and gated retrieve/consumer on a freshly rebuilt packaged runtime.

Acceptance criteria:
- Rebuild receipt + SEA sha rebound before hops.
- Launch uses equals-form or discrete argv with `--scope-id=run84-dev` (or Phase-2-locked scope) and `--evidence-root` under run-84.
- Evidence sequence: OFF refuse → ceremony ON (UI wiring proven per `R4`) → production retrieve PASS → consumer PASS → soft OFF → refuse again.
- If ceremony material is supplied via host helper under `U1`, Playwright still proves UI control invokes activation API (API-only without UI = FAIL for `R4`/`R17`).
- Stale binary hops = FAIL.

### `R18` Live cloud `--track=dev` recommendation hop

Description:
Retain live recommendation apply+dismiss hop on scoped run id against bound `--track=dev` (regression: KW/UI work must not break rec path; axes stay independent).

Acceptance criteria:
- PASS receipt under run-84 evidence; secrets omitted in binder.
- Apply/dismiss does not imply KW ON (`R14`).
- Prefer existing permanent-dev workers (`U10`).

### `R19` Live `pi` → router storage correctness

Description:
Live `pi` storage presence/correctness check remains green for this run’s packaged runtime (`FD22`).

Acceptance criteria:
- Receipt under run-84 evidence; binder cites it.
- Asserts presence/absence **and** correctness (not CLI exit alone).
- Secrets sanitized (`U9`, `FD17`).

### `R20` Pin / freeze honesty if tip advances

Description:
If private product tip advances enough to break pin-freeze/TB11, refresh with full Playwright assemble (not proof-only-only) (`FD16`).

Acceptance criteria:
- pin-freeze + TB11 PASS after tip advance, **or** Phase 3 documents no tip advance needed with green gates.
- Proof-only-only closeout after tip drift = FAIL.
- Binder records pin SHAs when advanced.

### `R21` Binder + Requirement Completion Status

Description:
Every `R1`–`R22` has machine-checkable RCS in Phases 3–5; binder maps evidence secret-free.

Acceptance criteria:
- `implemented`/`verified` cite changed files; `verified` cites distinct verification evidence.
- Binder `secretsOmitted: true`; records SEA sha, scope id, cloud/pi/UI/gate evidence paths.
- `publicChange` / `serverChange` recorded (`FD1`, `FD11`).

### `R22` Dual-repo paired delivery + control-plane closeout

Description:
Ship private+public feature branches; Phases 6–8 update DECISIONS/STATE/memory. Merge remains operator-requested unless user authorizes in-run (`FD23`).

Acceptance criteria:
- Mirrored run id/artifacts.
- DECISIONS soft-closes run-83 deferred UI gap and records gated production retrieve + consumer usefulness.
- STATE/memory updated for UI control, durable activation, retrieve-gate vocabulary, and consumer proof.
- No anticipatory Phase 6–8 edits before those phases’ real work (`FD18`).

## Extensibility & future-proofing contracts

| ID | Contract |
|---|---|
| `E1` | Activation/auth schema is versioned; unknown fields refuse; additive versions only. |
| `E2` | Retrieve-gate vocabulary is versioned; new planes/modes are additive; OFF cannot silently map to production. |
| `E3` | Refuse codes/fields are stable or versioned; additive error codes allowed without breaking old clients’ fail-closed behavior. |
| `E4` | Future consumers (additional eval suites, replay, training) must call the gated production retrieve contract — not invent a parallel ungated production path. |
| `E5` | Future operator-auth modes (e.g. stronger attestations) may add fields/versions but must not remove receipt+shadow+digest bind for ON unless a later run explicitly supersedes `I3`. |
| `E6` | Future full router prompt-injection unlock requires a **new explicit run**; this run’s candidate/export fields must not be treated as inject unlock (`I9`, `OOS3`). |
| `E7` | Future stage/main promotion or live `--track=production` requires a **new explicit run** (`OOS5`, `OOS6`). |
| `E8` | Shadow-ready default + production-off default remain the safe baseline for future modes (`I1`, `I2`). |

## Soft-close of prior decisions (expected at Phase 6)

- Soft-close run `83-kw-operator-toggle-assemble-live-e2e-argv-equals` deferred Extensions UI control (run-83 `U1` / honesty-only gap).
- Record that “KW useful when ON” is now an observable production retrieve + consumer proof (not readiness-only).
- Do **not** soft-close inject unlock, training unlock, or stage/main promotion.

## Out of Scope

| ID | OOS |
|---|---|
| `OOS1` | Ambient always-on / class-static `productionActivation === true` |
| `OOS1a` | Weakening/deleting KW derive/rebuild/retrieve correctness rules while ON |
| `OOS1b` | Removing unlock ceremony for ON or allowing attestation-only / bare-boolean ON |
| `OOS1c` | Permanent empty cold-start that blocks immediate ceremony-backed ON despite available bootstrap |
| `OOS2` | Auto-promotion to `stage` / `main` |
| `OOS3` | Full live router production prompt injection unlock |
| `OOS4` | Profile Learner / GRPO training product unlock |
| `OOS5` | Live `--track=production` Cloudflare writes |
| `OOS6` | Replacing Set-mode mutate API as enablement authority |
| `OOS7` | Making recommendation apply imply KW ON or unlock production retrieve |
| `OOS8` | Full Cloudflare resource reprovision / rename program |
| `OOS9` | Proposal-corpus rewrite |
| `OOS10` | TB11 predecessorReceipts maxItems schema redesign |
| `OOS11` | Knowledge-store (and other unchanged packages) hard-off copy rewrite |
| `OOS12` | Claiming freeze PASS via proof-only rebind alone |
| `OOS13` | Inventing a second unrelated knowledge product outside Knowledge Worker |
| `OOS14` | Silent weakening of offline CI to hide UI/gate/consumer/cloud/`pi` failures |
| `OOS15` | Claiming consumer PASS via silent empty success while OFF |
| `OOS16` | Skipping UI wiring and claiming operator-toggle PASS via API-only |

## Constraints

- Dual worktrees on `recursive/84-kw-ui-toggle-gated-retrieve-eval` from paired `origin/dev` baselines.
- Prefer run-84 evidence root; do not overwrite run-80/83 historical receipts.
- Pass `--evidence-root` for non-run80 scopes (`FD15`).
- No anticipatory Phase 3–8 docs before real phase work (`FD18`).
- Keep contribution destination-auth / aggregate-only privacy invariants.
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` when Phase 5 needs Track B runtime.
- Do not treat `track_b_runtime: null` packages as complete Track B verify.
- Diff basis recorded in `00-worktree.md`; incidental runtime byproducts ignored unless tracked.

## Verification matrix

| `R#` | Primary commands / artifacts | Assertion focus |
|---|---|---|
| `R1` | host/unit tests under public runtime-host-bridge (or Phase-2-locked) | ceremony refuse/ON/OFF audited |
| `R2` | host tests + Phase 5 status round-trip | durable flag across calls |
| `R3` | host status tests + UI read path | status fields honest |
| `R4` | `extensions.test.tsx` + Playwright on SEA | UI control wired; not API-only |
| `R5` | UI unit + probe honesty checks | copy matches state machine |
| `R6` | `tests/track-b/tb10.test.mjs` + probe | production retrieve OFF refuse / ON PASS |
| `R7` | unit tests for retrieve vocabulary | no silent production while OFF |
| `R8` | consumer tests + Phase 5 hop | fail-closed OFF; useful ON |
| `R9` | unit/probe assertions on codes | stable refuse observables |
| `R10` | `run81-kw-activation-probe.mjs` and/or run-84 probe | full matrix + durability |
| `R11` | contract/depth + package permissions | declared caps match path |
| `R12` | TB10 unknown-field refuse | versioned schemas |
| `R13` | TB10 + launch-scope + evidence-root tests | no run-83 regressions |
| `R14` | axis independence tests/probes | Set-mode/recs ≠ activation |
| `R15` | `evidence/logs/red|green/` | strict TDD |
| `R16` | rebuild receipt + SEA package logs | distribution root required |
| `R17` | Phase 5 logs + SEA sha | UI+gate+consumer on fresh SEA |
| `R18` | recommendation lifecycle hop logs | `--track=dev` PASS; axes independent |
| `R19` | pi storage receipt | presence + correctness |
| `R20` | assemble + pin-freeze + TB11 (if tip advances) | no proof-only-only |
| `R21` | binder.json + RCS tables | secret-free; every R# mapped |
| `R22` | DECISIONS/STATE/memory + mirrored artifacts | soft-close UI gap; usefulness recorded |

## Phase ownership (seed)

| Phase | Owns |
|---|---|
| 0 | This requirements lock |
| 1 | AS-IS for UI/host/KW/consumer; resolve `U1`–`U10` measurements |
| 2 | Normative locks for `U1`–`U7` API/vocabulary/consumer; ExecPlan |
| 3 | Implement `R1`–`R16` product surfaces under strict TDD; tip/assemble if needed |
| 4 | Local CI / test summary RCS |
| 5 | `R17`–`R19` (+ `R20` if needed) rebuilt-runtime hops |
| 6–8 | DECISIONS/STATE/memory closeout (`R22`) |

## Traceability seed

- Host/UI/durability: `R1`–`R5`, `R11`, `R17`
- Gate + consumer + taxonomy: `R6`–`R10`, `R12`
- Preserve + axes: `R13`–`R14`
- Process/verify/delivery: `R15`–`R22`

## Consistency cross-check (authoring PASS)

- [x] Every Theme A–G maps to ≥1 `R#`
- [x] Every `FD` cited by ≥1 `R#`/`I#`/`OOS`/`E#` or Constraints
- [x] Every `U#` has a resolution rule before related PASS
- [x] Every invariant `I#` has a verification surface
- [x] OOS blocks ambient on, ceremony removal, inject unlock, training unlock, stage/main, production track, proof-only-only, API-only UI claim, silent empty consumer success
- [x] No requirement claims router inject unlock or training unlock
- [x] Extensibility contracts `E1`–`E8` do not contradict ceremony/shadow-ready defaults
- [x] Soft-close targets are explicit and do not overclaim

## Approval gate

User approved 2026-07-25. Run initialized; dual worktrees active.

Locked intent:
1. Run id `84-kw-ui-toggle-gated-retrieve-eval`
2. Quality bar: thorough / consistent / detailed / extensible / future-proof as encoded above
3. Normative value path = **production retrieve gate** + one first-party **fail-closed consumer proof** (`U3`, prefer eval)
4. Full router prompt-injection and training unlock stay **OOS** (`OOS3`, `OOS4`)
5. Ceremony retained; UI + host + durability in scope; API-only UI claim = FAIL
6. Schemas versioned/additive (`R12`, `E1`–`E8`)

## Coverage Gate

- [x] Themes A–G co-required
- [x] R1–R22 with observable ACs
- [x] OOS / FDs / U# / I# / E# present
- [x] User approved

Coverage: PASS

## Approval Gate

Approval: PASS
Audit: PASS
Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: available; requirements user-approved
Delegation Decision Basis: self-audit selected
Delegation Override Reason: user-approved draft installed verbatim into dual worktrees; no delegated rewrite
Effective Inputs Re-read: user approval message; STATE/DECISIONS post-83; draft quality mandate
Reviewed Subagent Action Records: none
