# S131 Repackaged: S129 verified in a real SEA binary, S130 still unexercised (and why)

## Packaging had two blockers before it could even run

1. **`EBUSY` on `dist/release/win32-x64`** - a leftover verification host of mine (`role-model-dev.exe` pid 57460, port 5782, state `E:/rm-tmp/visual-state`) was still running from the visual work and holding the directory. Killed its tree; the operator (`:3456`, pid 44804) stayed up and healthy throughout.
2. **"public source tree does not match this package"** - the private distribution at `dist/run00-dev` was built against an older public tree. Rebuilt it with `ROLE_MODEL_PUBLIC_WORKTREE` pointed at this worktree. The private tree is dirty with worker WIP, so the build needed `ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1` - a **test** distribution, not a release artifact.

Then `runtime:package-sea` succeeded:

```
role-model-dev.exe  sha256 cfdcc1ae4cac6aa0062da496d15021b1f83f1ba99d01afc1774e3248082cdb35
```

## Packaged candidate gate (our R39 tool)

```
version=healthy 0.0.20-125-gccd934db
sha256=cfdcc1ae...
PASS health / models (3) / telemetry (0) / controller / learning / replay jobs (0) / evaluation jobs (0) / ui shell (1960 bytes)
exit=0
```

## What that verifies - and what it does not

**Verified:** S129 (the non-packaged `backend` scope slice) now runs inside a real SEA binary. The binary is built from this tree (`0.0.20-125-gccd934db`), so the scope-owned backend is what served those 8 surfaces.

**Not verified: S130 (packaged runtime scope).** Reading the gate explains why:

- `readPackagedRuntimeProfile(process.execPath)` does find the manifest next to the exe, so a packaged profile exists;
- but the packaged branch is gated by `if (packagedReleaseId)` (`cli.ts:12261`), and `packagedReleaseId = run88StageIdentity?.releaseId` - a **stage/production** identity;
- a development package therefore takes the `createBackend()` branch. The health payload confirms the shape: `executionMode=decision_only`, `sessionBootstrap` stages `vendors/local-reload/remote-health` all **skipped**.

So exercising S130 needs a **stage or production** package with a run88 stage identity, which only the release pipeline produces. I am not going to fake a stage identity to make a test go green; S130 stays flagged as unexercised until a real stage build runs.

## Honesty note

My previous round said the packaged branch was unexercised and that a repackage would close it. The repackage happened, and it **did not** close it - it closed the question for S129 instead. The correct statement now is: one of the three slices is verified in a shipped binary, one in source runs, and one only by type-checking.