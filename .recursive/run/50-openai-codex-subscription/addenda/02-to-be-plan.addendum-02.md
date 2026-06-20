Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 TO-BE PLAN`
Status: `DRAFT`
Addendum: `02`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-02.md`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-02.md`
Scope note: This addendum defines the bounded RED-GREEN repair for restart-time remote-health false negatives caused by canonical-vs-provider model-id formatting drift.

## Remediation Plan

1. Add a failing unit regression proving `probeRemoteEndpoints(...)` accepts unprefixed provider ids for canonical runtime ids.
2. Add a failing restart regression proving a restarted remote endpoint stays healthy when provider `/models` returns the unprefixed id.
3. Implement comparable-id normalization inside `remote-health-probe.ts`.
4. Re-run the focused host-bridge bootstrap, restart, and probe suites.
5. Rebuild the runtime host and restart the live `3461` runtime.
6. Verify `/healthz` and `/api/role-model/endpoints` emit corrected health for the affected provider.

## Acceptance

- false `model-not-found` degradations caused only by provider-prefix omission are removed
- genuine unmatched provider ids still degrade honestly
- restart-time inventory recovers healthy endpoints after bootstrap
- rebuilt runtime on `127.0.0.1:3461` reflects the corrected health emission

Coverage: PASS
Approval: PASS
