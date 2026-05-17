Run: `34-router-runtime-role-policy-and-ui-fixture-reduction`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-17T02:55:18Z`
LockHash: `d9bc852e7edbdb00c99ce33bcf95467189e36b17452f718a6d5e752682a57d31`
Inputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`
Outputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/05-manual-qa.md`
Scope note: Records the live operator-flow proof for Roles and model-side role assignment against the QA bridge.

QA Execution Mode: `agent-operated`

## TODO

- [x] Prove that the Roles page loads live runtime data.
- [x] Prove that a role can be created from the live UI.
- [x] Prove that model-side role assignment can be saved from the live UI.

## Runtime/browser QA notes

### Roles surface

Environment:
- QA bridge server started from `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- runtime UI built from `role-model-router/apps/runtime-ui/build/client`
- browser-driven verification executed against `http://127.0.0.1:3456`

Observed:
1. `/app/control/roles` loaded successfully after QA-server role-policy route wiring.
2. The Roles page showed live runtime role catalog content instead of frontend fixture records.
3. A new role was created through the live browser form:
   - role id: `qa.browser`
   - name: `QA Browser`
4. The new role appeared in the live role catalog and became the selected editable role.

### Models surface

Observed:
1. `/app/control/models` loaded successfully after QA-server model/device route wiring.
2. The page rendered live configured model cards and did not fall back to fake frontend placeholder rows.
3. Opening a model inspection panel exposed the backing-account role binding editor.
4. Saving the `general.chat` role binding for `openai.personal.primary` succeeded.
5. The page showed:
   - updated card summary `Roles: general.chat`
   - in-panel confirmation `Updated roles for openai.personal.primary.`

## QA defects found and fixed during this pass

1. Roles page initially failed with `GET /api/role-model/role-policy -> 404`
   - fixed by wiring role-policy methods into `scripts/start-for-qa.ts`
2. Models page initially failed with `GET /api/role-model/accounts/device -> 404`
   - fixed by wiring model/device methods into `scripts/start-for-qa.ts`

## Remaining QA disposition

- Manual/browser validation for Roles create and Models save flows is complete.
- Automated host validation is now complete after fixing the managed bridge entrypoint mismatch.

## QA Execution Record

- Agent Executor: GitHub Copilot CLI agent
- Tools Used: `browser-use`, QA bridge from `start-for-qa.ts`
- Runtime under test: QA bridge launched from `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- UI under test: built `role-model-router/apps/runtime-ui/build/client`
- Browser target: `http://127.0.0.1:3456`
- Evidence type: live route navigation, live form interaction, and persisted UI readback against the QA bridge
- Evidence Paths: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/evidence/logs/green/phase5-roles-models-browser-qa.green.log`

## QA Scenarios and Results

1. Roles navigation and live catalog load
   - Result: PASS
   - Evidence: `Roles surface`
2. Roles create flow (`qa.browser`)
   - Result: PASS
   - Evidence: `Roles surface`
3. Models navigation with live data
   - Result: PASS
   - Evidence: `Models surface`
4. Model-side role binding save (`general.chat` on `openai.personal.primary`)
   - Result: PASS
   - Evidence: `Models surface`
5. QA bootstrap route exposure for roles/models/device auth
   - Result: PASS after repair
   - Evidence: `QA defects found and fixed during this pass`

## User Sign-Off

- Not required for `agent-operated` QA.

## Traceability

- `R1` -> the Roles page loaded the live runtime role catalog rather than static fixture content.
- `R2-R3` -> live role creation and model-role assignment save are proven through the browser flows above.
- `R4` -> the live Roles/Models flows prove that the router-facing role policy surface is reachable from the operator shell.
- `R5` -> the live Roles flow proves that role definitions can be authored from the operator shell before the automated execution-policy validators run.
- `R6-R7` -> the operator shell exposes the new Roles route and honest live-data-backed Models flow instead of placeholder cards.
- `R8` -> the browser proof complements the automated RED/GREEN validation and uses tracked evidence under the run folder.
- `R9` -> manual QA complements the automated backend and host-validator evidence by proving that the operator-facing workflows are actually reachable and writable.

## Coverage Gate

- [x] Roles route reachability verified.
- [x] Live role create flow verified.
- [x] Live model-role assignment save flow verified.
- [x] QA defects encountered during execution are recorded with repairs.

Coverage: PASS

## Approval Gate

- [x] QA execution mode is explicit.
- [x] The execution record is concrete enough to reproduce the manual flow.
- [x] The manual proof aligns with the automated validation receipts instead of contradicting them.

Approval: PASS

## Evidence and Artifacts

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/evidence/logs/green/phase5-roles-models-browser-qa.green.log`
