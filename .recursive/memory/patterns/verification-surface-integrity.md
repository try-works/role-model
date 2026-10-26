# Verification Surface Integrity

Type: `pattern`
Status: `CURRENT`
Scope: `Gates, audits, and tests that can appear to pass while measuring nothing - and the checks that keep them honest.`
Owns-Paths:
- `/scripts/runtime/verify-packaged-candidate.mjs`
- `/scripts/runtime/audit-rendered-ui.mjs`
- `/scripts/runtime/verify-client-journeys.mjs`
- `/scripts/r39-workflow-flags.test.mjs`
- `/package.json`
- `/role-model-router/apps/runtime-ui-next/package.json`
Watch-Paths:
- `/.github/workflows/build-binaries.yml`
- `/role-model-router/apps/runtime-ui-next/**`
- `/.recursive/STATE.md`
Source-Runs:
- `115-effect-foldkit-runtime-migration`
Last-Validated: `2026-10-27`
Tags: `verification`, `gates`, `ui-audit`, `ci`, `packaging`

## The rule

A check earns trust only after it has been shown to FAIL for the right reason. A green run is not
evidence; it is the absence of a red run.

## Failures this pattern exists to prevent

| Shape | What happened | Guard |
|---|---|---|
| gate pointed at the wrong bytes | `--static-root` was the worktree build while the package shipped an older UI for several rounds | the gate refuses a static root that is not byte-identical to `<package>/build/client` |
| test outside the CI list | 17 UI invariants lived in `*.test.mjs` while the app ran `vitest run` with `include: test/**/*.test.ts` | the app `test` script runs both runners; new script tests are added to `test:release-workflows` |
| utility that paints nothing | `focus-visible:ring-2` set `--tw-ring-shadow`; nothing composed it, so the focus ring was never visible while the class and rule both existed | audit requires an outline or a >=50%-opaque shadow; `s205` forbids ring utilities in the port |
| check that accepts anything | the focus check passed on a transparent box-shadow | the check now reads the shadow colour alpha, not its presence |
| stale ledger | a requirement row claimed more than the audit proved | ledger rows are re-read against evidence each time the evidence changes |
| flag drift in CI-only steps | workflow flags are unvalidated because the steps never run locally | `scripts/r39-workflow-flags.test.mjs` asserts every `--flag` the workflow passes exists in the script |

## Practices that produced those guards

- Prove falsifiability with the smallest deliberate break: append a byte, override one CSS variable, revert one class.
- Prefer measuring in the page (`getComputedStyle`, `element.matches`, `getBoundingClientRect`) over asserting class strings.
- When a guard does not fire, establish whether it RAN before concluding it is broken: identical symptoms, different causes.
- Separate "the guard is wrong" from "the expectation is wrong" - a byte-identical package makes a correct identity guard pass.
- Never update an assertion to match broken behaviour. Establish whether the failure predates the change (`git stash`) first.

## Known open edges

- shadow-DOM controls are not scanned; contrast over images/gradients is counted, not judged.
- Two `s26k-control` render/click tests fail at HEAD (pre-existing); recorded, not silenced.