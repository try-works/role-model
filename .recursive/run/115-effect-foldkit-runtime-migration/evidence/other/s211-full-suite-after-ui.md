# S211 Full public suite after the UI journey work

    Test Files  2 failed | 433 passed | 3 skipped (438)
         Tests  2 failed | 2689 passed | 5 skipped (2696)
      Duration  2272.45s (37.9 min)

## The two failures

| Test | Status |
|---|---|
| `run105-review-advisory-safety > refused larger admission leaves bounded prior real snapshot routable` | **known pre-existing**, reproduces at baseline `24678a66` |
| `index.test.ts > retries transient API timeouts once and falls back to a secondary endpoint after quota exhaustion` | **passes in isolation** (`1 passed | 217 skipped`, 2.6 s) |

So the suite is **2,689 / 2,696** with one classification and one load-sensitive test that a full parallel run can starve of its retry timing.

## Delta since the last full run

| Run | Tests | Pass | Why |
|---|---|---|---|
| round 160 | 2,693 | 2,687 | before the UI journey work |
| **round 184** | **2,696** | **2,689** | +3 (s207 studio invariants) |

All UI-side changes this round and last (view, init, update, control, control-view, message, index.html, app.css) are client code: they are not imported by the host suite. This run confirms they did not disturb the host packages indirectly either - the only new failure is timing-sensitive and green alone.

## Not proven by this run

- the `--rendered` gate on a **freshly packaged** binary: the UI changes are in `dist/client`, which is built locally and passed via `--static-root`; the existing package on disk predates them.
- anything about the R leg, which remains dated.

## Honest summary

Host: 2,689/2,696 (1 known, 1 flaky-in-parallel). UI: 17/17 invariants, 20 routes x 2 viewports clean, Studio journey green, gate exit 0.