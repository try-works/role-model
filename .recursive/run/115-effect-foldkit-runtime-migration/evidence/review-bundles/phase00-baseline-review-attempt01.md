## Baseline auditor report — Run 115, Phase 00 (DRAFT)

**Scope reviewed.** Read-only review of `evidence/review-bundles/phase00-baseline-bundle.md`, `00-requirements.md`, full `source-proposal.md`, `evidence/other/phase00-source-reconciliation.md`, both `phase00-worktree-prework.md` files, `phase00-baseline-round01.json` / `round02.json`, all `round02-*.log` files, `phase00-dispatch-policy.md`, `phase00-sequencing-repair.md`, `RECURSIVE.md` §§620–739 and 2296–2312, and `delegated-verification-and-refresh.md`. No edits, no child delegation, no file writes.

**Method limitation.** `pwsh` could not execute at all: every invocation failed before running with `Error: SetNamedSecurityInfoW failed (Win32 5): grantWrite(D:\DEV\role-model\.worktrees\115-effect-foldkit-runtime-migration)`. A one-shot `danger-full-access` retry was rejected because no approval channel is available. Therefore hash/status/diff commands were **NOT RUN**. Branch identities were verified by reading `.git` worktree HEAD/ref files directly.

### Verified facts

- Public worktree `HEAD` → `refs/heads/recursive/115-effect-foldkit-runtime-migration` → `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`; local `origin/dev` ref is the same.
- Private worktree `HEAD` → same branch name → `16021cc5f87f60f2d01338a29adf0002da5e8327`; local `origin/dev` ref is the same.
- Public tree `b3d5cf91435faad39d11a0dc1d65f54d8668cc2e` is asserted in public prework line 33/77 but not independently corroborated.
- Private tree `18a0e994ed3330293c8bb61931dbf44834172f41` is recorded in private prework line 33 and matches the private tree asserted in `source-proposal.md:626` for the packaged private pair.
- Asserted source hash `870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c` appears identically in bundle line 4, requirements line 6, reconciliation line 3, dispatch line 4, and handoff lines 10/25. It was **not recomputed**.
- Vendor manifests agree in both repos: Effect `4.0.1` / `460272d30457f4697d8b8c52cad41caccbcace08`, digest `0d0028aa7de72ff9e6a8e39f4bc4232640bd1111b30aaa3440d0c53116a49749`; effect-mq `v0.7.0` / `5fea694188ee33c132bed27e1f97c40533276511`, digest `aa7cae59104a2472ea5127488641643eca5498b5a4955d362b4ff37c5b76f655`. Round02 lines 65–70 repeat the same digests.
- Logged counts match receipts exactly: UI 79 files/752 tests (`round02-ui-baseline.log:175-178`); core 21/194 (`core:26-29`); protocol-routing 3/18 (`protocol:53-56`); endpoint-registry 5/16 (`endpoint:10-13`); host 5/46 (`host:22-25`); private capture/eval 24/24 (`private:29-36`); lint 0 FAIL/11 WARN (`run-lint:18-22`).
- Census spot checks found no false counts: `runtime-api.ts` has 143 exported functions, 134 exported types and 119 `/api/role-model/` lines; `routes.ts` has 20 legacy redirects; runtime-ui has 102 `.tsx` files.
- Cwd/cache handling is honest: the root-cwd SQLite 1/140 failure is correctly characterised as an invocation/registry-path failure and rerun package-cwd as 140/140; the nested pnpm11/no-TTY cached run is explicitly not treated as fresh build evidence; no whole-workspace/host/private/package/browser/live certification is claimed.
- Phase sequencing is correct: only `00-requirements.md` is active; the premature `00-worktree.md` drafts were moved to `evidence/other/phase00-worktree-prework.md`; lint records the missing worktree only as a not-reached WARN. This matches `RECURSIVE.md:2296-2312`. No false Coverage/Approval PASS and no product implementation.

### Findings

1. **BLOCKER — mandatory verification not performed.** R1 requires “source snapshot hash verified” (`00-requirements.md:31`), and the bundle requires exact hashes/status checked (bundle line 10). I could not recompute the source hash, run `git status`/`git diff`, or verify the public tree hash. This is an environment/prerequisite failure, not a proven content defect, but it prevents a PASS.

2. **MEDIUM — receipt-only verification claims.** Public release-workflows `57/57` and private source-seal `1/1` are repeated in `phase00-worktree-prework.md:63` and `CONTROLLER-HANDOFF.md:24` but do not appear in the round01/round02 receipts or logs. The round02 vendor `--verify` row records only digests, with no command/stdout, and is public-only. Capture the exact commands, exits and logs before lock.

3. **LOW — private log discoverability.** `phase00-baseline-round02.json:53-62` points at `.recursive/.../round02-private-capture-eval-baseline.log`, which resolves only under the private root. The 24/24 count is substantiated there, but the public receipt should say “private root” or mirror a safe summary.

4. **LOW — stale control-plane state.** `00-requirements.md:16` still lists “Resolve exact team model” as an open TODO although line 7 and R2 (lines 38–39) record the owner update. Both prework files still say the exact route is unresolved and name `deepseek` rather than `deepseek-official` (`phase00-worktree-prework.md:18,107`); `phase00-dispatch-policy.md:9-14` is stale despite the bundle labelling it historical; `CONTROLLER-HANDOFF.md:86` still says “Resolve exact team route selection.” Reconcile or annotate before lock.

5. **LOW — route evidence gap.** `verified-official-route.md:5` asserts an independent Zstd header decode showing provider/model, but `worker-preflight.jsonl:1-8` contains only the session id, thinking, `PREFLIGHT_OK`, usage and final text. The overlay YAML does show `provider: deepseek-official`, `model: deepseek-flash`. Store the decode evidence. Also clarify R2 line 38’s “normal tool policy is disabled” against the overlay, which disables nested delegation and config-editor but not all tools.

6. **LOW — formatting.** `SHA256870fa...` is missing a separator in bundle line 4, requirements line 6, reconciliation line 3 and dispatch line 4; `at16021...` is missing a space in bundle line 6. Not a hash mismatch, but ambiguous for machine extraction.

### Draft prerequisite gaps, not defects

E1/E2 remain explicitly unresolved (R34/R35; requirements line 305); the full clean baseline, R/D/C release isolation and lossless source inventory are not yet executed (R16/R38; round02 limits lines 88–94). These are correctly not claimed PASS.

### Verdict

**Audit: FAIL** — scope: independent baseline verification for Phase 00 DRAFT. No false baseline count, fabricated Coverage/Approval PASS, invented E1/E2 decision, or product implementation claim was found; the failure is verifiability/lock-readiness. Do not lock `00-requirements.md` or recreate canonical `00-worktree.md` from this audit until the hash/status/diff and vendor/release-workflow checks are run with durable logs and the stale control docs are reconciled, then re-audit.
