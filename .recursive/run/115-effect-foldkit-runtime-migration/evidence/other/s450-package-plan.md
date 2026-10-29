# S450/S453 — current paired dev SEA package plan (READ-ONLY, HOLD repaired)

Status: revised plan only. Repairs the S453 HOLD (`evidence/other/s453-package-plan-review.md`). No builds, installs, downloads, process starts, source/config edits, operator ports/state, or commits in this revision.
Identity is NOT final: public S448 commit is pending; private has moved to `3d03ad78`. Do NOT execute the SHAs in this document until S448 lands and the pair identity is refreshed (section 1).

## 1. Identity prerequisite (REPAIR 3 of 3)

- Current verified: private HEAD `3d03ad78f87c6b6e199796b43a0580c1b47463a8` tree `c9a7561787d73140e89400e565f8cd2b181621aa`; public HEAD `6306dc9ec308105fd2996a67c58c3e34b2d0c108` tree `ba38957489773d2852f1a26570a6d721ddc8c4ba` with **S448 public commit pending**.
- The held plan pinned private `ac809d31`; that basis is STALE and retained only as history. After S448 is committed and the private identity is refreshed, re-resolve both HEAD/tree values, re-run the section-6 assertions, and substitute `<PUBLIC_S448_COMMIT>`/`<PUBLIC_S448_TREE>`/`<PRIVATE_FINAL_COMMIT>`/`<PRIVATE_FINAL_TREE>` below. Any build against the old SHAs is out of scope and would assemble the wrong private tree.
- Inputs read (unchanged authority): 00-requirements R14-R18/R36-R39, 02-to-be-plan, owner-scope-decision (E1/E2 deferred), 00-worktree paired authority, addenda/02-workspace-reference-implementation, S420 corrective audit bundle, build/gate sources, and the S453 review.

## 2. Exact sequence (clean pair; dependency closure PROVED, not assumed)

### 2.1 Preflight (STOP on failure; no downloads)
```
node --version                                  # v24.11.0 verified
$env:COREPACK_ENABLE_NETWORK="0"; corepack pnpm --version   # must work offline; STOP if corepack/pnpm would download or version mismatches the lockfile (CI pins pnpm 10.6.5)
```

### 2.2 Clean detached pair (after S448/identity refresh; working trees untouched)
```
git -C <public-current> worktree add --detach <clean>/115-public   <PUBLIC_S448_COMMIT>
git -C <private-current> worktree add --detach <clean>/115-private <PRIVATE_FINAL_COMMIT>
git -C <clean>/115-public  status --porcelain   # must be empty
git -C <clean>/115-private status --porcelain   # must be empty
```

### 2.3 Dependency closure (REPAIR 1 of 3 — replaces the invalid root-only junction)
The current root `node_modules` has NO `@role-model-router` scope; workspace links live in per-app `node_modules` as ABSOLUTE junctions into the current worktree (verified: `runtime-ui-next/node_modules/@role-model-router/foldkit -> D:\\DEV\\role-model\\.worktrees\\115-...\role-model-router\packages\foldkit`; host bridge links `core`/`catalog`/`effect` the same way; private `node_modules/effect -> D:\\DEV\\role-model-internal\\.worktrees\\115-...\shared\effect`). A root-only junction cannot satisfy app imports and would silently resolve the ORIGINAL source. Required:
```
$env:COREPACK_ENABLE_NETWORK="0"
$env:PNPM_CONFIG_OFFLINE="true"
cd <clean>/115-public ; corepack pnpm install --offline --frozen-lockfile
cd <clean>/115-private; corepack pnpm install --offline --frozen-lockfile
```
- Local store only; no network/new download. If any package is absent from the store, STOP and report.
- Alternative only if offline install is impossible: construct every workspace link (`@role-model-router/*`, `effect`, `effect-mq`, `@effect/sql-sqlite-node`) to the CLEAN package dirs; `@effect/sql-sqlite-node` is the workspace package `role-model-router/packages/sql-sqlite-node` (not a third-party store package), so it must be a clean-target link like the others. Only genuine third-party packages may use the shared store; then pass the same resolve proof. Documented fallback, not a claim.

