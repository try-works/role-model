# S430 — independent review: S427 full UI route-contract test drift repair

Reviewer: `s5-health-wait`, active model verified **deepseek-flash** via `list_agents`. Read-only product/test/config: no source or test edits, no overlays, no commit. Review basis: tasks/s427-parallel-repair.md; S420 audit/full-ui log; frozen six files supplied by Lead.

## Frozen artifacts verified (sha256, exact full values)

| File | bytes | sha256 |
| --- | --- | --- |
| test/s380-models-roles.test.ts | 6771 | d46024c186391025dc8679b71670a43dcac3f5fb0efc105101fd327ca7e3a081 |
| test/s383-router-family.test.ts | 8750 | 9ec1f183e3e5370a1f7a774ddf8ebda5692a81f37a1f34a2626512b8c3ce1b92 |
| test/s386-learning-family.test.ts | 6893 | 951054d24a17fc5747fad1d92ce208057ad8c6fb5c5010c56e9b5de585382bbf |
| test/s26e-readback-routes.test.ts | 18049 | a4dc9013b0fbb25da37b82bcc3288bb513cf9c0c9b7e92b861bd07e08800d359 |
| test/s26f-client-host-tie.test.ts | 7366 | 1b147a8e67a7de6e52264d25030c74034774c40212ae86ec7966ca6cea615bc9 |
| evidence/other/s26a-route-inventory.json | 48406 | 750447019f0a9474d07f908ad89c876200badc39035a0aba4a408ab2c0d49eba |

All six match the Lead-supplied hashes/prefixes (s26a-route-inventory.json is 75044701…, not s4-contracts-inventory.json). No product/src file is modified by this change set (git status shows only the five tests + s26a inventory).

## Run evidence (independent rerun)

- RED: evidence/logs/s427-red.log — 5 failed | 71 passed (76); Test Files 5 failed. Exactly the five named drift tests failed (s26e, s26f, s380, s383, s386).
- GREEN: evidence/logs/s427-green.log — 76 passed (76), Test Files 5 passed.
- Independent rerun on the frozen files: **EXIT=0, 5 files / 76 tests passed**.
- UI tsc on the current tree: **exit 0** (see S425 classification below).

## Semantic review

### s26e — exact request target (PASS)
- The test now records pathname AND search and compares every `READBACK_PATHS` client call to the declared `READBACK_SPECS` target. `learningPacks` keeps its exact `?kind=pack` query; no stripping.
- Method GET, bearer-"only-when-provisioned" assertions, and the AbortSignal non-aborted check are unchanged (diff adds no weakening).
- The expected target derives from `spec.pathFor?.("")`/ `spec.path` only to mirror the client's no-id call; the actual observed search is compared exactly, which is the stronger assertion.
- Physical abort propagation is still exercised elsewhere (S279), as the retained comment states.

### s26f — client/host/inventory tie (PASS with note)
- Host routes are parsed as pathname literals, so the test now compares host registration by pathname and inventory declaration by exact endpoint (pathname + search). This is a semantic correction, not a wildcard: every declared inventory endpoint must start with `/` and contain no `*`.
- Inventory is real: 51 routes, 53 unique endpoints, 0 wildcard; all shared `READBACK_PATHS`/observability paths are declared.
- Nine endpoint additions, zero removals, verified against host and caller:
  1. `route:control-routing-strategy` -> `/api/role-model/router/config` (host GET literal; READBACK_PATHS exact)
  2. `route:extensions` -> `/api/role-model/extensions`
  3. `route:learning` -> `/api/role-model/operator/learning/policy`
  4. `route:learning` -> `/api/role-model/operator/learning/records?kind=pack`
  5. `route:learning` -> `/api/role-model/operator/learning/decisions`
  6. `route:learning` -> `/api/role-model/operator/learning/measurement`
  7. `route:learning` -> `/api/role-model/operator/learning/history`
  8. `route:local-llama-swap-models` -> `/api/role-model/local/llama-swap/models`
  9. `route:operator-controls` -> `/api/role-model/operator/trace-roots`
  All are exact host GET literals and exact `READBACK_PATHS` values; no invented endpoint.
- Note (not a defect): four additions sit on route rows that remain `status: "absent"` with their absenceReason intact. They record real host facts for readbacks used elsewhere, not route completion; the inventory does not mark those routes implemented.

### s380/s383/s386 — MISSING semantics (PASS with residual risk)
- The historical count pins (14/10/5) are removed per the approved scope correction. The tests now iterate the CURRENT `MISSING_ORIGINAL_TARGETS` list and assert every listed target is `NotFound` and has no legacy redirect, while landed families are explicitly asserted absent from the list.
- Current MISSING list = exactly 2 entries: `/app/local/llama-swap/policy`, `/app/local/llama-swap/matrix`. Both are asserted NotFound by the tests; landed models/router/learning families are excluded.
- The removed explicit `/app/router/strategy` NotFound assertion is correct because that family is in the landed set (asserted not-missing and redirect-tested).
- Residual evidence gap (low risk): no fixed assertion pins that the MISSING list is non-empty or contains those two current targets; if the legacy module silently emptied the list, these tests would still pass. This is a consequence of the approved "replace count pins with semantic assertions" scope, not a current route defect; a future test can pin the two known targets without reintroducing drift-prone counts.

### S425 tsc blocker (classified separately)
- The earlier global UI tsc failure at `test/s425-device-auth-correctness.test.ts:210` was an auth-worker typing issue, not a route-regression defect. The owner repaired it; independent UI tsc now exits 0. It is not counted as S427 evidence or failure.

## Lint (independent, absolute)
- s26e-readback-routes.test.ts: filesScanned=1, 6 findings (pre-existing patterns; sample 29 no-unknown-parameters, 46 no-unknown-returns, 316 no-conditional-empty-object-spread, 354 require-safety-comment).
- s26f-client-host-tie.test.ts: filesScanned=1, 4 findings (31 no-unknown-parameters, 83/138/142 safety-cast comments).
- s380-models-roles.test.ts: clean (filesScanned=1, 0 findings).
- These are baseline test-file findings, not new storage/product code; no new wildcard/route acceptance pattern found.

## Verdict
**PASS (bounded)**: the five suites are green at 76/76 on the frozen six files; exact query (`kind=pack`), bearer auth and abort assertions are preserved/strengthened; nine inventory additions are real exact host GET endpoints with matching callers; no removal or wildcard; MISSING targets currently resolve NotFound; the inventory is not fake. Residual low-risk note: MISSING-list non-emptiness is semantic-only, not pinned. This is not a whole-UI/R11-R13 completion claim; no source edits or commit.
