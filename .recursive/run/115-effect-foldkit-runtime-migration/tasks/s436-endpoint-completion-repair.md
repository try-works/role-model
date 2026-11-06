# S436 — endpoint multi-activation completion repair (DESIGN ONLY, no implementation)

Status: design draft. No product writes performed; source/tests untouched. Author: `s5-health-wait`, active model verified **deepseek-flash** via `list_agents` at review time. Auth worker owns the current `src/update.ts`; this document is disjoint planning only. No M8 completion claim.

## 1. Governing finding

S420 finding 4 (evidence/other/s420-current-state-review.md):

> Multi-model admission reports saved after the first response (M8/R13). `update.ts:1158-1172` emits N commands sharing one token; `1175-1183` clears pending on first success. Lead two-model probe: 2 commands, first success -> saved. Duplicate submit becomes possible while other requests run; mixed success/failure order is not tracked. Previous M8 COMPLETE is withdrawn.

Confirmed in current code:
- `apps/runtime-ui-next/src/update.ts:1168-1184` (`EndpointAdmissionSubmitRequested`): one `token` shared by every `ActivateEndpoint` command in single mode.
- `:1185-1192` (`EndpointAdmissionSucceeded`): any matching success sets `pendingAction: undefined, status: "saved"`, so the busy guard stops protecting remaining in-flight commands; a second submit can issue duplicate activations.
- `commands.ts` `ActivateEndpoint`/`ActivateEndpointBatch` args carry only `{payload, token}` — no activation identity, so a success/failure cannot be attributed to one model.
- `endpoint-admission.ts` `EndpointAdmissionState` has only a single `status`/`token`; no pending set or per-activation results.

## 2. Exact original/current HTTP contract (must not change)

Single activation (landed S396c extension; host route):
- `POST /api/role-model/endpoints` — host `apps/runtime-host-bridge/src/index.ts:20020-20033`.
- Body: `{ providerAccountId, modelId, region, reasoningEffort? }` (`apps/runtime-ui-next/src/endpoint-admission.ts` activation payload type; the original per-request activation shape).
- Response: one endpoint record; non-2xx = host `{error}` bounded message.

Batch activation (original provider/reasoning-effort path):
- `POST /api/role-model/endpoints/batch` — host `index.ts:20005-20018`.
- Body: `{ activationBatchId, activations: [{providerAccountId, modelId, region, reasoningEffort?}] }`; `activationBatchId` must match `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`, 1..32 activations (host validation).
- Response: `{ activationBatchId, status: "committed", endpoints: [...] }` (`RuntimeEndpointActivationBatchResult`; host `activateEndpointBatch`).
- Original UI builder: `apps/runtime-ui/app/lib/runtime-api.ts:3588` `activateRuntimeEndpointBatch`; producer `providers.tsx:1044-1062` `buildReasoningEffortActivationBatch`; types `RuntimeEndpointActivationBatchInput/Result`.
- Therefore: the batch call remains ONE atomic activation unit; single mode emits one activation unit per selected model. No host change, no new route, no payload field change.

## 3. Design — pure per-activation completion tracker

New disjoint file (future, not created now): `apps/runtime-ui-next/src/endpoint-activation-tracker.ts`. No Effect/command code; pure data transition so it can be tested without mounting the shell and integrated without rewriting the update monolith.

### State (Schema-bound; exact types to be finalized at implementation)

```ts
EndpointActivationOutcome = "succeeded" | "failed"
EndpointActivationSettled = { activationId: string; outcome: EndpointActivationOutcome; message?: string }
EndpointActivationRun = {
  generation: number;                  // monotonic run fence; 0 = idle
  mode: "single" | "batch";
  pending: ReadonlyArray<{ activationId: string }>;
  settled: ReadonlyArray<EndpointActivationSettled>;
  status: "idle" | "pending" | "partial" | "saved" | "error";
}
```

Activation identity:
- single: `activationId = "model:" + encodeURIComponent(modelId)` (unique per selected model; payload remains the exact body from `endpointActivationPayloads`).
- batch: `activationId = "batch:" + activationBatchId` (one unit; the host commits the whole batch).
Identity never derives from array position, so reordering callbacks cannot mis-attribute results.

### Transitions

1. `beginEndpointActivationRun(run, { mode, activations })`
   - If `run.pending.length > 0` OR `run.status === "pending"` -> `{ kind: "busy", run }` (no generation bump, no commands; this is the submit-while-pending gate).
   - Else generation = `run.generation + 1`; pending = planned activation ids; settled = []; status = `"pending"`; returns `{ kind: "started", run, generation, activations }` for the caller to build commands.
   - Empty planned set is a validation error, not a run (reuse `validateEndpointAdmissionDraft`).
