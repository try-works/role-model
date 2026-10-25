# S109 A zero-argument verifier for a packaged candidate (and the bug it found in itself)

`verify-client-journeys` needs five arguments. Requiring every caller to remember them is how arguments drift, so I added `scripts/runtime/verify-packaged-candidate.mjs` (`runtime:verify-packaged-candidate`):

- resolves the package dir (`role-model-router/dist/release/<target>` or `--package-dir`),
- reads `manifest.json`, takes the executable from **the manifest** (`executable`, else `<name>.exe`),
- allocates an ephemeral loopback port, uses a fresh temp state root, and delegates to the verifier.

## The bug it found on its first run

My first version selected "any `.exe` in the package". The package contains `role-model-dev-launcher.exe` and `role-model-dev.exe`; it picked the **launcher**, and the verifier's manifest pin refused it:

```
NOT RUN: executable sha256 e41b94e2... does not match manifest 4898f865... - refusing to verify the wrong binary
exit=2
```

The pin was right and the selection was wrong. Fixed: the executable now comes from the manifest, and a manifest naming an absent executable is a typed NOT RUN rather than a fallback guess.

## Verified

```
$ node scripts/runtime/verify-packaged-candidate.mjs --package-dir E:/rm-tmp/s97a/release/win32-x64 ...
version=healthy 0.0.20-81-g17cbdd21
sha256=4898f865...f044c7
port=64717 state=E:\rm-tmp\r39-candidate-state
PASS health / models (3) / telemetry (0) / controller / learning / replay jobs (0) / evaluation jobs (0) / ui shell (1960 bytes)
exit=0
```

`test/r39-scripts.test.ts` is now **11 / 11**: the two new cases pin a missing package directory and a manifest that names no present executable.

## Where this leaves R39

The tooling is now: a strict verifier, a symmetric comparator, and a one-command packaged-candidate gate - all fail-closed, all tested, all exercised against real artifacts. CI calls two of them advisory. What is still open is unchanged: a dispatch run to validate the steps, the stage-path discovery it performs, and the toggle.