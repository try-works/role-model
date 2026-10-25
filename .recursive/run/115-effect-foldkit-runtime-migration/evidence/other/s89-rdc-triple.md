# S89 R/D/C triple completed: zero migration regressions

## D identity (verified by me)

| | |
|---|---|
| Commit | `9b0ca8bd` (dev tip) |
| Tree | `9af34e0c8b708a117ea3cb6042d7cfb196980f4c` |
| Version | `0.0.20-1-g9b0ca8bd` |
| Exe sha256 | `ef63075623944dd415d91fcf81338e79730445ed9a9d3732258fc3ecd0171991` - **I recomputed this from the artifact and it matches** |
| `validate-packaging` | exit 0 |

I also started D myself on an ephemeral port: `/healthz` 200, `/api/role-model/models` 200 JSON, `/api/role-model/version` **200 text/html** - i.e. D still carries R's SPA fallback, exactly as classified, which is the point of contrast with C.

## Three-column result

| Surface | R | D | C | Class |
|---|---|---|---|---|
| `/healthz` | 200 JSON | 200 JSON | 200 JSON | same |
| runtime/summary | 17 keys | 17 identical | 17 identical | same |
| models | 2 | 3 | 3 | environment/config |
| endpoints | 3 | 3 | 3 | same |
| router/summary | decision_only | decision_only | decision_only | same |
| telemetry/summary | 39 requests | 0 | 0 | environment/state |
| operator/learning | v1, candidates 253 | v1, 0 | v1, 0 | environment/state |
| operator/replay/jobs | `[]` | `[]` | `[]` | same |
| operator/evaluation/jobs | 256 | 0 | 0 | environment/state |
| `/api/role-model/version` | 200 HTML | 200 HTML | **404 JSON** | intentional (S38a) |
| UI `/` | legacy React | identical legacy React | Foldkit (`Overview | RM3 Foldkit shell`, 4 selects, 50 nav nodes) | intentional (client replacement) |

Counts: **same 5, environment/config 1, environment/state 3, intentional 2, migration regression 0, pre-existing 0, inconclusive 0.**

## Verdict

- **D preserves R's API contract**: every difference is config inventory or state history.
- **C preserves D's API contract** on all shared paths; the only deltas are the approved 404-instead-of-HTML strictness fix and the client replacement this run exists to make.
- **No unexplained behaviour** in the compared surfaces.

## One clause I must not overstate

R16 asks to "preserve R by isolated copy/staging with unchanged artifact bytes". We did **not** stage a copy of R: we measured the operator's installed runtime **in place, read-only** (GETs only, no writes, no state mutation), which is arguably stronger than staging but is not the letter of the clause. So R16 is verified for the **R/D/C comparison and classification** and **not** for the isolated-artifact-identity procedure.
