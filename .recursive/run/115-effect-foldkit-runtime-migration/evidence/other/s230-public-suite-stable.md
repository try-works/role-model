# S230 Public suite re-run after installation: identical result, same two failures

After installing the public tree (S225/S226), the full host suite was re-run with the CI export
condition:

    NODE_OPTIONS=--conditions=runtime
    Test Files  2 failed | 433 passed | 3 skipped (438)
         Tests  2 failed | 2689 passed | 5 skipped (2696)

Identical to the pre-install run at round 184 (2,689/2,696). Same two failures:

| Test | Status |
|---|---|
| `run105-review-advisory-safety > refused larger admission leaves bounded prior real snapshot routable` | known pre-existing, reproduces at baseline |
| `index.test.ts > retries transient API timeouts once and falls back ...` | passes in isolation (2.6s) |

## What this settles

- Installing the tree did **not** change the public suite: the two failures are not dependency artefacts.
- The export condition did **not** change it either: unlike the private suite (S229), the public suite is
  insensitive to `--conditions=runtime` because its tests import built packages, not `protocol-types`
  source.
- So the public number is stable across install state and conditions: 2,689/2,696, one classified and one
  load-sensitive failure.

## Contrast worth keeping

| Suite | Sensitive to install | Sensitive to conditions |
|---|---|---|
| public host | no | no |
| private track-b | **yes** (Python toolchain cluster) | **yes** (protocol-types resolution) |

That asymmetry is why the private suite needed three attempts before its failures meant anything.