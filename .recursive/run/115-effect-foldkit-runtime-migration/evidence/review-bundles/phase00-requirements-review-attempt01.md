# Phase 00 Requirements Audit — read-only independent review

**Scope:** Phase `00 Requirements` DRAFT only. Audited `.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md` (R1–R38) against the full 61-heading `source-proposal.md`, the preserved Phase-0 setup evidence, dispatch policy, baseline receipts, and applicable `.recursive/RECURSIVE.md` audit rules.

**No edits, no child delegation, no provider/runtime calls were performed.** The review did not claim implementation or product acceptance.

---

## 1. Inputs actually read

- `00-requirements.md` (full)
- `source-proposal.md` (full, 1,357 lines)
- `evidence/other/phase00-source-reconciliation.md`
- `evidence/other/phase00-sequencing-repair.md`
- `evidence/other/phase00-worktree-prework.md`
- `evidence/other/phase00-baseline-round01.json`
- `evidence/other/phase00-baseline-round02.json`
- `phase00-dispatch-policy.md`
- `evidence/other/team-model-routing/verified-official-route.md`
- `CONTROLLER-HANDOFF.md`
- `evidence/other/round03-team-model-blocker.md`
- `evidence/logs/round02-run-lint.log`
- `.recursive/RECURSIVE.md` lines 270–344, 481–620, 735–785, 905–974
- `.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`
- `vendor/effect/VENDORED.json`
- `role-model-router/packages/effect/package.json`

No addenda exist.

---

## 2. Hash / git / diff-basis checks

**Tooling limitation:** shell verification was unavailable. `pwsh` failed before executing any command with:

`SetNamedSecurityInfoW failed (Win32 5): grantWrite(D:\DEV\role-model\.worktrees\115-effect-foldkit-runtime-migration)`

Escalation to `danger-full-access` was refused because no approval channel exists. I therefore did **not** recompute hashes or run `git rev-parse`/`git status`. This is a review limitation, not a claim that the files are wrong.

**Declared hashes checked for consistency:**

- `source-proposal.md` SHA-256 `870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c`
  - `00-requirements.md:6`
  - `evidence/other/phase00-source-reconciliation.md:3`
  - `phase00-dispatch-policy.md:4`
  - `evidence/review-bundles/phase00-requirements-bundle.md:4`
  - `CONTROLLER-HANDOFF.md:10,25`
  - Consistent as declared, but **not independently recomputed** — hash verification is NOT RUN, not PASS.

- Public commit `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
  - `00-requirements.md:23`, `phase00-worktree-prework.md:33,76`, bundle `:5`
- Private commit `16021cc5f87f60f2d01338a29adf0002da5e8327`
  - `00-requirements.md:23`, `phase00-worktree-prework.md:76`, bundle `:6`
- Public baseline tree `b3d5cf91435faad39d11a0dc1d65f54d8668cc2e`
  - only `phase00-worktree-prework.md:33,77`
- **Private baseline tree: absent** from all reviewed evidence.
- `vendor/effect/VENDORED.json:6-8` records `effect@4.0.1`, commit `460272d30457f4697d8b8c52cad41caccbcace08`; `role-model-router/packages/effect/package.json:3` records `4.0.1`. This is consistent with `source-proposal.md:95,113`.
- `VENDORED.json:33` content digest `0d0028aa7de72ff9e6a8e39f4bc4232640bd1111b30aaa3440d0c53116a49749` matches `phase00-baseline-round02.json:68` `effectDigest`. That is a cross-file consistency check, not a recomputation.

**Diff basis:** no canonical `00-worktree.md` exists; the bundle states this is because prerequisites are not locked. The preserved prework records:

- Baseline: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Comparison: `working-tree`
- Command: `git diff --name-only f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Note: inventory untracked run files via `git status`

That block is internally coherent, but it is archived prework, not the source-of-truth Phase-0 worktree artifact. I could not independently run the diff or status. The changed-file set is therefore **not independently audited**.

---

## 3. Blocking content findings

### F1 — R2 does not accurately state the authorized worker route/transport

