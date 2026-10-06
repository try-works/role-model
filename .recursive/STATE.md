# STATE.md

## Current State

Run `106-client-neutral-model-effort-routing` is the current increment: reasoning effort is now a first-class, client-neutral routing dimension. The normalized input separates `requested_effort` from `effort_policy` (`strict` | `preferred` | `router`); the router selects over executable model-endpoint-effort arms; `strict` considers exact-effort arms only (else `reasoning_effort_unavailable`), `preferred` falls back through named receipts, and `preferred` with zero exact arms records `unsupported_fallback`. Four lossless effort states (`named` | `disabled` | `provider-default` | `no-client-preference`) are preserved end to end (decision four-state, occurrence binary). Benchmark/operational evidence is keyed by the effort arm with borrowed/related-effort priors; arm-aware lifecycle, turn-aware difficulty, non-inferiority ranking, and arm-level discovery are wired; decision/telemetry/trace provenance is canonical; and operator surfaces co-display model + effective effort + exact/borrowed evidence. Phases 0-8 are locked. Phase 5 ran the packaged SEA (`role-model-dev.exe`, sha256 `e181c6011a50a7e9681d6f16314ae7cefcbe7ca26bb21eeac34343b3befc7364`) on its own isolated port `:3462` driven by a real Pi CLI (requestId `req-9d68e76b`, routingDecisionId `decision-req-9d68e76b` -> deepseek-v4-pro; strict+max -> v4-flash-max, router+max -> v4-flash). Promotion remains a separate release operation.

Run `105-route-learning-matching-scope-activation` is the current increment: stage-3 matching-scope activation is shipped — a pack is a per-(role,task) ranked endpoint ladder (exact match only), materialized and aggregated pairwise, walked advisory-only, with derived floor-based activation and per-task rollback, and the Packs page renders the ladder index. The Phase 3.5 review found and the controller repaired a R1/R8 classification divergence: buildRequestClassificationForPlan read runtime-policy ids instead of the authoritative taxonomy identity, so capture/advisory classification was null while telemetry showed coder|coder.edit. Fixed at public d797a185 (tree 5da40073) + private da40a115; full host suite 2250/5-skip; live pi request classifies coder|coder.edit with lastUnclassifiedCaptures 0 on :3458 (dev channel only). Promotion remains a separate release operation.

**Run 105 closeout — bug 3 verified, four operational caveats carried forward** (not defects in the shipped fix). Verified live on `:3458`: both `coder/coder.edit` and `coder/coder.config` built **4/4 ladders** through counterfactual replays (all configured endpoints admitted, including `kimi-k3` — the configured controller and therefore the judge — admitted as a *challenger*, with `evaluation_judge_switches` recording `kimi-k3 -> deepseek-flash` from `dedupeJudgeAgainstPair`), and the route advisory reached live routing (`selection=advisory_applied`; `deepseek-flash-max` x3, `deepseek-flash` x1). Queue at closeout: 28 dispositions (24 `replayed`), 36/39 replay jobs `complete`, 0 deferred-pending, 0 capture-WAL rows, 0 stuck ledger reservations. Four caveats for the next replay-lane increment:

1. **`kimi-k3` provider flakiness.** 3 `timed_out` replay jobs and `durable replay evaluation ... missing counterfactual output evidence` refusals all trace to that endpoint. `replayDeferralBound=3` retires such captures so the queue self-heals, but it burns budget — 103 dispatches produced 26 counterfactuals. Worth a per-endpoint flake metric before the next promotion.
2. **Orphaned `awaiting_evaluation` replay job blocks the dispatcher.** A job whose `leaseOwner` named a dead runtime parked in `awaiting_evaluation` with an expired lease and was refused re-lease (`replay job is awaiting evaluation and cannot be re-leased`), stalling the focus loop until the deferral bound retired the capture; it required manual state repair once (`track-b/extensions/workers/replay-core/replay-core.json`). A parked job with an expired lease should be reclaimable by the lease sweep.
3. **Advisory influence is still narrow.** Of 505 advisory observations: only **4** `applied`; **47** `wouldHaveChanged=true` with `selection=baseline_retained` under `mode=shadow`; 304 `unavailable` are the unclassified requests. Consistent with the `cohortLadder: [10,25,50,100]` rollout rather than a defect, but pack steering is small until the cohort widens.
4. **The direct launch does not provision the managed `artifact-digest.key`.** `resolveDurableEvaluationAuthority` then throws `managed artifact digest key not found`, the `readRouteDispatchEvidence` binding returns null, and **every replay tick dies with `route dispatch evidence unavailable` before planning a focus** — it looks exactly like a planner bug. The packaged launcher supplies the key via `--artifact-digest-key-file`; a direct `role-model-dev.exe` launch does not. Either provision a key at launch or fail loudly at startup.

