# S396c — endpoint admission form (LANDED)

## Verified host contract
- Single: POST /api/role-model/endpoints (index.ts:20021) body { providerAccountId, modelId, region, optional reasoningEffort } — the activation body the original UI/original batch builder sends.
- Batch: POST /api/role-model/endpoints/batch (index.ts:20005): { activationBatchId (regex ^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$), activations: 1..32 objects } (host validation at activateEndpointBatch).
- GET /endpoints list readback remains the control page's read source.

## Landed
- src/endpoint-admission.ts: typed draft/state, validation (provider, at least one model, valid batch id in batch mode), endpointActivationPayloads (one per unique model), endpointBatchPayload, and the exact client (activate/activateBatch).
- Message/model/commands/update: controlled field/model add/remove; SubmitRequested is busy-guarded; single mode emits ONE ActivateEndpoint per selected model; batch mode emits ONE ActivateEndpointBatch; success token-fenced; failure and validation errors keep the draft.
- control.ts: ControlSpec.action is now optional; the endpoints generic action (and its S208 disabledReason) is REMOVED because the landed admission form owns the action. control-view guard renders the generic action only when present (legacy dispatch returns 400 no-action for endpoints).
- control-view/view: Endpoints page renders the endpoint-admission form (provider account, region, reasoning effort, batch mode, batch id, model add/remove, Activate button, error alert) under data-route endpoint-admission; app wires the real client.

## Tests (test/s404-endpoint-admission.test.ts, 7)
- exact one-per-model payloads; exact batch payload; exact POST paths/bodies for single and batch.
- single mode = one ActivateEndpoint per model; batch mode = one ActivateEndpointBatch; no-double-submit while saving; failure keeps draft+error; validation keeps draft with an error and no commands; S208 disabledReason removal assertion (`action` absent).
- Updated s26k control tests for the form-owned endpoints action (generic dispatch returns 400; action bodies loop filters specs with actions).

## Evidence
- RED s404-red.log EXIT_CODE=1 (4 failed pre-wiring); GREEN s404-green.log 7 files / 154 tests; UI tsc exit 0.
- Hashes: endpoint-admission E8D4FB9F..., control 7CE9A54F..., control-view 420A02F7..., update 0CAC8611..., view 3BC64EA2..., app 1462142C..., message 792E82B5..., model 6060548E..., commands 3E3B994D..., s404 test 6F744114..., s26k test E2E5B340....
- Lint: s404 clean (0).
## S405 repair (batch bound + lint)

| Hold | Fix | Evidence |
| --- | --- | --- |
| Batch 1..32 bound not enforced client-side | validateEndpointAdmissionDraft now refuses batch mode with more than 32 unique selected models ('Batch mode supports at most 32 activations.'), keeping the draft and emitting no commands. | tests 'accepts 32 selected models in one batch command' (one batch, 32 activations) and 'refuses 33 selected models in batch mode with a typed validation error keeping the draft' (no commands, status error, 33 kept) |
| Bare as HTMLButtonElement cast in s26k | Added an adjacent SAFETY comment (the test asserted the button exists; only aria-disabled is read). | test/s26k CLEAN |

Evidence: RED s404-red2.log EXIT_CODE=1 (only the 33-refused test failed); GREEN s404-green2.log 7 files / 156 tests; UI tsc exit 0. Hashes: endpoint-admission ABC74A10..., s404 test 67E5A2A5..., s26k test 7D4D924A....
