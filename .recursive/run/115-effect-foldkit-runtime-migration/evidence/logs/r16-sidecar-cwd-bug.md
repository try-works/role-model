# Product bug: host-spawned Track B sidecar resolves public taxonomy from process cwd

Discovered during task-85 (R16 seeding), 2026-11-01. This is a launch-context footgun, not an R16 root-construction defect.

## Symptom

Both preserved and rebuilt hosts reached HTTP health but stayed 503:

`sessionBootstrap.backend = failed: Track B sidecar exited before readiness (1): ...`

The sidecar stderr (truncated into the health message) showed taxonomy lookup failures for paths derived from the host's working directory, e.g.:

- C:\Program Files\nodejs\role-model-router\packages\core\data\taxonomy\manifest.json
- D:\DEV\data\taxonomy\manifest.json
- D:\packages\core\data\taxonomy\manifest.json
- D:\role-model-router\packages\core\data\taxonomy\manifest.json

It did not try the repository root or the manifest distribution root.

## Trigger

Launching the host from any cwd where `role-model-router/packages/core/data/taxonomy` is not an ancestor-relative path. In task-85 the launchers started from `D:/DEV`, so both binaries failed identically.

Launching with `-WorkingDirectory D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration` made both healthy with no other change.

## Impact

- A packaged/hosted runtime can be healthy in one launch directory and 503 in another.
- The failure is indistinguishable at first from a state/credential/manifest mismatch, and the sidecar stderr is truncated, hiding the first error line.
- Any service manager, shortcut, or test harness that does not set cwd to the source checkout can trip it.

## Suggested fix for a later run

1. Resolve the public taxonomy from an explicit root:
   - host passes `--repo-root` / `--public-router-root` to the sidecar, or
   - sidecar resolves taxonomy from the Track B manifest's `publicSourceTree` / distribution root, not `process.cwd()`.
2. Fail with a short, actionable error naming the missing taxonomy root and the tried paths (cap the host's health-message tail so the first line survives).
3. Add a regression test that launches the host from a temp cwd and asserts the sidecar becomes ready.
4. Optionally default/validate `process.cwd()` against the manifest root at startup.

No code change was made in task-85; the workaround is to launch with the repository root as cwd.
