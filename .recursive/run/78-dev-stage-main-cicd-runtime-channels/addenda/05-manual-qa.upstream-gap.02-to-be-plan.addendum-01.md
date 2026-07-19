Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `05 Manual QA upstream-gap addendum`
Status: `DRAFT`
Inputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/02-to-be-plan.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/05-manual-qa.md`
- GitHub Actions runs `29668088068` and `29668594990`
- User instruction approving stronger agent guidance and durable memory closeout
Outputs:
- `/AGENTS.md`
- `/package.json`
- `/scripts/ci-workflow.test.mjs`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This addendum records Phase 5 evidence that exposed CI fan-out instability and a repository-level agent-instruction gap after the locked implementation plan.

## Gap

The locked Phase 2 plan required stable required checks and a Codex recursive-mode bridge, but live promotion QA exposed two gaps:

1. The workspace-wide recursive test fan-out twice terminated `@try-works/pi-role-model` without a failing assertion while its resource-heavy rebuilt-runtime proof was running. The identical package passed all 95 tests in isolation and passed on rerun, so repeated blind reruns would leave a flaky required check.
2. `/.codex/AGENTS.md` instructed recursive-mode sessions, but the repository had no root `/AGENTS.md` with unconditional branch, promotion, runtime-channel, and naming rules for ordinary agent work.

## Evidence and compensation

- Run `29668088068`, job `88142085912`, and run `29668594990`, job `88143425962`, both ended with `packages/pi-role-model test: Failed` and no failed Vitest assertion.
- The isolated command `corepack pnpm --filter @try-works/pi-role-model test` passed 15 files and 95 tests, including the 15-second rebuilt-runtime alias proof.
- `/package.json` now excludes `@try-works/pi-role-model` from the concurrent recursive fan-out and runs it once afterward.
- `/scripts/ci-workflow.test.mjs` contains the RED/GREEN contract for that sequencing.
- `/AGENTS.md` makes the delivery workflow visible without requiring recursive-mode discovery.

## Implications

The promotion PR must wait for this compensation to merge into `dev`, then rerun from the updated `dev` head. Phase 5 must record the resulting green promotion and post-merge stage candidate before it can lock. Phase 8 must refresh the two GitHub workflow memory patterns and the memory router.

## TODO

- [x] Record both assertion-free CI failures.
- [x] Add a failing sequencing contract.
- [x] Isolate and verify the Pi package test.
- [x] Add root agent instructions.
- [ ] Merge the compensation through a reviewed pull request into `dev`.
- [ ] Re-run and complete the promotion QA.

## Traceability

- `R1`: root agent guidance reinforces ordinary work targeting `dev`.
- `R2`: the compensation preserves stable protected checks and promotion enforcement.
- `R3`: the required `build-test` lane becomes deterministic under bounded sequencing.
- `R4`: root guidance preserves the approved main-only docs exception.
- `R5`-`R9`: unchanged; later Phase 5 evidence must verify their already implemented behavior and migration state.

## Coverage Gate

Coverage: FAIL — promotion and final GitHub topology evidence remain incomplete.

## Approval Gate

Approval: FAIL — this addendum remains active until the compensation and promotions are verified.
