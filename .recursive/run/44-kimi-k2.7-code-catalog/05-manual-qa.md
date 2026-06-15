Run: `/.recursive/run/44-kimi-k2.7-code-catalog/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-15T03:07:41Z`
LockHash: `de7aaff74d584194450279e9f3866d0291bd0283ad33c44cff4912b4a10cf9de`
QA Execution Mode: `agent-operated`
Workflow version: `recursive-mode-audit-v2`

## Completed

| Check | Result | Evidence |
| --- | --- | --- |
| Live backend `listProviders` k2.7 on moonshot + kimi-code | PASS | `phase5-live-bridge-providers-smoke.log` |
| Packaged SEA build | PASS | `phase5-sea-build-retry.log` (SHA256 `9a3e4888…`) |
| Packaged `:3456` providers API | PASS | `phase5-sea-providers-smoke.log` |
| Catalog economics | PASS | `phase4-validate-catalog-economics.log` |
| Run 40 Moonshot invariants | PASS | bridge provider tests |

## Optional (skipped)

| Check | Result | Notes |
| --- | --- | --- |
| Kimi Code OAuth chat against k2.7 | SKIPPED | No credential session in agent-operated QA |
| Connect UI browser walk | DEFERRED | Providers API parity proves Connect dropdown source; UI unchanged |

## SEA smoke excerpt

```
moonshotModelIds=moonshot/kimi-k2.5,moonshot/kimi-k2.6,moonshot/kimi-k2.7-code
kimiCodeModelIds=moonshot/kimi-k2.5,moonshot/kimi-k2.6,moonshot/kimi-k2.7-code
PASS k2.7 on packaged :3456
```
