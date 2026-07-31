# Addenda 03 · Studio Chat/Advanced bounded startup (run 67 contract)

Run: `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/`
Phase: `03 Implementation Summary` (stage-local)
Status: `LOCKED`
LockedAt: `2026-07-31T22:56:04Z`
LockHash: `0aa426b45011e84f9563b4992e407689d7bb4cd5373f42db8a36fd6f0d1048aa`

**Against:** `00-requirements.md` R7 + Fixed Decision #11 · run `67` startup bootstrap contracts  
**Updated:** 2026-08-01

## Decision

Studio **Chat** (`workbench.tsx`) and Studio **Advanced** (`studio-advanced.tsx`) keep a **models-only** startup fetch (`fetchRuntimeModels`). They must **not** restore the pre-RM3 fanout of `fetchRuntimeSummary` / `fetchRuntimeAccounts` / `fetchRuntimeEndpoints`.

## Why (Paper parity + R7)

- Paper / DESIGN_SYSTEM Studio Chat is **Model · Prompt · Run** only — no Endpoint / Routing mode controls.
- Paper Studio Advanced is **Family · Model · JSON · Submit** — no summary/account/endpoint chrome.
- Run 67 forbids weakening startup contracts **without an explicit addendum**. This addendum is that exception: the prior helper list encoded Linear-era Studio chrome that RM3 retired. Bounded startup for Chat/Advanced is therefore **models inventory only**, matching Images/Audio/Rerank.

## Test contract

`startup-bootstrap-regression.test.ts` expects:

| Route | Expected helpers |
|-------|------------------|
| `/app/studio/chat` | `fetchRuntimeModels` |
| `/app/studio/advanced` | `fetchRuntimeModels` |

Still forbidden: `fetchRuntimeSnapshot(`.

## Acceptance

- Chat/Advanced remain live-data-driven via `/api/role-model/models` (+ submit APIs).
- No decorative placeholder telemetry.
- Connect / Models / other P0 routes keep their existing bounded helper lists.
