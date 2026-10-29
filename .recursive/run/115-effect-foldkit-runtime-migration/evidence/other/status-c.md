# Run115 audit area C — release/parity gates and owner-gated status

Read-only audit. Public worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration` HEAD `c6e7d0c0`; private worktree: `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration` HEAD `a6510c63`. No source edits; this file is evidence only.

## Per-gate status

| Gate | Latest actual evidence | Status | Assessment |
|---|---|---|---|
| verify-packaged-candidate | S525 final7: **12/12 PASS** (S524 final7, S505 final6, S483 final4 also pass) | **PASS — stale on current tree** | Final7 sealed exe `0.0.20-365-g50d251ab`, sha `d94d3c25…`, public `50d251ab`/private `a6510c63`. Current public HEAD `c6e7d0c0` plus uncommitted S540/S541 edits is **not** in that package. |
| audit-rendered-ui | S525: **20/20 PASS** | **PASS — stale on current tree** | Current `scripts/runtime/audit-rendered-ui.mjs` has uncommitted Studio-evidence changes; no packaged run on current HEAD. |
| dialog a11y | S525: **PASS** (aria-modal, initial focus Dismiss, Tab trapped, Escape, focus returned) | **PASS — stale on current tree** | No current-tree rerun after uncommitted UI changes. |
| ui-parity | S525: **128/128 PASS** | **PASS — stale on current tree** | Same final7 package; uncommitted S540/S541 UI is outside it. |
| parity-selfcheck | S525: **PASS harness** (React/Foldkit deterministic; mutation detected; reactVsFoldkit classification `different`) | **PASS harness / BLOCKED acceptance** | The one remaining visual item is owner delta approval; no 0.9/visual parity claim. |
| validate-packaging | S525: **PASS** (healthy, 8 models, 28 roles, taxonomy 1.0.0-alpha.1, 13 extensions, packaged-env chat) | **PASS — stale on current tree** | Needs seal/rerun after S540/S541 and current commits. |
| compare-release | Not run. Preserved R artifact **exists now** at `D:/role-model-router/0.0.20` (exe sha `718d71f5…`; E:/rm-tmp/r-stage copy matches). | **RUNNABLE / NOT RUN** | Both exes exist, fixture root exists, distinct nonoperator ports available. Old R is **production**; final7 candidate is **development** (`role-model-dev.exe` sha `d94d3c25…`), so the gate requires deliberate `--allow-cross-channel`; without it exits 2. It is runnable now but the result would compare production 0.0.20 to the final7 dev package, not current HEAD. |
| real-client R15/R16-live/R39 | No approval or run evidence found | **BLOCKED / NOT RUN** | Owner approval required; prior evidence explicitly says approval-gated. |
| E1/E2 | Owner-approved named deferrals (`owner-scope-decision.md`, 2026-10-24): E1-storage-authority-protocol, E2-durable-live-inference-protocol | **DEFERRED / CLOSED for this run** | Not missing work; owner explicitly deferred both, no other waiver implied. |
| stage/prod Run88 identity | No authorization evidence | **BLOCKED / NOT RUN** | Separate owner authorization required; development-channel packaged evidence is not promotion. |
| vision quota / visual-delta approval | S525/S484: `reactVsFoldkit` still `different` on route `/`; 429 quota across 4 rounds | **BLOCKED** | Needs vision-capable quota or explicit owner delta approval; cannot be replaced by code-only evidence. |

**Overall:** development-channel packaged gates are green on **final7**, but the current public tree contains uncommitted UI changes and no fresh sealed package. Compare-release is now technically runnable, but real-client/stage-prod/visual approvals remain owner-gated. Release parity is **not complete**.

## Uncommitted work inventory

### Public worktree (HEAD c6e7d0c0)

Modified tracked files:
- `role-model-router/apps/runtime-ui-next/src/families-view.ts`
- `src/view.ts`
- `src/features/learning/routes.ts`
- `src/features/models/routes.ts`
- `scripts/runtime/audit-rendered-ui.mjs` (+22 lines Studio evidence/Network diagnostics)
- `evidence/other/s294-captures/foldkit-run0.png`, `foldkit-run1.png`, `react-run0.png`, `react-run1.png` (new deterministic pairs; baseline react PNGs unchanged)
- `evidence/other/workspace-pin-decision.json` (adds manifest URL/content hash; `manifestHashScope` honestly notes readable JSON, not wire digest)

Untracked work of interest:
- `role-model-router/apps/runtime-ui-next/test/s541-density.test.ts` (hash `016F10DE…`) — S541 frozen test, not committed.
- 136 untracked entries, including `%SystemDrive%/` (junk/expanded env artifact), hundreds of historical `evidence/logs/s2xx*` files, `evidence/router/*`, and task docs. These must be classified/committed or removed; do not delete evidence blindly.

### Private worktree (HEAD a6510c63)

- Modified: two remediation-proposal JSON files under `00-direct-track-b-v1-1-implementation/evidence/.../cloud-local/`; `evidence/other/s345b-b10-ledger-review.md`.
- Untracked: `evidence/logs/s353b-green2.log`, `s363b-green3.log`; `tests/track-b/fixtures/`.
- Private source itself is committed at `a6510c63` (ledger enumeration); the modified files are evidence/fixture inventory, not product source.

## Pending reviews / frozen work

1. **S540** implementation is committed as `c6e7d0c0` (system/local density), but the current public `view.ts`/`families-view.ts` modifications (final local-peers/control fixes) are **uncommitted**. The independent S542 review is PASS; commit/freeze the final source.
2. **S541** is frozen only in the working tree: untracked `test/s541-density.test.ts`, modified learning/models routes and view, and `s541-audit/green/red` logs. **No independent S541 review artifact exists**; it needs review + commit.
3. `scripts/runtime/audit-rendered-ui.mjs` uncommitted Studio evidence changes need review/commit or revert; they are used by the R39 rendered audit.
4. `s294-captures` PNG modifications and `workspace-pin-decision.json` need an evidence decision (commit the regenerated deterministic captures / pin, or revert). The baseline vs current react PNG size differs (84686 vs 84824), so classify before accepting.
5. Private `s345b` review/evidence and lifecycle JSON changes need disposition; untracked `s353b`/`s363b` logs and fixtures need preserving or cleanup.
6. `%SystemDrive%/` in public untracked is not evidence; remove after confirming no data inside.

## Ranked next actions

1. **Freeze/commit current public S540/S541 source+tests** and resolve the untracked s541 test; obtain independent S541 review. Build a **fresh sealed candidate** from current HEAD. Do not reuse final7 as current-tree evidence.
2. **Run compare-release now that R exists**: use old `D:/role-model-router/0.0.20/role-model.exe` and a current candidate exe, distinct nonoperator ports, `--fixture-root D:/DEV/role-model/testdata/router-runtime/fixtures`; add `--allow-cross-channel` only if the production-R vs development-candidate comparison is explicitly accepted (otherwise obtain/build the intended channel). Record exact command, exit code, endpoint classifications/deltas, and identity versions.
3. **Rerun the packaged gate set on the fresh candidate:** verify-packaged-candidate 12/12, audit-rendered-ui 20/20, dialog a11y, ui-parity 128/128, parity-selfcheck/mutation, validate-packaging. Current final7 results are historical only.
4. **Owner gates:** visual-delta approval (vision quota/429 or explicit delta), real-client R15/R16-live/R39 approvals, stage/prod Run88 identity authorization. E1/E2 need no action (deferred).
5. **Evidence hygiene:** classify/commit s2xx logs and router evidence; commit s294 deterministic captures only after comparison; remove `%SystemDrive%/`; resolve workspace-pin decision; preserve private s345b/fixtures.
6. **Do not claim release parity or promotion** until 1–4 complete; development-channel final7 PASS is not stage/prod acceptance.

