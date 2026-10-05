# Run 103 Phase 8 memory audit
Auditor: sp8_memory_audit (delegated memory-auditor)

## Verdict

**NOT YET CURRENT.** The memory plane contains no run-103 content at all, and four `CURRENT` entries across two
domain docs plus one skill pattern are now wrong or superseded: they still describe the routing posture as a
single four-value mode vocabulary (`baseline | difficulty | controller | hybrid`) and the operator surface as
the single-page routing-strategy baseline, and the one doc that should own the new contract
(`domains/role-model-router.md`) stops at run 92. Three durable lessons are missing (candidate 2, 3, 5 below;
candidate 1 is already captured outside the repo memory plane and candidate 4 is mostly present in spirit but
must be restated as the canonical two-axis rule). Recommended: six edits in five memory docs plus one router
blurb. No changed product path is unowned by a domain doc.

Inputs read: `03-implementation-summary.md`, `03.5-code-review.md`, `04-test-summary.md`, `05-manual-qa.md`,
`evidence/other/{analyst_t1,planner_t2-dispatch-failure,sp35-code-review-findings,sp35-followup-review-findings,sp4-tester-audit-findings}.md`,
`.recursive/memory/MEMORY.md`, `.recursive/memory/skills/SKILLS.md`, and the domain/pattern/training docs
matched by `Owns-Paths`/`Watch-Paths` and topic (routing, aliases, config merging, observation stub, UI
surfaces, biome gate, packaging).

Product truth re-verified directly before writing (read-only): `SCORING_STRATEGY_NAMES =
["balanced","quality","latency","cost","custom"]` (`role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts:15`),
`ROUTING_MODE_NAMES = ["baseline","difficulty","hybrid","intelligent"]` with `controller` documented as the
compat spelling of `intelligent` (`scoring-strategy.ts:221`, `:224-231`), latency policy bounds `5..30`, default
`minSamples: 5`, `maxDeltaMs: 10_000` (`role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts:42`, `:54-55`),
public package name `@role-model/schema-tools` (`packages/schema-tools/package.json:2`), CI lane order
`pnpm install --frozen-lockfile` then `pnpm run lint` (`.github/workflows/ci.yml:61-62`, `package.json:21`),
private builder reading `ROLE_MODEL_PUBLIC_WORKTREE` (`role-model-internal/scripts/track-b/build-runtime-distribution.mjs:45`).

## Stale or wrong memory entries

