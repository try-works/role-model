# S675 - new packaged build with all S671/S672/S673 fixes + the private plane

Date: 2026-11-07.

## Build
Private distribution first (owner-authorized private worktree):
`ROLE_MODEL_PUBLIC_WORKTREE=<public worktree> pnpm run build:run00-runtime` ->
`{"status":"PASS","extensionCount":13,"sidecarSha256":"73243d736ea06e804254a65d90e525c108ab82b8d4dc2c004749cecde12b504a"}`.

Public package with the private distribution:
`ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=<private>/dist/run00-dev pnpm run runtime:package-sea`
- exe: role-model-dev.exe, sha256 19f0371f7ee196a3d388a8b8ddddb3b14594468a2b5a7f6aeacebf32a0290737
- version 0.0.20-818-g9ff48b98 (HEAD 9ff48b98)
- track_b_runtime manifest e1d678a8f8c59c68754a411423c1c6824313febae98eb460b94ce248d27acb9b, 13 extensions
- launch (no --static-root; the exe embeds build/client and the Track-B distribution)

## Live verification on :3480 (new exe)
- healthz: 0.0.20-818-g9ff48b98, exe sha 19f0371f..., healthy.
- 5 remote-only aliases exposed; `baseline.remote-only` -> deepseek/deepseek-flash -> real "OK".
- Real-model inference and alias routing verified against the owner's state root.

## Packaged-candidate verification (scripts/runtime/verify-packaged-candidate.mjs)
All 12 journeys PASS on the new build:
health 0.0.20-818-g9ff48b98, models 3, telemetry, controller, learning, replay jobs, evaluation jobs,
ui css 68137 bytes, ui bundle 3744488 bytes, ui theme boot, chat completion total_tokens=56, ui shell 2194 bytes.
Exit 0.

This is the packaged new build carrying: the S664-S673 UI fixes, the host S671 fixes (gate/terminal/
activation/fence/ledger lock/capture claim/disposition), and the private Track-B P0/P1 fixes.
