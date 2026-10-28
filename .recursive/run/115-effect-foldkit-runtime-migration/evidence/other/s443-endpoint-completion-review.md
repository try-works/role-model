# S443 — independent review: S439 endpoint aggregate completion

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only product/test/config; no source mutation, no commit. Inputs read: S439 task, S436 design, S441 design review, original R13, current endpoint command/update/message/view flow.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/endpoint-activation-tracker.ts` | `E0750FF26B110D6FE46E863F30AC8F1E8F8DCF1F4C2A2A0859D0513249F393D4` | 5467 |
| `src/endpoint-admission.ts` | `B5419FBB8D25DF4579A503D2B910DBB9F695BDB83041CEF339AA5F1213D7A6E8` | 5316 |
| `src/message.ts` | `98A69F04C7B333302B02EE6C7578F660977E7A0BE2A2E0ABDCDCB74A0999B205` | 14591 |
| `src/commands.ts` | `6A315CE4012C2B5BF5E893B5725A621BC42467785CB1C74B9236B7221015C5DF` | 27410 |
| `src/update.ts` | `8056233A94E88CDCB4C93008F42B6656AF853BA786E368FDA3E24929B11B4A4E` | 61246 |
| `src/control-view.ts` | `EDE44D17A0D29B6AA34F1E0D1661BA1BC7AF0F9F8496E558DFE2BFD4C3CB4C52` | 21132 |
| `test/s439-endpoint-completion.test.ts` | `1E54057803853510F89153378C3034522DBD6AB9226821BD48A2E101995F9A23` | 16315 |
| `test/s404-endpoint-admission.test.ts` | `E4C973C5EE2D3D0AF741DAE5F74D643BCAF3CAE4E03A1A7D52CF8465405E6A4F` | 7220 |

All hashes match the frozen values (the Lead corrected the s439 test hash after a SAFETY-only edit; tracker/state/message/commands/update/control-view unchanged).

## Production path: PASS

- `ActivateEndpoint`/`ActivateEndpointBatch` args now carry `activationId`, `generation`, and `payload`; the Effect callback returns exactly the captured identity/generation on success/failure (`commands.ts:459-487`). The s439 production test constructs the real command set with `defineEndpointAdmissionCommands(createEndpointAdmissionClient({fetchImpl}))`, executes `.effect` for two real commands, and feeds the resulting messages to `shellUpdate`; it asserts exact ids/generations and a partial result (s439:216-249). This is not a manually constructed-callback-only proof.
- Submit uses distinct `model:<encodedModelId>` ids and `batch:<batchId>`, one shared generation; no response-derived identity or array-position attribution (`update.ts:1211-1240`).
- `settleEndpointActivation` checks generation first, then pending membership; duplicate/unknown/old-generation callbacks are inert and first terminal wins (`endpoint-activation-tracker.ts:80-115`; tests s439:119-162).
- Both orderings produce the same partial settled set/status/failure message (s439:85-117).
- Pending field/model mutations are refused until the run completes and an explicit reset is requested (`update.ts:1194-1216`, s439:191-214); reset is visible and documented as reactivating selected models (s439:251-292).
- Batch is one atomic unit: one command, one `batch:` id, success saved/error with host message; duplicate/old callbacks ignored (s439:164-189). Existing exact single/batch payload and 32/33-bound tests remain in s404 (9 tests).
- Status mapping: pending until all settle; all success saved; mixed partial with failed messages; all fail error; no first-success saved (`tracker:102-111`; `update.ts:217-243`).

## Run/evidence — PASS

Actual final run: s439 **8** + s404 **9** + s425 **16** + s397 **15** = **48/48**, 4 files passed; UI tsc exit 0. The author's per-suite count claim was false; this is the correct actual composition. `s439-red.log` is the behavioral first-success RED (1 test: expected saved not to be saved); green is 48/48.

## Lint — PASS for the new region, baseline classified

Absolute filesScanned=1:
- `endpoint-activation-tracker.ts`: 0 (new module clean).
- `test/s439-endpoint-completion.test.ts`: 0; `test/s404-endpoint-admission.test.ts`: 0.
- `control-view.ts`: 0; `message.ts`: 0.
- `endpoint-admission.ts`: 9 baseline findings (no new state line); `commands.ts`: 20 baseline (the two endpoint payload casts are pre-existing at the shifted lines); `update.ts`: 10 baseline, none in the endpoint-completion region. No suppressions.

## Bounded verdict: PASS

The implementation closes the actual first-success race with real command-effect identities/generation, order-independent partial/error aggregation, duplicate/stale/unknown fencing, pending freeze plus explicit reset, batch atomicity, and real view summary/reset wiring. This is a bounded R13/M8 slice, not whole-M8 completion. Residual evidence limits: the view test uses a recording HtmlBuilder rather than a mounted DOM (disabled/reset code is verified by inspection), and batch command.effect is covered by the same command path plus manual batch messages rather than a second real-fetch batch execute. No product/test/config file was modified; no commit.

