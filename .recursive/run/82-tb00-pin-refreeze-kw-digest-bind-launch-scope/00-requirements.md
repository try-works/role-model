Run: `/.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-24T22:31:20Z`
LockHash: `6ea874319a4140bd69247e63a5b1386cd4c87299a4a83e4037b832f8588be2c9`
CapturedAt: `2026-07-25T06:25:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-25): author comprehensive, detailed, future-proof, extensible requirements for the next run after run 81; require strict TDD; require rebuilt-runtime verification in Phase 5
- Prior control-plane truth: `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`, `/.recursive/memory/domains/direct-track-b.md`
- Predecessor runs:
  - `00-direct-track-b-v1-1-implementation` (TB00–TB11; freeze pins; pin-freeze gate; live-e2e release evidence)
  - `79-extension-control-and-recommendations-qa` / `80-signed-recommendation-cloud-lifecycle` / `81-kw-activation-browser-recommendation-evidence` (product tips that drifted past the frozen private pin)
- Run 81 residuals / ship notes:
  - F1: activation receipt not bound to candidate `validationReceiptHash`
  - F3: `launch-packaged-runtime.mjs` hardcodes `--scope-id packaged-run00`
  - Ship CI: `pin-freeze-gate` fails on clean `origin/dev` because private product pathset drifted past `tb00-release-source-lock` private revision `f231be50…` while `invalidate.tb11Authoritative` / gate asserts still expect freeze integrity; naive pin advance without refreshing hashed live-e2e artifacts breaks TB11 `validateRun00LiveEndToEndEvidence`
- AS-IS product anchors:
  - Private KW: `extensions/knowledge-worker/index.mjs` (`#assertActivationPolicy` requires policy v1 + attestation + verified `knowledge_validation` receipt claims + any shadow candidate; does **not** bind `receipt.payload.groupDigest` to a candidate `validationReceiptHash`)
  - Private freeze: `evidence/source-set/tb00-release-source-lock.json`, `tests/track-b/pin-freeze-gate.test.mjs`, `scripts/track-b/validate-release-evidence.mjs`, `evidence/live-e2e/**`
  - Private launch: `scripts/track-b/launch-packaged-runtime.mjs` (`--scope-id packaged-run00` hardcode)
  - Public: runtime UI / host-bridge only if launch parameterization or Phase 5 browser/API verify requires mirrored helpers
Outputs:
- Temporary draft: `.cursor/spec-drafts/82-tb00-pin-refreeze-kw-digest-bind-launch-scope.00-requirements.md`
- After user approval + recursive-init: `/.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/00-requirements.md` (mirrored dual-repo)
Scope note: Defines authoritative Phase 0 requirements for (A) re-freezing TB00 private/public product pins with consistent live-e2e/release evidence so full local CI including `pin-freeze-gate` and TB11 live-e2e validation is green, (B) hardening gated KW activation by binding verified receipt digests to shadow candidates, and (C) parameterizing packaged-runtime launch `--scope-id`, under **strict TDD**, with **Phase 5 verification against a freshly rebuilt packaged public runtime**. Does not auto-promote to `stage`/`main`. Does not lift live `--track=production` ban. Does not unlock ambient/ungated KW activation.

## TODO

- [x] Elicit requirements from user direction + predecessor control-plane docs + run-81 residuals
- [x] Align run id with public max+1 (`81` → `82`)
- [x] Author comprehensive `R1`–`R14` with observable acceptance criteria
- [x] Add fixed decisions, open unknowns, freeze/activation vocabulary, and verification matrix
- [x] Require strict TDD (`R11`) and Phase 5 rebuilt-runtime verification (`R12`, `R5`)
- [x] Require pin re-freeze that keeps TB11/live-e2e hashes coherent (`R1`–`R3`)
- [x] Require KW digest↔candidate binding (`R4`)
- [x] Require launch `--scope-id` parameterization (`R6`)
- [x] Add extensibility / future-proofing and evidence layout contracts
- [x] Document out of scope (`OOS1`–`OOS12`)
- [x] User approve this draft (2026-07-25)
- [x] recursive-init + write approved content into both repos’ run folders
- [x] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)
- [x] Lock Phase 0 via recursive-lock after worktree PASS