Full detail: `/.recursive/run/105-route-learning-matching-scope-activation/addenda/05-manual-qa.replay-no-distinct-candidate.addendum-13.md`.

Run `104-replay-eligibility-and-evidence-fidelity` is the current increment: the replay lane refuses by name
(`candidate_input_unsupported`, terminal when the declared pool can never serve the capture and deferrable when a
capable arm is merely unavailable), traffic classes are typed end to end so the operator's aggregates are
live-only with visible excluded counts, the live stall's cause is decided and fixed (the packaged launcher never
supplied `handoffEvaluation`, and the completion contract demanded every trial be covered although
train-partition trials are structurally ineligible), the branch-append recovery re-attaches from the boundary's
own field and refuses a saturated excerpt, and arm effort comparability is published with a mismatched arm named
in the comparison's validity. Phases 0-6 are locked; Phase 5 ran the rebuilt runtime on its own channel `:3459`
with its own state root — the matrix passed (text control, image through `difficulty.remote-only` selecting the
DeepSeek flash endpoint, PDF control, `hybrid.remote-only`) and the monitored window ran 61.5 minutes with 123
samples. One commitment transfers: `R8`'s live disposition drain, which needs a channel that already carries a
route package. `R9`'s producer plumbing is now wired and verified live end-to-end (post-closeout `8aa114ed` plus addenda
08-20): the comparison identity carries `effortComparability`, and a finalized comparison on `:3457` records
per-arm `matched`/`mismatched` instead of only `source_effort_unspecified`. The queue was traced live and
repaired in turn — the restricted-tick no-op, the resume-entry record with `classifyReplayArmEffort`, the
resume-store `effortComparability` persistence, the `capture_missing` retryability, and the compact replay-job
dispatch projection. The addenda run `post-closeout.r9-r8-pickup.addendum-01.md` through
`post-closeout.r9-finalized-effort-comparability.addendum-20.md`.
Promotion remains a separate release operation.

Run `103-agent-strategy-and-scoring-strategy` is the current increment: the routing posture is split into the
planner axis (`routing.mode`) and the scoring axis (`routing.scoring_strategy`), the five scoring strategies
actually rank candidates, `pin_weights` blocks the automatic overrides, agent-strategy and workload postures
materialise `<name>.<scope>` aliases, and every decision records the strategy source, the effective weights, the
alias posture binding and the measured-latency outcome. The operator UI gained the `Routing strategy`,
`Agent strategy` and `Workloads` surfaces. Phases 0-8 are locked; the live matrix ran on the rebuilt development
runtime on `:3458` with live `pi` CLI requests. Two commitments transfer to the next release operation: the
paired private latency-policy registry update (min samples 5..30, max delta 10 000) and the recorded
`agent-strategy.ts` decoder deviation. Promotion remains a separate release operation.

## Current State

Run `94-stage-manifest-commit-identity` repairs a release-blocking provenance
defect found by the acceptance workflow: shallow CI had packaged the synthetic
manifest commit `runtime-derived`. The repair makes `GITHUB_SHA` authoritative
for shallow CI and requires an exact 40-hex commit at package, startup, Stage
candidate, and production acceptance boundaries. The rejected
`stage-rc-23f91a1f7cd8` must not be promoted. After this repair is merged,
release operations must build a fresh Stage candidate, verify its manifest
commit equals the Stage SHA, obtain fresh human UAT, and pass acceptance before
the paired private/public main promotions.

