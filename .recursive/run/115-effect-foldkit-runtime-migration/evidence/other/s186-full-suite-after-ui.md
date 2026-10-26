# S186 Full public host suite after the UI and script work

```
Test Files  1 failed | 434 passed | 3 skipped (438)
     Tests  1 failed | 2687 passed | 5 skipped (2693)
  Duration  1984.24s (33 min)
```

 FAIL  test/run105-review-advisory-safety.test.ts > refused larger admission leaves bounded prior real snapshot routable

The single failure is the **same classified pre-existing one** (`run105-review-advisory-safety > refused larger admission leaves bounded prior real snapshot routable`), which reproduces at baseline `24678a66` and is load-sensitive.

## Delta since the last full run

| Run | Tests | Pass | Why |
|---|---|---|---|
| round 142 | 2,683 | 2,677 | before the UI work |
| **round 160** | **2,693** | **2,687** | +10: three R39 script tests and seven UI/a11y invariants |

So the ten new tests are green inside the full suite, not only in isolation - which is the failure mode that would have hidden a cross-package break from the CSS change (`runtime-ui/app/app.css` is shared with the ported shell).

## What this closes

The S178 change touched a stylesheet used by both apps, and `runtime-ui` 97/97 plus `runtime-ui-next` 289/289 were run at the time. This full run is the confirmation that nothing else in the host package depended on the old muted colour or the removed inline palette.

## Still true after it

- the stage-only packaged-runtime branch remains unreachable without a Run 88 identity;
- R leg parity remains dated;
- the two UI scope questions (IA grouping, Overview visualisations) remain owner decisions.