# S298 — independent review: S297 R14 mutation-check slice

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only review; no product file modified, no commit, no tests or runtime launched by me.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `AE8121E01CB4286A879EA2BFE69B987F0AD4A436939B49FA5C8B6627B4524B6A` | 27631 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `DC9C8C67FDFD84D341BBF2DCAE9528E69B8DC8304498819F2EC2412D5BD27888` | 16401 |
| `scripts/runtime-parity.mjs` | `C682467D189460049A586E67F673D68C7830CD392245081A4AF69541636482D3` | 1578 |

All hashes match. Dispatcher is byte-unchanged from the S295 baseline (hash and `git diff` both clean). Diff against the S295-final baseline (runner `3EBC195F…`, test `6C3E0AE1…`): `parity-selfcheck.mjs` +139/−? (git stat: 139 insertions), `parity-selfcheck.test.mjs` +84 insertions; the only runner edit outside the new mutation functions is the `main({mutation})` branch and the `isMain` argument parse. The normal S294 lane is otherwise untouched.

## Q1 — Non-tautology: detection derives only from capture shas

**PASS.** `evaluateMutationCheck` computes `noFalseMutation = baselineShas.length === DEFAULT_RUN_COUNT && all baseline shas equal` and `mutatedDiffers = mutatedSha !== undefined && every baseline sha !== mutatedSha`; it sets `detected = noFalseMutation && mutatedDiffers` (runner `:81-84`). `reportedDetected` is never used to set `detected`; it is only a consistency check that fails on disagreement (`:87-89`). The mutation code path writes a CSS file and never sets a “mutated” flag consumed by the verdict. RED tests encode the blind cases: identical mutant sha → `FAILED mutation-not-detected` (`test:345-354`), `reportedDetected:false` with differing shas → `FAILED inconsistent-detection` (`:356-365`), baseline-pair drift → `FAILED nondeterministic` (`:367-376`). No self-report can create a PASS.

## Q2 — One-class precision

**PASS.** `prepareMutationRoot` copies the React static root, selects one shipped CSS asset, requires `.flex{display:flex}`, and performs one `String.replace` for the first occurrence (`runner:44-59`). It writes only that CSS file; no JS/HTML rewrite and no second class. `classMutation` records `file: assets/<actual-css>`, `selector: ".flex"`, `from: "display:flex"`, `to: "display:block"` (`:55-58`), matching the real JSON (`assets/root-Bljja8hb.css`). The large visual change is expected because `.flex` is a Tailwind utility used broadly, but the mutation itself is one declaration. No broad rewrite.

## Q3 — Mutation-mode provenance

**PASS for the contract.** `runMutationCheck` captures two baselines (runs 0/1) and one mutant (`runner:100-106`); `evaluateMutationCheck` requires exactly `DEFAULT_RUN_COUNT` baseline shas and identical values (`:81`), so a single baseline cannot PASS. `mutatedDiffers` is a real sha comparison against every baseline (`:82`). Main’s mutation branch captures baseline0, baseline1 and the mutant separately (`:547-563`). One residual observation: the predicate enforces the baseline pair’s length/equality but not a separate run identifier (the injected adapter could supply two identical captures from one run); the CLI path produces separate captures, and this does not allow a one-capture PASS.

## Q4 — Shared port / false detected

**PASS.** `mutationPort` is allocated once and passed to all three `captureServed` calls (`runner:554-558`), so the rendered endpoint URL is constant and a sha difference is attributable to the served CSS, not the port. Each capture gets a fresh `stateRoot` (mkdtemp) and a fresh host process (`:472-497`), and `captureWithChrome` uses a fresh browser context; baseline pair equality (real: `1096eb95…` twice) proves no warm-state artifact. The mutant is captured last, so a stale cache could only cause a false negative (mutation-not-detected), not a false positive. Cross-pair determinism remains meaningful: baseline pair identical + mutant differs.

## Q5 — Invariants

| Invariant | Status |
| --- | --- |
| E: temp-drive fail-fast | **PASS** — guard runs before the mutation branch; real `tempRoot E:\rm-tmp`. |
| exe identity | **PASS** — real JSON has `0.0.20-231-gd61c32dc` / `e3181d50…`. |
| favicon partition | **Code preserved** — `captureWithChrome` partitions; mutation path does not surface the ignored list (below). |
| **ignoredIssues emission** | **FAIL** — mutation result has no `ignoredIssues`/per-capture list and no `ignoredCount`. `captureWithChrome` returns them, `evaluateMutationCheck` drops them (only `issues` at `:80`), and main passes only `issues` (`:559-563`). Real JSON has neither, contradicting the task/evidence docs’ “ignoredIssues/ignoredCount” invariant. |
| exit codes | **PASS** — PASSED/FAILED/NOT_RUN map 0/1/2; mutation real exit 0. |
| `--selfcheck` branch unchanged | **PASS** — dispatcher hash and `git diff` both zero. |
| no operator ports | **PASS** — no 3456/3457/3458 strings; ephemeral port only. |
| anti-slop clean | **PASS** — three files clean (exact invocations below). |

## Q6 — Scope honesty

**Partially confirmed; doc repair required.** The task/evidence docs correctly record that option (a) mutates the shipped artifact rather than `packages/ui` source, that the captured React route emits no `packages/ui`-only class, and that `.flex` is a Tailwind utility (task:16-25; evidence:9-20,56-61). That is accurate. However, the record does not explicitly state what a full source-level `packages/ui` check would still require (rebuild the React app/UI package after the source class change, confirm the class is actually emitted on the captured route, capture that rebuilt artifact, and compare). The deviation says option (b) was not chosen; it does not define the remaining source-level evidence.

