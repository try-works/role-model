Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `04 Tests and validation` (upstream-gap addendum amending `02-to-be-plan.md`)
Status: `LOCKED`
LockedAt: `2026-10-01T17:00:10Z`
LockHash: `7d88c9ffd2a836b51bf3f58c404f3f036cccfbbcb3428aff57abebb31d831601`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp4-tester-audit-findings.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: Amends the remaining work for `R8` and `R9` only. It does not narrow, replace or weaken either
requirement, and no other requirement is touched.
## TODO

- [x] State what in the plan was missing or wrong
- [x] Provide evidence for why the amendment is needed
- [x] Specify the amended steps for the remaining work
- [x] State the impact on traceability
- [x] Lock this addendum

# Addendum 01 to `02-to-be-plan.md` (raised by `04-test-summary.md`)

## What the plan assumed and what is true

`SP10` and the `R8` remainder were planned as "make the private evaluation handoff real, fix the branch-append
receipt gate, and prove a completed replay enqueues exactly one evaluation job". All three landed and are
verified in-suite (private `21dd180f`, `b3ac491a`, public `efab6bc3`). What the plan did not foresee is that
`R8`'s **live** criterion ("the stuck count drains under the run's live window") needs a prerequisite that this
run does not own: the advisory/replay spine only completes a replay when the channel has a **route package**.
On the run's own fresh state root the runtime logs
`live advisory observation skipped: route advisory observation requires decision and route package`, so the
eight replays produced by the live matrix defer with `replay_failed` and never finalize. The operator's stage
channel has such a package because three earlier runs produced it; a new state root does not.

`R9`'s plan also assumed the effort-comparability dimension could be consumed end-to-end once the private
exclusion existed. The public producer link (`cli.ts` → `track-b-runtime.ts` comparability key) turned out to
need the replay's resume entry threaded into the post-observation comparability builder, which is a larger
change than the phase-5 window allowed.

## Amended steps for the remaining work

1. `R8` live drain: record it as a **deferred** acceptance with this addendum as the approved path. The
   in-suite half stays verified. Closing it needs either a packaged route package on the run's channel
   (upstream of this run) or a monitored window on a channel that already has one; both are operator
   decisions, not implementation work.
2. `R9` producer plumbing: implement the resume-entry → comparability threading in a follow-up run, with the
   private exclusion already in place (`885eda30`) as its consumer contract.
3. No other requirement is amended. `R1`-`R7`, `R10`-`R12` and `R14`/`R15` remain as planned and are verified
   by `04-test-summary.md`.

## Evidence

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp4-tester-audit-findings.md`
- The live disposition samples under `E:\tmp\run104-phase5\t5-disposition-samples.log`
- The runtime error log `E:\tmp\run104-phase5\runtime-3459.err.log` (the advisory-skip line)

## Traceability

- `R8` -> `SP10` + the R8 remainder (verified in-suite) -> the live drain deferred to a channel that carries a
  route package
- `R9` -> `SP6` + the private exclusion `885eda30` (verified in-suite) -> the producer plumbing deferred to a
  follow-up run
- No other requirement's traceability changes.

## Coverage Gate

- [x] The amendment is grounded in live evidence (the advisory-skip line and the deferring dispositions)
- [x] It carries the two open requirements instead of narrowing either one
- [x] The in-suite halves stay verified and are cited

Coverage: PASS

## Approval Gate

- [x] The operator's standing instruction is that every phase is mandatory and every requirement must be
  accounted for; this addendum accounts for both open requirements with evidence rather than closing them
  silently

Approval: PASS