| Memory file | Quote | Why it is wrong now | Suggested edit |
| --- | --- | --- | --- |
| `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | "Routing semantics are split across `baseline`, `difficulty`, `controller`, and `hybrid`, with request-level overrides producing durable routing diagnostics rather than mutating saved operator config." | Run 103 split the posture into two axes. The mode vocabulary is now `baseline | difficulty | hybrid | intelligent`, and `controller` is only a compat spelling of `intelligent` (`scoring-strategy.ts:221-231`). The line also omits the new scoring axis (`balanced | quality | latency | cost | custom`, plus `pin_weights` and the six-metric `weights` profile, required iff `custom`) that now actually selects ranking weights — a reader trusting this line would not know a saved scoring strategy exists. | Replace the sentence with: mode axis `routing.mode` (`baseline/difficulty/hybrid/intelligent`, `controller` = compat spelling) and scoring axis `routing.scoring_strategy` (`balanced/quality/latency/cost/custom`) with `pin_weights` blocking difficulty and controller overrides; add the five-step precedence ladder (request intent > controller directive > difficulty bucket > saved strategy > `balanced`) and the "legacy single `routing.strategy` is read-compatible, degraded on read, rejected on write, never written back" rule. Cite `.recursive/DECISIONS.md` (run 103) and `scoring-strategy.ts`. |
| `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | "Difficulty routing, controller routing, rewrite behavior, hybrid arbitration, observed-profile selection, effective metrics, throughput penalties, and alias resolution are all runtime-owned diagnostics that should remain inspectable in request receipts." | Incomplete after run 103: the receipt set now also includes `strategyResolution` (strategy, source, effective weights, `weightsDigest`, discarded directive), `aliasPostureBinding` (declared vs preset role, capabilities, alias strategy) and the measured-latency outcome (`latencySelection`), and those receipts are now part of *every* stored decision including the compact observation stub. The measured-latency override contract itself (off by default, effective metric `p50 + 0.25 * (p95 - p50)`, `max_delta_ms` 10 000, `min_samples` 5 bounded 5..30, may only substitute an already-eligible endpoint) appears nowhere in memory. | Extend the sentence with `strategyResolution`, `aliasPostureBinding`, `latencySelection`; add a new bullet for the measured-latency override policy (off by default; effective metric; 10 000 ms / 5..30 defaults; eligibility-only substitution); add `/docs/operations/05-agent-strategy-and-workload-postures.md` to the doc's reference list; refresh `Source-Runs` (add `103-agent-strategy-and-scoring-strategy`), `Validated-At-Commit` (the run's HEAD) and `Last-Validated`. |
| `.recursive/memory/domains/role-model-router.md` | "8. Benchmark clear is transactional (`BEGIN IMMEDIATE`) and writes a `clear-receipt.json` with membership revision and counts." (end of the "Configured model pool convergence (run 92)" section — the doc stops at run 92) | Incomplete: this doc owns the router domain but has no run-103 truths, so the posture split, the alias-materialisation rules, the decision receipts and the three UI surfaces are not retrievable from the doc a future run would load first. | Append a "Routing posture split (run 103)" section with: two axes + precedence ladder + pin semantics; `agent_strategies.<name>` / `workloads.<name>` postures materialising one `<name>.<scope>` alias per execution scope (declared role beats alias preset; declared `model_ids` narrows and an empty slice reports `ALIAS_POOL_EMPTY`); the decision receipts and the stub-allowlist rule; canonical-only writes (no UI path persists a legacy synonym); `Routing strategy` + `Agent strategy` + `Workloads` surfaces. Add `103-...` to `Source-Runs`, refresh `Last-Validated`, and normalise `Owns-Paths` from its current free-text blob into the real path list. |
| `.recursive/memory/domains/role-model-baseline.md` | "The runtime now also owns per-request routing-mode overrides for `baseline`, `difficulty`, `controller`, and `hybrid`, with deterministic invalid-value rejection and durable receipts that distinguish request overrides from alias-default routing modes" | Reads as current truth in a `CURRENT` doc but the mode name set changed in run 103: `controller` is no longer a mode, it is the compat spelling of `intelligent`; `intelligent` is missing from the list. | Reword to the historical form (e.g. "…as of the mode vocabulary before run 103…") and add the run-103 vocabulary sentence, or replace the enumerations with a pointer to the run-103 truths in `runtime-routing-and-provider-capabilities.md` / `role-model-router.md`. |
| `.recursive/memory/domains/role-model-baseline.md` | "The repo-owned runtime UI now also has a first-class routing-strategy operator baseline: `Control > Routing strategy`, workbench routing-mode override control, request-ledger routing decision readback, request-detail routing receipts, and a preserved advanced raw-config or raw-observation escape-hatch path all ship together in `/role-model-router/apps/runtime-ui/`" | Superseded by run 103: the page is now the two-axis `Routing strategy` surface (mode + scoring strategy + weights editor with live sum check + pin checkbox + execution scope + resolved-posture line + latency card) with separate `Agent strategy` and `Workloads` pages; legacy spellings are canonicalised on save and the raw-string alias derivation was removed, so the "raw-config/raw-observation escape hatch" is no longer the decision-truth path. | Reword as the pre-run-103 baseline and add the run-103 operator-surface truth (three pages; canonical-only writes; no raw config string presented as a strategy), or point the line at the run-103 section in `role-model-router.md`. |
| `.recursive/memory/skills/patterns/biome-ci-parity-and-clean-checkouts.md` | "Reproduce formatter failures against the specific tracked files named in the failed CI log before widening scope" | Incomplete for the failure mode this run hit twice: the pattern teaches how to *repair* parity failures but not that the unqualified repo-wide gate (`pnpm run lint` → `biome check .`, the first run step in CI) must be executed against the final commit before any phase is called green. Run 103 shipped a formatting regression into Phase 3.5 (`N1`) and then produced a "green" parity log that did not cover the committed content, which the tester audit caught at Phase 4. | Add a "Gate discipline (run 103)" block: (1) `pnpm run lint`/`biome check .` is CI's first step — run it on the final commit before claiming a phase green; (2) a green log must have run against the committed content (a log that predates the last commit touching the file proves nothing); (3) verify a filtered test command actually collects the intended package — `--filter @role-model-router/schema-tools` matches no project, prints "No projects matched the filters" and exits 0 (the real package is `@role-model/schema-tools`). Add `103-...` to `Source-Runs` and refresh `Last-Validated`. |
| `.recursive/memory/training/packaging-verification.md` (RB-9) | "1. Set ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT to private dist/run00-dev (or equivalent) before pnpm runtime:package-sea." | Incomplete: this is only the public half of the pair. Run 103 rebuilt the *private* distribution against the public worktree by setting `ROLE_MODEL_PUBLIC_WORKTREE` (read at `role-model-internal/scripts/track-b/build-runtime-distribution.mjs:45`; `docs/track-b-runbooks.md` shows the operator form) before packaging the public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`; a run that only does the latter pairs a fresh SEA with a stale private distribution. | Extend the item to the pair and name both directions, then mirror the sentence into `domains/direct-track-b.md` (its packaged-SEA line names only `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`). |

## Missing lessons

| Lesson | Recommendation (add / skip) | Target file |
| --- | --- | --- |
| The parent→child collab payload arrives empty; recover the task from the `Task name` header plus the `E:\tmp\collab\INBOX.md` brief table, and follow-ups must use a new agent name. | **Skip** for repo memory. The parent recorded this as an orchestrator-environment defect (`probe_msg_delivery`, 2026-09-29) outside the product memory plane; it is repo-external tooling behavior, and this repository's memory router is explicitly for durable repo knowledge. Re-record only if the collab transport is promoted into this repo. | none (parent-side record) |
| "A receipt attached to a mapper's return value is not the same as a receipt in the observation ledger - the compact stub's allowlist decides what a decision can answer." | **Add.** This is the run's highest-value lesson: Phase 5's first live pass found 0 of 80 stored observations carried `strategyResolution` because the compact observation stub's field allowlist dropped it, and the capture is deferred on this runtime so the stub *is* the decision record (`05-manual-qa.md` S11, repaired in `790da3e2`, pinned by `run98-a40-stub-fidelity.test.ts`). Frame it as a standing rule: when a decision gains a receipt, extend the observation stub's allowlist in the same change and pin it with the stub-fidelity test. | `.recursive/memory/domains/role-model-router.md` (run-103 section); optionally cross-reference from `domains/direct-track-b.md` whose `Watch-Paths` already cover `runtime-host-bridge` |
| "The repo-wide Biome gate is CI's first step, so a run must run it before calling a phase green." | **Add** (accept, with the false-green clause). Verified: CI runs `pnpm install --frozen-lockfile` then `pnpm run lint` (`.github/workflows/ci.yml:61-62`), and `lint` is `biome check . && pnpm run lint:rust` (`package.json:21`). Run 103 was called green twice while red — N1 in the follow-up review and the stale parity log / wrong filter in the tester audit. | `.recursive/memory/skills/patterns/biome-ci-parity-and-clean-checkouts.md` |
| "A legacy spelling must never be written back, and a patch naming only a shared flag must not switch vocabulary." | **Add**, restated as the canonical rule it is: read-degrade + write-reject, canonical-only writes on every surface, and a config patch that names only one shared flag key must not silently re-spell or reset the other vocabulary (`F5`, `N2`; `unified-runtime-config.ts`, pinned by `agent-strategy-config-path.test.ts` / `backend-unified-runtime-config.test.ts`). | `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` (vocabulary/compat section; the same edit as stale row 1) |
| "The packaged runtime's paired private distribution is rebuilt with `ROLE_MODEL_PUBLIC_WORKTREE` + `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`." | **Add** (accept). Verified against the private builder (`scripts/track-b/build-runtime-distribution.mjs:45`) and the run's `evidence/phase5/{package-sea,private-distribution}.log`: the private rebuild resolved the public source tree from the run-103 worktree while the public SEA consumed the rebuilt `dist/run00-dev` (13 extensions, sidecar sha256 `7471af1f…`). | `.recursive/memory/training/packaging-verification.md` (RB-9) + `.recursive/memory/domains/direct-track-b.md` |

## Files to update

1. `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` — two edits (stale rows 1-2) plus
   the reference-list addition for `/docs/operations/05-agent-strategy-and-workload-postures.md`; refresh
   `Source-Runs`, `Validated-At-Commit`, `Last-Validated`.
2. `.recursive/memory/domains/role-model-router.md` — add the run-103 posture/receipt/alias/UI section (stale
   row 3 and lesson 2 land here); add `103-...` to `Source-Runs`; refresh `Last-Validated`.
3. `.recursive/memory/domains/role-model-baseline.md` — reword the two superseded lines (stale rows 4-5); no new
   doc needed.
4. `.recursive/memory/skills/patterns/biome-ci-parity-and-clean-checkouts.md` — add the gate-discipline and
   false-green block; add `103-...` to `Source-Runs`; refresh `Last-Validated`.
5. `.recursive/memory/training/packaging-verification.md` — extend RB-9 to the paired rebuild (stale row 7);
   mirror the same sentence into `.recursive/memory/domains/direct-track-b.md`.
6. `.recursive/memory/MEMORY.md` — add registry blurbs for `domains/role-model-router.md` and
   `domains/runtime-routing-and-provider-capabilities.md` for run 103. (The registry currently lists only
   `remote-effort-instance-identity` and `release-artifact-provenance`, so the two docs this run changes are not
   discoverable from the router; this gap predates run 103 but should be closed in the same edit.)

No new memory doc is recommended: every durable lesson above lands in an existing `CURRENT` doc, and the
run-specific receipts stay in `.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/`.

## Uncovered paths

- No changed product path is unowned. `role-model-router/apps/runtime-host-bridge/**`,
  `apps/runtime-ui/**`, `packages/core/**`, `packages/sqlite-memory/**` and
  `packages/runtime-observability/**` fall under `domains/runtime-routing-and-provider-capabilities.md` and
  `domains/role-model-router.md`; `docs/**` falls under `domains/role-model-baseline.md`.
- The new `docs/operations/05-agent-strategy-and-workload-postures.md` is inside `role-model-baseline.md`'s
  `/docs/**` `Owns-Paths` but is referenced by no memory doc — covered by update 1's reference-list edit.
- The private half of the paired distribution
  (`D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs`, the carried `R7` registry
  mismatch min 3/max 1000/default 2000 vs. public 5..30/10 000) is outside this worktree's memory plane; it
  belongs to the private repository's memory/decisions and to the release operation that lands the fix. This
  audit does not cover the private memory plane.
- `.recursive/memory/skills/issues/*` and `.recursive/memory/training/*` carry pre-existing lint/metadata
  issues recorded by earlier runs; they are out of scope for this run and were not touched.
