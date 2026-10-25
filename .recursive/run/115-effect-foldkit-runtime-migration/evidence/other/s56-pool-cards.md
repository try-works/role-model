# S56 model pool + token cards: claims verified, layout wrong

## The honest omission checks out

The worker dropped the quality and speed axes because the host candidate body carries no such score. I verified that independently against the live endpoint:

- `difficultyProfiles` = `{easy:null, medium:null, hard:null}` for all three candidates
- `recentSamples` = empty
- no field matching `score|quality|speed|latency|rank`

So the cost-only strip is the truthful rendering. The card says so in its description.

## What is wrong (measured on the running build)

| Card | Height | SVG | viewBox |
|---|---|---|---|
| Model pool | 236 | 150 | none |
| Token usage over time | **490** | **380** | `0 0 640 220` |
| Latency (ms) | **490** | **380** | `0 0 640 220` |
| Success vs failure | **490** | **380** | `0 0 640 220` |

A `640x220` viewBox rendered into `1105x380` is a non-uniform scale, so axis text distorts and the token chart shows guide lines rather than a plotted series. Card heights disagree with the reference grid.

Fix dispatched: aspect-correct charts with a fixed plot height, unified card heights, and a token chart that actually plots its series.
