# S69 /learning verified: one title, measured overflow, states correct

Verified by the lead on a rebuilt client served from the packaged executable:

| Check | Result |
|---|---|
| `h1` count | **1** ("Learning", top bar) |
| `h2` order | Knowledge worker, Replay jobs, Evaluation jobs |
| Section states | `ok`, `empty`, `empty` |
| Viewport | 1920 CSS px, DPR 1.0 |

## The overflow question, settled with numbers

| Width | Row right | Value right (worst) | Overflowing rows |
|---|---|---|---|
| 1920 | 1390 | 1318.2 | 0 |
| 1280 | 1292 | 1220.2 | 0 |
| 1024 | 1036 | 964.2 | 0 |

The apparent clipping came from the **attachment preview being downscaled to 1708x961 (0.89x)**, not from the page. The cells were hardened anyway (`min-w-0 max-w-full break-words text-right` plus a `title` with the full text), so nothing can be cut silently even if a future value is longer.

Lesson recorded durably: measure DOM rects before declaring a visual overflow defect; previews are scaled.
