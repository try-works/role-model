# S53 alignment verified; host suite classified

## Alignment (measured by me in the browser, packaged backend + rebuilt client)

| Element | x | width |
|---|---|---|
| `h1` (top bar) | 252 | 125 |
| `main` | **252** | **1138** |
| "No telemetry yet" card | **252** | **1138** |

- `h1.x` and `main.x` now match exactly (was h1 252 / main 688 with a 768-wide centred column).
- `OBSERVABILITY` eyebrow occurrences: **0** - one page title only.
- Fonts served (200 `font/woff2`, 45 KB) and `document.fonts.check("16px Geist")` true.

![Aligned overview](.recursive/run/115-effect-foldkit-runtime-migration/evidence/visual-final/aligned-1920.png)

## Host suite (my own background run, full 420 files)

**2,597 passed / 2 failed / 5 skipped.** The two failures are named, not hand-waved:

1. `test/executable.test.ts` - "declares target-scoped SEA config and standalone release inputs for Windows packaging": almost certainly the intentional `standaloneReleaseCopies` change (legacy app -> `runtime-ui-next/dist/client`). The test must be updated to the new intent, not bypassed.
2. `test/run105-review-advisory-safety.test.ts` - "refused larger admission leaves bounded prior real snapshot routable": `expected 'written' to be 'refused'`. Classification in progress (current tree alone vs pre-change baseline) before any fix.

## Still open

- Charts are aggregate cards, not the reference model-pool visualisation.
- Sidebar group labels differ from the reference.
- Studio success generation needs real model weights (llama-swap routing itself is proven).
