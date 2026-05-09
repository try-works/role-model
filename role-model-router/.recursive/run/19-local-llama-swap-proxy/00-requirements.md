Run: `/.recursive/run/19-local-llama-swap-proxy/`
Phase: `00 Requirements`
Status: `LOCKED`
Inputs:
- `/.recursive/run/18-local-llama-swap-runtime/08-memory-impact.md`
- User request: wire backend stubs to real llama-swap proxy
Outputs:
- `/.recursive/run/19-local-llama-swap-proxy/00-requirements.md`
Scope note: Define requirements for wiring Run 18's stub backend methods to actual llama-swap runtime proxy calls.

---

# Run 19: Local llama-swap Proxy — Requirements

## Context

Run 18 created the "Local" section in the runtime UI with Models, Swap History, and Policy pages, plus bridge API endpoints. However, all backend methods are stubs returning empty defaults:

- `listLocalModels()` returns `[]`
- `loadLocalModel()` returns `{ success: true }`
- `unloadLocalModel()` returns `{ success: true }`

The llama-swap vendor process is already running when the bridge starts. It exposes:
- `GET /running` — list currently running models
- `POST /api/models/unload` — unload all models
- `POST /api/models/unload/:model_id` — unload specific model

## Requirements

### R1: Wire `listLocalModels` to llama-swap `GET /running`
- `listLocalModels()` must proxy to llama-swap's `GET /running` endpoint.
- Must return model ID, loaded-at timestamp, and engine type.
- Must handle llama-swap not running (return empty array, not error).

### R2: Wire `unloadLocalModel` to llama-swap `POST /api/models/unload`
- `unloadLocalModel(modelId?)` must proxy to llama-swap's unload endpoint.
- When `modelId` is provided: `POST /api/models/unload/{modelId}`.
- When `modelId` is omitted: `POST /api/models/unload`.
- Must return `{ success: true }` on HTTP 200, `{ success: false }` on failure.

### R3: Wire `loadLocalModel` to llama-swap implicit load
- `loadLocalModel(modelId)` must trigger a request to llama-swap with the target model.
- llama-swap automatically loads the model on first request.
- Must return `{ success: true }` if the request succeeds, `{ success: false }` on failure.

## Constraints

- All changes must pass `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-ui`, `schemas:validate`, and `smoke`.
- All bridge and UI unit tests must pass.
- Work must be done in isolated worktree; never on `main` directly.

## Acceptance Criteria

- [ ] `listLocalModels()` returns actual loaded models from llama-swap when it's running.
- [ ] `unloadLocalModel()` actually unloads models from llama-swap.
- [ ] `loadLocalModel()` triggers model load in llama-swap.
- [ ] All validations green.

## TODO

- [x] Create worktree and verify baseline tests pass
- [x] Write AS-IS analysis
- [x] Write TO-BE plan
- [x] Implement vendor-llama-swap proxy methods
- [x] Implement bridge backend wiring
- [x] Run all validations

---

## Coverage Gate

- All R1–R3 requirements have acceptance criteria defined.

**Coverage: PASS**

## Approval Gate

- Requirements are ready for AS-IS analysis and planning.

**Approval: PASS**

LockedAt: 2026-05-10T06:15:00+08:00
LockHash: `run19-requirements-locked`