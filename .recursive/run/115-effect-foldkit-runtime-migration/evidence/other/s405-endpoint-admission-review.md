# S405 — independent review: S396c endpoint admission form

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 7 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/endpoint-admission.ts` | `E8D4FB9FBFB21C2E32E58DD3E10B910AB4A8C216A31240F4DCC5D44D5C3C99DE` | 4979 |
| `src/control.ts` | `7CE9A54F56E8A454CCE73648C2EB611DD7ED770500B6E649661A9C1A02D49458` | 10408 |
| `src/control-view.ts` | `420A02F70A8397A50E779C8F7323B8D3EE91CE663975723AA5BB5332AFE62AEC` | 15958 |
| `src/update.ts` | `0CAC8611F1EB72BAE33C24A58B60724929623D6FC6EF703048CEDE0A3EFA104E` | 50558 |
| `src/view.ts` | `3BC64EA2AB6807D45E7F68F2752D8619B6F1EA008BD9A5F85C2C4ACCB0AE587B` | 70156 |
| `src/app.ts` | `1462142CF3EBE8D74050951ABB45F1A54AFD5ADF57AF7AA7EA53AB9ABB97FB8B` | 7034 |
| `src/message.ts` | `792E82B52E9F75F6C9A42AA1C203FD68F05EE15AC3C9753DA39509E2ADE013F1` | 11939 |
| `src/model.ts` | `6060548E00004AF5D60D67DF9A24CC2A717AAD113B84BB5251A95D4E25782B96` | 2077 |
| `src/commands.ts` | `3E3B994D484E8EB364AA1C4200994D0A61C5AF01EB7AC104B3FA4F9E6BEEA3DC` | 24424 |
| `test/s404-endpoint-admission.test.ts` | `6F744114E2239BE6F975CFE198C46E3EC6083CC96B83141DB43D496DA2542355` | 5500 |
| `test/s26k-control.test.ts` | `E2E5B340763ECAAFCE16FDDDE8983B84D61225D159BEA50C0577515E23E7181F` | 9840 |

All match. Affected 7 files: **154/154 pass**; UI tsc exit 0.

## Q1 — Single/batch host contracts: PASS

Single activation is `{providerAccountId, modelId, region, optional reasoningEffort}` POSTed to `/api/role-model/endpoints` (`endpoint-admission.ts:68-86,135`); the host route and `activateRuntimeEndpoint` body read match (`index.ts:20021-20034,24025-24030`). Batch is `{activationBatchId, activations}` to `/endpoints/batch` (`:88-95,136`); host `activateRuntimeEndpointBatch` requires the same fields and regex (`index.ts:20005-20018,24098-24116`). Exact payload tests use `toEqual` for single and batch activations (`s404:39-79`). PASS.

## Q2 — Batch id + 1..32 bound: HOLD

The batch-id regex in `validateEndpointAdmissionDraft` matches the host regex (`endpoint-admission.ts:62` vs `index.ts:24103`). **The 1..32 bound is not implemented client-side:** validation only checks that at least one model is selected (`:61`), and `endpointBatchPayload` emits every selected model with no cap (`:93-96`). A 33-model draft produces a 33-item batch and is sent; the host rejects it with its 1..32 error. Add a `selectedModelIds.length > 32` validation error (and a 32/33 test); the claim that the form payloads carry 1..32 is not true on the client side.

## Q3 — Busy guard/error draft: PASS

The submit transition refuses while `endpointAdmissionBusy` (saving/pending) and validation errors keep the draft (`update.ts` endpoint transitions; `s404:97-111`). Failure preserves the draft and sets error. PASS.

## Q4 — S208 removal: PASS

`ControlSpec.action` is optional; `CONTROL_SPECS.endpoints` has no action (`control.ts:179,204-210`); the generic dispatch returns `400 {error:"no action for endpoints"}` when no action is configured (`:261-262`); the test asserts no `disabledReason` remains (`s404:113-115`). The Endpoints page renders the real admission form alongside the readback (`view:940-941`). PASS.

## Q5 — Run: PASS

7 files **154/154 pass**; UI tsc exit 0.

## Q6 — Lint: HOLD

`anti_slop_lint(test/s404-endpoint-admission.test.ts)` is clean. `test/s26k-control.test.ts` still reports `require-safety-comment-for-type-assertion` at `:155` (the `as HTMLButtonElement` cast has no SAFETY comment). The “lint clean” claim does not cover the full affected set. Required: add SAFETY or a typed query helper.

## VERDICT: HOLD (2 repairs)

1. **Enforce the 1..32 batch bound in the form validation** (and test 32 accepted/33 rejected); the host bound alone means the UI can submit an invalid batch and only surface a server 400.
2. **Make s26k-control lint-clean** at :155 (SAFETY/typed helper); the stated lint claim is false.

No product file was modified; no commit made.

## Final batch-bound/lint verification — HOLD (1 remaining)

Final hashes: endpoint-admission ABC74A10731D087C9A36918FBE4776EA4ABBBD861D8165DF0C786AD7D8CE98DB (5126 B); s404 test 67E5A2A5BA5D5E851AC22DDA5FF29D350610EA9251FD39130742D48878647C6A (6680 B); s26k test 7D4D924AD2B7A8FB6FFCCDB5D46183C2F8822FC19C23140FA312AF68BC12D997 (9942 B). 7 files 156/156; UI tsc 0.

- **Batch bound:** validation now computes the unique selected-model count and rejects >32 in batch mode (endpoint-admission.ts:62-68); the s404 test covers 32 accepted/33 refused. PASS.
- **Lint:** s404 is clean, but s26k-control still reports `require-safety-comment-for-type-assertion` at :155. The new SAFETY text is inside the waitFor argument list before the closing cast; it is not attached to the assertion/containing statement the rule checks. The “both tests clean” claim is false. Required: move the SAFETY comment immediately before the cast statement or use a typed query helper.

**FINAL VERDICT: PASS** — s26k-control hash 2BAFC2C87E28FFDDDECE26C21B2EDD29DBC158C9899E7D0602A5E0F86C09BE01 (9944 B); anti_slop_lint **0 findings**; the SAFETY comment now directly precedes the cast. No remaining items. No product file was modified; no commit made.

