# S453 — independent review of S450 paired-package plan

Verdict: **HOLD** (clean-pair source closure is not proved by the proposed node_modules junction; plan
basis is stale; one gate command contains an unsupported argument). Read-only review; no builds,
downloads, installs, process starts, or source/config edits.

Reviewer model: **deepseek-flash** verified via `list_agents`.
Plan reviewed: `evidence/other/s450-package-plan.md` (sha256 `C415A39B63954ADA5BBCBAF67C371572735D2E1C25DF086EC10C1BC3FB2B033A`).
Current heads at review: public `6306dc9e` (matches plan), private `3d03ad78` (plan pins `ac809d31`).
Public S448 is still pending; the plan basis is intentionally old and MUST be refreshed after the S448/private
commit before a build. The plan's own exact-head commands would otherwise build the old private tree.

## Blocking finding — clean-pair node_modules junction does not establish source closure

The plan proposes creating clean detached public/private worktrees and junctioning only each worktree's
root `node_modules` to the current tree, asserting "no install is needed" and that the clean build is exact.
The current evidence contradicts that:

- The public root `node_modules` has **no** `@role-model-router` directory (`Test-Path node_modules/@role-model-router` = false).
- Per-app node_modules carry the workspace links as **absolute junctions** to the current tree, e.g.
  `role-model-router/apps/runtime-ui-next/node_modules/@role-model-router/foldkit` and
  `.../effect-platform-browser` target
  `D:\DEV\role-model\.worktrees\115-effect-foldkit-runtime-migration\role-model-router\packages\...`;
  the host bridge has the same absolute junctions for `core`, `catalog`, `effect`, etc.
- The clean worktrees have no app-level `node_modules`; the plan does not junction or install them. A root-only
  junction therefore cannot satisfy app imports. The build helper explicitly runs
  `corepack pnpm --filter ... run build` in the clean public tree
  (`scripts/track-b/public-runtime-build.mjs:34-64`), which requires those app dependencies.
- Even if the app-level node_modules were junctioned, the workspace links are absolute to the original tree, so
  resolution would read original (dirty) packages rather than the clean checkout. The app/host tsconfigs have no
  `paths` alias; `moduleResolution: "Bundler"` resolves the package links. This affects Effect wrappers, Foldkit/
  Foldkit-UI, and the host packages; it is exactly the sideways-resolution hazard in the Lead note.
- Consequence: the no-install plan either fails at the first `pnpm --filter`/TypeScript resolution or builds from
  the original source while claiming clean closure. Source closure cannot be proved from these junctions.

Required before execution: use an actual frozen-lockfile install in both clean worktrees (offline store is
acceptable; no network download is required by this review), or construct node_modules whose
`@role-model-router/*` and `effect`/`effect-mq`/`@effect/sql-sqlite-node` links all target the clean package
directories and only third-party store links point at the shared store. Then verify with `Get-Item ... Target`
and `require.resolve`/module resolution from the clean app roots. Do not proceed on the current junction claim.

## Other concrete findings

1. **Unsupported gate argument.** The plan's
   `node scripts/runtime/verify-packaged-candidate.mjs --package-dir ... --repo-root ... --fixture-root ...`
   includes `--repo-root`; `verify-packaged-candidate.mjs:18-36` accepts only `--package-dir`, `--static-root`,
   and `--fixture-root` (unknown flags are ignored). Remove it or use `--static-root`. The `compare-release`
   flags in the plan (`--left-exe`, `--right-exe`, ports, state roots, `--fixture-root`, `--allow-cross-channel`)
   are real parsers (lines 8-32); the preserved R path is still a placeholder and cross-channel needs the flag
   explicitly. `audit-rendered-ui --exe/--static-root`, `system-proof --check phases|semantics|generated`, and
   `run-command-test TB11-CMD-05` are valid (TB11-CMD-05 exists in the pinned assurance registry).
2. **Stale basis.** Private has moved from plan `ac809d31` to `3d03ad78`; public S448 is pending. Re-pin the
   plan heads/trees after commit and re-run the clean-pair preconditions; do not execute the listed SHAs.