Run `93-variant-admission-model-pool-integrity` is the current release-candidate
readiness increment: remote effort variants are distinct endpoint identities,
admission and probe/circuit health are authoritative for routing and benchmark
eligibility, managed LiteLLM adapter rows are hidden from configurable provider
connections, candidate colours are deterministic/distinct, and packaged builds
require the paired mandatory thirteen-extension Track B distribution. Agent-run
QA rebuilt the executable and sent bounded Pi CLI alias and direct Low/High/Max/
Pro-default requests through telemetry, routing decisions, browser projections,
Track B shadow consumers, and Cloudflare read-only inventory. Stage promotion
remains a separate release operation.

Run `92-configured-model-pool-benchmark-convergence` is the **current closed-out** configured-model-pool convergence: endpoint-variant-exact membership revision token stamped at persist/read/portfolio/decision time, honest null candidate-space (no synthetic 0/0%), membership-revision + stale benchmark quarantine, destructive-confirm final-controller eject, decision revision, and transactional benchmark clear. Strict TDD (SP1–SP6), Phase 3.5 self-review, agent-operated rebuilt-runtime QA on `:3501`. Run `89-codex-role-model-package` remains the closed-out Codex adapter package (public npm `@try-works/codex-role-model@0.1.1`); Direct Track B v1.1 remains the substrate baseline. Runs 79–85 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated KW activation, and gated live-router prompt inject. Run `86-runtime-ui-rm3-design-system-frontend` remains the closed-out runtime-ui RM3 design-system migration. Track B / KW substrate truths from run 85 remain authoritative for inject/KW surfaces.

### Product truths

