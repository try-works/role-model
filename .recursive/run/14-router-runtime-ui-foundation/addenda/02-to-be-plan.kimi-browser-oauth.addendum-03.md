Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:33:32Z`
LockHash: `09f0df2f43e6e9cddf7aa7eda6d484f832fdc8a04355b522aa4b116dd533051f`
Addendum: `03`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.kimi-browser-oauth.addendum-03.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.kimi-browser-oauth.addendum-03.md`
Scope note: This addendum plans the Kimi Code OAuth UX repair after run-14 closeout.

## TODO

- [x] Record the scope expansion or repair without rewriting the locked base plan
- [x] Map the required product or architecture changes into concrete implementation slices
- [x] Capture sequencing, constraints, and focused validation expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Root cause identified in `01.5-root-cause.kimi-browser-oauth.addendum-03.md`:
- the upstream Kimi flow is device-code OAuth with browser-open + polling
- the runtime host already supports session start and token polling
- the remaining gap is the runtime UI orchestration and copy

## Target Outcome

Starting Kimi Code OAuth from `/app/accounts` should:
1. open the verification URL in a new browser tab/window automatically
2. continue polling the existing host bridge until the session becomes connected, expired, or failed
3. surface clear status messaging so the operator does not need to guess whether the binding is still progressing
4. retain a manual retry/check action as a fallback when popup blockers or network issues interfere
5. document that this provider flow is device-code polling rather than callback redirect

## Planned Changes

1. Add a small runtime-ui helper module for device-auth browser-open + polling decisions so the flow can be regression-tested directly.
2. Add failing tests first for:
   - selecting the best verification URL to open
   - deciding whether a session should keep auto-polling
   - deriving a stable poll delay from the session metadata
3. Update the accounts route to:
   - open the verification URL immediately after `startRuntimeDeviceAuthorization(...)`
   - schedule automatic polling while the session remains pending
   - stop polling on `connected`, `expired`, or `failed`
   - refresh the runtime snapshot after poll transitions
4. Update UI copy so Kimi Code status explains that the runtime is waiting on device authorization completion in the opened tab, not on a provider callback URL.
5. Capture focused RED/GREEN evidence plus implementation/test-summary addenda for this repair slice.

## Validation Plan

- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm run runtime:validate-ui`

## Traceability

- R3 provider onboarding -> Kimi Code browser-open + auto-poll repair

## Coverage Gate

- [x] Addendum scope is grounded in the locked base plan and effective inputs
- [x] Concrete implementation slices or constraints are recorded in the addendum body
- [x] Focused validation expectations or follow-on receipt obligations are captured

Coverage: PASS

## Approval Gate

- [x] The plan addendum names the concrete repair or expansion scope
- [x] Sequencing or dependency constraints are explicit where needed
- [x] The addendum is ready to guide paired implementation and validation receipts

Approval: PASS

