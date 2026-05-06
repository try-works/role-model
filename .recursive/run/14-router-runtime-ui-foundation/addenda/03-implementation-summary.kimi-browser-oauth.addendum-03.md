Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `03`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.kimi-browser-oauth.addendum-03.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.kimi-browser-oauth.addendum-03.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.kimi-browser-oauth.addendum-03.md`
Scope note: This addendum records the Kimi Code browser-open + auto-poll OAuth UX repair.

## TDD Compliance Log

TDD Mode: strict

RED Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-ui-kimi-browser-oauth.addendum-03.log`

GREEN Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-ui-kimi-browser-oauth.addendum-03.log`

### Requirement

**Target behavior:** Starting Kimi Code OAuth should open the verification URL in a new tab/window and keep progressing without requiring a manual "Check connection" loop for the normal path.

**RED Phase**
- Added `app/lib/device-authorization.test.ts`
- Initial failure: missing `./device-authorization` module proved the new browser-open/poll helper surface did not yet exist

**GREEN Phase**
- Added `app/lib/device-authorization.ts` with:
  - verification URL selection
  - pending-session auto-poll eligibility
  - provider/default poll-delay handling
- Updated `app/routes/accounts.tsx` to:
  - open the verification URL in a new tab immediately after device auth start
  - auto-poll pending sessions using the host bridge's existing poll endpoint
  - stop polling once the session becomes `connected`, `expired`, or `failed`
  - update the device-auth copy so it clearly describes device-code polling instead of callback redirect semantics
- Updated `apps/runtime-ui/package.json` so the new runtime-ui regression test is part of the focused package test command

**REFACTOR Phase**
- Tightened the polling effect with an explicit non-null pending session capture for TypeScript safety
- Kept the inline verification link and manual `Check now` action as fallback behavior when popup blocking or operator preference requires manual intervention

## Files Changed

- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`
- `role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/accounts.tsx`

## Result

The runtime UI now matches the upstream Kimi device-auth interaction more closely: the browser opens immediately, the UI keeps polling automatically, and the account binding completes through the existing device-token polling path instead of waiting for a nonexistent provider callback URL.