`00-requirements.md:38` requires:

> “supported per-launch headless/SDK DSH workers are acceptable when normal tool policy is disabled”

The verified evidence says something different and narrower:

- `verified-official-route.md:3-7`: owner authorized `deepseek-official/deepseek-flash`; normal subagent rejected explicit selection; the **per-launch DSH headless overlay** used `agent-default-model`, managed credential references, and disabled nested delegation/config-editor; preflight decoded the actual request header; substantive tasks require **per-worker durable route checks** and controller verification.
- Bundle `:9`: owner authorized provider `deepseek-official` and **ordinary/process workers**, superseding mandatory AgentTeams transport.

R2’s “normal tool policy is disabled” condition is not the verified condition, and “headless/SDK DSH workers” does not plainly include the authorized ordinary/process workers. R2 also lacks:

- per-worker route evidence, not just a pre-dispatch check;
- a stop/no-substitute rule when the route is unavailable;
- controller verification of worker route and output, not worker self-report.

The current artifact does reflect the owner update at `00-requirements.md:7` and `:304`, but R2’s normative acceptance is stale/imprecise enough to permit the wrong dispatch shape.

**Repair:** rewrite R2 around the exact verified overlay/ordinary-process route; require per-worker route/config evidence under `evidence/router/`, controller verification before acceptance, and an explicit “route unavailable → stop/NOT RUN; no fallback” rule. Align R36 accordingly.

---

### F2 — R1’s baseline/hash/tree acceptance is not evidenced, and the Coverage Gate overclaims

`00-requirements.md:31` requires “fresh origin/dev/public-private SHA/tree/diff bases” and “source snapshot hash verified.” `:313` marks “Source snapshot and stable R1-R38 acceptance inventory recorded” as `[x]`.

But:

- `00-requirements.md:23` records only commit SHAs, not trees.
- `phase00-worktree-prework.md:33,77` records only the **public** tree; the private tree is absent.
- `phase00-baseline-round01.json:4-5` and `round02.json:4-5` record only baselines, not trees.
- No independent source hash receipt exists; only repeated declarations of `870fa...`.
- No canonical `00-worktree.md` exists, so the normalized diff basis cannot be reconciled against a locked artifact.
- `source-proposal.md:5-7` separately requires **re-pinning all measurements at the execution SHA** and says a stale census is not evidence. R1 does not require that re-pin.

This is partly a Phase-0 sequencing prerequisite (no worktree artifact yet) and partly a content defect: R1’s acceptance cannot be checked from the evidence it cites, while the Coverage Gate claims it already is.

**Repair:** record public/private commit **and tree**, diff basis, and a computed source SHA-256 receipt; add an explicit re-pin-at-execution-SHA acceptance item; leave `:313` unchecked until a real receipt exists.

---

### F3 — R36 compresses the entire controller/team/evidence contract into one sentence

`00-requirements.md:276` says only:

> “Disjoint named scopes, single writer shared files, dependency/task IDs, verified team model, independent current code/test/live review, evidence action records. Backend/client stable DTO parallel then join M11 including diagnostics and E dispositions.”

The source requires much more:

- `source-proposal.md:867-890`: controller is integrator/final reviewer; one active phase at a time; parallelize independent tasks only within the active phase; phase boundaries are not waived by a teammate claiming completion; shared tasks have exact `write_scopes`, dependencies, acceptance criteria; workers claim current revision and complete only after checks; ownership does not wake inactive agents; re-list before waiting; collect/cancel every managed job; shared-file single-writer rules; no baseline/fixture/tolerance edits by workers; `FS_STALE_VERSION` re-read/rebase.
- `:892-930`: the A0–X task catalogue, role ownership, bounded scopes, acceptance handoffs, and dependency graph.
- `:932-952`: every return must include actual touched files/commit identity, tests/exits, RED/GREEN/refactor receipts, live evidence, findings/limitations, and requirement completion status; chat summaries, status flags, or “tests pass” claims are not acceptance; material delegated work needs durable action records; repairs refresh bundles/invalidate claims.
- `:954-968`: no self-approval; delegation-unavailable fallback records capability probe and full self-audit; never reduce requirements or claim external independence.

