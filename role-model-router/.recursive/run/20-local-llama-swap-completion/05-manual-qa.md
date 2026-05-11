# Run 20: Manual QA Report

## Browser Verification

All Local pages were verified in-browser with the bridge server running on port 3456.

### Local > Logs (`/app/local/logs`)

- ✅ Page renders with Swiss design compliance (stone palette, zero radius, mono text)
- ✅ "Refresh" button functional
- ✅ Auto-refresh toggle (3s interval) present
- ✅ Line count display shows "0 lines" when empty
- ✅ Empty state: "No logs available. The local runtime may not be running."
- ✅ Log text area uses `font-mono` with `mutedPanelClassName`

### Local > Matrix (`/app/local/matrix`)

- ✅ Page renders with Swiss design compliance
- ✅ Grid layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- ✅ Empty state: "No models loaded. Load a model from the Models page."
- ✅ Model cards show: model ID (mono), engine (accent uppercase), loadedAt, Active badge

### Local > Peers (`/app/local/peers`)

- ✅ Page renders with Swiss design compliance
- ✅ Peer inventory section with empty state
- ✅ Add peer form with URL and auth token inputs
- ✅ Empty state: "No peers configured. Add a peer instance below."

### Local > Policy (`/app/local/policy`)

- ✅ Page renders with persisted values (TTL: 300, Max concurrency: 1, Auto-unload: checked)
- ✅ Policy values are read from `local-policy.json` (not empty `{}`)
- ✅ Save and Reset buttons functional

### Local > Models (`/app/local/models`)

- ✅ Page renders (pre-existing from Run 18)
- ✅ Empty state when no llama-swap running

### Local > Swap (`/app/local/swap`)

- ✅ Page renders (pre-existing from Run 18)
- ✅ Empty state when no swap events

## Screenshot Evidence

| Page | Screenshot File |
|---|---|
| Dashboard | `browser-screenshot-22.jpg` |
| Local > Logs | `browser-screenshot-23.jpg` |
| Local > Matrix | `browser-screenshot-24.jpg` |
| Local > Peers | `browser-screenshot-25.jpg` |
| Local > Policy | `browser-screenshot-26.jpg` |

## API Verification

| Endpoint | Response | Status |
|---|---|---|
| `GET /api/role-model/local/policy` | `{"ttl":300,"maxConcurrency":1,"autoUnload":true}` | ✅ |
| `GET /api/role-model/local/swap` | `[]` | ✅ |
| `GET /api/role-model/local/logs` | `{"logs":""}` | ✅ |
| `GET /api/role-model/local/models` | `[]` | ✅ |

## Deferred

- **R7: Model-level overrides UI** — Backend persistence and frontend controls not implemented. Requires:
  - `model-overrides.json` read/write
  - Override application in `loadLocalModel`/`unloadLocalModel`
  - Frontend controls in `local-models.tsx`
