# S76 Overview filters verified; and an a11y claim I checked before making

## Verified in the browser (temp-state host, one seeded FAILURE request)

- The Overview renders **four filter selects**: Breakdown (all/endpoint/model/provider), Source (all/local/remote), Status (all/success/failure/unknown), Difficulty (all/easy/medium/hard), plus a summary line.
- Setting **Status = success** updated the summary to `Source: all - Status: success - Difficulty: all - Breakdown: all` and the page then showed the **honest empty state** "No telemetry requests in the last day" - correct, because the only seeded request was a failure.
- One `h1`, four chart SVGs.

## Query mapping (from the host contract, `index.ts:11923`)

| Control | Parameter |
|---|---|
| Breakdown endpoint / model / provider | `endpointIds` / `modelIds` / `providerIds` |
| Source | `sourceTypes=local|remote` |
| Status | `statusFamilies=success|failure|unknown` |
| Difficulty | `difficultyBuckets=easy|medium|hard` |
| Window | `windowMs` |

## An a11y question I raised and then withdrew

My first programmatic attempt to set the status filter failed because the selects have no `aria-label`, `name` or `id`. Before recording that as an accessibility defect I checked the DOM: each select is **wrapped inside a `<label>`** ("BREAKDOWN", "SOURCE", "STATUS", "DIFFICULTY"), which is valid programmatic labelling. The accessible name ends up verbose (it includes the option text), but it is not missing.

So: not a defect, and my script was wrong. Worth improving with an explicit `aria-label` for a cleaner name, but that is polish, not a bug.

## Remaining R16 gaps

Router strategy editor, provider setup / connect actions, runtime-config editor, and the quality/cost/speed model pool (blocked on a host field that does not exist).
