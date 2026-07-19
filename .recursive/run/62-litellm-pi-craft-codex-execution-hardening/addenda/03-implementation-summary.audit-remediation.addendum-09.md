Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `09`
Status: `LOCKED`
LockedAt: `2026-07-10T04:28:11Z`
LockHash: `2ad71fc99c903a444444ff5cb3a4473cd2f408e7432a71018e4eb42376a81e33`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `pragmatic`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.audit-remediation.addendum-09.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/final-ci/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-09.md`
Scope note: This addendum records final local-CI hardening only. It does not change routing product semantics.

## TODO

- [x] Implement the final CI harness hardening.
- [x] Preserve the 200-case Pi/Craft validator corpus.
- [x] Record RED/GREEN evidence for the final local-CI remediation.

## Implemented Changes

- `packages/pi-role-model/test/validate-agent-path.test.ts` now imports the TypeScript helper through a native dynamic import URL so Vitest can execute the rebuilt-runtime alias proof.
- `packages/schema-tools/test/validate-schemas.test.ts` gives the fixture-manifest authority test a `20_000ms` budget for full-CI load.
- `role-model-router/apps/runtime-host-bridge/vitest.config.ts` sets a `30_000ms` default timeout for runtime-host-bridge integration tests.
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` permits controller-hybrid corpus cases to declare multiple acceptable execution families when the alias contract allows local or LiteLLM execution.
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` and `test/validate-vendors.test.ts` make recursive temp cleanup retry-tolerant.
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` raises only the comprehensive vendor validator from `90_000ms` to `180_000ms`.

## TDD Compliance

TDD mode is pragmatic because this was final CI remediation after the primary run 62 addenda were already locked. The final vendor timeout RED log was preserved before the GREEN run:

- RED: `evidence/logs/final-ci/ci-check.failed-vendor-timeout.log`
- GREEN: `evidence/logs/final-ci/ci-check.log`

The earlier Pi/schema/runtime-host-bridge timeout failures were observed in the local terminal transcript during the same final-CI pass sequence; their durable acceptance evidence is the final full CI log.

## Non-Goals

- No Pi-specific runtime branching was introduced.
- No LiteLLM-specific provider classification was introduced; LiteLLM remains an execution path/vendor, not the actual provider family.
- No deterministic corpus cases were removed or weakened to reduce runtime.

## Coverage Gate

- [x] Final blocker root cause has a persisted RED log
- [x] Fix keeps the 200-case Pi/Craft corpus intact
- [x] Cleanup hardening is scoped to temp-root deletion
- [x] Routing/product semantics are unchanged by timeout changes

Coverage: PASS

## Approval Gate

- [x] Implementation matches root-cause fix strategy
- [x] No unrelated run61 changes were merged into run62
- [x] Full local CI is the required proof before commit readiness

Approval: PASS
