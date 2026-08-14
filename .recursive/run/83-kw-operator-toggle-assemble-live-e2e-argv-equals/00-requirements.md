Run: `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/`
Phase: `00 Requirements`
Status: `LOCKED`
CapturedAt: `2026-07-25T08:49:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-25): next run must include (1) full Playwright `assemble-run00-live-e2e` refresh so TB00 freeze no longer depends on run-82 `FD12` proof-only rebind, (2) equals-form argv parsing for `launch-packaged-runtime.mjs` (`--track=dev`, `--scope-id=…`), and (3) **operator-togglable** Knowledge Worker `productionActivation` (not ambient always-on).
- Clarifications (2026-07-25):
  - KW must **work properly when on**.
  - Unlock ceremony (signed `knowledge_validation` receipt + shadow candidate + digest match) is **retained and required for ON** to reduce bugs/errors.
  - Default posture is **shadow-ready** so the operator can turn production ON immediately (ceremony still required; production flag still default off).
  - Spec must be **consistent, detailed, verifiable, extensible, and future-proof**.
  - Verification must include strict TDD, Phase 5 rebuilt-runtime proof, live Cloudflare `--track=dev` E2E, and live `pi` CLI → router storage presence/correctness checks.
- Prior control-plane truth: `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`, `/.recursive/memory/domains/direct-track-b.md`, `/.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md`
- Predecessor runs: `00-direct-track-b-v1-1-implementation`, `79-…`, `80-…`, `81-…`, `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`
- Current product anchors (as of run 82 merge):
  - Private KW: `extensions/knowledge-worker/index.mjs` — ON requires policy v1 + attestation + verified receipt + shadow candidate with `validationReceiptHash === digest(receipt)`; static `productionActivation === false`; OFF today is mainly `rollback()`
  - Private launch: `scripts/track-b/launch-packaged-runtime.mjs` — discrete argv only; equals-form does not bind
  - Private live-e2e: `scripts/track-b/assemble-run00-live-e2e.mjs`; run 82 used proof-only rebind after assemble failed
  - Cloud: `pnpm test:cloud`; live `pnpm test:cloud:e2e -- --track=dev|stage` (`scripts/track-b/cloud-track-e2e.mjs`; production refused)
  - `pi` hops: `evidence/live-e2e/local-runtime-and-pi.json` + correlate helpers
Outputs:
- /.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md (private + public mirrors)
- Approved source draft retained at .cursor/spec-drafts/83-kw-operator-toggle-assemble-live-e2e-argv-equals.00-requirements.md
"@
Run: `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/`
Phase: `00 Requirements`
Status: `DRAFT`
LockedAt: `2026-07-25T00:59:57Z`
LockHash: `9c9cbabf404223b3ce1416457ffd9b4cf9f736fe73270efb0e953baec62beebd`
CapturedAt: `2026-07-25T08:49:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-25): next run must include (1) full Playwright `assemble-run00-live-e2e` refresh so TB00 freeze no longer depends on run-82 `FD12` proof-only rebind, (2) equals-form argv parsing for `launch-packaged-runtime.mjs` (`--track=dev`, `--scope-id=…`), and (3) **operator-togglable** Knowledge Worker `productionActivation` (not ambient always-on).
- Clarifications (2026-07-25):
  - KW must **work properly when on**.
  - Unlock ceremony (signed `knowledge_validation` receipt + shadow candidate + digest match) is **retained and required for ON** to reduce bugs/errors.
  - Default posture is **shadow-ready** so the operator can turn production ON immediately (ceremony still required; production flag still default off).
  - Spec must be **consistent, detailed, verifiable, extensible, and future-proof**.
  - Verification must include strict TDD, Phase 5 rebuilt-runtime proof, live Cloudflare `--track=dev` E2E, and live `pi` CLI → router storage presence/correctness checks.
- Prior control-plane truth: `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`, `/.recursive/memory/domains/direct-track-b.md`, `/.recursive/memory/skills/issues/launch-packaged-runtime-argv-equals.md`
- Predecessor runs: `00-direct-track-b-v1-1-implementation`, `79-…`, `80-…`, `81-…`, `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`
- Current product anchors (as of run 82 merge):
  - Private KW: `extensions/knowledge-worker/index.mjs` — ON requires policy v1 + attestation + verified receipt + shadow candidate with `validationReceiptHash === digest(receipt)`; static `productionActivation === false`; OFF today is mainly `rollback()`
  - Private launch: `scripts/track-b/launch-packaged-runtime.mjs` — discrete argv only; equals-form does not bind
  - Private live-e2e: `scripts/track-b/assemble-run00-live-e2e.mjs`; run 82 used proof-only rebind after assemble failed
  - Cloud: `pnpm test:cloud`; live `pnpm test:cloud:e2e -- --track=dev|stage` (`scripts/track-b/cloud-track-e2e.mjs`; production refused)
  - `pi` hops: `evidence/live-e2e/local-runtime-and-pi.json` + correlate helpers
