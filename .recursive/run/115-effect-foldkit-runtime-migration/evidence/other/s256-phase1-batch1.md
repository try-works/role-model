# S256 Phase 1, first batch: click budget 27 -> 22, verified by the Lead

Delegated to a UI-test agent, then re-verified by me (clean worktree, src diff empty, isolated + full runs).

| Commit | Change |
|---|---|
| `67054e29` | `s254` pins the per-tab request shape at `studioRequestFor` |
| `8b1cccb7` | four Studio inventory rows repointed at the new proof (fixes the red I caused) |
| `52e3a6e8` | `s255` renders Studio tabs through scene; `s46a` keeps client wiring; 27 -> 24 |
| `a02b8c11` | `s256`/`s257` take runtime-config rendering + invalid-save; 24 -> 22 |

## Verified state

    worktree clean · src/**: untouched · isolation: s67a 4/4
    full run: exit 0 · 39 files · 317 tests · 20/20 invariants · tsc clean
    click budget: 22, every entry equal to the measured comment-stripped count

## What "replaced" means here

- Tab clicks (5) -> `s254` asserts method, path, per-tab distinct path and the advanced JSON body directly
  against the function that builds the request.
- Studio rendering (tab labels, selected state, idle RAW text, field sets, ArrowRight) -> `s255`, 7 scene tests
  through the real view.
- Runtime-config rendering (not-loaded, invalid, confirming, saved) -> `s256`; the invalid-JSON rule -> `s257`
  as two update tests with a differential control (invalid -> 0 commands; valid changed -> exactly 1).
- Kept as wiring with reasons: `s46a` typed-body/404/chat success, `s76a` stale-confirm guard (the read->compare
  lives in `defineSaveRuntimeConfig`, no command-level harness exists), PUT body, 409.

## Corrections to my own record

1. The s46a budget of 6 was **over-provisioned by 2** (my arithmetic at S252/S253); the measured count was 4, so
   the total was 25 before this batch, not 27. The budget now equals measurement.
2. The `S256` failure I reported to the agent as "the notice is not painted" was an **ambiguous `role("status")`
   hit** on an earlier runtime-readback card - the notice was painted. Fixed by scoping to
   `[data-runtime-config-notice]` **and** asserting `role="status"` on it: stronger, not weakened.

## Known flake

`S67a learning surfaces` failed once in my first full run (5.2 s) and passed 4/4 in isolation and on an immediate
full re-run. Second sighting this session (also round 226). Load-sensitive under parallel vitest; it deserves its
own fix rather than a footnote.

## Not yet accepted

The four commits were authored by the agent that ran them. An independent review (different agent, read-only) was
dispatched to check coverage loss, assertion weakening, budget honesty, inventory correctness and the test-only
claim. Nothing here is recorded as accepted until that review returns.