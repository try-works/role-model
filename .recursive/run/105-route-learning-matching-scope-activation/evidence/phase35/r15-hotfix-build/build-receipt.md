# Run105 R15-only provisional development build

Build and static artifact verification: PASS. **Not full Run105 Phase5 completion; full integration review remains FAIL.** This worker did not start or stop any runtime, redeploy stage, access stage/production state, copy state, or make a model identity claim.

## Immutable pair

- Public baseline: `701b8b8fc0b0eeebdfe818b757f5702f50021488`.
- Only cherry-pick sources: `368f7264a1a3c80a7d7d91c0041a7626511f4533` and `d8485ea1381b7fc9d04799ecdcda3b177392ff94`; results `0ef9b08d` and `ca91d98aeb0532a0bdcded0b5b4e9f19617ceac5`.
- Public branch: `recursive/105-r15-hotfix-verification`; root `E:/tmp/run105-r15-hotfix-public`; tree `52b42ccc1d55ca39012f12214ce1e46caded0c2e`.
- Private branch: `recursive/105-r15-hotfix-private`; root `E:/tmp/run105-r15-hotfix-private`; unchanged baseline commit `c993b2f2ebe8e1daa8ee506a50af0ea09f61b5f9`; tree `e8bda7aed6e36771cdaf140afc7b15b63786d9bc`.
- Both paired worktrees clean before builds and after packaging. Main105 ongoing writer tree was used only for evidence output, never as packaged source. No reset/stash or user-file deletion/move performed. Packaging script internally manages its temporary generated SEA config.

## Artifact

[Development executable](<E:/tmp/run105-r15-hotfix-public/role-model-router/dist/release/win32-x64/role-model-dev.exe>) and [release manifest](<E:/tmp/run105-r15-hotfix-public/role-model-router/dist/release/win32-x64/manifest.json>).

- Executable SHA256: `7ac9a92d45b5f9f58e30d40b164fa1995581ba8da17942c8326531e6cfde35df`.
- Release manifest SHA256: `3f00d89a305f0de6bcdf47f919c180785851f115e497fbc14ec9b399bacd0369`.
- Private/staged distribution manifest SHA256: `1cade800d3db8abf067bcceb839e5c6919ed3106fd17fceabb51a2d92e338801`.
- Exact private distribution: `E:/tmp/run105-r15-hotfix-private/dist/run00-dev`. Packaged manifest bytes match private manifest bytes. Channel development, scope standalone-runtime-dev, authorizationEpoch1. Source seal sealed_clean, privateClean/publicClean true.
- Independent artifact-closure verification PASS; 152 release file hashes captured in [verification receipt](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/release-verification.json>). [Final verification log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/release-verification-attempt3.log>).

## Commands and evidence

Node24.11.0, pnpm10.6.5. Both installs used frozen lockfile and passed: [public install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/public-install.log>), [private install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/private-install.log>).

Private build command, from private hotfix root:

```powershell
$env:ROLE_MODEL_PUBLIC_WORKTREE='E:/tmp/run105-r15-hotfix-public'
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-r15-hotfix-public/role-model-router/packages/core/data/taxonomy'
corepack pnpm run build:run00-runtime
```

[Private build log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/private-build.log>): exit0. Public package command from public hotfix root:

```powershell
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='E:/tmp/run105-r15-hotfix-private/dist/run00-dev'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-r15-hotfix-public/role-model-router/packages/core/data/taxonomy'
$env:RUN88_RELEASE_ID=''
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
corepack pnpm run runtime:package-sea
# After inspected transient Go download failure, retry exact SEA substep:
corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea
```

[Attempt1](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/public-package-attempt1.log>): pinned Go dependency github.com/klauspost/compress v1.18.5 TLS handshake timeout; all public UI/dependency/bridge builds had passed. Failure inspected before retry. [Attempt2](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/public-package-attempt2.log>): exit0; exact same source/dependency pins, no source repair or stage release identity reuse. Bundler warnings retained, not suppressed.

- [Focused SQLite](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/sqlite-22-tests.log>): 22/22 PASS; bounded stubs7081/7065 bytes without graph and7313/7297 with graph.
- [Bridge primary-error isolation](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/bridge-4-tests.log>): 4/4 PASS, actual backend with injected persistence seam faults, no provider egress. Not a live packaged runtime test.
- [Full SQLite](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/sqlite-full-suite.log>):130/130 PASS,23 files.
- [Bridge typecheck](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/bridge-typecheck.log>) and [SQLite typecheck](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/sqlite-typecheck.log>):exit0.
- [Product diff check](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/product-diff-check.log>):exit0. Whole-pick diff check reports trailing CR whitespace in imported historical evidence logs only; no edits made to those authorized commits.
- Independent verifier initially failed native Node TS-to-JS imports, then default workspace exports; corrected verifier import to built module and used documented runtime condition. Both failed logs retained: [attempt1](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/release-verification.log>), [attempt2](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/release-verification-attempt2.log>). Final command:

```powershell
node --conditions=runtime 'D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/verify-release.mjs'
```

## Controller-only launch recipe — NOT EXECUTED

Controller must independently verify release, confirm3458 free, and choose a fresh development-only state root. `E:/tmp/run105-r15-hotfix-state` was absent at worker check; it has not been created. Do not use stage or production roots or share their scope. Default development root would be `C:/Users/erikb/AppData/Local/role-model-runtime-dev`, but fresh isolated state is recommended for provisional verification.

```powershell
$release='E:/tmp/run105-r15-hotfix-public/role-model-router/dist/release/win32-x64'
$env:ROLE_MODEL_TRACK_B_RUNTIME_MANIFEST="$release/track-b-runtime/track-b-runtime-manifest.json"
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-r15-hotfix-public/role-model-router/packages/core/data/taxonomy'
# Provider credentials, if authorized for live testing, belong only to the runtime
# and must be supplied through the controller-owned secret facility; never echo.
& "$release/role-model-dev.exe" --host 127.0.0.1 --port 3458 --runtime-state-root 'E:/tmp/run105-r15-hotfix-state' --scope-id standalone-runtime-dev
```

Use the full release tree, not an exe-only copy. The channel is pinned by package manifest; ROLE_MODEL_BUILD_CHANNEL is a build variable, not a stage-to-dev runtime override. Fresh state lacks existing provider/account configuration; controller must provision development config via authorized facilities without reading/copying live stage/production state. No readiness, traffic, telemetry cessation, or verified model identity is claimed by this build receipt.