None of that is enforceable from R36 as written. This is especially important because R2’s route change and the run’s ability to claim independent review depend on it.

**Repair:** expand R36 into separate acceptance bullets covering controller role, one-active-phase rule, task catalogue IDs/write scopes/dependencies/acceptance, return contract, action-record/evidence verification, refresh/invalidation, no-self-approval, and self-audit fallback.

---

### F4 — R16 weakens the release/dev/candidate delta rules

`00-requirements.md:136` requires “classified pre-existing/intentional/inconclusive deltas.” The source requires:

- five classifications: pre-existing R-to-D change, migration regression, approved intentional change, known baseline defect, capability absent/inconclusive/environmental failure (`source-proposal.md:651-656`);
- no blanket “dev changed” waiver;
- every intentional delta needs requirement/rationale/approval, expected-value assertions, and a regression;
- an unexplained R/C difference blocks release parity even if D/C passes;
- missing capabilities are recorded and do not count as exercised coverage.

R16 omits the approval/regression requirement, the “known baseline defect” and “migration regression” categories, and the R/C blocking rule. It could permit an intentional delta with no approval or regression.

**Repair:** expand R16 to the exact classification set and make each intentional delta require approval, expected-value assertions, and a maintained regression; state explicitly that unexplained R/C differences block release parity.

---

### F5 — R33 permits a blanket “reviewed retention” path without the required ledger/negative checks

`00-requirements.md:255` says:

> “Every actual operation owner converted or explicit reviewed retention with tests/TDD/caller refs.”

The source says:

- a wrapped but unused leaf is **not** converted;
- a token Effect around an unowned timer/Promise is **not** structured concurrency;
- every production operation/resource must be classified as converted, retained-pure, retained-compatible-adapter, retained-existing-Effect, or approved N/A, with caller/source/test evidence;
- no blanket retention for monoliths (`source-proposal.md:1183-1187`);
- the ledger must record public/private path/export, current owner/caller, disposition, service/Layer/scope, typed error/wire projection, transaction/lease/fence/cancel policy, B/M/task/R IDs, RED/GREEN/refactor/maintained-lane evidence, coverage, source/build identity, reviewer, and rollback (`:1288-1297`).

R33 has no “unused leaf/token Effect” negative check, no ledger field list, and no explicit “no blanket retention.” A monolith could be retained wholesale under “reviewed retention.”

**Repair:** add the B10 negative checks and the §17.1 ledger schema to R33; require old orchestration removal only after callers migrate.

---

### F6 — R27 omits the “never deduplicate distinct stochastic inference” rule and shutdown/permit details

`00-requirements.md:213` says “Bounded permits/waiters/cache identity; per-run sequential judge/throttle isolation, no late task writes.”

The source adds:

- share provider permits at the process owner; bound waiters separately; retain concurrency defaults; approve parallelism as a distinct policy change;
- metadata caches retain config/authority/model keying, TTL, cap, and invalidation;
- **never deduplicate distinct stochastic inference** (`source-proposal.md:1125-1128`);
- stop admission, join/drain or interrupt tasks, then close dependencies; one finalizer error must not skip remaining releases or trigger early `process.exit`;
- benchmark cancellation and overlapping-run isolation before any concurrency change (`:1130-1133`).

R27’s “cache identity” does not prohibit the dangerous dedup behavior. This is a behavioral-safety gap, not a wording preference.

**Repair:** add explicit no-dedup, provider-permit ownership, bounded waiters, finalizer/shutdown, and benchmark cancellation/overlap acceptance.

---

### F7 — R23/R28/R30 omit several source-specified storage/SQL/queue invariants

**R23** (`00-requirements.md:185`) requires fallible open/PRAGMA cleanup, retries, same-connection transactions, primary-error preservation, and graph hydration. It omits:

