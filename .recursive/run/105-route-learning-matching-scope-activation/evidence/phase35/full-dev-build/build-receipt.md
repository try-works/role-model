# Run105 COMPLETE paired source development build — offline/static receipt

**SUPERSEDED / STALE: this receipt describes private4d78, NOT final private da40a115. Do not launch/use as final. Build and static verification passed for that older pair only. NOT Phase5 PASS. Full objective and every phase remain in progress.** No runtime was launched, stopped, restarted, or probed; no port was probed. Controller-owned3458/job1862 and stage3457 were untouched. No running release was overwritten. No full-host expensive test job was duplicated. Offline here means no application-runtime/live-provider operations; normal frozen dependency/build tooling was used.

## Exact immutable source pair and authorized repairs

NEW worktrees created on requested branches:
- Public E:/tmp/run105-full-public, branch recursive/105-full-build-verification-public. Original requested commit a3ca6663cb4ee4218c33fdbd22318ea39cf59ed2/tree09489ead28cb7a988f3442fa9333b942559278ef verified before creation.
- Private E:/tmp/run105-full-private, branch recursive/105-full-build-verification-private. Original requested commit3fe39e88300f1fb746c725132ab9f96264a0593a/tree52daf28b42b5a09db08d4158182075fabbb50318 verified before creation.
- Initial exact private build failed at package-permission closure; [actual failed log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-build.log>) and [failure diagnosis](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-build-failure.json>) retained. Knowledge-store package declared25permissions but registry21, lacking knowledge:land-route-ladder-rollback, knowledge:read-route-ladder-rollback, knowledge:mark-ladder-eligible, knowledge:list-route-ladders. Protocol1.1.0 matched. Reported BEFORE any retry. No local patch/bypass made.
- Controller repaired source with genuine RED/GREEN test and explicitly authorized clean ff-only updates. Private final4d78ce60cfbf34734e286b34b878291617266261/tree914efc317adb82dfdb1aee2c406ea0712a97e02c. Public final83308e29c7e9505054a0885f56da378330e76e5e/treed391ec693cf10e8af812e1e26c57934649f202ba. These supersede the initial requested pair; they are NOT misrepresented as the old commits.
- Both final worktrees clean; sourceSeal sealed_clean, releaseEligible/privateClean/publicClean true. No reset/delete/move of uncontrolled paths. Only build scripts manage generated outputs inside the new worktrees.

## Final artifact identity

[New executable](<E:/tmp/run105-full-public/role-model-router/dist/release/win32-x64/role-model-dev.exe>) and [release manifest](<E:/tmp/run105-full-public/role-model-router/dist/release/win32-x64/manifest.json>).

- Executable SHA256: ffc3f58a45992d72b5eae539e3450b9b5bded5954335567da64c219e17768d78.
- Release manifest SHA256:69ac667e6c03c691f7f32b78fd336207fbba2b7dcb94977e005cc108dcab3896.
- [Exact private distribution manifest](<E:/tmp/run105-full-private/dist/run00-dev/track-b-runtime-manifest.json>) SHA256:27599b3c87d618f9bfab1072cb8ddbb1fc97eb34e7585930e66b1fb17e9b69cb. Packaged manifest bytes identical.
- Development channel, standalone-runtime-dev scope, authorizationEpoch1,13canonical extensions. Private distribution binds final public/private SHA and trees; release binds final public commit/tree. Executable sha256/executable_sha256/core_payload_sha256 all match.
- Independent artifact-closure verification PASS;152release-file hashes recorded in [complete verification receipt](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/release-verification.json>). [verification log](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/release-verification.log>) and [reproducible verifier](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/verify-release.mjs>).

## Setup, final build, and bounded checks

Node24.11.0 / pnpm10.6.5. Frozen paired installs PASS: [public install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/public-install.log>), [private install](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/private-install.log>). Repairs did not change dependency pins.

This superseded draft is retained as historical evidence only. Use [latest final receipt](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/full-dev-build/build-receipt-final-da40.md>) and its exact private da40 manifest and separate release root instead.
