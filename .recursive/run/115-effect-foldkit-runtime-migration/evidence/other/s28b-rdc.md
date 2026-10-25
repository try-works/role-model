# S28b — R / D-prod / C / D-dev like-channel comparison

All four artifacts booted healthy on ephemeral loopback ports with separate E: temp state roots and the shared worktree fixtures. No operator port (3456/3457/3458) was bound. Temp roots removed. Raw captures: [`s28b-compare.json`](../logs/s28b-compare.json).

## Identities

| Artifact | Version | Commit | Channel / scope | Source tree | exe sha256 |
|---|---|---|---|---|---|
| **R** released `0.0.20` | 0.0.20 | `945a8906782a434e800a0ca2deb2e08ef1472e20` | production / `standalone-runtime` | `d29e2a3c45ba3617cb0db7bad9fcb6ea0e0bd7b8` | `718d71f51ea6cf4f4bcfddf82165695c52fbc6d59eaaa600a38f3c73df8e248a` |
| **D-prod** main baseline | 0.0.20 | `945a8906782a434e800a0ca2deb2e08ef1472e20` | production / `standalone-runtime` | `d29e2a3c45ba3617cb0db7bad9fcb6ea0e0bd7b8` | `20e7e894758a32152255e4562c1de480ef01bf2eaa258e00a2b055161a173b7c` |
| **C** candidate | 0.0.20-7-gfd2a5f55 | `fd2a5f5581b2427832df8c49fe35803fc0cae132` | development / `standalone-runtime-dev` | `d4095825ab0294d3b3fe7ab7d6f2954687c35508` | `468bdc503ca44b7f0db6eb9d4d15ea8edd789c8ceba0eae0b94ea85717a73c87` |
| **D-dev** main baseline | 0.0.20 | `945a8906782a434e800a0ca2deb2e08ef1472e20` | development / `standalone-runtime-dev` | `d29e2a3c45ba3617cb0db7bad9fcb6ea0e0bd7b8` | `20e7e894758a32152255e4562c1de480ef01bf2eaa258e00a2b055161a173b7c` |

## Pair 1 — R vs D-prod (release/source parity at production channel)

| Difference | R | D-prod | Classification | Justification |
|---|---|---|---|---|
| executable sha256 | `718d71f5…` | `20e7e894…` | **pre-existing R-to-D packaging difference** | Same version, commit, source tree and release_id; fresh rebuild is not byte-identical. |
| build_date | `2026-10-16T10:18:19Z` | `2026-10-25T02:14:33Z` | **absent/inconclusive/environmental** | Build timestamp, not runtime behavior. |
| private_distribution_sha256 | `8074d102…` | `938a1ff7…` | **pre-existing R-to-D packaging difference** | Paired from the same private main commit but rebuilt production-context Track-B distribution; runtime probes equal. |
| runtimeStateRoot / process pid+rss / session timestamps / reconciliation timestamps | separate E: run | separate E: run | **absent/inconclusive/environmental** | Per-run state and clocks. |
| health, `/`, diagnostics | healthy / 200 / 404 | healthy / 200 / 404 | **no difference** | Equal. |
| version / commit / source_tree / release_id / channel / scope | equal | equal | **no difference** | Equal. |
| summary counts, readiness/lifecycle, taxonomy, 13 extension ids, operator capabilities | equal | equal | **no difference** | Equal after normalizing volatile fields. |

**Regression:** none observed. **Inconclusive:** byte-for-byte reproducibility of R vs D-prod (same source, different sha) is not established.

## Pair 2 — C vs D-dev (migration isolation at development channel)

| Difference | C | D-dev | Classification | Justification |
|---|---|---|---|---|
| version / commit / source_tree / executable sha | `0.0.20-7-gfd2a5f55` / `fd2a5f55…` / `d4095825…` / `468bdc50…` | `0.0.20` / `945a8906…` / `d29e2a3c…` / `20e7e894…` | **approved intentional change** | C is the seven-commit migration candidate. |
| diagnostics endpoint | `200` local-diagnostics-read v1 (state disabled) | `404` `{error:operator route not found}` | **approved intentional change** | C ships the new diagnostics endpoint; D-dev predates it. **404 on D-dev is expected, not a regression.** |
| `/` client body | new client HTML (sha `4b885957…`) | baseline client HTML (sha `97ad199b…`) | **approved intentional change** | C ships the new client; both return 200. Visual/browser parity is not asserted. |
| private_distribution_sha256 | `bd0e083f…` | `dbb34971…` | **approved intentional change** | Candidate's private Track-B build. |
| build_date | `2026-10-25T02:22:41Z` | `2026-10-25T01:58:35Z` | **absent/inconclusive/environmental** | Build timestamp. |
| extension pid, runtimeStateRoot, timestamps, storage ids | C process/run | D-dev process/run | **absent/inconclusive/environmental** | Per-process/per-run values. |
| health/ready/executionMode | healthy/ready/decision_only | healthy/ready/decision_only | **no difference** | Equal. |
| counts, readiness/lifecycle, taxonomy, 13 extension ids, operator overall/capabilities | equal | equal | **no difference** | Equal. |

**Regression:** none observed in the compared HTTP surfaces. **Inconclusive:** browser/visual parity of the new client, and parity outside these endpoints, were not tested. No row was softened: the only behavioral change is the intentional diagnostics addition.

## Pair 3 — R vs C (end-to-end release-to-candidate, cross-channel context)

| Difference | R | C | Classification | Justification |
|---|---|---|---|---|
| channel / scope | production / `standalone-runtime` | development / `standalone-runtime-dev` | **approved intentional change** | Different channel contexts. |
| version / commit / source_tree / sha / build_date | R identity | C identity | **approved intentional change** | Seven migration commits and a fresh build. |
| diagnostics | 404 | 200 new endpoint | **approved intentional change** | New C capability. |
| `/` body | baseline client | new client | **approved intentional change** | New client in C. |
| extension channel/pid | production / R pid | development / C pid | **approved intentional change** + **environmental** | Channel projection and process identity. |
| counts, taxonomy, extension ids, operator capabilities, health | equal | equal | **no difference** | Equal. |

## Diagnostics/client note

C ships the new local diagnostics endpoint and the new client. D-dev (and R/D-prod) return 404 for diagnostics because the baseline predates that endpoint; this is expected. C's 200 response is the new `role-model.local-diagnostics-read.v1` surface with `state: "disabled"` on a clean temp root.

## Reproduce

```powershell
node .recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s28b-compare.mjs
```

Requires D-dev at `E:/rm-tmp/s28b/release-dev/win32-x64`. The script launches R, D-prod, C and D-dev, captures the endpoints, and rewrites `evidence/logs/s28b-compare.json`.