- **Client-neutral model-effort routing (run 106):** `requested_effort` + `effort_policy` (`strict`|`preferred`|`router`); executable model-endpoint-effort arms; `unsupported_fallback` for zero-exact-arm preferred; four lossless effort states (decision four-state, occurrence binary); effort-scoped evidence with borrowed/related priors; arm-aware lifecycle + turn-aware difficulty + non-inferiority + arm-level discovery; canonical decision/telemetry/trace provenance; UI model+effort+evidence co-display.
- **Run 106 worktree:** `D:\DEV\role-model\.worktrees\106-client-neutral-model-effort-routing` on branch `recursive/106-client-neutral-model-effort-routing` (diff basis `701b8b8fc0b0eeebdfe818b757f5702f50021488`; HEAD `9260a10b`).
- **Run 106 verification floor:** Tier A 23 files green · Tier B 2063/2068 (3 conditional skips) · schemas:validate 37+30 · conformance 53/53 · core 113 · packaged SEA sha256 `e181c6011a50a7e9681d6f16314ae7cefcbe7ca26bb21eeac34343b3befc7364` · Pi QA `:3462`.
- **Configured model pool (run 92):** `computeConfiguredMembershipRevision` (order-stable SHA-256 over endpoint-variant-exact tuples) stamped on router candidates, routing decisions, benchmark manifests/samples, and clear receipts; runtime-ui `fetchRuntimeModels` no longer falls back to `/v1/models`; candidate-space scorers nullable with `—`/`n/a` presentation; `readLatestBenchmarkProfilesByEndpointIds` skips membership-mismatch and `completion_state: "stale"` samples; controller eject is destructive-confirmed; benchmark clear is transactional.
- **Run 92 worktree:** `D:\DEV\role-model\.worktrees\92-configured-model-pool-benchmark-convergence` on branch `recursive/92-configured-model-pool-benchmark-convergence` (diff basis `d59f07b91e7b23c25e7297860a0f9c967b342b7a`; HEAD `01537fb8b402c6808e7a6b69c3a03227acceb17c`).
- **Run 92 verification floor:** host-bridge 756 passed/3 skipped · runtime-ui 454 passed · sqlite-memory 67 passed · profile-aggregator 8 passed · builds green · agent-operated QA on `:3501`.
- **Codex adapter (run 89):** `@try-works/codex-role-model@0.1.1` at `packages/codex-role-model`; adapter default `:3460`; does not own role-model runtime; signed-in `openai_base_url` + merged catalog; tool bridge + `web_search` fulfill stay adapter-only; marketplace `.agents/plugins/marketplace.json` (npm source).
- **Run 89 worktree:** `D:\DEV\role-model\.worktrees\89-codex-role-model-package` on branch `recursive/89-codex-role-model-package` (diff basis vs `origin/dev` @ `6cf19bf033c23246c173a1bf634d13b2c822b2d8` from locked `00-worktree.md`).
- **Run 89 Phase 5 QA:** hybrid; real runtime + real Codex CLI; operator sign-off `2026-08-07`; npm publish + marketplace→npm install verified.
- **Runtime-ui styling authority (run 86):** RM3 Paper pages `4-0`/`5-0`/`6-0`/`7-0` + `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` + `@role-model/ui` at `role-model-router/packages/ui`.
- **Run 86 worktree:** `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend` on branch `recursive/86-runtime-ui-rm3-design-system-frontend` (diff basis vs `origin/dev` @ `b633056aa52252eaa40a7324ac7018b84d1ea0d9`).
- **Run 86 Phase 5 QA:** rebuilt `start-for-qa` on `:3470`; human Paper sign-off complete; P1–P8 polish accepted via upstream-gap addendum.
- **Run 86 verification floor:** kit 30 · runtime-ui 394 · build · validate-ui · Playwright (`evidence/logs/sp8-playwright-final2.log`).
- **FD#15:** `/app/router/config` redirects to `/app/router/strategy`; no Config segment in Router IA.
- **Track B / KW (run 85):** private worktrees under `role-model-internal` / public `.worktrees/85-kw-gated-router-prompt-inject`; gated inject, host join/auto-arm, honesty/export unlock, Phase 5 hops on `run85-dev`, post-lock live `pi`→KW inject→storage E2E.
- Private TB00 product pin is `39b56d41d60f703f766f71397ba7c76cd68c8254`; public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public host ships KW mutate actions plus join factory and durable production auto-arm; insertion surface is `applyRequestedRoleExecutionPolicy` via `mapChatCompletionsRequest` only.
- Knowledge Worker: ceremony ON / soft OFF retained; production retrieve + eval consumer retained; gated prompt inject when ON + retrieve PASS.
- Packaged launch binds discrete and equals-form `--track` / `--scope-id`; non-run80 scopes must pass `--evidence-root` / env.
- Server change for run 89 `not-required`; `publicChange: required`. Run 86 server change `not-required`; `publicChange: required`. Run 85 same.

### Known limitations

- Run 106 residual: non-blocking LOW documentation follow-ups (materiality, threshold documentation, strict-with-no-effort docs).

- Feature-branch merge to origin `dev` remains operator-requested (runs 92, 89, 86, 85, …).
- Run 92 residual: `profileRevision` is membership-keyed (diagnostic-only) until a distinct profile receipt is warranted; no decision-time membership snapshot is persisted (the field reflects current membership at read time).
- Run 89 residual: land `.agents/plugins/marketplace.json` on published `dev` for GitHub marketplace one-liner; optional Desktop UI glance; optional Codex Stop-hook auto-continue (not adapter regex).
- Optional residual: rename legacy `--rm-*` call sites to `--rm3-*` where drift remains.
- Local Matrix route remains a `<Navigate>` stub (run 86 R5 exception).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 89 (or 86/85/84/83/82/81/80/79) to `stage`/`main`.
- Ungated ambient KW, ceremony removal, Profile Learner / GRPO training unlock, live `--track=production`, and Paper file edits remain OOS.
- Run-84 deferred full live-router inject residual is soft-closed for gated inject only (training unlock still open).

### Operational notes

- Prefer run-106 evidence under `.recursive/run/106-client-neutral-model-effort-routing/evidence/` for client-neutral effort routing, four-state effort-source vocabulary, borrowed/related-effort priors, and Phase 5 packaged-SEA + Pi QA.