3. **Confirmed claims.** The dev workflow does set `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` to empty for
   development (`.github/workflows/build-binaries.yml:372`) while `validatePairedReleasePackagingInputs`
   requires the exact distribution for every channel (`package-sea.ts:60-61`); setting it manually is required.
   The private source lock still points at the old 108 public worktree (`tb00-release-source-lock.json`), the
   clean/dirty seal semantics are as quoted (`build-runtime-distribution.mjs:66-81,425-432`), and
   `package-sea.ts:1006-1007` deletes the release target, so the fresh absolute `ROLE_MODEL_RELEASE_OUTPUT_ROOT`
   warning is mandatory. No operator ports are used by the plan.

## Bounded status

- Plan warning about stale distribution/stale artifact/wrong exe/channel is factual; no deletes of existing
  release/operator state are proposed if the fresh disposable root is enforced.
- No build/gate was executed. No product/config source was modified.
- The blocking clean-pair closure point and stale heads prevent a PASS; resolve them and re-review before the
  approved clean-pair build.


## S453 final re-review — repaired plan (hash `77DFF5BD...`)

Verdict: **HOLD (bounded, plan safety)** — the clean-pair/offline-install repair is directionally correct and
the old junction/closure blocker and `--repo-root` error are addressed, but the mandatory resolve proof
cannot pass as written; the plan is not executable until corrected. No builds/downloads/installs were run.

Verified repaired plan sha256: `77DFF5BD2536B325A52C9F2871F6E836C65A62F872930C5FB3BF70A428E9C92F`.
Current identities: public `6306dc9e` tree `ba389574...` (S448 pending); private `3d03ad78` tree
`c9a75617...`. The plan correctly marks identity provisional and non-executable until S448/private refresh.

### Repairs confirmed

- Root-only node_modules junction removed. Plan now requires offline frozen-lockfile install in BOTH clean
  worktrees with `COREPACK_ENABLE_NETWORK=0`/`PNPM_CONFIG_OFFLINE=true`, STOP on cache miss (no download);
  clean-target workspace links or install, plus private `effect`/`effect-mq` checks.
- `verify-packaged-candidate` now uses only supported `--package-dir`, `--static-root`, `--fixture-root`;
  `--repo-root` is removed. `compare-release`, `audit-rendered-ui`, `system-proof`, and `TB11-CMD-05`
  arguments remain supported.
- Dev distribution-root gap, stale source lock, dirty/seal semantics, release-target deletion, channel
  hazard, and no-operator-port constraints remain accurately documented.

### Remaining concrete blockers in the proof commands

1. **Windows path comparison fails even for a correct clean install.** Section 2.4:
   `$target = ($_.LinkTarget -join ''); if (-not $target.StartsWith('<clean>/115-public')) { throw ... }`
   `LinkTarget` returns a Windows path with backslashes (verified:
   `D:\DEV\...\packages\foldkit`), while the literal uses `<clean>/115-public` with forward slashes. The
   prefix check is also case-sensitive. Every clean junction can therefore throw `LEAK`, preventing the build.
   Normalize with `[IO.Path]::GetFullPath(...)`, replace `/` with `\`, and compare OrdinalIgnoreCase (or
   compare resolved paths).
2. **`require.resolve('@role-model-router/core/package.json')` is invalid.** `packages/core/package.json`
   exports only `"."`; there is no `./package.json` export, so the command throws `MODULE_NOT_FOUND` even when
   the link target is correct (verified against the current app). Use the package entry
   (`@role-model-router/core`) or a direct link-target check for core; keep `foldkit/package.json` and
   `effect/package.json` which are exported.
3. **Proof scope is narrower than the claim.** It checks sample app paths (`foldkit`, `core`, `effect`) and
   private `effect`/`effect-mq`; it does not explicitly prove every `@role-model-router/*` link (including
   `effect-platform-browser`/Foldkit-UI/http-facing packages) or `@effect/sql-sqlite-node` resolves from the
   clean tree. The `Get-ChildItem apps/*/...@role-model-router` guard covers app workspace links, but add the
   remaining package names (or enumerate all package.json names) and `@effect/sql-sqlite-node`.

### Plan-safety conclusion

No unsafe deletion/operator-port/network behavior is proposed: the release root is explicitly fresh and the
plan stops on missing store or non-clean pair. Lead's `COREPACK_ENABLE_NETWORK=0` + pnpm 10.6.5 check is
consistent with the preflight. The remaining defects are proof-command false negatives, not unsafe actions;
fix the three items and re-review. No build or product/config write was performed for this review.


## S453 final proof-doc re-review — HOLD (plan safety only)

Reviewed frozen plan hash: `FEF046A9BC2132572F5CC9F8A6D0BB8B4CA92262B9B1B5F159C0B08C5BFC29B9`.
No builds/installs/product/config writes. Identity remains provisional (public S448 pending; private
`3d03ad78`).

Repairs confirmed: Windows `[IO.Path]::GetFullPath` + OrdinalIgnoreCase normalization; `core` entry instead of
`core/package.json`; all-public workspace scopes plus @effect/sql-sqlite-node and private wrapper enumeration;
future/UNVERIFIED resolve proof marked; identity refresh mandatory.

### Remaining concrete blocker in the resolve proof

The final node proof asks **both apps to resolve all four specs**:

```js
for (const app of [runtime-ui-next, runtime-host-bridge])
  for (const spec of ["@role-model-router/foldkit", "@role-model-router/core", "effect", "@effect/sql-sqlite-node"])
    require.resolve(spec, { paths: [app] })
