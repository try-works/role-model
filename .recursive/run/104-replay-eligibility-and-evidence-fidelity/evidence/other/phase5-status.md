# Run 104 Phase 5 — rebuilt-runtime status

Recorded 2026-10-02 (local) by the controller. This file is the resumable state for Phase 5; it is not a
substitute for `05-manual-qa.md`.

## `T5.1` Rebuild the packaged runtime — DONE

Two steps, both from a clean tree (the packaging gates refuse a dirty one):

1. Paired private distribution:
   `corepack pnpm run build:run00-runtime` in the private worktree with
   `ROLE_MODEL_PUBLIC_WORKTREE`, `ROLE_MODEL_REPO_ROOT` and `ROLE_MODEL_TAXONOMY_DATA_ROOT` pointing at the
   public run worktree →
   `{"status":"PASS","extensionCount":13,"sidecarSha256":"6b9b0a744f351866027e7059fde187bcab9fb1c0dab54b11fcdc5b4ff25305e7"}`.
   Log: `E:\tmp\run104-phase5\private-dist-build.log`.
2. SEA: `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=<private dist/run00-dev> corepack pnpm run runtime:package-sea`
   in the public worktree →
   `role-model-router/dist/release/win32-x64/role-model-dev.exe`,
   sha256 `fbd0b0a476e4f3d9fde84f55c7b405a1b963eb44ad62d1d8269797523c91a806`.
   Log: `E:\tmp\run104-phase5\public-sea-build.log`.

The Effect runtime is carried inside the SEA: the packaged `public-runtime-adapter.mjs` bundle includes
`packages/effect/dist/**` (the build log's `sideEffects` warnings come from that package) and the health
identity below reports the release digest that contains it.

## `T5.2` Start it on its own channel — DONE

- Command: `E:\tmp\run104-phase5\start-runtime-104.ps1` (kept for restart), which runs
  `role-model-dev.exe --port 3459 --repo-root <release> --runtime-state-root
  C:\Users\erikb\AppData\Local\role-model-runtime-104 --unified-runtime-config
  E:\tmp\run104-phase5\runtime-config.yaml --operator-auth-token run104-operator-token`.
- The operator's `:3457` (stage RC) and `:3458` (dev) were **not** touched.
- `--repo-root` is required: without it the packaged adapter exits looking for the shipped taxonomy and
  `/healthz` stays 503.
- Live identity from `GET :3459/healthz`:
  `status healthy`, `ready true`, `channel development`, `commit d938049d9e527f6789fff91d8183f919e9898a21`,
  `executable_sha256 fbd0b0a476e4f3d9fde84f55c7b405a1b963eb44ad62d1d8269797523c91a806`,
  `executionMode remote_only`.
- The runtime is left **running** so the operator can provision it.

## `T5.3`–`T5.6` — BLOCKED on endpoint provisioning

`/healthz`'s session bootstrap reports `no remote endpoints to probe` and `no routable endpoints in
inventory`: a fresh state root starts with an empty endpoint registry, so no request can be routed through
it and the pi matrix cannot run. The operator's own state roots carry their activated endpoints; the run's
state root does not, and activating endpoints is an operator-level action (which models, with which
credentials).

Two ways forward, both one step:

1. **Operator activates endpoints on `:3459`** (UI or registry API), then the matrix and the 30-minute window
   run against it unchanged; or
2. the controller points the Phase-5 runtime at a state root that already has endpoints, accepting that the
   run then shares that channel's traffic class with the operator's own load (the Phase-5 header must record
   which).

## Evidence already captured for Phase 5

- `E:\tmp\run104-phase5\private-dist-build.log`, `public-sea-build.log`, `runtime-3459.err.log`,
  `runtime-3459.out.log`.
- The Phase-4 private-suite run also proved the packaged launcher starts: the `resolveShippedRoot` scope bug
  (introduced by `SP10`'s launcher wiring, fixed in private `15c33cdf`) made it exit before serving.
