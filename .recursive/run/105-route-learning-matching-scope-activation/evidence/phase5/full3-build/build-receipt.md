# Run105 live e26 exact paired development build (full3)

Static seal + closure verification: PASS. Build worker only; no server launched, no ports touched, no stage/production state.

## Immutable pair

- Public: commit `e26bbc8350217273c8fb0a798e9f091f83590f0f` ("recursive/105 live: dispatch classified captures from fresh queue"), tree `d128ddc84aae7aa4486ca6ab2b1661214aaaa1f6`, branch `recursive/105-full3-public`, root `E:/tmp/run105-full3-public`. Clean before and after packaging.
- Private: commit `da40a115237432b248f6b5282a4ac42f8fb90179` ("recursive/105 review: prevent mixed-policy admissions from invalidating authoritative ladder"), tree `148cbe9db5304ac6e9fc6b39d2b152fdd022bdde`, branch `recursive/105-full3-private`, root `E:/tmp/run105-full3-private`. Clean before and after packaging.
- Both installs frozen-lockfile exit0: [public install](<run105-full3-public-install.log>), [private install](<run105-full3-private-install.log>).

## Commands

```powershell
# private build (E:/tmp/run105-full3-private)
$env:ROLE_MODEL_PUBLIC_WORKTREE='E:/tmp/run105-full3-public'
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full3-public/role-model-router/packages/core/data/taxonomy'
corepack pnpm run build:run00-runtime

# public SEA packaging (E:/tmp/run105-full3-public)
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='E:/tmp/run105-full3-private/dist/run00-dev'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full3-public/role-model-router/packages/core/data/taxonomy'
$env:RUN88_RELEASE_ID=''
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
corepack pnpm run runtime:package-sea
```

Both exit0: [private build log](<run105-full3-private-build.log>), [public package log](<run105-full3-public-package.log>). Private build report: `{"status":"PASS","extensionCount":13,"sidecarSha256":"42757bdf5a910d9d921fc5a45f945aa87b478d1b8cb0128d054b8ef0580ae9a2"}`.

## Artifact

- [Development executable](<E:/tmp/run105-full3-public/role-model-router/dist/release/win32-x64/role-model-dev.exe>)
- [Release manifest](<E:/tmp/run105-full3-public/role-model-router/dist/release/win32-x64/manifest.json>)
- Executable SHA256: `8829ba4c0b147b914f2caff7a605b44e790eb3c1b7632b4c8a68cebbdbcf58a6`
- Release manifest SHA256: `5128e89172923b9be20c163e47769abe58ec7d88cf9234ef8e0dfe5a1410b5ee`
- Private/staged distribution manifest SHA256: `13a7bdfce6960e54bc151de7b1a135e59abec2a15b72a6eb55c91c327e264d4a` (packaged bytes identical to private `E:/tmp/run105-full3-private/dist/run00-dev/track-b-runtime-manifest.json`)
- Source seal: `sealed_clean`, releaseEligible true, privateClean/publicClean true. Channel development, scope standalone-runtime-dev, authorizationEpoch 1.
- Artifact closure verified with the canonical `verifyPackagedRuntimeArtifactClosure` from the built bridge `dist/package-sea.js` (runtime_ui tree + track_b_runtime manifest/sidecar/adapter/extension-host/worker/router assets/13 extensions); 152 release files hashed in [verification receipt](<release-verification.json>).
- Closure verifier requires the tsx loader for the workspace `@role-model-router/sqlite-memory` TypeScript export link (same as full2); verification ran under `corepack pnpm exec tsx`. Plain-node invocation fails on that workspace TS link, not on the artifact.
- Verification run with `ROLE_MODEL_TAXONOMY_DATA_ROOT` set (required by verifier import), matching full2 attempt2.

## Verification receipt (release-verification.json)

- checks.total: PASS, zero failures
- publicIdentity: commit e26bbc83, tree d128ddc8, status clean
- privateIdentity: commit da40a115, tree 148cbe9d, status clean
- executableSha256 8829ba4c..., releaseManifestSha256 5128e891..., privateDistributionManifestSha256 13a7bdfc...
- artifactClosureVerified true, 152 release file sha256s, extensionCount 13
- serverLaunched false, portsTouched false, stageOrProductionTouched false
