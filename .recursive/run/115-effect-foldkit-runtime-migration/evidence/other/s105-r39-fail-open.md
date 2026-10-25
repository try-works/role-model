# S105 R39 scripts: the review found a fail-open comparison - fixed and pinned

The reviewer's most serious finding: **`compare-release` failed open**. Two dead or equally unauthorized sides produced identical undefined statuses, every row classified `same`, counts `{"same":9}` and **exit 0** - CI could go green comparing two artifacts that answered nothing.

## Fixes I made

| Defect | Fix |
|---|---|
| Unreachable / non-2xx sides classified `same` | classifier now emits **`not-run`** unless BOTH sides are 2xx, and the exit path prints `NOT RUN: N endpoint(s) were unreachable or did not answer 2xx; a comparison is not evidence` and exits **2** |
| Comparing a URL with itself produced a green run | `--left` and `--right` identical -> NOT RUN exit 2 |
| No fetch timeout | `AbortSignal.timeout`, default 10 s, overridable with `R39_FETCH_TIMEOUT_MS` |
| State dir defaulted to `E:/rm-tmp` (absent on CI runners) | defaults to `os.tmpdir()` |

## Probes (run by me)

```
$ compare-release --left http://127.0.0.1:5991 --right http://127.0.0.1:5992   # both dead
not-run /healthz (undefined/undefined) ... {"not-run":9}
NOT RUN: 9 endpoint(s) were unreachable or did not answer 2xx; a comparison is not evidence
exit=2

$ compare-release --left http://127.0.0.1:5940 --right http://127.0.0.1:5940   # same URL
NOT RUN: --left and --right are the same URL
exit=2
```

The healthy case still works: D vs C gave `{"same":8,"environment-state":1}` with exit 0 (s104).

## Tests

`test/r39-scripts.test.ts` extended from 4 to **7**: both-dead exit 2 with a NOT RUN line, both-non-2xx never exit 0, and self-comparison refused. All 7 pass.

## Still open on these scripts (from the same review, not yet fixed)

`verify-client-journeys`: `--fixture-root` is treated as optional but is effectively required; `--static-root` is validated but never forwarded to the child; no free-port check; state root is not required empty; the 30 s health budget is tight for 13 cold extensions; child kill has no exit wait or force; the printed sha256 is not compared to a manifest.

And R39's **CI wiring** remains unwritten: the review says wire into `build-binaries.yml` -> `build-runtime` (linux-x64 first) after `Verify channel manifest identity`, gate `verify-client-journeys` with a repo variable until a dispatch run is green, and put `compare-release` in the production channel after the pair check - failing on both 1 and 2. I will not add that blind while CI has never run on this branch.