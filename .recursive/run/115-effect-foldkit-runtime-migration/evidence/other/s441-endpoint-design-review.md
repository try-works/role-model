# S441 — pre-implementation design/caller review: S439 endpoint aggregate completion

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only design/caller review; no product/test/config edits, no commit, no ports/providers. Inputs: tasks/s439-endpoint-completion-implementation.md, tasks/s436-endpoint-completion-repair.md, S420 finding F10 and the current endpoint command/update/message flow.

## Current flow facts (the race the design must close)

- `EndpointAdmissionSubmitRequested` (`update.ts:1172-1187`) increments one token, builds either one batch command or N `ActivateEndpoint` commands, and sets one `pendingAction/status:"saving"`.
- `ActivateEndpoint`/`ActivateEndpointBatch` args are only `{payload, token}` and their callbacks are `EndpointAdmissionSucceeded({token})`/`Failed({message, token})` (`commands.ts:459-487`). There is no activation identity or run generation in the callback.
- `EndpointAdmissionSucceeded` accepts any matching token, clears `pendingAction`, and sets `saved` (`update.ts:1189-1193`). This is exactly F10: first child success ends the run; remaining children are still in flight and a second submit is allowed.
- `EndpointAdmissionFieldChanged/ModelAdded/ModelRemoved` mutate the draft at any time, including while a run is pending (`update.ts:1158-1171`); there is no run snapshot.
- Batch is one host unit: `POST /endpoints/batch` returns committed-or-error with one `activationBatchId`; single is one request per model.

## Design review: required semantics are sound, but these implementation pitfalls need explicit decisions

### 1. Callback identity/generation must be captured at command creation, not inferred from responses

The design correctly adds `activationId` and `generation` to command args and callback messages. Ensure:
- Single id is stable and unique: `model:${encodeURIComponent(modelId)}` (dedupe selected IDs before planning; current payload builder already dedupes).
- Batch id is `batch:${activationBatchId}` and is ONE unit; never derive per-endpoint outcomes from the host `endpoints[]` array.
- The command's Effect callback carries the captured args; do not derive identity from the response (the single endpoint record may not echo a useful identity) or from array position.
- `generation` is a monotonic integer (typed in message schema); the first check in the callback must be `generation !== run.generation -> ignored` **before** any status/pending/error mutation. Design v1 correctly says this.
- Keep old callback names only if they carry the new metadata; update s404 tests' callback metadata, not their exact HTTP payloads.

### 2. Draft changes while pending — define snapshot/freeze policy

The design's tracker plans `activationId`s from the submitted draft, but the form still permits field/model edits while pending. If A/B run pending and the user removes B or changes region:
- Results still settle for the old run; the visible form now describes a different selection;
- `saved` for the old run can look like success for the new draft;
- A later submit can duplicate an already-successful endpoint because the draft still contains it.

**Required policy (pick and test):** either (a) freeze field/model/batch controls while `pendingAction/canSubmit === false`, or (b) store the run's submitted selection snapshot and render per-activation results against that snapshot, keeping the draft editable only for the next run. Do not silently merge old run results into a mutated draft.

### 3. Partial retry must not re-activate already-succeeded models

After A success/B failure, `pending` is empty and `canSubmit` becomes true. A plain new `beginRun` over the current draft issues commands for A **again**. That is the duplicate-activation bug the S439 note warns about. The base design's optional follow-up is not enough unless the author chooses a policy:
- retain `settled` successes and on retry issue only failed activation ids (new generation), or
- require an explicit “retry failed”/reset action that excludes succeeded ids, or
- if a full re-run is chosen, require explicit operator confirmation and document that it may duplicate/conflict.
Also define behavior when the draft changed: retrying only failed ids is unsafe if their payload changed; use a full run only with explicit policy. Add tests for A-success/B-fail -> next submit does not contain A unless the policy explicitly says full rerun.

### 4. Batch is one atomic unit; do not synthesize partial batch outcomes

The host batch route is committed-or-error and returns `{activationBatchId, status:"committed", endpoints}`. The tracker should have exactly one batch activationId and one settled outcome. A batch success is `saved` after that one unit; a batch failure is `error` with the bounded message; never mark per-endpoint partials from `endpoints` or response array ordering. If a batch response is ambiguous/lost after commit, the UI has no per-child truth; that is a host/idempotency limitation, not something the tracker should fabricate. Duplicate batch callbacks/old generation must be ignored.

### 5. Failure-before/after-activation ambiguity and retry

A single `ActivateEndpoint` non-2xx or network error may occur after the host committed the endpoint (the client cannot distinguish). The design's “failed” outcome is an observation, not proof nothing was activated. Do not auto-retry failed ids without an explicit policy; surface the bounded failure message and keep the draft. For batch, use the same `activationBatchId` on an explicit retry to preserve host receipt/idempotency if supported, or require operator choice; do not silently generate a new batch id.

### 6. Bounded tracker/view and status edges

- Use a run-level settled collection bounded by the planned ids (single selected models; batch one), not an unbounded history; retain per-id first failure message only (bounded).
- Status rules: pending until all settle; all success -> `saved`; mixed -> `partial` (failure messages visible); all fail -> `error`; never `saved` on the first success.
- The submit guard must use run pending/status, not the old `endpointAdmissionBusy` alone; a `pendingAction`-style flag can be updated only by aggregate completion.
- View should disable submit while `canSubmit === false` and show partial/error per activation. If draft controls are not frozen, label old-run results clearly.

## Recommended RED cases for the author (beyond S436)

1. Two commands distinct ids/same generation; first success -> still pending; submit while pending -> zero commands/generation unchanged.
2. A success then B fail (and reverse) -> one partial status, per-id failures retained, order-independent; no duplicate A.
3. Duplicate A success, late A failure, unknown id -> ignored; first terminal wins.
4. Old generation success/failure -> no mutation of new run.
5. Batch -> exactly one unit/id; success saved; failure error; duplicate/old ignored; no fabricated per-endpoint partials.
6. Draft mutation while pending -> either controls are frozen or old-run results are bound to a submitted snapshot; a subsequent submit cannot silently duplicate a succeeded endpoint.
7. Partial retry -> no succeeded activation id is submitted; if full rerun is chosen, explicit policy/confirmation is tested.
8. Existing s404 exact single/batch payload and 32/33 bound remain unchanged.

## Verdict

The S436 tracker/design direction is sound (per-id, generation, aggregate status, batch one unit), but the author must explicitly resolve **draft-while-pending** and **partial-retry/failed-ambiguity** policy before implementation; without those, the design can still duplicate activations or show saved under a mutated draft. No product/test file was modified; no commit. This is design review only, not implementation acceptance.

No product/test/config file was modified; no commit.