Outputs:
- `/.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md` (private + public mirrors)
- Approved source draft retained at `.cursor/spec-drafts/83-kw-operator-toggle-assemble-live-e2e-argv-equals.00-requirements.md`
Scope note: Authoritative Phase 0 requirements for (A) shadow-ready + operator-togglable KW with ceremony-bound ON and full KW correctness when on, (B) full Playwright assemble live-e2e refresh (no proof-only-only freeze closeout), (C) equals-form packaged launch argv, under strict TDD with Phase 5 rebuilt-runtime, live cloud `--track=dev`, and live `pi`→router storage verification. No stage/main auto-promotion. No live `--track=production`.

## TODO

- [x] Elicit requirements from user direction + predecessor control-plane docs + run-82 residuals
- [x] Align provisional run id with public max+1 (`82` → `83`)
- [x] Author comprehensive sequential `R1`–`R19` with observable acceptance criteria
- [x] Add fixed decisions, open unknowns, vocabulary, invariants, verification matrix
- [x] Consistency pass: renumber R#, resolve FD id clash with run-82 proof-only term, align cross-refs
- [x] Require shadow-ready default, ceremony ON, KW correctness, assemble, equals-form argv, TDD, rebuilt runtime, cloud E2E, `pi` storage
- [x] Add extensibility / future-proofing contracts
- [x] Document out of scope (`OOS1`–`OOS14`)
- [x] User approve this draft (2026-07-25)
- [x] recursive-init + write approved content into both repos’ run folders
- [x] Complete Coverage / Approval gates for repo artifact (after approval + worktree PASS)
- [x] Lock Phase 0 via recursive-lock after worktree PASS

## Background

### Goal

After this run, all of the following are true together (no partial theme PASS):

1. **Default = shadow-ready, production off.** Validated knowledge exists as shadow candidate(s) (or Phase-2-locked equivalent) while `productionActivation === false`.
2. **Operator can toggle production on/off.** Ambient always-on is forbidden. Static/class `KnowledgeWorker.productionActivation` remains `false`.
3. **ON requires unlock ceremony** (verified receipt + shadow candidate + digest match). Shadow-ready makes ON immediate once the operator chooses it.
4. **OFF is explicit** and returns to shadow-ready by default (soft deactivate); destructive rollback remains available if retained.
5. **When on, KW works correctly** (derive / rebuild / retrieve rules still enforce and still succeed on valid inputs).
6. **Full Playwright assemble** refreshes live-e2e; pin-freeze + TB11 pass without proof-only-only closeout.
7. **Equals-form launch argv** binds the same as discrete form.
8. **Multi-plane verification** is green: strict TDD, rebuilt runtime Phase 5, live cloud `--track=dev`, live `pi` storage correctness.

### Problem

- Run 82 closed digest-bound ON and launch `--scope-id`, but left shadow-ready default / reversible OFF / honesty UX incomplete as a coherent operator story.
- Freeze honesty still depends on run-82 proof-only live-e2e rebind after assemble failed.
- Equals-form `--track=dev` silently fails to bind in `launch-packaged-runtime.mjs`.
- Prior closeouts did not require live cloud write-path + live `pi`→router storage correctness in the same run.

### Scope

| Axis | In scope |
|---|---|
| Repos | `try-works/role-model-internal` (primary) + `try-works/role-model` (as required for UI/host/`pi`/Phase 5) |
| Run id | `83-kw-operator-toggle-assemble-live-e2e-argv-equals` (mirrored) |
| Branch | `dev` only unless user later authorizes promotion |
| Theme A | Shadow-ready + operator toggle + ceremony ON + KW correctness |
| Theme B | Full Playwright assemble + coherent TB00 freeze/TB11 |
| Theme C | Equals-form packaged launch argv |
| Theme D | Strict TDD + Phase 5 rebuilt packaged runtime |
| Theme E | Live Cloudflare `--track=dev` + live `pi` storage correctness |
| Server | Only if Phase 1/2 proves local surfaces cannot satisfy an AC (`FD9`) |
| Verification | See Verification Matrix; every `R#` must be observable |

