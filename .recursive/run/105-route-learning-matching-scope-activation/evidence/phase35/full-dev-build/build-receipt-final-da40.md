# Run105 COMPLETE paired source development build — latest final pair

**Build + independent static artifact verification: PASS. NOT Phase5 PASS. Full objective and every phase remain in progress.** No application runtime was started, stopped, restarted, or probed. No ports probed. Controller-owned3458/job1862 and stage3457 untouched. Build outputs only in NEW clean worktrees, never an existing running release. No duplicate full-host diagnostics.

## Exact source identity

Requested roots/branches created clean at verified original public a3ca6663cb4ee4218c33fdbd22318ea39cf59ed2/tree09489ead28cb7a988f3442fa9333b942559278ef and private3fe39e88300f1fb746c725132ab9f96264a0593a/tree52daf28b42b5a09db08d4158182075fabbb50318. Subsequent source fixes were explicitly controller-authorized and applied by clean git merge --ff-only, never uncommitted patches or bypasses.

| Source | Final commit | Final tree | Root / branch |
|---|---|---|---|
| Public |83308e29c7e9505054a0885f56da378330e76e5e|d391ec693cf10e8af812e1e26c57934649f202ba|E:/tmp/run105-full-public / recursive/105-full-build-verification-public|
| Private |da40a115237432b248f6b5282a4ac42f8fb90179|148cbe9db5304ac6e9fc6b39d2b152fdd022bdde|E:/tmp/run105-full-private / recursive/105-full-build-verification-private|

Both final trees clean. Source seal sealed_clean, releaseEligible/privateClean/publicClean true.

## Latest artifact, not superseded private4d78 package

- [New executable](<E:/tmp/run105-full-public/role-model-router/dist/release-private-da40a115/win32-x64/role-model-dev.exe>) SHA256 ffc3f58a45992d72b5eae539e3450b9b5bded5954335567da64c219e17768d78.
- [New release manifest](<E:/tmp/run105-full-public/role-model-router/dist/release-private-da40a115/win32-x64/manifest.json>) SHA256017904dcaa75cf2daf92d66e00026ff92c55ca29c7aeebc77f27e43630b37d6e.
- [Private manifest](<E:/tmp/run105-full-private/dist/run00-dev/track-b-runtime-manifest.json>) and [packaged manifest](<E:/tmp/run105-full-public/role-model-router/dist/release-private-da40a115/win32-x64/track-b-runtime/track-b-runtime-manifest.json>) bytes IDENTICAL, SHA256463d29a07beb3f5de71fc32fc81e3a3634723c86bc6186e92f5f02c444260206.
- Development channel, standalone-runtime-dev scope, authorizationEpoch1,13canonical extensions. Every source commit/tree field matches the latest final pair. Executable sha256/executable_sha256/core_payload_sha256 agree.
- Independent artifact closure PASS,152release-file hashes in [latest verification receipt](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/release-verification-final-da40.json>); [verification log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/release-verification-final-da40.log>) and [verifier](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/verify-release.mjs>).
- Executable hash equals superseded package because public source did not change; private distribution/sidecar and release manifest hashes DID change. Never use exe hash alone to identify this paired release. Entire release tree required.

## Failure history preserved, no silent retry

Initial exact private3fe build failed knowledge-store package permission closure: registry21capabilities vs package25permissions, missing land-route-ladder-rollback/read-route-ladder-rollback/mark-ladder-eligible/list-route-ladders. [failed actual log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-build.log>) and [diagnosis](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-build-failure.json>). Reported BEFORE retry; controller repaired registry with genuine RED/GREEN then committed4d78. Earlier successful4d78 package was superseded by controller mixed-policy repair da40. Earlier release/manifest152hash receipt remains preserved at [superseded verification](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/release-verification.json>), and [superseded build receipt](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/build-receipt.md>) is marked STALE. Latest output uses separate release-private-da40a115 root; no older release overwritten.

## Frozen installs and final bounded checks

Node24.11.0 / pnpm10.6.5. [public frozen install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/public-install.log>) / [private frozen install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-install.log>): PASS; dependency pins unchanged by authorized repairs.

- [latest private build](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-build-final-da40.log>): PASS0, job2086.
- [latest development SEA build](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/public-package-final-da40.log>): PASS0, job2090.
- [normal final UI suite including Chromium](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/public-ui-final-suite.log>):684/684 tests,72files PASS0, job2068; exact unchanged public83308.
- [final bounded bridge critical](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/bridge-critical-final.log>):113/113 tests,6files PASS0, job2076; no full-host suite duplication.
- [bridge final noEmit](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/bridge-typecheck-final.log>) / [SQLite final noEmit](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/sqlite-typecheck-final.log>): PASS0.
- [latest private materialization and package alignment](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-final-da40-focused-tests.log>):20/20 PASS0, job2089.
- Public tests that read paired private source use RUN105_PRIVATE_ROOT=E:/tmp/run105-full-private where supported.

## Reproducible final commands

Private, from new private root:

```powershell
$env:ROLE_MODEL_PUBLIC_WORKTREE='E:/tmp/run105-full-public'
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full-public/role-model-router/packages/core/data/taxonomy'
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
$env:RUN88_RELEASE_ID=''
corepack pnpm run build:run00-runtime
```

Public, from new public root:

```powershell
$env:ROLE_MODEL_BUILD_CHANNEL='development'
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT='E:/tmp/run105-full-private/dist/run00-dev'
$env:ROLE_MODEL_TAXONOMY_DATA_ROOT='E:/tmp/run105-full-public/role-model-router/packages/core/data/taxonomy'
$env:ROLE_MODEL_RELEASE_OUTPUT_ROOT='E:/tmp/run105-full-public/role-model-router/dist/release-private-da40a115'
$env:RUN105_PRIVATE_ROOT='E:/tmp/run105-full-private'
$env:RUN88_RELEASE_ID=''
$env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=''
corepack pnpm run runtime:package-sea
```

Independent static verifier:

```powershell
$env:RUN105_EXPECTED_PUBLIC_SHA='83308e29c7e9505054a0885f56da378330e76e5e'
$env:RUN105_EXPECTED_PRIVATE_SHA='da40a115237432b248f6b5282a4ac42f8fb90179'
$env:RUN105_RELEASE_ROOT='E:/tmp/run105-full-public/role-model-router/dist/release-private-da40a115/win32-x64'
$env:RUN105_RECEIPT_NAME='release-verification-final-da40.json'
node --conditions=runtime 'D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/verify-release.mjs'
```

## Job accounting and boundary

All worker jobs collected:1999/2000 frozen installs0;2012 originalbuild1 (diagnosed);2026 publicdependencybuild0;2027 prefinalUI0;2031 prefinalcritical0;2032 SQLitetypecheck0;2067 supersededprivatebuild0;2068 finalUI0;2069 finalbridgetypecheck0;2074 supersededSEA0;2076 finalcritical0;2086 latestprivatebuild0;2089 latestfocusedprivate0;2090 latestSEA0. Foreground verifier/typechecks0. [complete job ledger](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/jobs.json>).

No readiness/live traffic/model identity claim; controller owns any later launch. Keep the entire latest release tree. Build verification does not complete the recursive objective or any Phase5 gate.
