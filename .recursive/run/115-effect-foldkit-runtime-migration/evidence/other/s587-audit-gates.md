# S587 — audit-gates: run 115 gate/verification inventory

Read-only audit. Public worktree HEAD `f3d700c6`; private worktree HEAD `23bed5f5`. No source/test/config edits; this report is the only file created.

## Gate table

| Gate | Last run / evidence | Result | Artifact / commit | Stale? |
|---|---|---|---|---|
| Public tree clean | `git status` 2026-10-31 | **1 untracked** `.audit-s586.log`; otherwise clean | f3d700c6 | **Claim false** (not clean) |
| Private tree clean | `git status` 2026-10-31 | **0 status entries** | 23bed5f5 | Clean tree; **stash@{0} paired-build** still holds pre-existing dirt |
| Sealed artifact version/hash | manifest before packaging attempt; exe hash rechecked | Version **0.0.20-438-gf3d700c6**; exe sha `fdf24416…` (104,928,768 B) | role-model-router/dist/release/win32-x64 | Exe present; **manifest now absent** |
| validate-packaging | `corepack pnpm run runtime:validate-packaging` (root) | **FAIL exit 1** — “Packaged runtime requires a clean public worktree”; first attempt from app cwd also failed exact-private-distribution | f3d700c6 | **Not green** |
| verify-packaged-candidate | `corepack pnpm run runtime:verify-packaged-candidate` (root) | **NOT RUN exit 2** — “no manifest.json beside the executable”; failed packaging removed manifest | same artifact | **Not run on current 438** |
| UI suite | `vitest run` in runtime-ui-next | **809/809 pass, 77 files** | source f3d700c6 | Current; green |
| UI tsc | `tsc --noEmit` | **0** | f3d700c6 | Current; green |
| ui-parity | `corepack pnpm run runtime:test-parity` | **128/128 pass, 4 files** | source f3d700c6 | Current; green |
| audit-rendered-ui | S581 claim only (no raw log for current artifact) | **20/20 claimed** on 4284fea5 / 0.0.20-432 | S581 | **Stale/unverified on 438** |
| dialog-a11y-audit | S581 claim only | **PASS claimed** on 4284fea5 / 432 | S581 | **Stale/unverified on 438** |
| compare-release (current) | No current-438 run found | **NOT RUN** | — | **Open** |
| compare-release (historical) | S548 final8; S559 final9, preserved R at `D:/role-model-router/0.0.20` (0.0.20 production, sha 718d71f5…) with `--allow-cross-channel` | final8: 6 same, telemetry environment-state, healthz/runtime additive-shape. final9: same shape | S548/S559 | Historical only; current 438 not compared |
| FINAL-STATUS.md | Round 162, dated 2026-10-26 | Historical 5 verified / 2 implemented / 32 blocked; not current | — | **Stale** |
| S581 sealed-gates doc | Built from public 4284fea5 / version 432; says compare-release NOT RUN because preserved artifact unavailable | Version/state do not match current 438; preserved artifact **does exist** and prior compares ran | S581 | **Stale/inaccurate** |

## Owner-gated items

1. **R15 live provider** — real client/provider journey; no approval/run evidence.
2. **R16 seeding approval** — like-for-like controlled fixture/seeding permission; owner decision.
3. **R39-live CI dispatch/toggle** — one dispatch run plus `vars.R39_VERIFY_BLOCKING`; not evidenced.
4. **Stage/prod Run88 identity** — owner authorization; development-channel artifact is not promotion.
5. **Pixel visual-delta sign-off** — `reactVsFoldkit` still reports `different`; vision quota/owner approval absent.

E1/E2 remain owner-approved named deferrals, not open gates.

## Verification debt

- **Failed packaging mutated the candidate:** the initial manifest named 438 and exe `fdf24416…`; the failed `validate-packaging` run left no `manifest.json` beside the exe. `verify-packaged-candidate` therefore cannot pin/run until packaging is rebuilt from a clean tree.
- **Clean-tree precondition is broken:** `.audit-s586.log` is untracked at public root; packaging refuses it. The “claimed clean” premise is false until that file is committed/removed by the Lead.
- **No current packaged gate evidence on 438:** audit-rendered-ui 20/20 and dialog-a11y PASS are S581 claims for 4284fea5/432, not the 438 artifact.
- **S581 docs are stale:** they claim compare-release not run because the preserved artifact is unavailable, but `D:/role-model-router/0.0.20` exists (exe 718d71f5…) and S548/S559 ran the compare on final8/final9. The current 438 candidate still lacks its own compare run.
- **Private pairing:** private worktree is clean at 23bed5f5, but stash@{0} (“paired-build”) still contains the pre-existing dirt; validate’s exact-private-distribution check cannot pass without rebuilding/matching the paired private distribution.
- **FINAL-STATUS** is a historical round-162 snapshot, not an authoritative current gate list.

## Bottom line

Source-level UI gates are reproducible and green (809/809, tsc 0, 128/128). The **packaged/release gates are not currently runnable**: public tree is not clean, failed packaging removed the manifest, and the current 438 artifact has not been re-verified. The owner-gated list remains R15/R16/R39-live/Run88/visual-delta; compare-release has historical runs on final8/final9 but not on current 438.