### Non-goals (summary)

See **Out of Scope**. Notably: ambient production-on, removing unlock ceremony, weakening KW correctness, permanent empty cold-start, proof-only-only freeze closeout, stage/main auto-promotion, live production track.

### Success definition (run-level)

Phase 4/5 may claim PASS only when **all** hold:

1. Every in-scope `R1`–`R19` reaches RCS `verified` (or an addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R14` RED/GREEN evidence exists for every in-scope production code change.
3. `R1`/`R2` are green after **full assemble** (proof-only-only = FAIL).
4. `R15` rebuilt-runtime Phase 5 evidence exists; hops target that artifact (stale binary = FAIL).
5. `R16` live cloud `--track=dev` PASS; `R17` live `pi` storage PASS.
6. `R18` binder is secret-free and maps every `R#` to evidence.
7. Invariants I1–I8 hold (see Invariants).

## Quality Bar (normative for this draft)

| Attribute | How this draft enforces it |
|---|---|
| Consistent | Single KW state machine; sequential `R1`–`R19`; FDs/`R#`/OOS/`U#` cross-checked; no “retire ceremony” language |
| Detailed | Vocabulary + invariants + per-`R#` description + observable ACs + verification matrix |
| Verifiable | Each `R#` names commands/artifacts/assertions; PASS requires RCS `verified` with distinct verification evidence |
| Extensible | Versioned toggle-request (`R12`); refuse unknown fields; axes stay independent; future modes documented without dropping ceremony/shadow-ready |
| Future-proof | Invariants I1–I8 + `FD15`/`FD19`; OOS blocks regressions (ambient on, ceremony removal, cold-start, CI weakening) |

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Themes A–E are co-required for run PASS; public changes only when required for UI/host/`pi`/Phase 5. |
| `FD2` | Operator-togglable = explicit ON/OFF; production default **off**; not ambient always-on; static class flag stays `false`. |
| `FD3` | Default posture is **shadow-ready** so ceremony-backed ON can be immediate (`R6`). |
| `FD4` | ON **requires** unlock ceremony: verified `knowledge_validation` receipt + shadow candidate + digest bind (`digest(receipt) === candidate.validationReceiptHash` or Phase-2-locked equivalent). Bare boolean / attestation-only ON is refused. |
| `FD5` | Ceremony and KW correctness are complementary: ceremony gates the production flag; derive/rebuild/retrieve keep knowledge honest when on. |
| `FD6` | Soft OFF returns to shadow-ready; destructive rollback may additionally clear candidates (`U2`). |
| `FD7` | Axes remain independent: installed ≠ Set-mode ≠ recommendation apply/dismiss ≠ `productionActivation`. |
| `FD8` | Phase 3 `TDD Mode: strict` for all in-scope production code. |
| `FD9` | Phase 5 verifies freshly rebuilt private Track B dist + public SEA. Stale binary = FAIL. |
| `FD10` | Full Playwright assemble via `assemble-run00-live-e2e.mjs` is required for freeze honesty. Run-82 proof-only rebind is **not** an acceptable sole closeout for `R1`/`R2`. |
| `FD11` | Server changes allowed only if Phase 1/2 shows local surfaces cannot satisfy an AC; additive + track-safe. |
| `FD12` | Work stays on `dev`; no auto-promotion to `stage`/`main`. |
| `FD13` | Live cloud write E2E required plane is `--track=dev`; production refused; stage optional extra only. |
| `FD14` | Launch helper accepts discrete and equals-form `--track` / `--scope-id` with identical effective bind and documented precedence. |
| `FD15` | Toggle-request/API is versioned; future modes may add fields/versions but must not drop digest bind, shadow-ready default, or axis independence. |
| `FD16` | Secrets stay out of git; evidence cites hosts/ids/digests/paths/hashes only. |
| `FD17` | Phase docs are authored serially after real work (no anticipatory 3.5–8 batch-write). |
| `FD18` | Live `pi` verification asserts storage presence/absence **and** correctness, not CLI exit alone. |
| `FD19` | Extensibility rule: new activation/auth modes ship as additive versions; unknown fields refuse; default remains shadow-ready + production off. |

## Open Unknowns (must resolve before claiming related PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Operator-toggle surface (capability / host-bridge API / Extensions UI / combination) | Phase 1 inventory; Phase 2 locks minimal operator path; UI honesty must match if UI is included |
| `U2` | Soft deactivate vs rollback vs both | Prefer soft OFF → shadow-ready + keep rollback as destructive reset; TB10 covers chosen paths |
| `U3` | Keep/extend v1 ceremony schema vs v2 | Additive version bump; must not drop digest bind for ON |
| `U4` | Whether public product pin must advance for assemble | Measure in Phase 1; advance coherently with assemble if needed |
| `U5` | Exact `pi` provider/model/marker prompt | Resolve from assemble/`local-runtime-and-pi` + router config; sanitize in evidence |
| `U6` | Storage planes asserted by `R17` | Phase 2 locks ≥1 local + ≥1 cloud-bound check when cloud plane is exercised |
| `U7` | Whether live cloud E2E needs redeploy | Prefer existing permanent-dev workers; redeploy only if Phase 1 shows drift |
| `U8` | Shadow-ready bootstrap mechanism (seed/derive/host bootstrap/import) | Phase 2 locks one default that makes ON immediate without ambient production |

## Vocabulary

| Term | Meaning for this run |
|---|---|
| `shadow-ready` | Default posture: ≥1 shadow candidate bound to verified knowledge material while `productionActivation === false` |
| `operator toggle` | Explicit ON/OFF control for instance `productionActivation` |
| `unlock ceremony` | ON prerequisites: verified `knowledge_validation` receipt + shadow candidate + digest bind |
| `KW correctness` | Derive/rebuild/retrieve rules that remain enforced when production is on |
| `soft deactivate` | OFF that returns to shadow-ready without clearing candidates/index |
| `destructive rollback` | Clears candidates and activation |
| `toggle request` | Versioned activate/deactivate payload (code may still say “policy”); ON includes ceremony fields |
| `proof-only rebind` | Run-82 source-revision rewrite without regenerating hop proofs — insufficient alone for this run’s `R1`/`R2` |
| `discrete form` | `--track` `dev`, `--scope-id` `run83-dev` |
| `equals form` | `--track=dev`, `--scope-id=run83-dev` |
| `effective bind` | Resolved track/scope recorded in runtime identity |
| `storage presence` | Observable record exists after a live request |
| `storage absence` | Observable empty/missing where expected |
| `storage correctness` | Present record fields/hashes/schema match expected marker (secret-free) |

### Normative KW state machine

```text
[default] shadow-ready + productionActivation=false (class static false)
  --(ON + valid unlock ceremony)--> productionActivation=true
  --(ON missing/mismatched ceremony)--> refuse (stays false)
  --(soft OFF)--> productionActivation=false, shadow-ready
  --(destructive rollback)--> false + candidates cleared
  --(Set-mode enable alone)--> does NOT set productionActivation

when productionActivation=true:
  derive / rebuild / retrieve still enforce KW correctness
```

## Invariants (must hold at ship)

| ID | Invariant | Verified by |
|---|---|---|
| `I1` | Production default off; static class flag false | TB10 + probe |
| `I2` | Default path is shadow-ready before first ON | TB10 + probe + `R6` |
| `I3` | ON requires ceremony; mismatch refuses | TB10 + `R7` |
| `I4` | Soft OFF returns shadow-ready; ON again possible | TB10 + probe + `R4` |
| `I5` | When on, KW correctness still holds | TB10 + Phase 5 + `R8` |
| `I6` | Set-mode / recommendation do not imply production ON | tests/probes + `R10` |
| `I7` | Equals-form and discrete argv bind identically | unit + Phase 5 identity + `R9` |
| `I8` | Freeze honesty uses full assemble, not proof-only-only | assemble logs + TB11 + `R1`/`R2` |

## Requirements

### `R1` Full Playwright assemble live-e2e refresh

Description:
Regenerate TB00 live-e2e via `scripts/track-b/assemble-run00-live-e2e.mjs` so freeze/TB11 no longer depend on proof-only-only rebind.

Acceptance criteria:
- `assemble-run00-live-e2e.mjs` exits 0.
- Validator-required artifacts refreshed (at least `evidence/live-e2e/run00-live-e2e-manifest.json`, `build-and-test.json`, `clean-checkout-reconstruction.json`, `local-runtime-and-pi.json` or validator-named successors).
- TB11 `validateRun00LiveEndToEndEvidence` PASS after assemble.
- Assemble logs stored under the run evidence tree.
- Proof-only-only closeout without successful assemble = FAIL for `R1`.

### `R2` Coherent TB00 freeze / pin-freeze CI honesty after assemble

Description:
After product + assemble evidence land, freeze integrity is CI-honest on a clean tree.

Acceptance criteria:
- `pin-freeze-gate.test.mjs` PASS without exclusion.
- `pnpm test` (Track B), `pnpm test:cloud`, and `node scripts/track-b/system-proof.mjs` exit 0 (or residuals are explicit and non-pin-freeze).
- If product pathset drifts past pins, advance `tb00-release-source-lock.json` coherently with assemble in the same closeout unit.
- Binder records private/public pin SHAs and assemble tip SHAs.

### `R3` Operator on/off toggle (production default off)

Description:
Provide an explicit operator-facing ON/OFF path for instance `productionActivation`. Default posture is shadow-ready (`R6`). ON requires ceremony (`R7`). Soft OFF returns to shadow-ready (`R4`).

Acceptance criteria:
- Fresh worker: `health().productionActivation === false` and `KnowledgeWorker.productionActivation === false`.
- Operator ON succeeds only when `R6` + `R7` are satisfied.
- Operator OFF does not require ceremony materials.
- Re-ON after soft OFF succeeds when `R7` is satisfied again (reversible by default).
- ON/OFF does not change Set-mode / recommendation axes (`R10`).
- TB10 RED→GREEN covers on/off + refuse-without-operator-action.

### `R4` Explicit OFF path (soft deactivate and/or rollback)

Description:
Lock OFF semantics (`U2`): preferred soft deactivate back to shadow-ready; optional destructive rollback.

Acceptance criteria:
- After ON, OFF yields `productionActivation === false`.
- Soft OFF retains shadow candidates/index so later ON can be immediate.
- If rollback retained: clears candidates + activation; covered by tests.
- Packaged/dist probe: shadow-ready → ON → soft OFF (shadow-ready) → ON.

### `R5` Honesty surfaces match shadow-ready + toggle + ceremony

Description:
UI/API/docs/probe must describe shadow-ready default, ceremony-bound ON, explicit OFF, and KW working when on — not bare switch, hard-off forever, always-production, or broken KW.

Acceptance criteria:
- Wording distinguishes Set-mode from `productionActivation`.
- States: default shadow-ready / production off; ON needs validated knowledge bind; KW works when on (`R8`).
- Probe asserts shadow-ready + toggle + ceremony + static class false.
- If UI in scope (`U1`): can drive on/off from shadow-ready; else Phase 2 documents operator path and keeps UI copy non-misleading.

### `R6` Default shadow-ready so ON can be immediate

Description:
Default KW posture is shadow-ready: validated knowledge present as shadow candidate(s) while production remains off.

Acceptance criteria:
- Default bootstrap (`U8`) establishes ≥1 shadow candidate bound to a verified knowledge-validation receipt before operator ON.
- Health/probe can distinguish shadow-ready vs production-on (candidates present + `productionActivation === false`).
- From shadow-ready, one valid ceremony-backed ON succeeds without an extra ad-hoc derive in the operator critical path.
- Soft OFF returns to shadow-ready (not ambient production; not forced empty unless rollback).
- Permanent empty cold-start despite available bootstrap = FAIL (`OOS1c`).
- TB10/probe RED→GREEN: shadow-ready default; immediate ON; refuse when shadow missing/mismatched.

### `R7` Unlock ceremony required for ON (receipt + shadow + digest)

Description:
Retain run-81/82 unlock ceremony for ON so the production flag binds to a specific validated candidate.

Acceptance criteria:
- ON refuses without verified `knowledge_validation` receipt (required claims).
- ON refuses without shadow candidate.
- ON refuses when `digest(receipt)` ≠ shadow `validationReceiptHash` (or Phase-2-locked equivalent).
- ON refuses unknown fields and unsupported versions.
- Matching ceremony sets instance `productionActivation === true`; static class remains `false`.
- TB10 mismatch/unbound refuse cases remain GREEN or stronger; removing ceremony = `OOS1b` FAIL.

### `R8` KW works properly when activated

Description:
After ceremony-backed ON, derive/rebuild/retrieve remain correct and enforced. Ceremony does not replace KW correctness.

Acceptance criteria:
- While on: valid derive/rebuild/retrieve still succeed under existing rules.
- While on: invalid/unsafe inputs still refuse (generic tips, missing provenance, set overlap, unbounded retrieve, etc.).
- OFF must not invent production behavior; ON must not disable correctness refusals.
- TB10 retains/adapts correctness cases proving toggle + ceremony + KW correctness together.
- Phase 5 demonstrates ≥1 success path and ≥1 refuse path while activated.

### `R9` Equals-form argv for packaged launch `--track` and `--scope-id`

Description:
`launch-packaged-runtime.mjs` (and shared parsers) bind equals-form and discrete-form identically.

Acceptance criteria:
- `--track=dev` ≡ `--track` `dev`.
- `--scope-id=run83-dev` ≡ `--scope-id` `run83-dev`.
- Precedence: CLI (either form) > env > defaults; documented in Phase 2.
- Explicit bad/empty tokens do not silently fall through to production/local; refuse or documented fallback only.
- Unit RED→GREEN for both forms; Phase 5 uses equals-form at least once; runtime identity records effective bind.
- Phase 8 closes/updates `launch-packaged-runtime-argv-equals.md`.

### `R10` Preserve Track B axis independence

Description:
Toggle must not collapse Set-mode, recommendation apply/dismiss, or contribution opt-out into production activation.

Acceptance criteria:
- Set-mode enable alone does not set `productionActivation`.
- Recommendation apply/dismiss alone does not set `productionActivation`.
- Contribution opt-out behavior unchanged unless an explicit residual says otherwise.
- Regression tests/probes demonstrate independence.

### `R11` SEA-complete packaging for Phase 5

Description:
When private packaging inputs change, rebuild private dist and package public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`.

Acceptance criteria:
- Rebuild receipt records commands, timestamps, artifact hashes/paths.
- SEA with null `track_b_runtime` due to missing distribution root is rejected for Phase 5.
- KW probe covers dist and/or packaged path for packaging fidelity.

### `R12` Extensible versioned toggle-request contract

Description:
Activate/deactivate uses a versioned schema so future operator-auth modes can be added without ambient unlock, ceremony removal, or KW-correctness loss (`FD15`, `FD19`).

Acceptance criteria:
- Explicit version field on toggle-request/capability.
- Unsupported versions refuse with stable error pattern.
- Unknown fields refuse.
- Phase 2 documents adding a future mode (new version/additive field) without changing shadow-ready default, dropping `R7`, or disabling `R8`.
- Contract remains forward-compatible: old valid ceremony ON still works after additive changes unless an explicit version bump documents otherwise.

### `R13` Evidence layout + secret hygiene

Description:
Run evidence is durable, correlatable, and secret-free.

Acceptance criteria:
- Evidence under `.recursive/run/83-…/evidence/` for RED/GREEN, assemble, rebuild/launch/hops, cloud E2E, `pi` storage.
- Binder lists paths, hashes, hop ids, pin SHAs, shadow-ready/ceremony probe results, `secretsOmitted: true`.
- No API tokens, private keys, or raw secrets committed.

### `R14` Strict TDD for in-scope production code

Description:
Phase 3 uses `TDD Mode: strict` for KW shadow/toggle/ceremony/correctness, launch argv parsing, and any public helper/UI/API touched.

Acceptance criteria:
- Each production change set has RED evidence before GREEN implementation evidence.
- TB10/launch-scope (or successors) updated first for new contracts.
- Pragmatic exceptions forbidden for production behavior code; assemble evidence outputs may be non-TDD but must be validator-proven.

### `R15` Phase 5 rebuilt-runtime verification

Description:
QA against freshly rebuilt artifacts: shadow-ready/toggle/ceremony, equals-form launch, KW correctness-while-on, and one recommendation trust hop.

Acceptance criteria:
- Rebuild receipt precedes hops.
- Launch uses equals-form at least once; identity shows effective `track`/`scopeId`.
- KW probe PASS for shadow-ready → ON (ceremony) → soft OFF → ON on rebuilt dist and/or packaged runtime.
- While on: ≥1 KW success + ≥1 KW refuse demonstrated (`R8`).
- Recommendation trust hop (API and/or browser) PASS on rebuilt SEA when workers available; else non-PASS residual (cannot claim `R15` PASS).
- Stale SEA reuse = FAIL.

### `R16` Live Cloudflare E2E (`--track=dev`)

Description:
Prove live cloud write/resolve path on permanent-dev.

Acceptance criteria:
- `pnpm test:cloud:e2e -- --track=dev` (optionally `--write-evidence`) exits 0.
- Evidence cites temp report and/or `evidence/live-e2e/cloud-track-dev.json`.
- Harness still refuses `--track=production`.
- Offline `pnpm test:cloud` remains green.

### `R17` Live `pi` CLI → router storage correctness

Description:
Live `pi` requests through the router/runtime must prove storage presence/absence and correctness (`FD18`).

Acceptance criteria:
- ≥1 live `pi` invocation against this run’s rebuilt/local packaged router provider path (command sanitized).
- Evidence records marker id, endpoint identity, and assertion results.
- Assertions include:
  - presence **or** intentional absence (explicit expected outcome), and
  - correctness of any present record (local and/or cloud-bound planes per `U6`).
- CLI exit 0 alone = insufficient / FAIL.
- Correlate hops where feasible without committing secrets.

### `R18` Secret-free binder + matrix completeness

Description:
Binder ties every `R#` to concrete evidence and records the multi-plane matrix.

Acceptance criteria:
- Binder fields/sections: assemble, pin-freeze, TDD RED/GREEN, rebuild, equals-form launch identity, shadow-ready/toggle/ceremony probe, KW correctness-while-on, cloud E2E, `pi` storage.
- Every `R1`–`R19` mapped in Phase 4/5 RCS.
- `secretsOmitted: true`.

### `R19` Dual-repo paired delivery + control-plane closeout

Description:
Ship private+public feature branches; Phases 6–8 update DECISIONS/STATE/memory. Merge remains operator-requested unless user authorizes in-run.

Acceptance criteria:
- Dual-repo run folders mirror required requirements/plan/evidence.
- Absolute public paths in RCS when public files change.
- Phase 6 soft-closes run-82 assemble residual + equals-form skill issue; records shadow-ready+ceremony+toggle decision.
- Phase 7 STATE describes shadow-ready default, ceremony ON, full-assemble freeze honesty, equals-form argv.
- Phase 8 updates domain/skill memory; closes/revises `launch-packaged-runtime-argv-equals.md`.

## Verification Matrix (normative)

| Plane | Required command / artifact class | Gates |
|---|---|---|
| Unit / Track B offline | `node --test tests/track-b/*.test.mjs` (TB10, pin-freeze, launch argv) | `R2`,`R3`,`R4`,`R6`,`R7`,`R8`,`R9`,`R10`,`R14` |
| Cloud offline | `pnpm test:cloud` | `R2`,`R16` (offline half) |
| System proof | `node scripts/track-b/system-proof.mjs` | `R2` |
| Full assemble live-e2e | `node scripts/track-b/assemble-run00-live-e2e.mjs` + TB11 live-e2e validate | `R1`,`R2`,`R17` (local/`pi` portion when regenerated) |
| Rebuild | `pnpm build:run00-runtime` + `pnpm runtime:package-sea` with Track B root | `R11`,`R15` |
| Phase 5 hops | equals-form launch + shadow/toggle/ceremony + KW correctness + recommendation hop | `R5`,`R6`,`R7`,`R8`,`R9`,`R15` |
| Live cloud E2E | `pnpm test:cloud:e2e -- --track=dev` | `R16` |
| Live `pi` storage | `pi …` + presence/correctness assertions | `R17` |
| Binder | `evidence/binder.json` | `R13`,`R18` |
| Control-plane closeout | Phases 6–8 | `R19` |

## Extensibility / Future-proofing Contracts

1. **Versioned toggle-request** (`R12`, `FD15`, `FD19`): additive versions only; unknown fields refuse.
2. **Stable axes** (`R10`, `I6`): future modes must not collapse Set-mode / recommendations / production activation.
3. **Ceremony preserved** (`R7`, `OOS1b`): future auth modes may add attestations but must not remove receipt+shadow+digest bind for ON unless a later run explicitly supersedes this invariant.
4. **Shadow-ready default preserved** (`R6`, `OOS1c`): future bootstraps may change mechanism (`U8`) but must keep immediate-ON capability without ambient production.
5. **KW correctness preserved** (`R8`, `OOS1a`): activation changes must not disable derive/rebuild/retrieve refusals.
6. **Launch argv parser** (`R9`): shared parser should accept both forms so future flags can reuse the same equals/discrete rules.
7. **Evidence schema** (`R13`, `R18`): binder remains additive; new probe types append fields rather than rewriting history.
8. **Track policy** (`FD12`, `FD13`, `OOS2`, `OOS3`): future promotion/live-production work requires a new explicit run — not silent expansion of this one.

## Out of Scope

| ID | Item |
|---|---|
| `OOS1` | Ambient always-on / class-static `productionActivation === true` |
| `OOS1a` | Weakening/deleting KW derive/rebuild/retrieve correctness rules |
| `OOS1b` | Removing unlock ceremony for ON or allowing attestation-only / bare-boolean ON |
| `OOS1c` | Defaulting to production-on, or permanent empty cold-start that blocks immediate ceremony-backed ON |
| `OOS2` | Auto-promotion to `stage` / `main` |
| `OOS3` | Live `--track=production` Cloudflare writes |
| `OOS4` | Replacing Set-mode mutate API as enablement authority |
| `OOS5` | Making recommendation apply imply KW production activation |
| `OOS6` | Full Cloudflare resource reprovision / rename program |
| `OOS7` | Proposal-corpus rewrite |
| `OOS8` | TB11 predecessorReceipts maxItems schema redesign |
| `OOS9` | Claiming freeze PASS via proof-only rebind alone |
| `OOS10` | Inventing a second unrelated knowledge product outside Knowledge Worker |
| `OOS11` | Unrelated non-Track-B extension package feature work |
| `OOS12` | Knowledge-store (and other unchanged packages) hard-off copy rewrite |
| `OOS13` | Removing contribution destination-auth / aggregate-only privacy invariants |
| `OOS14` | Silent weakening of offline CI to hide assemble/cloud/`pi` failures |

## Constraints

1. Follow `/.recursive/RECURSIVE.md` audit-v2; serial phase authoring; strict TDD in Phase 3.
2. Prefer dual worktrees (short private path + public worktree) as in runs 81/82.
3. Both discrete and equals-form argv must bind after this run.
4. Prefer existing permanent-dev workers; redeploy only under `U7`.
5. Keep evidence secret-free; sanitize `pi` commands.
6. Recommendation API lifecycle alone does not satisfy `R16` or `R17`.
7. Offline unit green alone does not satisfy `R15`.
8. Extensibility contracts above are normative for Phase 2/3 design choices.

## Traceability (draft → future phases)

| R# | Primary later surfaces |
|---|---|
| `R1`–`R2` | Phase 1 freeze/assemble AS-IS; Phase 3 evidence; Phase 4 TB11/pin-freeze |
| `R3`–`R8`, `R10`, `R12` | Phase 1 KW AS-IS; Phase 2 state-machine design; Phase 3 KW/TB10/probe/UI; Phase 5 probes |
| `R9` | Phase 3 launch parser + tests; Phase 5 equals-form identity |
| `R11`, `R15` | Phase 5 rebuild receipt + hops |
| `R13`, `R18` | Phase 4/5 binder |
| `R14` | Phase 3/4 RED/GREEN logs |
| `R16` | Phase 5 live cloud E2E logs |
| `R17` | Phase 5 `pi` + storage assertions (may share assemble outputs if regenerated) |
| `R19` | Phases 6–8 + ship |

## Coverage Gate

- Effective inputs reviewed:
  - User approval of draft (2026-07-25) for shadow-ready + ceremony ON + assemble + equals-form argv + TDD + rebuilt runtime + cloud E2E + pi storage
  - Dual-repo worktrees recorded in `00-worktree.md` (private `D:/DEV/.wt/83-kw`, public `.worktrees/83-kw-…`)
  - Prior STATE/DECISIONS/memory and run-82 residuals
- Requirement coverage check:
  - Theme A KW: `R3`–`R8`, `R10`, `R12`
  - Theme B assemble/freeze: `R1`–`R2`
  - Theme C equals-form argv: `R9`
  - Cross-cutting packaging/TDD/Phase5/cloud/pi/binder/dual-repo: `R11`, `R13`–`R19`
- Out-of-scope confirmation: `OOS1`–`OOS14` explicit
- Lock state: ready to lock with worktree PASS

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Requirements cover shadow-ready default, ceremony-bound ON, KW correctness, full assemble, equals-form argv, strict TDD, rebuilt SEA, live cloud `--track=dev`, and live `pi` storage with observable criteria
  - No ambient always-on (`OOS1`); ceremony retained (`OOS1b`); empty cold-start forbidden (`OOS1c`)
  - Dual worktrees isolated on `recursive/83-kw-operator-toggle-assemble-live-e2e-argv-equals`
  - Run id `83` (public max+1)
  - User approved draft 2026-07-25; written into both worktree run folders
- Remaining blockers:
  - none for Phase 0 requirements lock

Approval: PASS

## Subagent Capability Probe

- Probe: requirements authoring and approval incorporation performed by controller; no delegated requirements audit.
- Result: self-executed.

## Delegation Decision Basis

- Audit Execution Mode: `self-audit`
- Delegation Override Reason: Phase 0 requirements are the user-approved draft already reconciled into dual-repo run folders after worktree isolation; locking is mechanical with complete local context.

## Audit

Audit: PASS
