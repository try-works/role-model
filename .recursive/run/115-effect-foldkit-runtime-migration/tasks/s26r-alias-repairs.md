# S26r fix the aliases, the detail proofs, the peer refusal and the action bodies (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The S26n review found real defects. Fix all of them; do not weaken the tests.

## 1. The aliases are route mappings with the WRONG targets
`route.ts:88-90` maps `/local/models` -> LocalChoose (correct), `/local/matrix` -> LocalSwap and `/router/config` -> Router (both wrong). Legacy `local-matrix.tsx` goes to `/app/local/llama-swap/models?view=grid` and `router-config.tsx` to `/app/router/strategy`. Either port those real targets or leave the two rows refused - and if you keep a mapping, make it a real redirect (address bar canonicalises) or assert the canonical path explicitly. A test must fail if a target changes.

## 2. Detail routes were flipped to verified on hand-written bodies
`requestDetail` and `routerDecisionDetail` have no captured body. Either capture a real one from a packaged host that has a request/decision id (a fixture-driven run can create one through the mock upstream), or set them back to unproven with the reason. A hand-written success body is not evidence.

## 3. local-peer-models is refused on a false premise
The four-state proof uses an INJECTED fetch, not host state: give the spec a non-empty success body (`[{id:'p',url:'http://peer'}]`, the shape `localPeers` already uses) and assert success/empty/loading/error. Keep the captured empty body for the empty state. Do not claim the success state from the empty capture.

## 4. legacy-redirect: keep the honest subset only
Refusing the full 22-path map is fine while targets are unported, but the honest subset today is `local/models` alone (plus whatever targets you actually port in this task). Record the rest with their target and the reason.

## 5. Control actions and the tie
- `control.ts` still dispatches `synthetic-model` / `synthetic-provider-account` for endpoints; send real values and assert the exact body per action (mutating a body to `{}` must fail).
- The tie's tightened regex is still fooled by a nested `if (false && request.method ...)`: make the tie run the client against the real handler in-process, or assert the handler's registration structurally (not a text match). Prove both mutations fail.

## 6. Evidence
`evidence/other/s26n-tdd.json` is missing; write a proper TDD record for this work (and backfill S26n's) with the RED/GREEN log paths.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; evidence `s26r-*`.

NO legacy/host changes except where a real target must be ported (say so), no ECharts, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The alias decisions with targets and their tests, the detail-route outcome, the peer route outcome, the honest subset, the real action bodies, the tie mechanism and its two mutation REDs, the evidence file, counts and typecheck.