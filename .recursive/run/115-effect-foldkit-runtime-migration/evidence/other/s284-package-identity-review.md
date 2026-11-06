# S284 — independent READ-ONLY identity review of the SEA package snapshot

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (verified via `list_agents`). No runtime launch, no build, no provider/operator, no writes to the snapshot; hashing only.
- Package root: `E:/role-model-run115/package-s284-public/role-model-router/dist/release/win32-x64` (SEA exit 0, Lead-reported). Source snapshots remained clean when frozen.

## Verdict

**PASS (bounded) on source identity, executable hash, SEA UI closure and Track-B private closure.** One bounded **HOLD/flag**: the copied Track-B distribution manifest declares a `runtime-ui` tree of 99 assets whose directory is **absent** from the SEA release (the SEA binds its UI as `build/client` instead). Whether that dead binding matters depends on the lane; it must be stated, not silently accepted.

## Identity — all verified true

| Field | Value | Check |
|---|---|---|
| public commit | `a01230f0524bd724536108b0b3aab5e7dc824492` | matches Lead/SEA manifest `commit` |
| private commit | `0c5216b69ea44126a67654bfe44655acb9d97eee` | matches Track-B manifest |
| public source tree | `3b229eed68c1ba6b34f1aac7c5c416cf4ff0e9ae` | matches SEA `source_tree` |
| private source tree | `7c94f851d1d564d08553093cf8799eb419abf368` | matches Track-B manifest |
| source seal | `sealed_clean`, `releaseEligible=true`, `privateClean=true`, `publicClean=true` | verified in Track-B manifest; SEA commit/source_tree agree |

## Executable

- `role-model-dev.exe` 104,880,640 B, channel `development`, build date `2026-10-27T10:25:15.915Z`.
- SHA-256 `589ecc0cb318e874ac4aaf4107f8e995a62919dda3f0678237eb5df70a640876` equals `manifest.sha256`, `executable_sha256`, `core_payload_sha256`, and the `.sha256` sidecar. ✅

## SEA artifact closure (manifest.artifact_closure)

- `runtime_ui` tree `build/client`: recomputed tree digest `0970c3813eab13c425a40f52380b970db447a032947b30d7067704e3bd9e2199` over **21 files** = manifest. ✅
- `track_b_runtime`: manifest file `ce56a4…`, sidecar `5c09f4…`, public adapter `9de7…`, public extension host `5a07…`, worker `0277…`, 3 router assets, 3 source-authority fixtures and **13 extensions** — every declared SHA-256 recomputed and matched. ✅
- Track-B manifest/SEA cross-bindings: `sidecar_sha256`, `manifest_sha256`, `public_source_tree`, `extension_count=13` all match. ✅
- Total: 57 hash checks; 55 matched; the 2 non-matches are the Track-B `runtime-ui` path/asset group below (the 3 router-asset initial mismatches were a reviewer path-prefix mistake; rechecked under `track-b-runtime/` and all 3 match exactly).

## HOLD/flag — Track-B manifest declares `runtime-ui` assets absent from the SEA release

- `track-b-runtime-manifest.json` `runtimeUi.root = "runtime-ui"` with **99 assets** and tree hash `1ee72187…`; `track-b-runtime/runtime-ui` does not exist in the release (**0/99** files present), and the SEA staging module has no runtime-ui copy step.
- The SEA UI is `build/client` (public `runtime-ui-next/dist/client`, 21 files) and is closure-bound/verified; the Track-B `runtimeUi` binding is therefore **dead metadata in this lane** (it describes the private distribution's UI, used by other lanes). Not a hash mismatch inside the closure, but a manifest claim that cannot be verified from the SEA package.
- Action: confirm the SEA lane intentionally ships `build/client` (then mark the Track-B `runtimeUi` binding as not-applicable for SEA, or strip/pin it when staging) — do not let a consumer believe `track-b-runtime/runtime-ui` exists.

## Build-path notes (Lead-reported, recorded as context only)

- The clean UI command needed a browser-wrapper prebuild: it failed with 13 missing outputs and then an explicit browser-wrapper build PASSed. The final SEA exit was 0.
- C: drive residual ~823 MB after packaging; not a package-content issue.
- No functional/runtime behaviour is claimed here; Lead owns the runtime/rendered gates.

## Limits

Read-only filesystem hashing/identity review of the frozen snapshot; no browser/runtime launch, no suite, no packaging rerun. I did not modify the snapshot or product files. The `runtime-ui` finding is evidence-scoped; the Lead decides whether the dead binding blocks acceptance.


## Consumer read — Track-B `runtime-ui` binding (read-only, scoped)

- **SEA lane consumes `build/client`, not `track-b-runtime/runtime-ui`:** public `runtime-host-bridge/src/index.ts:35346-35377` `resolveStandaloneStaticRoot` resolves `build/client` (executable dir/repo) or the dev root `apps/runtime-ui/build/client`; private `launch-packaged-runtime.mjs:283-285` uses `packaged.releaseDir/build/client` for the SEA/CI contract launch. SEA closure binds `build/client` (`package-sea.ts:435,516,575`).
- **Track-B `runtime-ui` is produced/verified only for the non-SEA private distribution:** private `runtime-ui-distribution.mjs:39-41` stages `apps/runtime-ui/build/client` as `runtime-ui/<asset>`, and `build-runtime-distribution.mjs:384-388` stages and verifies it into `dist/run00-dev`; the SEA staging module has no runtime-ui copy step.
- **No SEA-path consumer of `track-b-runtime/runtime-ui` found** in the scoped public host-bridge/private runtime launch code; `prove-packaged-product.mjs` has no `runtime-ui`/`track-b-runtime` references. So the Track-B manifest `runtimeUi` field is a non-SEA binding carried dead into the SEA package; do not strip or alter the artifact/seal now — mark it not-applicable for the SEA lane and keep it for the private-distribution lane. If any external consumer is expected to read `track-b-runtime/runtime-ui` from a SEA package, that is a packaging gap to design explicitly.