- `Effect Ref/Tx*` memory operations do not transact SQL;
- never retry provider/network side effects inside a SQL transaction;
- serialize connection/transaction ownership, not a shared depth counter across yielding fibers;
- drain/fence every owner before backup/reset/restore;
- preserve per-store PRAGMAs (`source-proposal.md:1091-1097`).

**R28** (`:220`) requires existing storage authority and no raw capture duplication. It omits:

- EventLog is bounded metadata, not a complete raw inference journal;
- the capture `storageMode` label is not proof of reference-only payloads;
- do not change pointer/encryption/admission/degraded-routing policy without a separate privacy/contract decision;
- per-store PRAGMAs, including ArtifactStore `DELETE/FULL/FK` versus WAL stores (`:1143-1149`).

**R30** (`:234`) requires PersistedQueue retention, abort-aware handlers, lease/late-completion fencing, and two-host characterization. It omits:

- a new `effect-mq` SQLite driver is a separate approved conformance slice, not a required name swap;
- preserve terminal versus deferrable refusals, tool policy, recovery handoff, and “do not revive superseded recovery passes”;
- local fiber/semaphore counts plus same-row claims do not prove a global concurrency cap; enforce single owner or distributed admission if required;
- the public host remains the packaged evaluation consumer until a reviewed topology change;
- scope-root paths, kill/drain/retry readback, and cleanup must agree across processes (`:1158-1166`).

**Repair:** add these as explicit R23/R28/R30 acceptance bullets; they are exactly the failure modes the source says must not be lost.

---

### F8 — R14/R15/R17/R18 under-specify the verification/live-evidence contract, and §10.1 command deliverables are missing

- **R14** (`:122`) does not require the `packages/ui-parity` package or `runtime:parity` script, the M4 React baseline **before** M1 acceptance, the determinism procedure, comparator semantics, or the accessibility/pixel report rules (`source-proposal.md:511-571, 726-738`).
- **R15** (`:129`) does not require an isolated DSH profile/session, prohibition on using the controller’s own session/profile, the preflight fields, proof that the active client model uses the router, bounded cost/token/request limits, or honest NOT RUN when prerequisites are missing (`:573-607`).
- **R17** (`:143`) omits unique synthetic markers/ID mapping, before/after counters and bounded readiness/watermarks, separate classification of background client calls, actual served candidate assets (not Vite proxying to production), prohibition on `page.route` stubs for accepted runtime evidence, read-only storage inspection with no repair/insert/delete, and private-projection-failure visibility (`:664-698`).
- **R18** (`:150`) omits the required receipt field list, the M0a/M1/M5/each-wave/after-integration/M12 receipt points, invalidation after changes, and the rule that only the controller closes G-LIVE/G-RELEASE after independent verification and code/test review (`:700-720`).
- **§10.1** (`source-proposal.md:797-810`) makes `runtime:verify-client-journeys` and `runtime:compare-release` required implementation deliverables that must fail closed and report NOT RUN distinctly. No R names them or their fail-closed/NOT RUN behavior.

**Repair:** add a verification requirement (or extend R14/R15/R16/R18) covering the named commands, M4-before-M1 ordering, isolated client sessions, receipt fields/points, and the exact harness/evidence rules.

---

### F9 — R4/R6/R7 are too permissive on exact targets and source pins

- **R4** (`:52`) accepts “Reviewed 4.0.6 **or explicitly reviewed newer stable target**.” The source specifies the exact target `effect@4.0.6`, commit `3b28bf686bf26e9700edd39c025aff2744dc5303`, with wrapper version `4.0.6` (`source-proposal.md:66,135-138`). A newer target without owner approval is an unresolved scope change.
- **R6** (`:66`) does not record the exact Foldkit/UI/oxlint pins (`foldkit@0.169.0`, `@foldkit/ui@0.169.0`, `@foldkit/oxlint-plugin@0.15.3`, commit `7ee214268c602967937b80f6f20d1e831f2e8ab6`) or the §4.3 rules: one entry per upstream subpath, Node/browser-like subpath parity tests, externalized `effect`/`@effect/platform-browser`, bundled `parse5`, license/provenance, never edit `vendor/foldkit` (`:200-264`).
- **R7** (`:73`) says “untouched pinned snapshot” but does not record the exact Crease commit `bb447e363e9c717bf11ebb10b2259f053bff6f71` or Foldcn commit `1fe1acc6a98dee9b8a040023ee88988098b42cab`; it omits transitive licenses including ECharts, the Tailwind-only/no-StyleX/Pleat/showcase/map/CLI-preset rule, and the compile/adapted-state/browser/anti-slop checks (`:266-311`).

