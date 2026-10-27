# S247 Foldkit adoption plan (historical; effective update below)

> EFFECTIVE UPDATE 2026-10-27: superseded where inconsistent by `../../REASSESSMENT-AND-EXECUTION.md` and `../../addenda/02-workspace-reference-implementation.md`. Workspace is a required feature-architecture reference, not a click-reduction exercise. Preview pin adoption has an exact compatibility gate; it is NOT a dependency of backend R27. Keep real mounted/client wiring tests. No <=5-click completion target.

Three phases, ordered by risk and by what can be verified here. Phases 1-2 need no dependency change
(pinned foldkit@0.169.0 / @foldkit/ui@0.169.0). Phase 3 needs a vendor bump and a decision.

Baseline at plan time: app suite 298/298 tests, tsc 0, 17/17 invariants, s26k-control 8/8; packaged
candidate 0.0.20-231-gd61c32dc; gate green (20 routes x dark/light/focus, Studio run, control action,
click sweep, 390px); parity: production 0.0.20 vs candidate = 6 same, 2 additive-shape, 0 different.

---

## Phase 1 - scene and story tests (pinned, now)

Goal: remove the fragile mechanism: 30 element.click() calls across 10 files, plus assertions that read
the DOM after asynchronous command execution.

### 1.1 Keep the proven precedent
- test/s245-scene-smoke.test.ts stays as the canonical example (scene + given + expect(role(...))).
- Add a short note in the app test folder: scene for view+interaction, story for update transitions,
  node:test invariants for source-level rules.

### 1.2 Convert DOM-click files, one per change

Order by fragility x value:

- s76a-runtime-config.test.ts (11 clicks): multi-step form; the DOM journey could not reach confirm (S219).
- s46a-studio.test.ts (7): the Studio run journey is now a gate check; its unit twin should match it.
- s26k-control.test.ts (3): just stabilised; remove the click mechanism so it stays stable.
- s26b-wave1.test.ts (3): route-level interactions.
- remaining 6 files with one click each.

Per conversion, acceptance:

1. Same assertions expressed as scene/story steps; no production code change.
2. Mutation proof: break the behaviour the test pins, show the converted test fails, restore, show green.
3. Suite count unchanged or higher; tsc 0; invariants 17/17.
4. Commit message names the file and the mechanism removed.

### 1.3 Story coverage for transitions currently asserted only through DOM
- Control action lifecycle: Requested -> pending -> Completed/Failed as a story with Command.resolve,
  replacing the DOM pending/success assertions in s26k-control.
- Move (not duplicate) the RuntimeConfig transition assertions that s220/s221 already cover.

### 1.4 Gate the mechanism
- New invariant s247: no element.click() in tests that drive the app shell; raw clicks allowed only in
  primitive tests with a written reason and an allowlist entry.
- Wire into the app test script alongside the existing .mjs invariants.

### 1.5 Exit criteria
- At most 5 .click() calls remaining, all in primitive tests with a reason.
- 298+ tests, 0 failures, tsc 0, invariants 18/18, one page of guidance.

Risk: scene needs update and view as values, and createUpdate(...) closes over 8 dependencies, so each
scene test constructs it with stubs (S221 shows the pattern). If noisy, add a test-only harness factory.

---

## Phase 2 - @foldkit/ui controls (pinned, next)

Goal: replace the hand-rolled form controls with vendored components: 2 select, 1 input, 2 textarea in
view.ts.

### 2.1 Inventory and map
- Selects: controller endpoint (aria-label Controller endpoint) and the Overview filters (status/sort/
  breakdown). Decide per control: listbox vs keeping a native select when the option set is large.
- Fields: Studio prompt/query/size; the runtime-config textarea stays a textarea (code-like content).

### 2.2 Convert one control at a time, with parity evidence

1. Scene test first and failing: open, keyboard-navigate, select, close, focus returns to the trigger.
2. Implement with the component; keep message names so update logic is untouched.
3. Keep s177-select-names passing and extend it to the new role.
4. Rendered audit unchanged: 20 routes x dark/light, focus visible, 390px.

