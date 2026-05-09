Run: `/.recursive/run/18-local-llama-swap-runtime/`
Phase: `05 Manual QA`
Status: `LOCKED`
Inputs:
- `/.recursive/run/18-local-llama-swap-runtime/02-to-be-plan.md`
- Implemented system on `main`
Outputs:
- `/.recursive/run/18-local-llama-swap-runtime/05-manual-qa.md`
Scope note: Record manual QA execution for Run 18 browser verification.

---

# Run 18: Local llama-swap Runtime — Manual QA

## QA Execution Mode: agent-operated

## Scenarios

| # | Scenario | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | Navigate to `/app/local/models` | Page loads with "Loaded models" header, empty state, quick actions | Page loaded with correct header, empty state message, "Unload all models" button | ✅ PASS |
| 2 | Navigate to `/app/local/swap` | Page loads with "Swap history" header, empty state | Page loaded with correct header, empty state message | ✅ PASS |
| 3 | Navigate to `/app/local/policy` | Page loads with "Host policy" header, TTL (300), Max concurrency (1), Auto-unload checked, Save/Reset buttons | Page loaded with all form fields correctly defaulted, buttons visible | ✅ PASS |
| 4 | API `GET /api/role-model/local/models` | Returns `[]` | Returned `[]` | ✅ PASS |
| 5 | API `GET /api/role-model/local/swap` | Returns `[]` | Returned `[]` | ✅ PASS |
| 6 | API `GET /api/role-model/local/policy` | Returns `{}` | Returned `{}` | ✅ PASS |
| 7 | API `POST /api/role-model/local/models/test-model/load` | Returns `{"success":true}` | Returned `{"success":true}` | ✅ PASS |
| 8 | API `POST /api/role-model/local/models/test-model/unload` | Returns `{"success":true}` | Returned `{"success":true}` | ✅ PASS |
| 9 | API `PUT /api/role-model/local/policy` with body | Returns persisted policy | Returned `{"ttl":600,"autoUnload":true}` | ✅ PASS |
| 10 | Swiss design compliance | Zero-radius cards, stone palette, accent red, uppercase labels | All pages comply | ✅ PASS |

## Evidence

- Screenshot: `browser-screenshot-19.jpg` — Local Models page
- Screenshot: `browser-screenshot-20.jpg` — Local Swap page
- Screenshot: `browser-screenshot-21.jpg` — Local Policy page

## Tools Used

- `browser_tool` for navigation and screenshots
- `curl` for API endpoint verification

## Issues Found During QA

- None.

---

## Coverage Gate

- All R7 acceptance criteria verified through browser and API.
- All scenarios passed.

**Coverage: PASS**

## Approval Gate

- Manual QA complete. All scenarios pass.

**Approval: PASS**

LockedAt: 2026-05-10T05:40:00+08:00
LockHash: `run18-manual-qa-locked`