**Repair:** freeze the exact pins; add the wrapper build/subpath-parity/externalization rules to R6 and the full acquisition/license/adaptation/test rules to R7.

---

### F10 — R34/R35 preserve the open E1/E2 decision but not the required deferral/constraint detail

The unresolved decision is correctly preserved at `00-requirements.md:262,269,305,314,321`. That is a prerequisite, not a defect by itself.

However, `source-proposal.md:1226-1231` requires the owner-approved disposition to be either “include fully specified, re-analysed tasks” or “explicitly defer to a named follow-on **with rationale and revised completion scope**.” It also says: until disposition, list unresolved; claim only framework migration preserving current semantics; **no new destructive tiering or live-admission change while unresolved**.

R34/R35 do not require:

- deferral rationale and revised completion scope;
- the “no destructive tiering/live-admission change while unresolved” constraint;
- the full E1/E2 protocol/test detail if included (`:1233-1244`).

**Repair:** add those three items. Do not choose the disposition in the requirements artifact.

---

### F11 — R37’s “retire React” is ambiguous against OOS1/D-U2, and rollback is under-specified

`00-requirements.md:283` says “retire React only after consumers migrate.” OOS1 (`:295`) says “removal of React across the entire workspace” is out of scope; source D-U2 (`source-proposal.md:71`) says `apps/docs-site` stays on Fumadocs/React indefinitely.

R37 should say explicitly: retire **runtime-ui** React only; `apps/docs-site` remains React. The source’s rollback/cutover mechanics are also missing:

- serving switches the source directory back to the React build and keeps the artifact for one release (`:839-840`);
- Effect pin rollback requires a matching wrapper graph and compatible persisted schema, not “install an older npm version” (`:843-846`);
- component/chart adaptations roll back behind the same contracts; temporary React chart bridge has a removal deadline (`:847-849`);
- cutover is a stage promotion validated by `runtime:validate-packaging` (`:830`).

**Repair:** scope R37 to runtime-ui React; add the exact cutover/rollback steps and state-compatibility proof.

---

### F12 — R9/R10/R38 omit measurable chart/lifecycle/performance acceptance

- **R9** (`:88`) does not require tooltip/legend interactions, explicit stale/partial/truncated/unsupported states, rapidly switched filters/ranges with obsolete-work cancellation, multiple instances with no colliding host IDs, accessible names plus numeric HTML data, or pre-agreed budgets before pilot acceptance (`source-proposal.md:444-460`).
- **R10** (`:95`) does not require hidden/zero-sized resize behavior, canvas animation/font readiness, bounded diagnostic timeouts for continuously changing charts, or heap behavior (`:529-538`).
- **R38** (`:290`) does not require fixed workload/hardware, raw/gzip/lazy-chart bytes, repeated-mount heap, rollback thresholds, or honest NOT RUN/INCONCLUSIVE when provider/prerequisites are unavailable (`:763, 1285-1287`).

**Repair:** add these as measurable acceptance bullets; “pre-agreed” needs the workload/hardware and the specific measurements.

---

### F13 — R3 omits the characterisation exception; mechanical moves/vendor acquisition have no valid path

`00-requirements.md:45` requires strict assertion-level RED before production GREEN/refactor and says setup failures are not RED. The source also defines a separate characterisation exception (`source-proposal.md:499-502`):

- pure mechanical source moves and untouched upstream acquisition use baseline GREEN + byte/export/provenance comparison + GREEN after;
- no behavioral rewrite hidden in that exception;
- if strict RED is genuinely infeasible, stop and obtain an explicit scoped exception with compensating tests;
- never silently switch the whole program to tests-after or pragmatic mode.

