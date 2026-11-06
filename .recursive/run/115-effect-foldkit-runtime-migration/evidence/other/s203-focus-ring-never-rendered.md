# S203 A real defect behind the focus check: the ring never rendered

Review #2 said the focus audit "accepts any static box-shadow". Tightening it produced:

```
FAIL / - A [1px none | rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0] Overview; …
```

`el.matches(":focus-visible")` was **true**, the CSS rules existed in the bundle, and the computed box-shadow was **two fully transparent placeholders**. So the old check passed on a transparent shadow, and the ring it claimed to verify had never been visible.

## Why the ring did not compose

`focus-visible:ring-2` sets `--tw-ring-shadow`, and Tailwind only paints it where a `box-shadow` declaration composes the ring variables. On these links the composition never happened: the utility emitted the variable, nothing painted it. The pinned CSS rule was present, the class was present, and the visual result was nothing - the same category as the invisible Run button in S175.

## Fix

Replace the ring utilities with an explicit outline that needs no composition:

```
focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-[var(--rm-accent)]
```

```
PASS /       {"focus":true}
PASS /studio
{"routes":2,"failures":0}   exit=0
```

The old ring at 8% alpha would have been invisible even if it had composed; the outline uses the accent (white on dark, near-black on light) at 2px with a 2px offset.

## Falsifiability, again with the CSS override

```css
:focus-visible { outline: none !important; box-shadow: none !important; }
```

```
FAIL / - A [3px none | none] Overview; A [3px none | none] Diagnostics; …
exit=1
```

Restored: passes. So the strict check now fails on a page without indicators and passes only when they are painted.

## Honest note about my S184 claim

I wrote that the focus check "was proven falsifiable" because a CSS override turned it red. It did turn red - for the wrong reason: the check accepted transparent shadows, so my "green" was vacuous and my "red" was the only true reading. **A falsifiability demo does not validate what the check measures**; tightening the predicate did.

## All UI invariants after the change

`11/11` across s175, s177, s178, s181, s182, s199.