### 2.4 Resolve proof (FUTURE/UNVERIFIED; must pass before any build; write output into a preflight receipt)

Windows normalization: every comparison uses [IO.Path]::GetFullPath and [StringComparison]::OrdinalIgnoreCase (no raw prefix checks, no first-N samples). The proof enumerates ALL @role-model-router link scopes in the clean public tree, ALL @effect/sql-sqlite-node links, and ALL private workspace wrapper links, and forbids any target under either original dirty worktree.

~~~powershell
$cmp = [System.StringComparison]::OrdinalIgnoreCase
$cleanPub  = [IO.Path]::GetFullPath('<clean>/115-public').TrimEnd('\','/')
$cleanPriv = [IO.Path]::GetFullPath('<clean>/115-private').TrimEnd('\','/')
$originals = @([IO.Path]::GetFullPath('<public-current>').TrimEnd('\','/'), [IO.Path]::GetFullPath('<private-current>').TrimEnd('\','/'))
function Assert-CleanTarget([string]$target,[string]$root,[string]$label) {
  $t = [IO.Path]::GetFullPath($target).TrimEnd('\','/')
  $under = $t.Equals($root,[StringComparison]::OrdinalIgnoreCase) -or $t.StartsWith($root + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)
  if (-not $under) { throw "$label escapes $root -> $t" }
  foreach ($o in $originals) {
    $leak = $t.Equals($o,[StringComparison]::OrdinalIgnoreCase) -or $t.StartsWith($o + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)
    if ($leak) { throw "$label points at an original dirty worktree -> $t" }
  }
  return $t
}
# 1) ALL @role-model-router link scopes under the clean public tree (apps AND packages; bounded depth; skip nested .pnpm):
$scopes = @(Get-ChildItem (Join-Path $cleanPub 'role-model-router') -Recurse -Depth 5 -Directory -Filter '@role-model-router' -ErrorAction Stop |
  Where-Object { $_.FullName -notlike '*node_modules\.pnpm*' })
if ($scopes.Count -eq 0) { throw 'no @role-model-router link scopes enumerated' }
$publicLinks = 0
foreach ($scope in $scopes) {
  foreach ($link in (Get-ChildItem $scope.FullName -Force -ErrorAction Stop)) {
    if (-not $link.LinkTarget) { throw "workspace entry is not a link: $($link.FullName)" }
    Assert-CleanTarget ($link.LinkTarget -join '') $cleanPub "public workspace link $($link.Name)" | Out-Null
    $publicLinks++
  }
}
if ($publicLinks -eq 0) { throw 'no @role-model-router links proved' }
"public @role-model-router links proved: $publicLinks"
# 2) ALL @effect/sql-sqlite-node links in the clean public tree:
$sqlite = @(Get-ChildItem (Join-Path $cleanPub 'role-model-router') -Recurse -Depth 5 -Directory -Filter 'sql-sqlite-node' -ErrorAction Stop |
  Where-Object { $_.Parent.Name -eq '@effect' -and $_.FullName -notlike '*node_modules\.pnpm*' })
if ($sqlite.Count -eq 0) { throw 'no @effect/sql-sqlite-node links enumerated' }
foreach ($s in $sqlite) { Assert-CleanTarget ($s.LinkTarget -join '') $cleanPub 'public @effect/sql-sqlite-node' | Out-Null }
# 3) ALL private workspace wrapper links (effect, effect-mq, @effect/sql-sqlite-node, @role-model-router/* when present):
$privCandidates = @((Join-Path $cleanPriv 'node_modules/effect'), (Join-Path $cleanPriv 'node_modules/effect-mq'), (Join-Path $cleanPriv 'node_modules/@effect/sql-sqlite-node'))
$privCandidates += @(Get-ChildItem (Join-Path $cleanPriv 'node_modules/@role-model-router') -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
$privLinks = 0
foreach ($p in $privCandidates) {
  if (Test-Path $p) {
    $i = Get-Item $p -Force
    if (-not $i.LinkTarget) { throw "private workspace entry is not a link: $p" }
    Assert-CleanTarget ($i.LinkTarget -join '') $cleanPriv "private workspace link $p" | Out-Null
    $privLinks++
  }
}
if ($privLinks -eq 0) { throw 'no private workspace links proved' }
"private workspace links proved: $privLinks"
# 4) Module resolution from the clean apps. NOTE: @role-model-router/core/package.json is NOT exported;
#    resolve the package ENTRY (below), never core/package.json.
~~~

~~~node
node -e "for (const spec of ['@role-model-router/foldkit','effect']) console.log(require.resolve(spec,{paths:['<clean>/115-public/role-model-router/apps/runtime-ui-next']}));"
node -e "for (const spec of ['@role-model-router/core','effect','@effect/sql-sqlite-node']) console.log(require.resolve(spec,{paths:['<clean>/115-public/role-model-router/apps/runtime-host-bridge']}));"
~~~

Expected: the UI app resolves `@role-model-router/foldkit` and `effect` inside the clean public tree; the host app resolves `@role-model-router/core`, `effect` and `@effect/sql-sqlite-node` inside the clean public tree. `@effect/sql-sqlite-node` is the workspace package `role-model-router/packages/sql-sqlite-node` (not a third-party store package), so its resolution must be a clean-tree target exactly as the link enumeration asserts. Private wrappers are proved by the direct LinkTarget checks in step 3 — no module-resolution call is made for them.

### 2.5 Private assemble (cwd clean private)
```
$env:ROLE_MODEL_PUBLIC_WORKTREE="<clean>/115-public"
$env:NODE_OPTIONS="--conditions=runtime"
corepack pnpm build:run00-runtime        # node scripts/track-b/build-runtime-distribution.mjs
```
Expected: exit 0; stdout `{"status":"PASS","extensionCount":13,"sidecarSha256":"<64hex>"}`; `dist/run00-dev/track-b-runtime-manifest.json` schema v2, 13 extensions, `publicSourceTree=<PUBLIC_S448_TREE>`, `publicCommit=<PUBLIC_S448_COMMIT>`, `privateCommit=<PRIVATE_FINAL_COMMIT>`, `sourceSeal.status="sealed_clean"`, `releaseEligible=true`. Then (private): `node --test tests/track-b/run87-*.test.mjs tests/track-b/runtime-distribution.test.mjs`.

### 2.6 Public SEA package (cwd clean public)
```
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT="<clean>/115-private/dist/run00-dev"   # required for EVERY channel (package-sea.ts:60-61)
$env:ROLE_MODEL_RELEASE_OUTPUT_ROOT="<fresh absolute disposable root>"
corepack pnpm run runtime:package-sea
```
Expected exit 0; `<root>/win32-x64` with `role-model-dev.exe` (+sha256), launcher, `.bat`, `manifest.json`, `build/client/**` (Foldkit UI from `runtime-ui-next/dist/client`), `track-b-runtime/**` copied manifest+modules.
Closure: `manifest.json` binds `executable_sha256`, `source_tree=<PUBLIC_S448_TREE>`, version/commit/build_date, `track_b_runtime{manifest,sidecar,sidecar_sha256,manifest_sha256,compatibility_generation:"N",public_source_tree,extension_count:13}`, `artifact_closure` (build/client tree + Track-B sidecar/adapter/extension host/worker/fixtures). Stage/production additionally require `RUN88_RELEASE_ID=sha256:…` and `node scripts/run88-stage-release.mjs --manifest <release>/win32-x64/manifest.json --release-id <id> --private-source <private sha>`; development does not.

### 2.7 Offline gates (exact supported flags; REPAIR 2 of 3 removes `--repo-root`)
```
node scripts/runtime/verify-packaged-candidate.mjs --package-dir <root>/win32-x64 --static-root <clean>/115-public/role-model-router/apps/runtime-ui-next/dist/client --fixture-root <clean>/115-public/testdata/router-runtime/fixtures
node scripts/runtime/audit-rendered-ui.mjs --exe <root>/win32-x64/role-model-dev.exe --static-root <clean>/115-public/role-model-router/apps/runtime-ui-next/dist/client
corepack pnpm --filter @role-model-router/runtime-host-bridge run validate-packaging
corepack pnpm run runtime:parity-selfcheck
corepack pnpm run runtime:parity-mutation
corepack pnpm run runtime:test-parity
corepack pnpm run runtime:test-critical
node scripts/runtime/compare-release.mjs --left-exe <preserved-R-exe> --right-exe <root>/win32-x64/role-model-dev.exe --left-port <free> --right-port <free> --left-state <tmp> --right-state <tmp> --fixture-root <fixtures>
cd <clean>/115-private
node scripts/track-b/system-proof.mjs --check phases
node scripts/track-b/system-proof.mjs --check semantics
node scripts/track-b/system-proof.mjs --check generated
node scripts/track-b/run-command-test.mjs TB11-CMD-05
node scripts/track-b/storage-audit.mjs
```
`verify-packaged-candidate` supports exactly `--package-dir`, `--static-root`, `--fixture-root` (plus optional `--worker-fixtures`/`--expect-model`); there is no `--repo-root`. `audit-rendered-ui` needs Chrome/`CHROME_PATH` and exits 2 = NOT RUN. Ephemeral loopback ports + mkdtemp state only; never 3456/3457/3458.
Approval-needed (NOT RUN offline): R15 live DSH/pi through the packaged router; R16 live/R-vs-C served closure; R39 live client journeys — controller approval, credentials and provider required; fixtures are not substitutes.

### 2.8 Cleanup
Remove junctions with `cmd /c rmdir`, `git worktree remove --force <clean paths>`, then delete the disposable release root explicitly.

## 3. Preflight / cache / space

- Verified: node v24.11.0; corepack present; lockfiles + `pnpm-workspace.yaml` in both trees; fixtures present; D 118.8 GB / E 443 GB free; `dist/run00-dev` and `dist/release/win32-x64` exist but are STALE.
- Offline install requires the local pnpm store to hold every lockfile dependency; verify `corepack pnpm install --offline --frozen-lockfile` succeeds in the clean pair before any build. If not, STOP (no download).
- SEA copies `process.execPath`; target win32-x64. Keep the release root absolute, on the same volume (D:), distinct from both source trees.

## 4. Risks / hazards

1. **Dependency-closure leak (S453 blocking).** Root-only `node_modules` junction is insufficient: no root `@role-model-router` scope, app-level links absolute into the current worktree, private `effect` points at the current private tree. Offline frozen install + resolve proof are mandatory.
2. **Stale identity.** Private moved `ac809d31 -> 3d03ad78`; public S448 pending. Re-pin heads/trees after commit; do not execute placeholders or old SHAs.
3. **Unsupported gate arg.** `--repo-root` is not parsed; use only `--package-dir/--static-root/--fixture-root`.
4. **Dirty current trees.** Public 143 porcelain entries (incl. 2 modified tracked files), private 3. Dirty builds emit `unsealed_dirty_test/releaseEligible:false`; package-sea throws on a dirty public worktree.
5. **Stale paired source lock.** Private lock names the old `108-…` public worktree @`b03d82a2` and private @`5a140959`; public has no lock. Always set `ROLE_MODEL_PUBLIC_WORKTREE`; lock refresh is a separate TB00 gate.
6. **Stale artifacts.** Private dist manifest binds `publicSourceTree 22bc0aa4`/`commit f3419212` and is unsealed; existing UI client and `dist/release/win32-x64` are old. Rebuild only.
7. **Release-dir deletion.** package-sea removes `<release-root>/win32-x64` recursively: use a fresh absolute disposable root.
8. **Wrong exe / channel.** Packaged executable is `role-model-dev.exe` (not the launcher); `compare-release` refuses cross-channel without `--allow-cross-channel`; preserved-R path is a placeholder.
9. **Dev distribution-root gap.** CI sets `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` to empty for development while package-sea requires the exact distribution for every channel — set it manually; no Run 88 binding on development.
10. **Corepack/pnpm offline.** pnpm is not on PATH and offline availability is UNVERIFIED; preflight with `COREPACK_ENABLE_NETWORK=0` and STOP rather than download.

## 5. Authoritative CI integration (names/parameters)

No `build:dev`, `assemble`, or `validate-release` script exists. Authoritative integration: public `pnpm install --frozen-lockfile` + `pnpm run build`; private checkout at the paired SHA + `corepack pnpm install --frozen-lockfile` + env `ROLE_MODEL_PUBLIC_WORKTREE=<public>`, `NODE_OPTIONS=--conditions=runtime` + `corepack pnpm build:run00-runtime`; public `pnpm run runtime:package-sea`; stage/prod only `node scripts/run88-stage-release.mjs --manifest <release>/<matrix.target>/manifest.json --release-id <sha256:…> --private-source <private sha>` and the production pair check `--stage-manifest … --verify-production-manifest …`. Matrix targets: linux-x64, darwin-x64, darwin-arm64, win32-x64 (local = win32-x64).

## 6. Read-only evidence for this revision (no builds/installs run)

- RED (assertion-level; held-plan assumptions): 4 FAIL exit 1 — root node_modules lacks `@role-model-router` (root-junction sufficiency false); private HEAD (`3d03ad78`) ≠ held basis `ac809d31`; `--repo-root` absent from the gate parser; app workspace links are absolute into the current (dirty) public tree, not clean-target links.
- GREEN (current facts): 16/16 PASS exit 0 — private 3d03ad78/tree c9a75617; public 6306dc9e/tree ba389574 (S448 pending); lockfiles + workspace files both trees; fixtures; supported flags (`--package-dir`, `--static-root`, `--fixture-root`, `--worker-fixtures`, `--expect-model`); app/private workspace-link evidence present.
- Syntax: `node --check` exit 0 on `verify-packaged-candidate.mjs`, `compare-release.mjs`, `audit-rendered-ui.mjs`, `build-runtime-distribution.mjs`.
- `anti_slop_lint` absolute targets with `effect:true`, `filesScanned=1`: `verify-packaged-candidate.mjs` 3 pre-existing, `compare-release.mjs` 19 pre-existing, `audit-rendered-ui.mjs` clean; no source introduced => no new finding.
- TDD not-applicable (task header); the RED checks packaging preconditions, not product TDD.

## 7. Limitations

- Nothing was executed: no installs, builds, process starts or gates. Offline-install success, clean-target resolution, SEA bytes and gate results are UNVERIFIED.
- Identity is provisional (S448 pending; private 3d03ad78). Re-anchor and re-review after the S448/private commit; the S453 HOLD remains until then.
- Development channel only; R16 needs the preserved v0.0.20 R artifact byte-identical; stage/prod need the Run 88 identity; R15/R39 live client verification needs approval/credentials/provider and is NOT RUN.
- No whole-requirement claim: R14-R18/R36-R39 remain open; E1/E2 stay deferred.

Resolve-proof status: the section-2.4 commands are FUTURE and UNVERIFIED; no install/closure PASS is claimed until they run on a post-S448 clean pair.