R3 has no such path. Without it, Phase 3 either cannot lawfully perform mechanical moves/vendoring or may silently fall back to tests-after. **Repair:** add the exception and the “no silent pragmatic switch” rule.

---

### F14 — The heading map is not clause coverage; several source obligations have no R acceptance

`phase00-source-reconciliation.md:4-7` correctly says it is heading-level, not Phase-1 lossless mapping, and warns against umbrella mappings of §0/§7/§8/§11/§17. The R1–R38 table does map every heading, but several substantive clauses have no corresponding acceptance:

- §3.5: extend the existing Run101 single-runtime-instance guard; do not replace it (`source-proposal.md:189-194`).
- §7: M4 baseline work **precedes M1 acceptance** despite numeric order (`:726-738`).
- §14.2: the A0–X task catalogue, role ownership, dependency graph, and acceptance handoffs (`:892-930`).
- §15.2: leaf Layer `OBJECT`/`MemoMap` identity, merging sibling Layers does not supply requirements, separate Effect runtime identities, validated DTOs not raw Causes/Layers/Fibers, no nested `runPromise`, no per-request graph recreation (`:1053-1059`).
- §17.1: the backend coverage/acceptance ledger fields (`:1288-1297`).
- §10.1: the required `runtime:verify-client-journeys` and `runtime:compare-release` commands (`:797-810`).

**Repair:** add a cross-cutting constraints section or R39+ (or extend the relevant existing R’s); do not rely on the heading map as proof of coverage.

---

## 4. Requirement-by-requirement coverage

`GAP` = acceptance is missing a source obligation or is too permissive to be lockable. `minor` = no blocking defect found, but the source clause is under-specified and Phase 1 must not treat it as complete. `S:` = source line references.

