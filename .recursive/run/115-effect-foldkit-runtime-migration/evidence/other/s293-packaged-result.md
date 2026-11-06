# S293 packaged candidate — lifecycle repair sealed, full gate PASS

## Identity (immutable snapshots)

- Public snapshot `E:/role-model-run115/package-s293-public` @ `35103383559630f9614594ca00a24e9d1cd3cc40` (tree `56105fc77567f63c2f4e0ed5753bd346db21a694`) — S290/S291 page-lifetime repair commit.
- Private snapshot `E:/role-model-run115/package-s293-private` @ `0c5216b69ea44126a67654bfe44655acb9d97eee` (tree `7c94f851d1d564d08553093cf8799eb419abf368`) — unchanged from S284.
- Both snapshots `git status --porcelain --untracked-files=all` empty before and after every step (`.cache/` and `dist/` gitignored).

## Build

- Offline `--frozen-lockfile --ignore-scripts` installs, shared store `E:/role-model-run115/pnpm-store/v10`, isolated virtual stores `E:/role-model-run115/s293-{public,private}-virtual`; 690/6 packages, 0 downloads; esbuild resolves on both sides.
- Maintained build-order gap handled the same way as S284: explicit `effect-platform-browser/foldkit/foldkit-ui/ui` wrapper builds (exit 0) before `runtime:package-sea`.
- Private `build:run00-runtime` with `NODE_OPTIONS=--conditions=runtime`, `ROLE_MODEL_PUBLIC_WORKTREE=<s293-public>`, no `ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD` — exit 0, 13 extensions, sidecar sha `5c09f4ef1d74140c90895359efa25d57bfbac4cbf83cf3677d11ac338b4b4685` (unchanged from S284).
- Manifest: `publicCommit=35103383…`, `publicSourceTree=56105fc7…`, `sourceSeal.status=sealed_clean`, `releaseEligible=true`, `privateClean=true`, `publicClean=true`; manifest sha256 `2F22F1455DFF6EC3FD3BF399E47658FBEB06A5E80CD009023851ADBAD2025E57`.

## Go module-cache incident (recorded, not hidden)

- `package-sea.ts` overrides `GOPATH`/`GOMODCACHE` to the snapshot-local `.cache/go`; the first SEA attempt failed downloading `github.com/gabriel-vasile/mimetype@v1.4.3` and `klauspost/compress@v1.18.5` from proxy.golang.org (wsarecv timeout via 198.18.0.42).
- Fix: seeded the s293 snapshot's `.cache/go` from the S284 snapshot's populated cache (identical go.mod; no dependency change in the a01230f0..35103383 diff). Identical SEA command then exited 0. No dirty-build switch, no manifest edit.

## Artifact

- `role-model-router/dist/release/win32-x64/role-model-dev.exe`, version `0.0.20-269-g35103383`, SEA sha256 `d2bc6231f5b5751f4f0b8bc4a970a7593d27a63497b0f7bfa1e41d53beccd67b` (manifest sha matches exe bytes).
- Shipped UI `build/client`: 21 files, tree sha256 `57405a7b5978a8ede35b5de60d229c0d88f49f774a34c0d445933e87541da036`.

## Gate — verify-packaged-candidate --rendered --require-rendered (sealed bytes)

`corepack pnpm runtime:verify-packaged-candidate -- --rendered --require-rendered --package-dir role-model-router/dist/release/win32-x64 --static-root role-model-router/dist/release/win32-x64/build/client --fixture-root testdata/router-runtime/fixtures` → **EXIT 0**.

- 12 HTTP checks PASS (health/models/telemetry/controller/learning/replay/evaluation/ui css/ui bundle/theme boot/chat completion/ui shell; fixture chat `openai/gpt-4.1-mini-fast` tokens=56).
- 20 routes PASS focus/light; 20 click sweeps PASS; control action honest HTTP 400 (outcome check).
- **`PASS studio run: clicked -> raw:success`** — the step that failed both S284 gates (`raw:loading` at 15 s) now succeeds in the exact full sweep→control→studio sequence on the shipped bytes.
- `{"routes":20,"failures":0,"focus":true}`. No timeout, predicate, or audit-sequence change; the only product delta is the S290 page-lifetime repair (commit `35103383`, independently reviewed S291 PASS).

## Operator state

- `:3456` owner PID 44804 untouched (still the only listener on 3456/3457/3458); gate used ephemeral port only; no stray `role-model-dev.exe` left; Go/Chrome/pnpm caches stayed on E:.

## Residual (unchanged)

- R/D/C ordinary-client J1/J2/J5, storage/restart, perf, rollback, R14 `runtime:parity --selfcheck` real runner, B6/B9 actual Layers, Track-B `runtimeUi` dead-binding decision remain open; this receipt claims only the lifecycle gate closure on sealed bytes.