- Prefer run-92 evidence under `.recursive/run/92-configured-model-pool-benchmark-convergence/evidence/` for membership-revision convergence, honest null candidate-space, benchmark quarantine, controller eject, and Phase 5 `:3501` QA.
- Prefer run-89 evidence under `.recursive/run/89-codex-role-model-package/evidence/` for Codex adapter, tool-bridge, npm/marketplace, and Phase 5 live routing proofs.
- Codex outsider install: `npx --yes @try-works/codex-role-model@latest setup|start`; marketplace via personal npm catalog or (after merge) `codex plugin marketplace add try-works/role-model --ref dev`.
- Prefer run-86 evidence for RM3 kit, shell, page IA, SP8 floor, Phase 5 `:3470` QA, screenshots, and P1–P8 polish addenda.
- Prefer run-85 evidence for inject unlock, host join/auto-arm, pin/freeze, Phase 5 rebuild/SEA-inject/probe/cloud/`pi` proofs, and post-lock `pi-kw-inject-e2e.json`.
- Prefer run-84 evidence for UI toggle / retrieve gate / eval consumer foundation.
- Prefer run-83 evidence for equals-form argv / evidence-root / soft-toggle foundation.
- Prefer run-82 evidence for digest-bind / launch-scope closeout context.
- Prefer run-81 evidence for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence for mutation/dismiss/UI/SEA packaging remediations.
- Prefer run-60 evidence only as historical Paper-Linear baseline context (superseded by run 86 for live runtime-ui styling).
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; SEA inject hop: `scripts/track-b/run85-sea-inject-hop.mts`; live pi inject E2E: `scripts/track-b/run85-pi-kw-inject-e2e.mjs`; TB10: `tests/track-b/tb10.test.mjs`; assemble: `scripts/track-b/assemble-run00-live-e2e.mjs`.
- Runtime-ui RM3 QA: `corepack pnpm --filter @role-model-router/runtime-ui build` → `runtime:validate-ui` → `start-for-qa`.
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; wire private KW join factory before claiming SEA inject unlock.
- Private feature worktrees must live under `role-model-internal/.worktrees/` (not external `D:/DEV/.wt/`).
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).

## Run 105 current state — route-learning matching-scope activation

Run `105-route-learning-matching-scope-activation` implements controlled exact `(role, task)` endpoint-ladder routing. Final source pair: public `7162930d` / private `da40a115`; final sealed development artifact under `E:/tmp/run105-full2-public/.../win32-x64` (exe SHA `ffc3f58a...`, release manifest `7506ad61...`, private manifest `fedaa87f...`). The final runtime is healthy on **development :3458 only**; :3457 was not touched.

Product state:
- Finalized comparisons materialize scoped ladders with atomic CAS, rollback preservation, measured evidence metadata, keyset pagination and strict accepted-policy proof.
- The publisher/cache/router enforce exact role/task, measured confidence/freshness/cohort, safety suppressors, eligibility and unchanged advisory gates.
- Depth-first replay, 30-day refresh, sequential endpoint challenge and durable round identity are wired through genuine evaluation/replay/queue evidence.
- Packs UI provides top-three index, full detail, truthful no-ladder/uncertainty states and per-task reversible rollback. Mobile shell repaired after live QA.
- Telemetry overflow R15 keeps the user-approved16KiB metadata policy; actual long provider failures preserve422 and store compact dimensions with explicit truncation.

Verification floor:
- host bridge:2245passed/5skipped; core154/154; UI685/685; paired private run105159/159; SQLite139/139; final build closure13extensions/152files.
- live :3458: health/source identity, API readbacks, bounded rollback409, two successful pi requests through localhost provider with cleanup, desktop/mobile browser27/27, zero network/console failures after responsive rebuild.

Known limitations: evidence-doc CAS orphans and bounded duplicate challenge work after restart; no live graph pointer for full rich failure diagnostics; merge/promotion is separate.

