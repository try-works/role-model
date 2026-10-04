# Addendum 13 — Bug 3 end-to-end: effective-judge exclusion, and what actually blocked the 4/4 ladder

Run: `105-route-learning-matching-scope-activation`  
Runtime under test: `:3458` (scope `standalone-runtime-dev`, channel `development`; `:3457` never touched)

## 1. The bug as stated

The replay focus-dispatch planner zeroed its arm list with `no_distinct_candidate_configured`
whenever the counterfactual arm it wanted to plan was also the effective judge.

## 2. Root causes actually found — five stacked defects

| # | Defect | Live evidence | Fix |
|---|--------|---------------|-----|
| 1 | Classification divergence: the runtime read runtime-policy ids instead of the authoritative taxonomy identity, so captures never carried `coder.edit`. | pi request `req-107da042` carried the intent but the ladder stayed empty. | public `d797a185` |
| 2 | Advisory `unavailable`: the host envelope merged transport fields into `route_ladder_evidence`, so the advisory digest was computed over the wrong body. | advisory readback showed `unavailable` under a mismatched key. | public `50705bdc` |
| 3 | `preferEffortMatchedReplayArms` repointed a `deepseek-flash` arm to its effort-matched sibling `deepseek-flash-max` — which was the *source* — collapsing the pair. | `[focus-diag] ... admitted=deepseek-flash-max,deepseek-v4-pro` only. | public `f16d9551` |
| 4 | The controller judge (`kimi-k3`) is *also* a configured endpoint, and every site excluded it from the challenger set, so `4/4` was unreachable by construction. | `no_distinct_candidate_configured` with `kimi-k3` permanently unranked. | public `a6a57cd4` |
| 5 | The dispatcher re-picked already-replayed captures forever: `readRouteReplayableCaptures` reads the classification index directly and never consulted the replay disposition, so terminal (`replayed`/`refused`) captures re-entered the candidate set. | `[cand-diag] ref=req-0e208911` (outcome `refused:duplicate_already_processed`) every tick. | public `07dcd9f8` |

## 3. Two further defects found while verifying

| # | Defect | Live evidence | Fix |
|---|--------|---------------|-----|
| 6 | A retried judge score re-dispatches the judge, producing fresh `dispatchReceiptId`/`judgeResultRef`; `recordTrialScoreBatch` then threw `evaluation trial score batch conflict` and stranded the comparison. | `req-2d2b5693: deferred replay_failed … score batch conflict`; `evaluation job stranded without a finalized comparison`. | private `e7eb4111` (stable `scoreId` + receipt-stripped identity compare; 23/23 tests) |
| 7 | The managed `artifact-digest.key` was absent from the state root, so `resolveDurableEvaluationAuthority` threw `managed artifact digest key not found`; the `readRouteDispatchEvidence` binding returned null and **every tick died with `route dispatch evidence unavailable` before planning a focus**. | tick `lastError="route dispatch evidence unavailable"`; `[replay-tick] run: captures=32` then `skip: running=true` indefinitely. | regenerated a 64-hex key at all three candidate locations |

## 4. Live verification on `:3458`

Both ladders built entirely through counterfactual replays — no synthetic seeding:

```
coder/coder.edit:   4/4  [deepseek-flash, kimi-k3, deepseek-flash-max, deepseek-v4-pro]
coder/coder.config: 4/4  [kimi-k3, deepseek-flash-max, deepseek-v4-pro, deepseek-flash]
```

* `kimi-k3` — the configured controller, and therefore the judge — is admitted as a **challenger**
  in both ladders, with `evaluation_judge_switches` recording `kimi-k3 -> deepseek-flash`
  (the alternative judge chosen by `dedupeJudgeAgainstPair`) for its own comparisons.
* The depth-first dispatcher advanced by itself: `coder.edit` -> `coder.config` ->
  `writer/educator.example.generate` (next).
* Ledger: `counterfactuals=26`, `dispatches=100` in the `2026-10-04` budget window.
* The repeatedly-failing capture `req-3c55775c` was retired by the deferral bound
  (`replayDeferralBound=3`) with `replay_branch_append_unavailable`, and the next fresh
  capture admitted `kimi-k3` — the bound working as designed rather than a stuck loop.

## 5. Route advisory uptake — verified

The routing consults the ladder advisory and applies it. From the durable observation ledger
(`track-b/advisory-observations.json`, revision 503):

```
observed=503  fresh=201  stale=0  unavailable=302
preferredEligible=146  considered=146  applied=4  rungWalked=103  rungApplied=4
```

Per task, the advisory was **fresh** for exactly the two tasks under verification:

* `taskTypeId=coder.edit`   — 124 fresh observations, **4 applied**
* `taskTypeId=coder.config` —  13 fresh observations

The 302 `unavailable` observations are the *unclassified* requests (the runtime itself reports
`[run105] 32 capture(s) refused as no_route_classification`), not the two tasks above, so they do
not indicate a publication regression. A stale first-tick `[run99] live advisory miss` and a
transient `[run105] ladder materialization degraded: database is locked` both cleared once the
advisory refresh (15 s cadence) republished.
