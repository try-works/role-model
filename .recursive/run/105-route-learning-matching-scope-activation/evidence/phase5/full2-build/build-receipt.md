# Run105 Phase5 responsive final: full2 exact paired development build

Static seal + closure verification: PASS. Build worker only; no server launched, no ports touched, no stage/production state.

## Immutable pair

- Public: commit `7162930d76dc1c317c8d192a2e3fbbdcde6f878c` ("recursive/105 phase5: responsive mobile shell after live browser defect"), tree `21149251eb844b2b3f345ce1e8a0e7d8ceec2803`, branch `recursive/105-full2-public`, root `E:/tmp/run105-full2-public`. Clean before and after packaging.
- Private: commit `da40a115237432b248f6b5282a4ac42f8fb90179` ("recursive/105 review: prevent mixed-policy admissions from invalidating authoritative ladder"), tree `148cbe9db5304ac6e9fc6b39d2b152fdd022bdde`, branch `recursive/105-full2-private`, root `E:/tmp/run105-full2-private`. Clean before and after packaging.
- Both installs frozen-lockfile exit0: [public install](<release-verification.json>) logs: run105-full2-public-install.log, run105-full2-private-install.log.

## Commands

```powershell
# private build (E:/tmp/run105-full2-private)
$env:ROLE_MODEL_PUBLIC_WORKTREE='E:/tmp/run105-full2-public'
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full2-public/role-model-router/packages/core/data/taxonomy'
corepack pnpm run build:run00-runtime

# public SEA packaging (E:/tmp/run105-full2-public)
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='E:/tmp/run105-full2-private/dist/run00-dev'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full2-public/role-model-router/packages/core/data/taxonomy'
$env:RUN88_RELEASE_ID=''
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
corepack pnpm run runtime:package-sea
```

Both exit0: [private build log](<run105-full2-private-build.log>), [public package log](<run105-full2-public-package.log>).

## Artifact

- [Development executable](<E:/tmp/run105-full2-public/role-model-router/dist/release/win32-x64/role-model-dev.exe>)
- [Release manifest](<E:/tmp/run105-full2-public/role-model-router/dist/release/win32-x64/manifest.json>)
- Executable SHA256: `ffc3f58a45992d72b5eae539e3450b9b5bded5954335567da64c219e17768d78`
- Release manifest SHA256: `7506ad615503f3b7f2f68a99585625aa2017786fffbdfa6459a187ad1a21bbb4`
- Private/staged distribution manifest SHA256: `fedaa87fad8acb04b26365f5931f32d3e9ceba253f54f95d36ab917b0ebc38c2` (packaged bytes identical to private `E:/tmp/run105-full2-private/dist/run00-dev/track-b-runtime-manifest.json`)
- Source seal: `sealed_clean`, releaseEligible true, privateClean/publicClean true. Channel development, scope standalone-runtime-dev, authorizationEpoch 1.
- Artifact closure verified against manifest (runtime_ui tree + track_b_runtime manifest/sidecar/adapter/extension-host); 152 release files hashed in [verification receipt](<release-verification.json>).
- Verification run with `ROLE_MODEL_TAXONOMY_DATA_ROOT` set (required by verifier import); first attempt without it failed on taxonomy manifest lookup and was retained as [attempt1](<release-verification-full2.log>), PASS on [attempt2](<release-verification-full2-attempt2.log>).

## Verification receipt

- publicIdentity: commit 7162930d, tree 21149251, status clean
- privateIdentity: commit da40a115, tree 148cbe9d, status clean
- executableSha256 ffc3f58a..., releaseManifestSha256 7506ad61..., privateDistributionManifestSha256 fedaa87f...
- artifactClosureVerified true, 152 release file sha256s
