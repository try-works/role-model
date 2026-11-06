# S89a R16 R/D/C: build D (dev tip) and produce the classified triple comparison (public+private)

Worktrees: public `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, private `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`.
R16 requires three separate identities: **R** = released `0.0.20` (already measured at `:3456`), **D** = `dev` tip, **C** = this branch.

## Facts already established

- `dev` tip = `9b0ca8bd` (the migration squash merge); this branch = dev + the subsequent fixes (origin gate, runtime-config editor, models, filters, single-title, release order).
- **R** at `:3456`: `0.0.20`, 2 models, 3 endpoints, telemetry 25 requests, 241 evaluation jobs, `/api/role-model/version` -> 200 HTML (SPA fallback).
- **C** (packaged `0.0.20-66-g91f089ec`): 3 models, 3 endpoints, 0 telemetry, 0 jobs, missing API paths -> 404 JSON.

## Required work

1. Create a D worktree at the `dev` tip (`9b0ca8bd`) - a NEW path, do not disturb this worktree or the operator installs. Record the exact commit/tree.
2. Build D's packaged candidate the same way as C (paired private distribution for D's tree, `package-sea`, `validate-packaging`). Record version/commit/tree/exe sha256.
3. Start D on an ephemeral port with a fresh temp state root; do NOT touch `:3456`/`:3457`/`:3458` or operator state.
4. Produce a THREE-column comparison on the same read-only surface set: `/healthz`, `runtime/summary`, `models`, `endpoints`, `router/summary`, `telemetry/summary`, `operator/learning`, `operator/replay/jobs`, `operator/evaluation/jobs`, `/api/role-model/version`, and the UI at `/` (title + control counts).
5. Classify every difference in R16 vocabulary: **pre-existing** (R vs D), **migration regression** (D vs C), **approved intentional change** (with the requirement/evidence), **environment/config/state**, or **inconclusive**.
6. Verdict: does D preserve R's contract? Does C preserve D's? Name anything unexplained.

## Constraints

No installs, no commits, no subagents, no operator state, no operator ports. Temp state on E: and removed after.

## Report
D's identity (commit/tree/exe sha), the three-column table, the classification counts, the verdict, and anything you could not compare with the reason.