# S184 A fifth check: keyboard focus must be visible, and I proved the check can fail

The rendered audit now tabs through the first six stops of every route and requires an **outline or box-shadow** on whatever receives focus.

```
node scripts/runtime/audit-rendered-ui.mjs --url http://127.0.0.1:6201 --focus
```

Implemented over CDP (`Input.dispatchKeyEvent` Tab) so it exercises the real focus path rather than reading a stylesheet.

## Results

```
20 routes x 1440x900  focus   ->  0 failures
20 routes x  390x844  focus   ->  0 failures
```

## The part that matters: falsifiability

A check that has never failed is decoration - the S177 lesson. So I appended the following to the **served** CSS and re-ran:

```css
*:focus { outline: none !important; box-shadow: none !important }
```

```
FAIL / - A has no focus indicator: Skip to content; A has no focus indicator: Overview;
         A has no focus indicator: Diagnostics; ... (6 stops)
{"routes":2,"failures":2,"focus":true}   exit=1
```

Then restored the CSS: `{"routes":2,"failures":0}` exit 0. The check detects a real regression and stops detecting it when the regression is gone.

## Wired everywhere the other checks are

- `verify-packaged-candidate.mjs --rendered` now passes `--focus`;
- the advisory CI step passes `--focus`;
- gate run with the real browser: **20/20 routes PASS**, exit 0.

## My error adding it

My first attempt nested a template literal (the CDP `expression`) inside the template literal generating the file, and the generator threw before writing anything. I rebuilt it with `JSON.stringify(expression)` so the inner code is data, not source. Third self-inflicted codegen failure in this run, and the same root cause every time: **generating code with string literals instead of encoding it as data.**