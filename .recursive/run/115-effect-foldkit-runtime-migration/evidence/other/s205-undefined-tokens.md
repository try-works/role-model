# S205 Undefined tokens are silent; proved it, and closed it

S203 found a utility that emitted a variable and painted nothing. The static analogue is a **token that is referenced and never defined**: CSS treats it as invalid at computed-value time, so the declaration is dropped and the element inherits or renders transparent - no error, no warning.

## What I checked

The port references **13** `--rm-*` tokens. All 13 resolve on the live page (`getComputedStyle(document.documentElement)`), so the shell is currently clean. `--rm-info` was empty in my first probe, but that was a name I invented for the probe - not one the port uses.

## The invariant

`test/s205-token-definitions.test.mjs`:

| Test | Meaning |
|---|---|
| every `var(--rm-*)` in `view.ts` is defined in the shared theme CSS | catches a typo or a removed token before it ships |
| the port does not use `focus-visible:ring-*` | pins the S203 fix (ring utilities do not compose on these elements) |

**RED proof:** replacing `text-[var(--rm-fg)]` with `text-[var(--rm-not-a-token)]` fails the first test (`1/2`); restoring passes (`2/2`).

## Full UI invariant set

```
14/14 across s175, s177, s178, s181, s182, s199, s205
```

Each one now corresponds to a defect that actually shipped this run or to a defect class proven by override:

| Test | Defect |
|---|---|
| s175 | invisible accent fill (white on white) |
| s177 | control named by its own option text |
| s178 | light theme mapping |
| s181 | skip link in the attribute array (crash) |
| s182 | `w-full` + margin overflow |
| s199 | WCAG ratios computed, not names checked |
| s205 | undefined tokens; ring utilities that never paint |

## Still open from review #2

- shadow DOM controls;
- card expectation does not re-audit card content;
- field-naming check unproven as a failure mode;
- CI audits with the repo/package root rather than archive contents.