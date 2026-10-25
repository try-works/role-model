# S112 Stylesheet accessibility affordances audited and pinned

## What the shipped stylesheet contains (57,636 bytes)

| Feature | Count |
|---|---|
| `:focus-visible` rules | **14** (`focus-visible:border-ring`, `focus-visible:ring-*` with the design-token ring colours) |
| `@media (prefers-reduced-motion: reduce)` blocks | **1** - disables `.rm3-status-pop` and `.rm3-metric-pulse` |
| transitions | 35 |
| animations | 3 |

## Focus is actually visible

I focused real controls in the browser and read their computed style:

- the **Save controller** button: `document.activeElement === button`, `outline-style: auto` (the UA focus ring) and no `outline: none` anywhere in the current stylesheet;
- the **theme toggle**: same.  

A direct string scan of the current `dist` stylesheet found **zero** `outline:none` rules, so nothing suppresses the ring. (My first count came from a PowerShell regex and said 10; the direct scan of the same file is the one I trust, and it is the one recorded.)

## Pinned in the build guard

`test/s48a-build.test.ts` now also asserts the generated stylesheet contains `focus-visible` and `prefers-reduced-motion`. Regenerating the CSS without them would strip keyboard focus indication and motion handling, and **no component test would notice** - exactly the class of regression this guard exists for.

## Honest limit

The reduced-motion block covers the two design-system animations, not the 35 transitions. That is defensible (most are colour/opacity), but it is not a blanket guarantee - I did not verify any transform-based transition under `prefers-reduced-motion`, and the browser tools here cannot emulate the media feature to check.

## Client suite

**290 / 290 across 28 files**, `tsc` **0**.