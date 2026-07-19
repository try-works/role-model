Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Addendum: `24`
Phase: `02 TO-BE Plan`
Status: `LOCKED`

## Goal

Make local Windows runtime rebuilds visibly fresh and self-describing in `role-model-router/dist/release/win32-x64`.

## Implementation Plan

1. Update version resolution so an explicit `BUILD_DATE` is honored for git-derived builds.
2. Add a release packaging helper that recursively stamps copied and generated release files/directories to the package build date.
3. Invoke the stamping helper after manifest generation so Explorer, manifest metadata, and packaged artifacts agree.

## TDD Plan

- `runtime-version.test.ts`: prove explicit `BUILD_DATE` overrides git commit date for local git-derived builds.
- `executable.test.ts`: prove release-tree timestamp stamping updates nested files with old mtimes.

## Live Verification

- Run targeted runtime-host-bridge tests.
- Rebuild runtime UI.
- Rebuild Windows package with `package-sea`.
- Inspect `manifest.json`, top-level artifacts, and font asset mtimes in `dist/release/win32-x64`.

## Completion

- `resolveRuntimeVersionInfo` now honors explicit package `BUILD_DATE` before git commit date for git-derived local builds.
- `package-sea` now stamps the completed release tree after manifest generation.
- Release output verified at `role-model-router/dist/release/win32-x64`.
