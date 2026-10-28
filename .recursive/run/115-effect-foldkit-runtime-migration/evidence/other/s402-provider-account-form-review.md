# S402 — independent review: S396b provider account create/update form

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 6 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/provider-account.ts` | `99A1DFF9C245D870E51F35B893842701DA3CCFACFB004A8B458DABA972640886` | 7311 |
| `src/message.ts` | `6C1D97BA98F3C298236E3D400C193E56556E6634051B9B12B6425B5FD2821FE2` | 10972 |
| `src/model.ts` | `F008A3BA78A96A9CAD94B94FF298F281238A75AEA723D45E637A767DF4C90DAA` | 1940 |
| `src/commands.ts` | `8FFCED8DFF56A04FB13147ED50A8B7A390F0DE47CDF2F2B1976DA87F743412EC` | 22332 |
| `src/update.ts` | `586BD9851214883725D31DB2DC85B7C3D90F374837FD083BF87D6B87A1AF495B` | 47479 |
| `src/app.ts` | `4C6478916E0CF9886987D6D867ED7C2F99E1B6EC1DA3EEEEB3FD37BCE7CD3954` | 6689 |
| `src/control-view.ts` | `85D75CB00F734C95C9C9AEF765FB24F34238CF2D66E04E3D9B716AEA2311FF96` | 13044 |
| `src/view.ts` | `18AE653B3BB48DE38D0D36442227D89E02F90F0E67352F64134592A288517F4B` | 69820 |
| `test/s401-provider-account-form.test.ts` | `A67CC753A2A8CC6863E7BFD0782CB8EF22AB06BBA2447E32BCA8EE65727EF292` | 6881 |

All match. Affected 6 files: **138/138 pass**; UI tsc exit 0.

## Q1 — Create payload vs original: HOLD

Spot-checking `providers.tsx:988-1023`:
- Original **always** includes `baseUrlOverride: selectedVariant.baseUrl ?? selectedProvider.apiBase` (`:1009`); the new payload only includes it when the draft field is non-empty (`provider-account.ts:120-122`). In the exact test the draft is empty, so the original property is absent from the new expected payload (`s401:67-87`).
- Original lifecycle uses `resolveProviderAccountLifecycle({authMode, providerAccountId, oauthState, existingAccount})` (`:981-985`): an existing api-key account that is disabled/credentials-missing is preserved, and a connected OAuth state is active. The new lifecycle is a two-way api-key/non-api-key ternary (`provider-account.ts:113-115`) and cannot produce the preserved/connected states. No test covers an existing account or OAuth state.
- Original `modelRoleBindings` is built from `selectedModelRoles`/`availableRoleIds` (`:1011-1015`); the new bindings are per model but always empty roleIds (`provider-account.ts:77-84`). Original `allowedModels` is one selected model; the new form uses all selected models (the “allowedModels extension” claim is not marked in the test).

No variantId and the credentialRef/regionPolicy branches match. Required: either reproduce the original baseUrl/lifecycle/bindings, or document these as intentional extensions and add tests for base URL auto-fill, OAuth/connected lifecycle, existing disabled api-key lifecycle, and role bindings. The current “exact original create payload” test only asserts the new shape for one fresh api-key draft.

## Q2 — update-key/delete paths: PASS

`updateKey` POSTs `{apiKey, providerAccountId}` to `/api/role-model/accounts/repair/update-key` (`provider-account.ts:143-148,197-198`; host `index.ts:19921-19929`); `deleteModel` DELETEs `/accounts/{encodeURIComponent(providerAccountId)}/models/{encodeURIComponent(modelId)}` (`:189-196`; host route `19844-19873`). The test asserts the exact body and percent-encoded DELETE (`s401:90-103`). PASS.

## Q3 — Busy guard: PASS by inspection; test gap

`providerAccountBusy` covers `status === "saving"` or any pendingAction (`provider-account.ts:64-65`), and Create/UpdateKey/ModelDelete all return early when busy (`update.ts:957,971,985`). The test only exercises the create refusal (`s401:113-121`); update-key/delete busy refusal is not separately tested, though the guard is shared. PASS with a coverage note.

## Q4 — Failure/draft/delete: PASS

Failure preserves `...state` including the draft (`update.ts:1008-1011`); token fences guard success paths; ModelDeleted filters exactly the requested id (`:992-1006`); tests cover failure draft and single deletion (`s401:123-134`). PASS.

## Q5 — Run: PASS

6 files **138/138 pass**; UI tsc exit 0.

## Q6 — Lint/honest remaining: PASS

anti_slop_lint on s401 is clean. The state-level tests are consistent with the stated replacement for the DOM mount probe; Providers rendering is covered by S397.

## VERDICT: HOLD (1 payload/lifecycle repair)

1. **Make the create payload genuinely match the original contract, or document the extensions:** include the original `baseUrlOverride` source (variant.baseUrl/apiBase), implement the original existing-account/OAuth lifecycle, and either compute role bindings from role data or state that empty role assignments are an intentional M8 limitation. Add tests for the missing branches; the current “exact” test only covers a fresh api-key draft and the new reduced shape.

No product file was modified; no commit made.

## Final branch-payload verification — PASS

Final hashes: provider-account 099DD679018CDB7744325AB5C1E67E1C192E36E87BE7901E5676A29887C6527D (8517 B); control-view 9F2C5F832BEFE9F14065461C025E8A7C0B28AFC1B19633DF48F932E685591D10 (13228 B); s401 test DA5559707CB6334D50FADD98C6A7456135F170922D798346A0B023348D216773 (9997 B). 6 files **142/142**; UI tsc 0; s401 lint 0.

- **baseUrlOverride:** always present as a string (empty when the draft is empty, the draft value when present), asserted by the branch test (s401:159-163) and the exact payload equality (s401:72-93).
- **Lifecycle:** the payload reproduces fresh api-key active/healthy/stable, OAuth pending disabled/credentials-missing/in-progress, OAuth connected active/healthy/stable, existing healthy OAuth active/stable, and existing disabled/credentials-missing api-key preserved with not-required rotation; each branch is tested (s401:165-175).
- **Bindings:** roleIdsInput is parsed into a sorted unique role-id set and used for enabledRoleIds/roleIds per selected model; a non-empty binding equality test exists (s401:177-182).
- **Busy/update/delete:** shared providerAccountBusy refuses create, update-key and delete; all three refusals are now tested (s401:119-127,183-187). Failure/draft and single-model delete remain green.
- **Scope note:** allowedModels remains the documented all-selected-models extension; the original form selected one model. Role input is one global comma-separated set applied to every selected model, while the original per-model role map is not represented; for the single-model default this matches the original shape.

The earlier payload/lifecycle HOLD is closed. No remaining numbered items. No product file was modified; no commit made.

