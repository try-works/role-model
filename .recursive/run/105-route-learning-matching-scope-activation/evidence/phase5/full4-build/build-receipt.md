# Run105 live 7d1c06ee exact paired development build (full4)

Static seal + closure verification: PASS. Build worker only; no server launched, no ports touched, no stage/production state.

## Immutable pair

- Public: commit `7d1c06ee9af61fe1bbc11803b501265b63ffb9c0` ("recursive/105 live: accept canonical empty replay queue projection"), tree `9fd0c0570d070b310ff20a0c4bf3ec0ef85414c2`, branch `recursive/105-full4-public`, root `E:/tmp/run105-full4-public`. Clean before and after packaging.
- Private: commit `da40a115237432b248f6b5282a4ac42f8fb90179` ("recursive/105 review: prevent mixed-policy admissions from invalidating authoritative ladder"), tree `148cbe9db5304ac6e9fc6b39d2b152fdd022bdde`, branch `recursive/105-full4-private`, root `E:/tmp/run105-full4-private`. Clean before and after packaging.
- Both installs frozen-lockfile exit0: [public install](<run105-full4-public-install.log>), [private install](<run105-full4-private-install.log>).

## Commands

```powershell
# private build (E:/tmp/run105-full4-private)
$env:ROLE_MODEL_PUBLIC_WORKTREE='E:/tmp/run105-full4-public'
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full4-public/role-model-router/packages/core/data/taxonomy'
corepack pnpm run build:run00-runtime

# public SEA packaging (E:/tmp/run105-full4-public)
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='E:/tmp/run105-full4-private/dist/run00-dev'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full4-public/role-model-router/packages/core/data/taxonomy'
$env:RUN88_RELEASE_ID=''
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
corepack pnpm run runtime:package-sea
```

Both exit0: [private build log](<run105-full4-private-build.log>), [public package log](<run105-full4-public-package.log>). Private build report: `{"status":"PASS","extensionCount":13,"sidecarSha256":"42757bdf5a910d9d921fc5a45f945aa87b478d1b8cb0128d054b8ef0580ae9a2"}`.

## Artifact

- [Development executable](<E:/tmp/run105-full4-public/role-model-router/dist/release/win32-x64/role-model-dev.exe>)
- [Release manifest](<E:/tmp/run105-full4-public/role-model-router/dist/release/win32-x64/manifest.json>)
- Executable SHA256: `0f9b9161bce62676bd21c9a39ee53be3edb0a3f31129ca352395861b30b1832a`
- Release manifest SHA256: `b45cb39ca8ed05d9f6d9f53457f7e31aeb8e4f45ea832c6c17a6fa7cbf28acd6`
- Private/staged distribution manifest SHA256: `44c7cc898c1054156e810cafe72e9b72298f81e4fefb8074ce793eae6426379d` (packaged bytes identical to private `E:/tmp/run105-full4-private/dist/run00-dev/track-b-runtime-manifest.json`)
- Sidecar SHA256: `42757bdf5a910d9d921fc5a45f945aa87b478d1b8cb0128d054b8ef0580ae9a2` (matches manifest `track_b_runtime.sidecar_sha256`; canonical sidecar identical to full2/full3)
- Source seal: `sealed_clean`, releaseEligible true, privateClean/publicClean true. Channel development, scope standalone-runtime-dev, authorizationEpoch 1.
- Artifact closure verified with the canonical `verifyPackagedRuntimeArtifactClosure` from the built bridge `dist/package-sea.js` (runtime_ui tree + track_b_runtime manifest/sidecar/adapter/extension-host/worker/router assets/13 extensions); 152 release files hashed in [verification receipt](<release-verification.json>).
- Closure verifier requires the tsx loader for the workspace `@role-model-router/sqlite-memory` TypeScript export link (same as full2/full3); verification ran under `corepack pnpm exec tsx`. Verification run with `ROLE_MODEL_TAXONOMY_DATA_ROOT` set.
- No server launched, no ports touched, no runtime, no :3457/:3458.

## Verification receipt (release-verification.json)

- checks.total: PASS, zero failures
- publicIdentity: commit 7d1c06ee, tree 9fd0c057, status clean
- privateIdentity: commit da40a115, tree 148cbe9d, status clean
- executableSha256 `0f9b9161bce62676bd21c9a39ee53be3edb0a3f31129ca352395861b30b1832a`, releaseManifestSha256 `b45cb39ca8ed05d9f6d9f53457f7e31aeb8e4f45ea832c6c17a6fa7cbf28acd6`, privateDistributionManifestSha256 `44c7cc898c1054156e810cafe72e9b72298f81e4fefb8074ce793eae6426379d`, sidecarSha256 `42757bdf5a910d9d921fc5a45f945aa87b478d1b8cb0128d054b8ef0580ae9a2`
- artifactClosureVerified true, 152 release file sha256s, extensionCount 13
- serverLaunched false, portsTouched false, stageOrProductionTouched false