| R | Verdict | Main gap / required repair |
|---|---|---|
| R1 | GAP | No execution-SHA re-pin; private tree absent; no independent source hash; `:313` overclaims hash/tree evidence. `S:5-7,9-17` |
| R2 | GAP | “Normal tool policy disabled” is not the verified overlay condition; ordinary/process workers and per-worker route evidence missing. `S:863-890,954-960` |
| R3 | minor | No characterisation exception for mechanical moves/vendor acquisition; no “no silent pragmatic switch” rule. `S:499-502` |
| R4 | GAP | Allows “newer stable target” beyond the exact 4.0.6/commit pin. `S:66,135-138` |
| R5 | GAP | No per-entry type/import smoke, esbuild metafile one-runtime check, or “extend Run101 guard” requirement. `S:156-167,187-194` |
| R6 | GAP | Exact Foldkit/UI/oxlint pins, one-entry-per-subpath, Node/browser parity, externalization, parse5 bundling, license/provenance missing. `S:200-264` |
| R7 | GAP | Exact Crease/Foldcn commits, transitive licenses/ECharts, Tailwind-only exclusions, compile/adapted/anti-slop checks missing. `S:266-311` |
| R8 | minor | Screen-reader semantics, escape/dismissal/overlay, `cn()` semantics, specimen Story/Scene fixtures, async-state donor wiring missing. `S:390-416` |
| R9 | GAP | Tooltip/legend, explicit stale/partial/truncated/unsupported states, rapid-filter obsolete work, multiple instances, accessible numeric data, pre-pilot budgets missing. `S:444-460` |
| R10 | minor | Hidden/zero-sized resize, canvas animation/font readiness, bounded timeout for continuously changing charts, heap missing. `S:529-538` |
| R11 | minor | Sibling `runtime-ui-next`/rename-at-cutover, `Document.title`, no Links/Meta equivalent, parent cross-route facts missing. `S:315-372` |
| R12 | minor | Injectable SSE factory test fakes, single Refresh Subscription/switched-away branch, token-vs-refresh buffer distinction missing. `S:374-388` |
| R13 | minor | Per-route light/dark + mobile, loading held-endpoint procedure, full wave inventory not explicit. `S:556-571,770-779` |
| R14 | GAP | No `packages/ui-parity`/`runtime:parity`, M4-before-M1 ordering, determinism procedure, comparator/accessibility/pixel report rules. `S:511-571,726-738` |
| R15 | GAP | No isolated session/no-controller-profile rule, preflight fields, active-model proof, bounded calls, honest NOT RUN. `S:573-607` |
| R16 | GAP | Missing delta categories; intentional deltas lack approval/expected assertions/regression; R/C blocking rule missing. `S:651-656` |
| R17 | GAP | Unique marker/ID map, counters/watermarks, background-call classification, actual served assets, no `page.route`, read-only inspection, private-projection failure missing. `S:664-698` |
| R18 | GAP | Receipt field list, receipt points/invalidation, controller-only G-LIVE/G-RELEASE closure missing. `S:700-720` |
| R19 | minor | Per-operation ledger fields, “no giant monolith split prerequisite,” explicit retention decisions under-specified. `S:1068,1288-1297` |
| R20 | GAP | Bounded record/byte/ingress/formatting/TTL/query limits, one-reporting-owner rule, target ErrorReporter/Cause API compile, hostile/cyclic/overflow tests missing. `S:1073-1087` |
| R21 | GAP | “Never trust forwarded owner headers or wildcard CORS,” no telemetry contamination, injected-defect test, existing observability/store-degradation pages intact missing. `S:1083-1089,1187-1189` |
| R22 | minor | Bounded polling/stop, post-acquire endpoint failure, real child/grandchild + SEA smoke not explicit. `S:1070,1193-1194` |
| R23 | GAP | No `Tx*`-does-not-transact-SQL, no provider/network retry inside SQL txn, connection-ownership serialization, drain/fence/per-store PRAGMA. `S:1091-1097` |
| R24 | minor | Off-thread/driver separate SEA/caller/serialization proof; consistent snapshots/no old binary against new schema not explicit. `S:1094-1097,1246-1251` |
| R25 | GAP | Sync-signature/compat-adapter path, `runSync` edge, reason-code value/order preservation, registry legacy accepted spellings missing. `S:1107-1113` |
| R26 | GAP | Exact 250/1000/2500/5000 ms retry + idempotent aggregate timeout, token-vs-refresh buffer, lossless backpressure, async-span rule missing. `S:1115-1123` |
| R27 | GAP | No “never deduplicate distinct stochastic inference”; provider-permit ownership, bounded waiters, finalizer/shutdown, benchmark overlap missing. `S:1125-1133` |
| R28 | GAP | EventLog bounded, `storageMode` label, pointer/encryption/admission/degraded-routing policy, per-store PRAGMAs missing. `S:1143-1149` |
| R29 | GAP | Stale leases, maintenance, corruption/decryption, restore, partial publication, committed-append masking, recovery receipts missing. `S:1151-1155` |
| R30 | GAP | `effect-mq` SQLite driver separate slice, terminal vs deferrable refusals, tool/recovery handoff, local-fiber-not-global-cap, packaged consumer/scope-root missing. `S:1158-1166` |
| R31 | minor | No-egress sandbox limits, versioned profile publication, late-ack checks, “not a second learner” missing. `S:1168-1174` |
| R32 | GAP | Incremental compatibility/answering-port proof, pagination, missing-vs-unavailable joins, live/probe/evaluation classification, codec limits, partial-startup child release missing. `S:1176-1179` |
| R33 | GAP | No unused-leaf/token-Effect negative check; no §17.1 ledger fields; no “no blanket retention”; old-orchestration removal after caller migration missing. `S:1183-1189,1288-1297` |
| R34 | GAP | E1 inclusion detail; deferral rationale/revised scope; “no destructive change while unresolved” missing. `S:1226-1237` |
| R35 | GAP | E2 full state/identity/version/ownership detail; legacy SSE wire; crash uncertainty/ack; deferral rationale missing. `S:1239-1244` |
| R36 | GAP | One sentence cannot enforce controller role, one active phase, A0–X catalogue, return contract, action-record verification, no self-approval, self-audit fallback. `S:867-968` |
| R37 | GAP | “Retire React” conflicts with docs-site OOS1/D-U2; cutover/`runtime:validate-packaging`, package-sea switch, Effect-pin rollback, React-bridge deadline missing. `S:71,746-747,830,839-849` |
| R38 | GAP | Fixed workload/hardware, raw/gzip/lazy bytes, repeated-mount heap, rollback thresholds, NOT RUN provider honesty missing. `S:763,1285-1287` |

