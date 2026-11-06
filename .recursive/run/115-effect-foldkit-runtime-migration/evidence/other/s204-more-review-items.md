# S204 Two more review items turned into checks that can actually fail

## 1. The control-naming check now includes form fields

It previously scanned `button, a[href], [role=button], select` - the reviewer noted inputs were excluded. It now scans `input:not([type=hidden])` and `textarea` too.

```
20 routes x 1440x900 -> {"routes":20,"failures":0,"focus":true}
```

No unnamed fields: the Studio inputs are inside `<label>` elements, so their accessible name comes from the label text. **I have not proven this check can fail** - unlike the focus and contrast checks, there is no CSS trick that produces an unnamed field on this page. Recording that limitation rather than claiming falsifiability.

## 2. Contrast over images is now counted, not silently skipped

The audit previously walked past any text over a `background-image`/gradient because it cannot compute a background colour from a gradient. It now counts those elements and says so:

```
note: / has 3 text elements over an image/gradient; contrast NOT judged there
```

On the current shell the count is **0** (no gradients behind text), so the audit is complete for this UI - but the note exists for the day someone adds one.

## 3. The S175 defect class is now a WCAG computation, not a class string

`s175` asserts that accent fills use `text-[var(--rm-on-primary)]` - a string check that passes if the token itself is redefined to something invisible. `s199` now computes the **fill vs ink contrast** from the token file:

```
#ffffff vs #0a0a0a -> passes (>= 4.5:1)
```

`s199` is 3/3 and covers three defects that shipped this run: the light-theme muted token (S178), the invisible accent fill (S175), and - as a negative control - the ring colour that would fail (3.54:1).

## Still open from review #2

- shadow DOM controls are not scanned;
- `--expect-overview-cards` counts visible non-empty cards but does not re-audit their content;
- the field-naming check is unproven as a failure mode;
- CI still audits with the repo/package static root rather than the archive contents.