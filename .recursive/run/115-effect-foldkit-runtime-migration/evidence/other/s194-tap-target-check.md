# S194 A sixth check, and the 20 false failures it produced before I fixed it

WCAG 2.5.8 asks for pointer targets of at least 24x24 CSS px. A control that exists, is focusable, and is a 12px sliver is the same class of defect as the invisible Run button: valid DOM, bad screen.

## The check

For every `button`, `a[href]`, `[role=button]` and `select`: **focus it, measure, blur**. Focused-state measurement matters, see below.

## First run: 20 of 20 routes failed

```
FAIL /session-readiness - controls under 24x24: Skip to content 1x1
FAIL /dashboard        - controls under 24x24: Skip to content 1x1
... 20 routes, all one control, all the same
{"routes":20,"failures":20}
```

The offender is my own skip link in its **visually hidden** state - `sr-only` makes it 1x1 until focused, which is exactly what it is supposed to do. The check was measuring a deliberately hidden element and calling it a defect.

**A check that fails on correct code is worse than no check**, because it teaches people to ignore the output. Fixed by measuring in the focused state: the skip link then reports 108x34 and everything else is unchanged.

## After the fix

```
20 routes x 1440x900 -> {"routes":20,"failures":0}  exit 0
```

## Falsifiability

Appended to the served CSS:

```css
button, a[href], select { padding: 0 !important; }
footer a, nav a { display: inline !important; height: 6px !important; line-height: 6px !important; }
```

```
FAIL / - controls under 24x24: Skip to content 84x18, Overview 55x17, Diagnostics 70x17,
         Observability 78x17
exit=1
```

Restored: `{"routes":1,"failures":0}`. The check detects the regression and stops detecting it when the regression is gone.

## The audit now covers six classes

| # | Class | First defect it would have caught |
|---|---|---|
| 1 | invisible control (colour == background) | S175 Studio "Run" |
| 2 | control name = its own option text | S177 filter selects |
| 3 | contrast below 4.5:1 | S178 light theme 1.12:1 |
| 4 | horizontal overflow | S182 shell `w-full` + margin |
| 5 | missing keyboard focus ring | none yet - proven falsifiable by CSS override |
| 6 | target smaller than 24x24 | none yet - proven falsifiable by CSS override |

Five of the six checks were written **after** the defect they represent, which is the honest order: a defect found by looking should end as a check.