### 2.3 Exit criteria
- No hand-rolled select in view.ts; named controls with keyboard support covered by scene tests.
- Suite green, invariants 18/18, packaged gate green (rebuild + repackage, because UI bytes change).

Risk: @foldkit/ui components bring their own Mount/lifecycle, and our model does not track Mount state. If
a component requires it, that is the first real pull toward Phase 3: stop at one control and record it.

---

## Phase 3 - Blocks and Effect Layers (needs vendor bump)

Goal: adopt the preview assembly where it closes our own gaps, specifically R27 closed composition Layer
DAG, which is exactly EffectsLayer plus program.provide(ApplicationLayer).

### 3.0 Preconditions
1. PR #1655 merged to main (owner says it will); a stable commit is a better vendoring target than a canary.
2. effect peer compatibility checked against our vendored 4.0.6 (preview declares 4.0.0).
3. A CI dispatch available to validate the gate on the new pin (same dispatch the R39 steps need).

### 3.1 Vendoring procedure (one change, reversible)
- scripts/vendor-upstream.mjs against the chosen commit; update vendor/foldkit/VENDORED.json (tag, commit,
  commitDate, license, payload digests).
- Re-pin @foldkit/oxlint-plugin; re-run anti-slop lint and vendor digest verification.
- Regenerate FOLDKIT.md guidance if the repo carries it.
- Gate: full public suite, app suite, invariants, workspace typecheck, packaged gate, parity with
  --expect-*-version. Any red reverts the bump.

### 3.2 Pilot: one command family as a Layer
Pick the readback family (ReadDiagnostics, ReadObservability, ReadReadback, ReadControl): 4 of our 8
commands, the R27 boundary problem (clients built ad hoc in app.ts and threaded positionally), and failure
modes already covered by tests and the gate.

Pilot acceptance:
1. Those clients become Effect Services in one layer; ApplicationLayer provides them.
2. createUpdate loses at least 3 positional parameters.
3. No behaviour change: same messages, same HTTP requests (proved by existing client tests), same rendering.
4. R27 evidence updated with an integration test that fails when acquisition is skipped or duplicated.

### 3.3 Then, feature by feature (only if 3.2 lands cleanly)
- Convert one feature (Control, then Studio) into Definition/Composition/Block with an OutMessage protocol.
- Keep the flat Message union for the shell until at least two features are blocks; no big-bang.

### 3.4 Non-goals
- No readback.ts to AsyncData rewrite in the same change (separate, test-covered migration).
- No devtools/MCP dispatch adoption until the Blocks pilot is stable; it would change how the rendered
  audit works, and that audit is one of our best checks.

---

## Cross-cutting rules

1. No green without a red: each new test is shown to fail for the right reason, and the red output is kept.
2. One control or one file per commit; no mixed changes.
3. The packaged gate stays authoritative: any change under apps/runtime-ui-next/src means rebuild,
   repackage, and gate on <package>/build/client (the gate refuses a drifted static root).
4. Parity re-measured after any packaged change, with --expect-left-version set to the new candidate.
5. Stop rules: if a phase needs a vendor bump before its first commit, stop and record; if scene cannot
   express an assertion, keep the DOM test and write why.

## Effort estimate (rounds)

| Phase | Work | Rounds |
|---|---|---|
| 1.1-1.2 | 5 files converted with mutation proofs | 5-7 |
| 1.3-1.5 | story migrations + click invariant | 3-4 |
| 2 | 2 selects + 3 fields, scene-tested, repackage + gate | 6-8 |
| 3.1 | vendor bump + full gate | 4-6 |
| 3.2 | readback family as a Layer + R27 integration test | 5-8 |
| 3.3 | one feature as a Block | 8-12 |

## What each phase buys the objective

- Phase 1: UI verification stops depending on synthetic DOM events; both defect classes this run found
  (invisible controls, click crashes) get cheaper to test.
- Phase 2: removes the hand-rolled control defect class (s177) and matches the reference design rule.
- Phase 3: closes R27 Layer DAG and gives the migration a composition boundary - the last architectural
  item in current scope that is not owner-gated.