2. `settleEndpointActivation(run, { generation, activationId, outcome, message? })`
   - `generation !== run.generation` -> `{ kind: "stale", run }`; no mutation (old-run late callback fence; checked FIRST, before any status/diagnostic mutation).
   - `activationId` not in pending -> `{ kind: "ignored", run }` (repeated callback, duplicate/unknown id, or already-settled activation). First terminal outcome wins.
   - Else move that id from pending to settled:
     - pending remains -> status `"pending"`; `{kind:"updated"}` (no `"saved"` yet).
     - pending empty:
       - every settled succeeded -> status `"saved"`;
       - at least one failed and at least one succeeded -> status `"partial"` (failed message(s) retained per activation);
       - every settled failed -> status `"error"` with failed messages retained.
3. `canSubmit(run) = run.pending.length === 0 && run.status !== "pending"`.

Aggregate result is order-independent: settling A then B yields the same settled set/status as B then A.

### Disjoint future integration regions (do not touch now)

| Region | File:line now | Planned change |
| --- | --- | --- |
| Tracked run field | `src/endpoint-admission.ts` `EndpointAdmissionState` (currently status/token/pendingAction; `update.ts:1181-1183`) | Add bounded run state (generation, mode, pending/settled, status) or embed tracker output; remove the single `token` from command callbacks (payload untouched) |
| Command args | `src/commands.ts` `ActivateEndpoint`/`ActivateEndpointBatch` | Add `activationId` and `generation`; callback messages carry them; payload JSON unchanged |
| Callback messages | `src/message.ts` `EndpointAdmissionSucceeded/Failed` | Add `activationId`, `generation`; add a batch outcome path; keep bounded failure message |
| Submit/callback handlers | `src/update.ts:1168-1195` | Submit: `beginEndpointActivationRun` (busy gate); issue one command per planned activation with the same generation + distinct ids. Callback: `settleEndpointActivation`; no command emission, no token overwrite; status only from aggregate |
| Form render | `src/control-view.ts` `renderEndpointAdmissionForm` | Disable submit while `canSubmit` false; render per-activation failed messages/partial summary honestly |
| Tests | new `test/s436-endpoint-activation-completion.test.ts`; keep `test/s404-endpoint-admission.test.ts` exact payload/32-bound tests | RED cases below, then integration |
| Existing messages | `EndpointAdmissionSucceeded/Failed` | Preserve names for batch compatibility or map batch id; do not delete existing payload tests |

No change to `endpoint-admission.ts` payload builders, host routes, client methods, or the 1..32 validation.

## 4. Behavioral RED cases (write first, before integration)

1. **Two single-mode commands have distinct identities and one generation.** Submit with two selected models -> exactly 2 `ActivateEndpoint` commands, same generation, distinct `activationId`, identical exact payloads per model. First success (A) -> status remains pending/activating, NOT saved; a `SubmitRequested` while B is pending -> zero commands and generation unchanged.
2. **A-success then B-fail preserves partial failure.** Settle A success, then B failure("B boom") -> status `partial`; settled contains A succeeded and B failed with "B boom"; draft unchanged; no command; submit still gated until no pending (after both settle it is allowed with a new generation).
3. **Reverse order is identical.** Settle B failure then A success -> same aggregate settled set/status as case 2; failure message retained; no duplicate B entry.
4. **Repeated callbacks are idempotent.** Duplicate A success, then a late A failure, and an unknown/old activation id -> all ignored; settled count stays 1 for A; first terminal outcome wins; no status flicker.
5. **Submit while pending is refused.** With A/B pending, `EndpointAdmissionSubmitRequested` -> `commands: []`, same generation, no draft change.
6. **Old-generation fence.** Finish run generation 1 and start generation 2 (new submit); deliver generation-1 success and failure for A/B -> both `stale`, ignored BEFORE any status/pending/error mutation; generation-2 pending/results unchanged.
7. **Batch mode remains one unit.** Batch submit -> exactly 1 `ActivateEndpointBatch` with `activationId=batch:<id>`; success -> saved; host failure -> error with draft kept; duplicate/old-generation batch callbacks ignored. Batch partial responses are not fabricated: host batch is committed-or-error, so one unit outcome only.
8. **Existing exactness preserved.** S404 tests still prove exact single/batch payloads and 32/33 bound; this repair changes only command metadata/completion aggregation, not HTTP bodies.

Optional bounded follow-up test (design decision, not required for RED): after a partial run settles, a new submit issues commands only for the failed activation ids and retains succeeded endpoints; if the draft selection changes, a full new run is allowed. Do not implement this before the base aggregate is green.

## 5. Verification plan for the future implementation

- Strict RED first: new completion test fails on current code (two commands -> first success reports saved; no activation ids; no partial), capture run log.
- Then minimal tracker + update/commands/message/view integration; GREEN includes s404 exact payload suite + S436 + affected UI suites + UI tsc 0.
- Absolute anti_slop_lint filesScanned>0 on new/edited files; no source-string-only acceptance.
- No host route/schema changes; no new endpoint authority; no M8 closure claim. Independent reviewer distinct from author. No commit without Lead.

## 6. Non-goals / limitations

- Not implementing here; the auth worker owns `src/update.ts` and no source is touched by this design.
- Not addressing endpoint selection/catalogue, batch atomicity changes, or host-side partial-batch results (host batch is all-or-nothing).
- Not claiming M8 complete; the design only closes the per-activation completion race once implemented and reviewed.