```

That is not the current dependency graph. Verified against the current tree:
- `runtime-ui-next`: foldkit and effect resolve; `@role-model-router/core` and `@effect/sql-sqlite-node` are
  `MODULE_NOT_FOUND` (UI does not depend on them).
- `runtime-host-bridge`: core, effect, and @effect/sql-sqlite-node resolve; `@role-model-router/foldkit` is
  `MODULE_NOT_FOUND` (host does not depend on it).

A correct offline install will still fail this proof for normal package-graph reasons, so the plan remains
non-executable even with clean links. Fix: derive the expected specs per app from its package.json (or an
explicit per-app list), e.g. UI: foldkit/effect; host: core/effect/@effect/sql-sqlite-node; keep the
all-links enumeration proof as the closure check. Do not use a cross-product.

### Safety conclusion

The plan's safety posture is otherwise sound: no root junction, offline install with STOP on store miss, clean
target/leak checks, fresh disposable release root, no operator ports or state deletion. No build was run. Fix
the per-app resolve list and the proof can be re-reviewed; PASS is not yet justified.


## S453 final plan-safety re-review — PASS (bounded)

Reviewed frozen plan hash: `3725019281FFCEBF40632B577D91B0DBC53839C1AC787C9FA3C6F8667535DFE1`.
No builds/installs/product/config writes. Plan identity remains explicitly provisional (public S448 pending;
private `3d03ad78`), and the resolve/install proof is explicitly FUTURE/UNVERIFIED; no closure PASS is claimed.

- Per-app resolve command is now correct: UI `@role-model-router/foldkit` + `effect`; host
  `@role-model-router/core` + `effect` + `@effect/sql-sqlite-node`. Verified those packages currently resolve
  from the respective apps; the previous cross-product blocker is gone.
- Windows proof uses `[IO.Path]::GetFullPath` and OrdinalIgnoreCase; `core` uses the package entry, not
  `core/package.json`; all public workspace scopes, `@effect/sql-sqlite-node`, and private wrapper links are
  enumerated. Spot-testing the exact depth/filter commands found 29 public workspace scopes and one
  `@effect/sql-sqlite-node` link in the current tree, so the enumeration is not vacuous.
- The plan still stops on missing local store/no network, uses a fresh absolute disposable release root, and
  never targets operator ports/state; no unsafe deletion is proposed.
- One non-blocking documentation correction: `@effect/sql-sqlite-node` is currently a workspace link
  (`role-model-router/packages/sql-sqlite-node`), not a third-party store package. The section-2.4 expected
  sentence should not permit store resolution for it; the all-link enumeration already enforces the clean
  workspace target, so the proof is safe but the prose is inaccurate.
- Install success, clean-target resolution, SEA bytes, and gate results remain UNVERIFIED until the operator
  runs the proof on the post-S448 clean pair. This is not a plan-safety blocker and no build success is claimed.

**Plan-safety verdict: PASS (bounded).** Identity refresh and the future install/resolve proof remain mandatory
before execution.
