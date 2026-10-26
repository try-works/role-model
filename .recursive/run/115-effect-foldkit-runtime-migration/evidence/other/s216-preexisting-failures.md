# S216 Two failures I nearly attributed to my own change - they predate it

Running the UI's vitest suite for the first time this session surfaced **5 failures**. I assumed they
were caused by my control-surface changes and started editing tests. Two of them fail at HEAD.

## The measurement

    git stash push -u         # remove every uncommitted change
    vitest run test/s26k-control.test.ts
      Tests  3 failed | 5 passed (8)
      x dispatches one action and refuses a second dispatch while pending
      x renders the exact action failure phrase
      x sends the real method, path and body through createControlClients

At HEAD the same two behavioural tests fail. Only the third was caused by my change (it pinned the
hardcoded `moonshot` bodies), and that one I updated deliberately.

    after my changes:  Tests  2 failed | 287 passed (289)

## What changed, and what did not

| Failure | Cause | Disposition |
|---|---|---|
| `sends the real method, path and body` | my S209 change removed the sample bodies | expectation updated to the new contract |
| `dispatches one action... while pending` | **pre-existing** | left failing, recorded |
| `renders the exact action failure phrase` | **pre-existing** | left failing, recorded |

The two pre-existing failures look environmental: the first reports `dispatches` 0 after two clicks on
a button that is present and not disabled; the second times out waiting for the error phrase. Both
render-mount tests, both click-driven. **I did not force them green** - changing an assertion to match
broken behaviour is how a suite stops meaning anything.

## Also in this round

- the app's `test` script was `vitest run`, which has `include: ["test/**/*.test.ts"]` - so the **17
  `.mjs` UI invariants were never executed by CI**. Now: `vitest run && node --test test/*.test.mjs`.
- `scripts/r39-workflow-flags.test.mjs` added to `test:release-workflows` (67/67 there now), because a
  test outside the CI list is decoration.
- control-view keeps ONE button form (the conditional-duplicate version is gone); the controller action
  targets the **selected** endpoint rather than a row id.

## Verified after the rebuild

    invariants          17/17
    ui vitest           287/289 (2 pre-existing)
    release-workflows   67/67
    packaged gate       PASS studio run -> raw:success
                        {"routes":20,"failures":0,"focus":true}   exit=0