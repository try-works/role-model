# Round 100 milestone: where this run actually stands

Goal `goal-2c0895f6…` revision 7, cap **1000** rounds, round 100, phase active.

## Requirement ledger

| Disposition | Count | Requirements |
|---|---|---|
| **verified** | **5** | R4, R6, R19, R25, R26 |
| implemented | 2 | R22, R33 |
| blocked | 32 | the rest, each with a named precondition |

## Verified this run, with reproducible evidence

- **Packaged artifact** `0.0.20-81-g17cbdd21`: exe sha256 `4898f865…f044c7` recomputed by me; client bundle 2,660,667 B inside the package.
- **Cross-origin write vulnerability closed** - foreign `Origin` -> 403 `cross_origin_write_rejected`, no ACAO, no state change; same-origin and no-Origin still 200; GET keeps ACAO `*`. Proven on the packaged bytes.
- **Acquisition ownership** - every host resource registered in one scope, both release paths through `releaseHostResources`, index 218/218.
- **Host suite** 2,620/2,626 with one classified pre-existing failure (reproduces at baseline `24678a66`).
- **Client** 289/289 across 28 files, `tsc` 0 - plus three property gates that green component suites miss: nav resolution (25), per-route accessible names (7 routes; found and fixed an unnamed controller select), focus-visible + reduced-motion pinned in the build guard.
- **D<->C byte-parity** on the compared surfaces; **R/D/C** triple with zero migration regressions; **R staged** byte-identical (159 files) and run isolated on 5913.
- **R17 J3 PASS** (abort at 500 ms, `AbortError`, counter +1); **J4/J6 honesty PASS**.
- **R39 tooling**: fail-closed verifier and comparator, hardened against every hazard the reviewer listed (fixture/static forwarding, free port, dirty state, manifest pin, forced kill, fail-closed comparison), 11 fail-closed tests, one-command packaged-candidate gate, wired into CI as **two advisory steps** gated by `vars.R39_VERIFY_BLOCKING`. Repo workflow tests 11/11 and 16/16 still pass.
- **R27 behaviours** - graph identity, metadata cache identity/TTL/cap/invalidation, early readiness, partial shutdown, per-run throttle, benchmark gate: all modelled, all TDD, 32 tests, `tsc` 0, plus a static guard on the CLI ownership contract.

## Blocked, and why each stays blocked

| Item | Precondition |
|---|---|
| **R39** | one dispatch run validating the advisory steps + the toggle flip |
| **R27** | rewiring `cli.ts` onto the DAG - a project (acquireHost + fail-at-each-step integration test), not a slice |
| **R16** | owner decision on config seeding |
| **R15** | a live provider; fixture-root mode serves adapter fixtures, so live HTTP cannot be simulated |
| **J4 effort honoring** | Codex subscription auth or catalog effort levels (catalog has no `reasoningEfforts`) |
| **J6 execution** | a private replay-core authoritative trace root; no creation route exists |
| **Model pool** | no `operationalProfile`/`latestProfile`/benchmark data even on R |
| **Packaging lockfile** | a network install |

## Corrections I made to my own work this run

- Nulled resource holders **before** `close()`, making every release a no-op - caught by reading, now guarded by `s120`.
- Committed before typechecking twice; one commit carried a `tsc` error and was amended.
- Claimed a Studio "live 200" that was actually **fixture-adapter-backed**; corrected in the evidence with the check (mock log had no requests) that should have been part of the verification.

## The honest headline

**5 of 39 requirements verified.** One real security defect found and fixed, a large amount of capability modelled and tested, and every remaining blocker attributed to a specific precondition rather than described as nearly finished.