## Background

### Goal

After this run:

1. **TB00 freeze integrity is restored and CI-honest.** Private (and public if drifted) product pins in `tb00-release-source-lock.json` match current product tips; `invalidate-stale-pass.json` / pin-freeze gate receipts agree with `productPinsHold`; hashed live-e2e and release-validation artifacts are coherently refreshed so `pin-freeze-gate` and TB11 live-e2e validation pass without excluding tests.
2. **KW gated activation is digest-bound.** Successful `activate(policy)` requires the verified activation receipt to bind to a specific shadow candidate via digest equality (`receipt.payload.groupDigest` ↔ candidate `validationReceiptHash`, or an explicitly documented equivalent that cannot unlock from an unrelated valid receipt).
3. **Packaged launch scope is parameterized.** Operators can launch the packaged runtime with an explicit `--scope-id` (default may remain `packaged-run00` for PCR compatibility) so browser/API evidence scopes are honest and not forced by a hardcode.
4. **Phase 5 proves the above on a freshly rebuilt packaged public SEA** (and private Track B distribution when private packaging inputs change), not against a stale binary.

### Problem

- Runs 79–81 advanced private product under `scripts/track-b/`, `tests/`, and `extensions/` while the TB00 private freeze pin remained at `f231be50…`. The pin-freeze gate therefore fails on clean `origin/dev`. Shipping while excluding that gate hides release-hygiene debt.
- Attempting to advance only the pin without refreshing live-e2e revision/hash coupling causes TB11 `validateRun00LiveEndToEndEvidence` failures (`live_e2e_source_revision_drift` / `live_e2e_manifest_invalid`). Freeze and live-e2e evidence must be updated as one coherent unit.
- Run 81’s activation policy allows any verified `knowledge_validation` receipt plus *any* shadow candidate. A stale/unrelated valid receipt can unlock after an unrelated derive on the same instance (run 81 F1).
- Launch still hardcodes `packaged-run00`, which forced run-81 browser honesty notes and will keep confusing future live evidence scopes.

### Scope

| Axis | In scope |
|---|---|
| Repos | `try-works/role-model-internal` (private, primary) + `try-works/role-model` (public, only as required for launch/Phase 5 verify) |
| Run id | `82-tb00-pin-refreeze-kw-digest-bind-launch-scope` (mirrored) |
| Branch | `dev` only unless user later authorizes promotion |
| Theme A | TB00 pin re-freeze + live-e2e/release evidence coherence + pin-freeze/TB11 CI green |
| Theme B | KW activation receipt↔candidate digest binding + TB10 evolution |
| Theme C | Packaged launch `--scope-id` parameterization |
| Theme D | Strict TDD + Phase 5 rebuilt packaged runtime verification |
| Server | `not-required` by default; additive server only if Phase 1/2 proves digest binding or freeze evidence cannot be satisfied locally (`FD9`) |
| Verification | Strict TDD offline/unit + full private Track B CI including pin-freeze + **Phase 5 rebuilt SEA** probe/browser-or-API hops as specified |

### Non-goals (summary)

See **Out of Scope**. Notably: ambient KW unlock, knowledge-store honesty rewrite, proposal-corpus rewrite, TB11 maxItems schema redesign, stage/main auto-promotion, live production track, full Cloudflare reprovision, inventing a public KW activation UI/API.

### Success definition (run-level)

The run may claim Phase 4/5 PASS only when **all** of the following are true:

