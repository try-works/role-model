Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `05 Manual QA`
Status: `DRAFT`
Addendum: `replay-no-distinct-candidate`

## Summary

Live Phase 5 follow-up: the coder.edit ladder stalled at `partial (2/4)` because the replay
dispatcher refused every remaining capture with `no_distinct_candidate_configured` (and later
`eligible counterfactual distinct from the source endpoint`). This records the root cause, the
four repairs, and the verification so far.

## Root cause (four stacked defects)

1. `Judge resolution divergence.` The dispatcher's `resolveJudgeEndpointId` read the narrow
   `options.readControllerAssignment` (unwired) and the empty `runtime_controller_assignments` table,
   returning `null`, while the supervised replay endpoint's `resolveControllerJudge` read the wired
   backend binding and returned the configured controller. So the two layers disagreed about the judge.
2. `Effort-matching repointed the counterfactual to the source.` `preferEffortMatchedReplayArms`
   substituted `deepseek-flash` with its effort-matched sibling `deepseek-flash-max` (same model, the
   source's effort), which IS the source endpoint, so the distinct-source gate rejected it. Effort is a
   preference, never a reason to reintroduce the source.
3. `Controller judge was also a candidate endpoint.` The configured controller (`kimi-k3`) is one of the
   four configured candidate endpoints. The judge exclusion (`excludedEndpointIds`) permanently removed it
   from the challenger set, so it could never be admitted and the ladder could never reach 4/4.
4. `Classification divergence` (earlier, `d797a185`) and `advisory digest envelope` (`50705bdc`) -
   see the prior addenda.

## Fix

- `16d061bd`: wire the controller judge into the dispatcher (`startHostAutoReplayLoop` now takes a
  `judgeResolver` that calls `resolveControllerJudge(created, learningPolicy)`).
- `f16d9551`: `preferEffortMatchedReplayArms` takes `sourceEndpointId` and never repoints to it.
- `a6a57cd4`: stop excluding the judge from the challenger set in all four places (dispatcher
  `planFocusDispatch`, automatic tick `selectReplayCandidates`, supervised `selectReplayCandidates`,
  `counterfactualPackages`). A challenger that equals the controller is de-conflicted at evaluation by the
  existing `dedupeJudgeAgainstPair` (picks an alternative judge), so the controller endpoint is admitted as a
  challenger.

## Verification

- Typecheck clean; 18 judge/replay tests pass (`run100-judge-arm-exclusion`, `run155-judge-provenance`,
  `run104-sp1-dispatch-subset`).
- Live on `:3458`: the dispatcher now resolves the judge and picks `deepseek-flash` as a distinct
  counterfactual; `candidatePackages` is `deepseek-flash` (no longer the source `deepseek-flash-max`);
  dispatches advanced 22->28 and counterfactuals 0->2, with `req-107da042` and `req-0e208911` both
  dispatched (now `duplicate_already_processed`).
- Still open: the ladder remains `2/4` because the prompt heuristic only classifies ~1-2 of my "TypeScript
  source file" prompts as `coder.edit` (`scoped=1`), so driving the 5 comparisons per unranked endpoint
  (`deepseek-flash`, then `kimi-k3`) is slow. To be completed: admit `deepseek-flash` (3/4), then
  `kimi-k3` (4/4) and confirm the advisory is taken up in routing.