---

## 5. Prerequisite gaps vs content defects

**Prerequisite gaps — correctly open, not authority to invent a decision:**

1. **E1/E2 owner dispositions remain open.** R34/R35 and `:305`, `:314`, `:321` record this accurately. The draft must not choose inclusion or deferral itself.
2. **No canonical `00-worktree.md`.** This is the documented sequencing repair; the preserved prework is factual but not the source-of-truth diff basis. Requirements lock should not claim a reconciled worktree diff yet.
3. **Independent lossless source inventory and the phase audit are not complete.** TODO items `:15-17` remain open; the artifact has no `Audit:` result, no `## Requirement Completion Status`, and no `## Subagent Contribution Verification` section.
4. **Shell-based hash/status verification was unavailable** because of the sandbox ACL provisioning failure. This is a review limitation, not an artifact defect, but it means this review cannot certify hash equality.
5. **Historical dispatch-policy label.** `phase00-dispatch-policy.md:9` still says `deepseek/deepseek-flash`; the bundle declares that subsection historical. It is not a current `00-requirements.md` contradiction, but it should be marked superseded explicitly to prevent reuse.

**Content defects — must be repaired before the requirements can be considered lockable:**

- F1 through F14 above, especially R1, R2, R14–R18, R23/R27/R28/R30/R33, and R36.

The draft’s own `Coverage: FAIL` and `Approval: FAIL` are correct, but they currently cite only the prerequisite gaps. The content gaps above are additional reasons the artifact cannot pass coverage.

---

## 6. Lock readiness

**Not ready for lock.** Even setting aside the unresolved E1/E2 decisions and the missing canonical worktree, the requirements’ acceptance criteria are not yet a sufficient contract for Phase 1/2. The highest-risk defects are:

1. R2’s worker-route wording;
2. R1’s unevidenced baseline/hash/tree claims;
3. R36’s compressed team/evidence contract;
4. R16’s release-delta rules;
5. R33’s blanket-retention exposure;
6. R27’s missing no-stochastic-dedup rule;
7. R23/R28/R30’s missing data/queue invariants;
8. R14/R15/R17/R18’s under-specified verification/live evidence;
9. missing §10.1 command and §7 M4/M1 sequencing obligations.

**Suggested repair order:**

1. Fix the exact-target/pin defects R4, R6, R7.
2. Rewrite R2 with the verified route and per-worker evidence.
3. Expand R36 with the controller/task/return/action-record contract.
4. Expand R16, R33, R27, R23, R28, R30.
5. Expand R14/R15/R17/R18 and add the §10.1 commands.
6. Add the R3 characterisation exception and the cross-cutting constraints from §3.5/§7/§14.2/§15.2/§17.1.
7. Repair R1 evidence and remove the `:313` overclaim.
8. Repair R34/R35 deferral wording (without choosing a disposition).
9. Re-run this audit against the refreshed bundle.

This is not a product or migration verdict; the migration remains unimplemented and unverified.

---

## 7. Verdict

**Coverage: FAIL.** The heading map is not a lossless clause audit; multiple in-scope source obligations lack enforceable acceptance.

**Approval: FAIL.** E1/E2 dispositions, the canonical worktree, independent source inventory, and the content repairs above remain open.

**Audit:FAIL — scope: Phase 00 Requirements DRAFT, `00-requirements.md` R1–R38 against the full `source-proposal.md` (61 headings), preserved Phase-0 setup/diff evidence, and applicable `.recursive/RECURSIVE.md` audit rules; read-only review, no product implementation or verification claimed.**