1. Every in-scope `R#` has machine-checkable `Requirement Completion Status` reaching `verified` (or an explicit addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R11` RED/GREEN evidence exists for every in-scope production code change.
3. `R1`–`R3` leave `pnpm test` (or equivalent Track B suite) **including** `pin-freeze-gate.test.mjs` and TB11 live-e2e validation green on a clean tree.
4. `R12` / Phase 5 rebuilt packaged runtime evidence exists; Phase 5 hops target that artifact (stale binary = FAIL).
5. `R13` evidence binder lists freeze SHAs, rebuild hashes, RED/GREEN paths, Phase 5 commands/artifacts without secrets.
6. Run-81 gated activation contract remains intact except where this run **tightens** it via digest binding; fail-closed default and static `productionActivation === false` are preserved.

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Primary work is private release-hygiene + KW hardening; public changes only when required for launch parameterization or Phase 5 verify helpers. |
| `FD2` | Pin re-freeze must be **coherent**: advance `tb00-release-source-lock` revisions **and** refresh coupled live-e2e / release-validation artifacts in the same closeout unit so TB11 validation stays green. |
| `FD3` | Phase 3 `TDD Mode: strict` is mandatory for all in-scope production code changes (KW, launch helper, and any public helper touched). |
| `FD4` | Phase 5 operator/agent QA must verify against a **freshly rebuilt** packaged public SEA (and private Track B distribution when private packaging inputs change). Stale binary = FAIL. |
| `FD5` | Digest binding is mandatory for successful activation; unbound “any valid receipt + any shadow candidate” is no longer acceptable. |
| `FD6` | Static/class `KnowledgeWorker.productionActivation` remains `false` (ungated always-on forbidden). |
| `FD7` | Independent axes remain independent: installed ≠ enabled/Set-mode ≠ recommendation apply ≠ **`productionActivation`**. |
| `FD8` | Secrets/keys stay out of git; evidence cites hosts, ids, digests, receipt/paths only. |
| `FD9` | Server-side changes allowed **iff** Phase 1/2 shows local policy/freeze evidence cannot satisfy an acceptance criterion without them; additive and track-safe only. |
| `FD10` | Work stays on `dev`; no auto-promotion to `stage`/`main`. |
| `FD11` | Launch `--scope-id` becomes an explicit CLI/env parameter; default may remain `packaged-run00` for backward PCR compatibility, but hardcode-only behavior is forbidden. |
| `FD12` | Do not falsify live-e2e by only rewriting revision strings without regenerating or re-validating the coupled hash/manifest contracts required by `validate-release-evidence`. Prefer regenerate/rebind via supported scripts; if a proof-only path exists, it must be documented and TB11-regression-safe. |
| `FD13` | Phase docs are authored serially after real work only (no anticipatory batch-write of Phases 3.5–8). |

## Open Unknowns (must resolve before claiming related PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Exact freeze tip selection (which private/public HEADs become the new pins) | Resolve in Phase 1/2: pins must be ancestors of ship HEADs with **no product pathset drift** for the pathspecs used by pin-freeze / `gitState`. Prefer `origin/dev` tips at freeze time after product commits land, using a two-commit freeze pattern if needed (product tip, then evidence-only pin/live-e2e refresh). |
| `U2` | Exact digest-binding field equality (confirm `groupDigest` ↔ `validationReceiptHash` vs alternate documented fields) | Resolve in Phase 1 against KW derive/activate code; lock equality rule in Phase 2; refuse if mismatch or missing. |
| `U3` | Whether public product pin also needs advance (vs only private) | Measure with pin-freeze/`gitState` in Phase 1; if public product pathspecs already hold, leave public pin unchanged and document; if drifted, advance coherently. |
| `U4` | Whether Phase 5 requires browser Playwright re-run vs packaged KW probe + recommendation API hop | Prefer minimum sufficient rebuilt-runtime proof: at least packaged KW activation probe under digest-bound policy **and** one recommendation trust hop (API or browser) on the new SEA. Expand to browser if launch-scope change affects UI seeding. |
| `U5` | Whether freeze requires refreshing `release-validation.json` / `tb11-system-proof.json` / paired-release manifest | Resolve by running validators; refresh whatever `validate-release-evidence` / TB11 / system-proof require for green. |

## Vocabulary

### Freeze / release hygiene

| Term | Meaning for this run |
|---|---|
| `product pin` | Revision recorded in `tb00-release-source-lock.json` for private/public |
| `product pathset` | Pathspecs used by pin-freeze / `gitState` (private: extensions/cloud/scripts/track-b/tests/…; public: runtime-ui/host-bridge/…) |
| `pins hold` | Pin is ancestor of HEAD **and** `git diff --quiet pin..HEAD -- <pathspecs>` is empty |
| `coherent re-freeze` | Pin advance + live-e2e/release artifact refresh such that pin-freeze and TB11 live-e2e validation both PASS |
| `proof-only refresh` | Evidence/manifest updates that do not change product pathset; allowed only when validators accept them |

### KW activation (extends run 81)

| Term | Meaning for this run |
|---|---|
| `digest-bound activation` | Activate succeeds only when verified receipt digests bind to a specific shadow candidate |
| `unbound activation` | Run-81 behavior (any valid receipt + any shadow) — **prohibited after this run** |
| `enablement` | Extension Set-mode — still not activation |

Normative activation tighten:

```text
[shadow candidate exists] + [verified receipt]
  --(digest mismatch / missing bind)--> refuse (unchanged inactive)
  --(digest match + run-81 policy fields)--> production-activated
```

## Requirements

### `R1` Advance TB00 product pins to coherent tips

Description:
Restore freeze integrity by advancing `evidence/source-set/tb00-release-source-lock.json` private (and public if needed) revisions so `productPinsHold` is true for the ship HEADs.

Acceptance criteria:
- After freeze commits, `pin-freeze-gate.test.mjs` PASS without excluding the file.
- `invalidate-stale-pass.json` `tb11Authoritative` equals computed `allowTb11Rewrite` (true when pins hold and Phase 3 unlock conditions hold).
- Pin revisions are recorded in the run binder with short SHAs and full SHAs.
- No claim of PASS while product pathset remains dirty vs the new pins.

### `R2` Refresh coupled live-e2e / release evidence coherently

Description:
Update or regenerate live-e2e and related release evidence so `validateRun00LiveEndToEndEvidence` accepts the new pins without hash/manifest drift failures.

Acceptance criteria:
- TB11 tests that call `validateRun00LiveEndToEndEvidence` PASS (including revision coupling for private/public builds and clean-checkout reconstruction).
- No silent string-only rewrite that leaves `live_e2e_manifest_invalid` / hash drift; use supported regenerate/rebind scripts or a documented validator-accepted proof-only path (`FD12`).
- `evidence/live-e2e/run00-live-e2e-manifest.json`, `build-and-test.json`, `clean-checkout-reconstruction.json` (and any other validator-required artifacts) are consistent with the new lock.
- Release-validation / system-proof remain PASS after the refresh (refresh additional artifacts if validators require).

### `R3` Full private Track B CI green including pin-freeze

Description:
Local private CI used for ship must not need to exclude pin-freeze or TB11 live-e2e validation.

Acceptance criteria:
- Commands equivalent to `pnpm test` (all `tests/track-b/*.test.mjs`), `pnpm test:cloud`, `pnpm test:track-a-exclusion`, and `node scripts/track-b/system-proof.mjs` exit 0 on a clean worktree at ship tip.
- Evidence logs for these commands are stored under the run evidence tree.
- Document any remaining known flake with a non-PASS residual (must not be pin-freeze).

### `R4` Digest-bound KW activation

Description:
Tighten `#assertActivationPolicy` so activation requires binding between the verified receipt and a specific shadow candidate.

Acceptance criteria:
- Successful activate requires at least one shadow candidate whose `validationReceiptHash` equals the verified receipt’s binding digest (default: `receipt.payload.groupDigest`, unless Phase 2 documents an equivalent field that is already authority-verified).
- Mismatch digest ⇒ refuse; instance remains inactive; candidates unchanged.
- Missing digest / missing candidate hash ⇒ refuse.
- Unrelated valid receipt + unrelated shadow candidate ⇒ refuse (closes run-81 F1).
- Matching digest + run-81 policy fields (version, attestation, verified claims) ⇒ success; `health().productionActivation === true`.
- Rollback still clears candidates and sets activation false.
- Static `KnowledgeWorker.productionActivation === false` retained.
- Unknown policy fields still refuse.
- Set-mode enablement and recommendation apply still do not activate.
- TB10 gains RED→GREEN cases for: match success, mismatch refuse, missing bind refuse; prior refuse/default-off/rollback cases remain green.

### `R5` Packaged KW activation probe updated for digest binding

Description:
Evolve `scripts/track-b/run81-kw-activation-probe.mjs` (or a run-82 successor) so packaged/runtime probe proves digest-bound success and mismatch refuse.

Acceptance criteria:
- Probe proves default-off, mismatch/unbound refuse, digest-bound success, rollback.
- Probe runs against staged Track B distribution and/or rebuilt SEA as used in Phase 5.
- Probe output JSON is secret-free and cited from the binder.

### `R6` Parameterize packaged launch `--scope-id`

Description:
Remove hardcode-only launch scope behavior from `launch-packaged-runtime.mjs`.

Acceptance criteria:
- CLI supports `--scope-id <id>` (and/or env override); documented default may be `packaged-run00`.
- Unit/contract tests cover: explicit scope forwarded; default when omitted; no silent substitution of a different scope than configured.
- Phase 5 launch uses an explicit scope id recorded in binder (recommend `run82-dev` or documented default — pick one in Phase 2 and stick to it).
- Windows-safe scope ids (no `:` in scope) remain required.

### `R7` Public surface minimalism

Description:
Public repo changes occur only if required for launch parameterization, mirrored helpers, or Phase 5 verify.

Acceptance criteria:
- If no public product change is required, record `publicChange: not-required` with rationale and empty product diff vs public baseline.
- If public change is required, keep it minimal; no new KW activation UI/API.
- Public `pnpm ci:check` PASS when public files change.

### `R8` Recommendation trust non-regression

Description:
Freeze/activation/launch changes must not regress run-80/81 recommendation trust/opt-out guarantees.

Acceptance criteria:
- Public operations API recommendation trust/opt-out suite remains green (or private equivalent if public unchanged).
- No unsigned recommendation bypass introduced.
- Production track live writes remain refused.

### `R9` Server change decision

Description:
Default server change is not required; decide explicitly.

Acceptance criteria:
- `evidence/other/server-change-decision.json` records `not-required` **or** a bounded additive change list with rationale.
- If `not-required`, paired diffs show no server/worker product churn for this run.

### `R10` Axis separation preserved

Description:
Digest binding and freeze work must not collapse product axes.

Acceptance criteria:
- UI/docs/tests continue to treat Set-mode enablement ≠ activation.
- No narrative that freeze re-pin “re-unlocks” ambient activation.
- knowledge-store / other packages remain unchanged unless explicitly pulled in by addendum (default OOS).

### `R11` Strict TDD for production changes

Description:
All in-scope production code lands under strict RED→GREEN.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`.
- Concrete RED and GREEN evidence paths exist for: digest-binding KW changes; launch scope parameterization; any public helper changes.
- Freeze/evidence refresh work that is evidence-only may be pragmatic with explicit rationale, but **code** changes remain strict.
- No “code first, invent tests later” for KW/launch.

### `R12` Phase 5 rebuilt packaged runtime verification

Description:
Phase 5 (Manual QA) must verify in-scope behavior against a **freshly rebuilt** packaged public runtime, not a stale SEA.

Acceptance criteria:
- Rebuild private Track B distribution when private packaging inputs change; package public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; record rebuild receipt (artifact path + sha256 + listen URL).
- Phase 5 launches that rebuilt SEA (via parameterized launch helper) and records pid/URL/scope.
- Phase 5 executes at minimum:
  1. **M-freeze/CI continuity** already proven in Phase 4 logs is cited; and
  2. **Packaged digest-bound KW probe** PASS against the rebuilt runtime context; and
  3. **One recommendation trust hop** on the rebuilt SEA (API lifecycle **or** browser download/preview with apply **or** dismiss) using the configured `--scope-id` and `--track=dev`.
- Stale SEA sha ≠ rebuild receipt sha ⇒ Phase 5 FAIL.
- Screenshots/logs for the chosen hop are stored under run evidence; secrets omitted.
- QA Execution Mode declared (`agent-operated` allowed); if human/hybrid, user sign-off required.

### `R13` Secret-free evidence binder

Description:
Closeout evidence is structured and sufficient for later audits without chat context.

Acceptance criteria:
- `evidence/binder.json` includes: run id; private/public baselines and freeze SHAs; rebuild sha/URL/scope; RED/GREEN paths; Phase 4 CI commands/results; Phase 5 hop type and artifact paths; server-change decision; `secretsOmitted: true`.
- No private keys, material blobs, or verification key values in git evidence.

### `R14` Dual-repo delivery hygiene

Description:
Paired feature branches and control-plane updates land cleanly.

Acceptance criteria:
- Dual worktrees / mirrored run id on both repos when public changes exist; if public is not-required, private still mirrors run artifacts as needed for recursive closeout.
- DECISIONS/STATE/memory updated in Phases 6–8 to record freeze restoration, digest binding, and launch scope parameterization; soft-close run-81 F1/F3 follow-ups.
- Origin/`dev` merge remains operator-requested (this requirement’s delivery criterion is branch readiness + CI, not auto-merge).

## Verification matrix (normative)

| Concern | Offline / Phase 3–4 | Phase 5 rebuilt runtime |
|---|---|---|
| Pin-freeze + TB11 live-e2e | `pnpm test` including pin-freeze + TB11 | Cite Phase 4; no substitute for rebuild |
| Digest-bound activate | TB10 RED/GREEN | Packaged probe on rebuilt SEA/distribution |
| Launch scope param | Unit/contract tests | Launch with explicit scope; binder records it |
| Recommendation trust | Ops API / prior suites | One hop on rebuilt SEA (`--track=dev`) |
| Server | Diff + decision JSON | N/A if not-required |

## Extensibility / future-proofing

- Digest-binding rule should be versionable (policy v1 continues; future v2 may add multi-candidate binds) without removing refuse-default.
- Freeze procedure should be documented as a repeatable playbook in Phase 8 memory (when to advance pins; which evidence scripts to regenerate).
- Launch scope parameterization should allow future per-run scopes without further hardcodes.
- Do not encode run-82 tip SHAs into product code; only into evidence/lock files.

## Evidence layout (minimum)

```text
.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/evidence/
  binder.json
  logs/red/...
  logs/green/...
  logs/phase4/...
  logs/phase5/...
  other/rebuild-receipt.json
  other/server-change-decision.json
  other/kw-digest-bind-probe.json
  other/freeze-receipt.json          # new pins + invalidate summary
  screenshots/                       # if browser hop used
```

Also expect updates under repo-root `evidence/source-set/` and `evidence/live-e2e/` as part of coherent re-freeze (owned by this run’s product/evidence commits).

## Out of Scope

| ID | Item |
|---|---|
| `OOS1` | Ungated / ambient / always-on `productionActivation` |
| `OOS2` | Public KW activation button/API or operator attestation UI |
| `OOS3` | knowledge-store / other packages hard-off copy rewrite (`OOS12` from run 81 retained) |
| `OOS4` | Auto-promotion to `stage`/`main` |
| `OOS5` | Live `--track=production` writes/evidence |
| `OOS6` | Full Cloudflare worker reprovision / channel redesign |
| `OOS7` | Proposal-corpus docs status rewrite |
| `OOS8` | TB11 predecessorReceipts maxItems schema redesign (compensation remains addendum-bound) |
| `OOS9` | Broad Playwright flake-hardening beyond what Phase 5 hop needs |
| `OOS10` | Changing recommendation trust cryptography / unsigned bypass |
| `OOS11` | Rich capture / training-use / external RL defaults |
| `OOS12` | Replacing recursive-mode audit-v2 workflow or batch-writing phase docs |

## Constraints

- Dual-repo recursive-mode audit-v2; serial phase authoring after real work.
- Windows MAX_PATH: prefer short private worktree paths when needed.
- Keep run-80/81 recommendation helpers; extend rather than fork carelessly.
- Do not commit secrets.
- Prefer existing validators (`validate-release-evidence`, pin-freeze, system-proof) over inventing parallel freeze checkers.

## Manual QA scenarios (Phase 5 contract preview)

These are normative intents for Phase 5; Phase 2 may refine steps but not weaken rebuilt-runtime coupling.

| ID | Scenario | Expected |
|---|---|---|
| `M1` | Fresh rebuild + launch with explicit scope | Rebuild receipt sha matches on-disk SEA; launch listens; binder records scope/URL/sha |
| `M2` | Digest-bound packaged KW probe | Default-off; mismatch refuse; match success; rollback |
| `M3` | Recommendation trust hop on rebuilt SEA | Download/preview and apply **or** dismiss succeeds for configured scope on `--track=dev` |
| `M4` | Stale binary rejected | Phase 5 must not claim PASS against a SEA sha that ≠ rebuild receipt |
| `M5` | Axis separation spot-check | Set-mode enablement still does not imply activation (UI copy and/or health) |
| `M6` | CI continuity citation | Phase 4 pin-freeze + TB11 green logs cited; no exclusion of pin-freeze |

## Coverage Gate

- Effective inputs reviewed:
  - User approval of draft (2026-07-25) and direction for pin re-freeze + KW digest bind + launch scope + strict TDD + rebuilt SEA Phase 5
  - Private STATE / DECISIONS / domain memory; run-81 residuals F1/F3 and ship CI pin-freeze debt
  - AS-IS KW `#assertActivationPolicy`, TB00 pin lock, pin-freeze gate, live-e2e validators, launch hardcode
- Requirement coverage check:
  - Theme A freeze: `R1`–`R3`
  - Theme B KW digest bind: `R4`–`R5`
  - Theme C launch scope: `R6`
  - Cross-cutting: `R7`–`R14` (honesty/extensibility/TDD/rebuild/binder/dual-repo as specified)
- Out-of-scope confirmation: `OOS1`–`OOS12` explicit
- Lock state: ready to lock after worktree PASS

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Requirements cover freeze coherence, digest binding, and launch parameterization with observable criteria
  - No ungated KW activation (`OOS1`); gated path remains fail-closed until digest-bound match
  - Strict TDD + rebuilt SEA gates first-class (`R11`, `R12`)
  - Serial phase-doc rule retained
  - Run id `82` (public max+1)
  - User approved draft 2026-07-25; written into both worktree run folders; worktree isolation recorded
- Remaining blockers:
  - none for Phase 0 requirements lock

Approval: PASS

## Subagent Capability Probe

- Probe: requirements authoring and approval incorporation performed by controller; no delegated requirements audit.
- Result: self-executed.

## Delegation Decision Basis

- Audit Execution Mode: `self-audit`
- Delegation Override Reason: Phase 0 requirements are the user-approved draft already reconciled into the run folder; locking is mechanical after worktree PASS with complete local context.

## Audit

Audit: PASS
