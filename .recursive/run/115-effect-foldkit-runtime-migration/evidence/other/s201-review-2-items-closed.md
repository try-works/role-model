# S201 Closing four review-#2 items, and a real phone-width overflow they exposed

## Fixed this round

| Review finding | Fix | Verified |
|---|---|---|
| `--rendered` skipped to exit 0 even when blocking | the gate now fails a skip when `--require-rendered` **or** `R39_VERIFY_BLOCKING=true` | local skip exit 0; blocking skip **exit 2** with `FAIL rendered: a rendered audit was required …` |
| light theme shipped dark `<meta theme-color #0a0a0a>` | the boot script sets `theme-color` from the theme | dark `#0a0a0a`, light `#ffffff` (read from the live page) |
| CI audited a single viewport | the workflow runs a second audit at **390x844** with `--focus --seed-chat` | both viewports 20/20 PASS locally |
| card expectation counted hidden or empty cards | counts only cards with non-zero width and non-empty text | still passes at both viewports |

## The phone-width run found a genuine layout defect

At 390 the populated Overview scrolled horizontally:

```
FAIL / - horizontal overflow at 390px:
   line.[object SVGAnimatedString], circle.[object SVGAnimatedString], TABLE.sr-only
```

The chart SVG was clipped visually but the **screen-reader data table** (`sr-only`) is absolutely positioned and its table layout still contributed to the document scroll width - `overflow: hidden` on a `<table>` does not contain table layout. It is now wrapped in a clipping `div`.

Both viewports after the fix:

```
1440x900  {"routes":20,"failures":0,"focus":true}   exit 0
 390x844  {"routes":20,"failures":0,"focus":true}   exit 0
```

## What the phone run also showed, and I have not fixed

A run at 390 reported `audited / instead of /dashboard` and `no [data-route] section rendered` on several routes, and a skip-link focus size of 1x1 on others. Those did not reproduce in the follow-up runs, so they are either a navigation race in the audit (sequential `Page.navigate` with a fixed settle) or a real narrow-width routing problem. **I am recording them as unexplained rather than fixed**, because "it did not reproduce" is not a diagnosis.

## Remaining from review #2

- controls hidden by opacity/transparent backgrounds, inputs, shadow DOM;
- contrast for oklch/gradients/images/opacity/buttons;
- focus ring uses `--rm-accent-subtle` at 8% ink, and the audit accepts any box-shadow;
- the route-identity anomaly above;
- `s175` still only checks class strings (a token redefinition passes).