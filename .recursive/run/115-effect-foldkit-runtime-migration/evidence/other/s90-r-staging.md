# S90 R16 isolated-R staging: the released artifact preserved byte-for-byte and run in isolation

R16 asks to "preserve R by isolated copy/staging with unchanged artifact bytes". This slice does exactly that, without touching the operator install.

## Procedure and result

| Step | Result |
|---|---|
| Source install | `D:/role-model-router/0.0.20/role-model.exe` (the operator's released runtime, pid 44804) |
| Copy | recursive copy to `E:/rm-tmp/r-stage` - **159 files in, 159 files out** |
| Source exe sha256 | `718d71f51ea6cf4f4bcfddf82165695c52fbc6d59eaaa600a38f3c73df8e248a` |
| Staged exe sha256 | **identical** |
| Run the staged copy | ephemeral port 5913, `--runtime-state-root E:/rm-tmp/r-stage-state` (independent state) |
| `/healthz` on the staged copy | `version 0.0.20`, `release_version 0.0.20`, `commit 945a8906782a434e800a0ca2deb2e08ef1472e20`, `channel production` |
| Source exe sha **after** the run | **unchanged** (`718d71f5...`) |
| Operator runtime `:3456` | still **200** |

So R is preserved as an isolated copy with unchanged bytes, and the copy runs independently with its own state - the artifact identity and isolation clauses are satisfied.

## Housekeeping

27 stray `role-model-dev` instances from this session's verification servers were stopped (all under `E:/rm-tmp`). The operator runtime is untouched and healthy; the only remaining listener in the 5900-6000 range is the staged-R check on 5913.

## What this leaves for R16

With the R/D/C triple (s89, zero migration regressions) and this staging proof, R16's procedural clauses are met. The only residual is that **state-dependent surfaces** (R's telemetry and evaluation history) cannot be compared without seeding equivalent candidate state - which R16's own vocabulary classifies as environment/state rather than a regression.
