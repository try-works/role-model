# S248 Phase 1 started: a click budget ratchet, and a correction to the plan order

## Correction first

The plan (S247) put `s76a-runtime-config` first because the *audit* could not drive the confirm step (S219).
Reading the file: its DOM journey **already works and passes** - including the confirm-to-PUT leg. The S219
failure was in my audit script, not in this test. So the fragility ordering in the plan needs a note: the
highest-value conversions are the control-action and studio files, not the one whose *sibling* journey
failed.

## What landed

**1. Removed a stray debug line** left inside `s76a-runtime-config.test.ts`

    await new Promise((resolve) => setTimeout(resolve, 600)); console.log("BODY", document.body.textContent?.slice(0,300), "HAS", !!editor());

That line dumped page text on every run of a passing test.

**2. A ratchet on synthetic clicks** - `test/s247-click-budget.test.mjs` (3/3)

    BUDGET = { diagnostics: 1, mount: 1, routes: 1, s25b: 1, s26b: 3, s26k: 3, s40b: 1, s46a: 7, s73a: 1, s76a: 11 }

| Test | Rule |
|---|---|
| no file exceeds its recorded count | a conversion may lower it; adding a click site fails |
| every file with clicks is recorded | a new click site must be justified in the budget |
| the total does not grow | 30 today, monotonic downward |

Falsified by appending one `b.click()` to a file with no recorded budget:

    x no test may exceed its recorded synthetic-click budget
    x every file with clicks is recorded in the budget
    x the total click count does not grow
    tests 3 | pass 0 | fail 3

Restored -> 3/3.

## Why a ratchet instead of a ban

The plan's target is scene/story coverage, not zero clicks by fiat. Converting 30 sites in one change would
be a blind rewrite with no way to tell a faithful conversion from a weakened one. The ratchet makes the
suite refuse *new* reliance on the mechanism while each conversion lowers a recorded number - and the red
above proves the refusal is real.

## Suite state

    Test Files 32 passed · Tests 298 passed · tsc via the test script · invariants 20/20 (was 17)

## Next in Phase 1

1. `s26k-control` (3 clicks) -> story for the action lifecycle + scene for the rendered states.
2. `s46a-studio` (7) -> scene, so the unit twin of the gated Studio journey stops depending on synthetic clicks.
3. `s76a-runtime-config` (11) -> story for transitions, keeping its client-level PUT assertions (s222 owns the
   wire format).