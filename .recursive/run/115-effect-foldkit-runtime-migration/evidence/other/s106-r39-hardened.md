# S106 R39 scripts hardened to the review's list (except CI wiring)

Every hazard the reviewer listed against `verify-client-journeys` is now closed, and each was probed by hand rather than assumed.

| Hazard | Fix | Probe |
|---|---|---|
| `--fixture-root` "optional" but effectively required | resolved from the input or `repoRoot/testdata/...`, and **missing -> NOT RUN exit 2** | `NOT RUN: fixture root does not exist (...) - pass --fixture-root`, exit 2 |
| `--static-root` validated but never forwarded | forwarded to the child | healthy run: `PASS ui shell: 1960 bytes` from the supplied root |
| No free-port check | refuses when the port is already bound, rather than measuring another process | implemented (`net` probe) |
| State root not required empty | refuses a non-empty root unless `--allow-dirty-state` | `NOT RUN: state root is not empty (...)`, exit 2 |
| 30 s health budget tight | default **90 s**, `R39_HEALTH_TIMEOUT_MS` override | healthy run completed well inside it |
| `child.kill()` with no wait/force | kill, wait up to 5 s for `exit`, then `taskkill /T /F` (win32) or `SIGKILL` | hardened path in the `finally` block |
| Printed sha256 never compared to the manifest | `--manifest` compares `executable_sha256` and refuses on mismatch | `NOT RUN: executable sha256 4898f865... does not match manifest deadbeef - refusing to verify the wrong binary`, exit 2 |

## Healthy run after hardening

```
version=healthy 0.0.20-81-g17cbdd21
sha256=4898f865...f044c7
port=5936 state=E:\rm-tmp\s106-b fixtures=D:\...\testdata\router-runtime\fixtures
PASS health / models (3) / telemetry (0) / controller / learning / replay jobs (0) / evaluation jobs (0) / ui shell (1960 bytes)
exit=0
```

## Tests

`test/r39-scripts.test.ts` grew 4 -> **9** and all pass: missing inputs, operator ports (both scripts), manifest mismatch, dirty state root, both-dead comparison, both-non-2xx, self-comparison.

One regression my own hardening introduced - resolving the fixture root from an undefined `repoRoot` threw instead of reporting NOT RUN - was caught by the pre-existing test and fixed by resolving lazily.

## R39 status

The scripts are implemented, fail closed on every listed hazard, pinned against a manifest, and exercised against the shipped artifact. **Blocked only on CI wiring**, which the review specifies as `build-binaries.yml -> build-runtime` (linux-x64 first), behind a repo variable until a dispatch run is green.