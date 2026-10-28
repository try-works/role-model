# S396b — provider account create/update-key/delete-model form (LANDED)

## Contracts verified before coding
- Create: POST /api/role-model/accounts (host index.ts:19828); payload mirrors the original providers.tsx buildProviderPayload (:988-1023): providerAccountId/providerId/providerKind, orgScope personal, accountScope workspace-default, credentialRef (env+ref for api-key-static, local-file oauth/<provider>/<account> otherwise), authMode, regionPolicy prefer global, baseUrlOverride only when present, allowedModels unique, modelRoleBindings computed, deniedModels [], entitlementTags [chat], budgetPolicyRef/quotaPolicyRef defaults, lifecycle status/healthStatus/rotationState (api-key-static -> active/healthy/stable; oauth without connected state -> disabled/credentials-missing/in-progress). variantId is NOT sent (the original does not send it).
- Update key: POST /api/role-model/accounts/repair/update-key (host :19921, method POST) with {providerAccountId, apiKey} (host :32363-32369).
- Delete model: DELETE /api/role-model/accounts/{providerAccountId}/models/{modelId}, both path segments encoded (host :19844-19873).

## Landed
- src/provider-account.ts: typed draft/state, initial state, validation, busy guard, create payload builder, update-key payload, model bindings, and the exact HTTP client (create/updateKey/deleteModel).
- Message/model/commands/update: FieldChanged/ModelAdded/ModelRemoved drive the draft; CreateRequested/UpdateKeyRequested/ModelDeleteRequested are guarded by busy (no double submit) and issue one command with token+1; successes clear pending, failures keep the draft with the error; ModelDeleted removes exactly one model.
- control-view/view: Providers page renders the controlled provider-account form (account id/provider/kind/variant/authMode/credential ref/API key/base URL, model add/remove, Save + Update API key buttons, error alert, saved notice) under data-route provider-account; app wires the real client.

## Tests (test/s401-provider-account-form.test.ts)
- exact create payload (toEqual: no variantId, credentialRef env, lifecycle active/healthy/stable, computed modelRoleBindings, allowedModels unique).
- exact update-key body + DELETE encoded model path.
- validation keeps the draft; no double submit while saving; save failure keeps draft+error; ModelDeleted deletes exactly one model; controlled field/model add/remove state test.
- RED s401-red.log EXIT_CODE=1 (module absent pre-implementation); GREEN s401-green.log 6 files / 138 tests; UI tsc exit 0.

## Hashes
provider-account 99A1DFF9..., message 6C1D97BA..., model F008A3BA..., commands 8FFCED8D..., update 586BD985..., app 4C647891..., control-view 85D75CB0..., view 18AE653B..., s401 test A67CC753....

## Honest remaining
- The controlled-form test is state-level (field/model messages) rather than a mounted DOM assertion; a DOM mount probe for the provider-account form found no rendered route in this test harness and was replaced, while the Providers page itself is proven by the existing S397 DOM test.
- Lifecycle for an oauth create without a connected device session is the original disabled/credentials-missing/in-progress projection; this form does not perform the connect handoff itself (S396a covers device authorization).

Lint: s401 clean (0).
## S402 repair (create payload branches + busy coverage)

| Hold | Fix | Evidence |
| --- | --- | --- |
| baseUrlOverride omitted when empty | Always sent from the draft (empty string when empty, value when present). | branch test 'sends an empty baseUrlOverride when the draft is empty and the value when present' |
| lifecycle lost connected OAuth/existing states | Branches mirrored from resolveProviderAccountLifecycle: api-key fresh active/healthy/stable; api-key existing disabled+credentials-missing preserved (rotation preserved or not-required); oauth connected -> active/healthy/stable; oauth existing active+healthy preserved (rotation or stable); otherwise disabled/credentials-missing/in-progress. | branch test 'projects fresh api-key, oauth not connected, oauth connected and existing-account lifecycles' |
| role bindings always empty | Computed from the draft role selection (unique, trimmed, sorted; include mode with roleIds+enabledRoleIds; disabled []) applied per selected model. | branch test 'computes non-empty role bindings from the role selection' |
| allowedModels extension undocumented | Documented: allowedModels sends ALL unique selected models (the original form sent one); this is the explicit multi-select extension. | this section |
| busy guard only create tested | Added refusal tests for update-key and delete-model while saving. | branch test 'refuses update-key and delete requests while a save is in flight' |

Evidence: RED s401-red2.log EXIT_CODE=1 (5 failed: exact create payload, save-failure draft, baseUrl, lifecycle branches); GREEN s401-green2.log 6 files / 142 tests; UI tsc exit 0. Hashes: provider-account 099DD679..., control-view 9F2C5F83..., s401 test DA555970.... Lint: s401 CLEAN.
