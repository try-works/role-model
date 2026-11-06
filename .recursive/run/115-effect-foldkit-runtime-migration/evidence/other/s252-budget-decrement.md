# S252 The click budget falls for the first time: 30 -> 28, with a replacement, not a deletion

## The replacement

`test/s251-control-dispatch-once.test.ts` (2/2) asserts the rule the DOM test protected, at the level where
it lives:

| Request | Asserts |
|---|---|
| one `ControlActionRequested` | exactly one command is emitted, status becomes `pending`, token advances |
| a second while pending | **no** second command, token unchanged |

No click, no client stub, no happy-dom event path. The click-driven version in `s26k-control.test.ts` was then
**removed** (it was asserting the same rule through a weaker mechanism), and the budget was lowered:

    "s26k-control.test.ts": 3 -> 1
    total 30 -> 28

## Two things the ratchet caught while doing it

1. **A comment count.** The new test's doc comment explains that it replaces `element.click()` twice - and the
   invariant counted that sentence as a click site. The counter now strips block and line comments before
   matching: documentation about a click is not a click.
2. **A flaky sibling.** The suite run reported `S67a learning surfaces` failing (5.3 s) while everything else
   passed; it passes 4/4 in isolation and on the immediate full re-run. Recorded as load-sensitive, not
   changed.

## State

    app suite 302 tests · invariants 20/20 (budget 28) · tsc in the test script

## Why this is the first honest decrement

S250 added scene coverage without touching the budget. This round removed a *redundant* mechanism and lowered
the number, which is the only way the ratchet's value is real: the budget tracks surviving wiring tests, not
aspirations.