## Q7 — Mutation CLI vs dispatcher

**PASS.** `--mutation` exists only in the runner’s `isMain` argument parse (`runner:615-619`); the dispatcher `runtime-parity.mjs` remains byte-identical `C682467D…` and exposes no mutation route. Mutation mode is runner-internal as intended.

## anti-slop

Exact invocations (absolute paths):
```
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.test.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime-parity.mjs" })
```
All three **clean**, 1 file scanned each, 15 rules, no findings.

## Evidence cross-check

`s297-red.log`: 26 tests, 6 mutation tests failed first (the six names above); `s297-green.log`: 26/26. `s297-real.log`: exit 0 PASSED; baseline `1096eb95…` twice, mutant `a5db4488…`; mutationCheck `detected:true/noFalseMutation:true/mutatedDiffers:true`; mutant and baseline PNGs exist under the run evidence dir (baseline0/1 identical, mutant different). No `ignoredCount`/`ignoredIssues` in the emitted JSON.

## VERDICT: HOLD (2 required repairs)

1. **Emit mutation-mode `ignoredIssues`/per-capture ignored lists and `ignoredCount`** in the mutation JSON (and add a test); currently the mutation path drops them, contradicting the task contract and the evidence doc’s invariant claim. Optionally include the three capture PNG paths for auditability.
2. **Complete the scope record:** add the explicit remaining full source-level `packages/ui` check (source change → rebuild UI/React → confirm the emitted class on the captured route → capture/recompare), rather than only “option (a) allowed”.

Residual non-blocking: mutation provenance enforces baseline count/equality but not a distinct-run identity (CLI path does use distinct captures); mutation JSON also omits capture evidence paths beyond `evidenceDir`.

## Re-review (final corrected bytes) — FINAL PASS

**Hash correction:** the first repair message carried pre-lint bytes (`171FEB76…`, 29029 B). The final runner after replacing the two conditional-spread lint findings is **`99A57A6B4F245A9F19AE493B305E95760ACA031D45D12E272A7DF9C3C151CB21` (29070 B)**, verified against the working tree; test **`792AC15974E02F0AC33FE4D9BE6282CE5A3566A0853B0D58847EE9B3FC7C9531` (18048 B)** and dispatcher **`C682467D…`** verified unchanged. The earlier 171FEB value is superseded and is not a review failure.

### 4/4 closure

1. **Mutation ignoredIssues/ignoredCount — CLOSED.** `evaluateMutationCheck` builds `captureSurface` with per-capture `ignoredIssues`, a per-target ignored list, top-level `ignoredCount`, and `targets` (`runner:70-130`); the test at `test:408-434` asserts per-capture/per-target lists, count and role/run. Real2 JSON: `ignoredCount:2`, baseline0 favicon pair, other captures empty. The prior evidence-doc invariant claim is now true.
2. **Scope follow-on — CLOSED.** `evidence/other/s297-r14-mutation-check.md:39-44` names the full source-level follow-on (source class change → rebuild React → confirm emitted in shipped CSS/JS → capture baseline+mutant → recompare); the task doc records the same at lines 57-60. It no longer merely says option (a) was allowed.
3. **Baseline provenance — CLOSED.** Mutation target captures carry `{role:"baseline", run:0}`, `{role:"baseline", run:1}`, `{role:"mutant", run:0}` (`runner:74-90`); real2 JSON confirms those roles/runs.
4. **PNG evidence — CLOSED.** `captureSurface.evidence` records `baseline:[baseline0,baseline1]` and `mutant:mutated` paths (`runner:103-108`); real2 JSON contains all three run-evidence PNG paths.

### Additional checks

- **sha-only detection retained:** the verdict still derives only from baseline/mutant sha comparisons; `reportedDetected` remains a consistency failure, never a source of PASS (`runner:63-67,127-138`). `MUTATION_FROM/TO` and the single `String.replace` are unchanged (`:43-61`), so one-class precision holds.
- **Provenance:** exactly two baseline captures are required and must match; mutant is a single sha differing from both (`:127-138`); a one-capture PASS remains impossible.
- **Shared-port attribution:** unchanged single `mutationPort` for baseline0/1 + mutant; fresh state roots/hosts/contexts; mutant last means a cache can only false-negative, not false-positive.
- **Invariants:** E: fail-fast, exe identity, exit codes 0/1/2, favicon partition, dispatcher `C682467D…` byte-unchanged, no operator ports — all present in code/real2.
- **Conditional-spread replacement:** anti-slop is clean on all three files; the explicit branches produce the same arrays (all captures/evidence present in test and real2), and 27/27 GREEN plus exit 0 real run show no behavior change.
- **Real evidence:** `s297-red2.log` 27 tests with 1 new failure first; `s297-green2.log` 27/27; `s297-real2.log` exit 0 PASSED, baseline `560ec387…` twice, mutant `fe8ea8fe…`, `ignoredCount 2`, evidence paths and role/run present.

Non-blocking record note only: `tasks/s297-r14-mutation-check.md:65-66` still carries the superseded first-run shas (`41106f06…`/`195f9a03…`); the authoritative evidence doc and real2 log use the corrected `560ec387…`/`fe8ea8fe…`. This does not affect the lane, but the plan doc should be updated before commit.

## FINAL VERDICT: PASS

All four S298 items are closed on the corrected final bytes, the two residuals are closed, detection/one-class/provenance/port/E:/exit/dispatcher/anti-slop checks pass, and the real evidence is from the corrected bytes. No remaining numbered repairs.

No product file was modified; no commit made.

