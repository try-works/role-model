# S199 Review #2: four real defects, fixed; and the ones I am still living with

The second independent review (s198) was harsher than the first and correct on the points that matter. This round fixed the ones that let the evidence lie.

## Fixed

| Finding | Fix |
|---|---|
| workflow converted audit `exit 2` to `exit 0` **even when blocking** | when `R39_VERIFY_BLOCKING=true`, a skip now throws: `R39 rendered UI audit did NOT RUN while R39_VERIFY_BLOCKING=true` |
| port 5942 used by both compare-release and the audit | compare moved to 5930/5931, audit to 5950, worker stays 5944 - no step shares a port |
| every step served the repo `dist/client` instead of the package | the audit now uses `$packageDir/build/client` when present (the package ships it) |
| audit could pass a shell-only page | requires `readyState === "complete"`, `location.pathname === route`, and a rendered `[data-route]` section |
| audit could pass with zero focus stops | `--focus` now fails unless at least 3 stops were observed |
| skip link was computed but never asserted | `/` fails when no skip-to-content link exists |
| s178 only checked a **variable name** | new `s199-contrast-ratio.test.mjs` resolves the token to hex and computes WCAG contrast: #666 on #fff = **5.74:1** passes, and the test also asserts the old ring colour (#888 = 3.54:1) would **fail** |
| s177 accepted an empty label | no `AriaLabel("")` allowed |

`s199` is falsifiable: redefining the muted token to `#999999` makes it fail, restoring it passes (verified).

## Two false positives I created and removed

1. **`hiddenControls`**: my new check flagged sidebar links as hidden, because responsive adaptation legitimately hides/reflows them. Same trap as the sr-only skip link in S194 - judging intentional adaptation as a defect.
2. **`readyState interactive`**: the fixed 1.2 s settle is not a load indicator; the audit now polls until `complete` (8 s budget).

## Still open, and I am not going to pretend otherwise

| Review caveat | Status |
|---|---|
| controls hidden by opacity/transparent bg, inputs, shadow DOM | not covered; the invisible-control check is colour equality only |
| contrast skips oklch/gradients/images/opacity/buttons | not covered |
| `--expect-overview-cards` counts hidden or empty cards | partially - cards are counted by selector only |
| chat check passes on empty content / `total_tokens: 0` | not covered; no finish_reason or provider identity |
| worker run never sends a deepseek request; `adapter-captures.json` has no deepseek entry, so such a request could fall through to live execution | **not covered, and this one is a safety caveat, not cosmetics** |
| focus ring uses `--rm-accent-subtle` at 8% ink; audit accepts any box-shadow | not covered |
| light theme still ships dark `<meta theme-color #0a0a0a>` | not fixed |
| CI audits 1440x900 only | not covered |

## The honest summary of the evidence apparatus now

It is better and it is still incomplete. The workflow no longer lies about a skip, the audit no longer passes a blank page, and one vacuous invariant became a real WCAG computation - but five classes of defect it claims to catch, it partially catches. Recording that is the point; the next round continues from this list rather than from a claim of completeness.