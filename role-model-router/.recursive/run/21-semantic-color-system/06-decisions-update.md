# Run 21: Decisions Update

## New Decisions

### D21.1 — Semantic Color System
- **Decision**: The primary accent color is now cobalt blue (`#003B8E`), not red (`#C8102E`).
- **Rationale**: Red is reserved strictly for error/destructive states. Blue is more appropriate for primary UI chrome, active states, and focus rings.
- **Dark mode accent**: Light blue (`#60a5fa`) for contrast against dark backgrounds.

### D21.2 — Auto-detected Swap Events Use Background Polling
- **Decision**: Auto-detected swap events are implemented via a 5-second `setInterval` polling `listLocalModels()`, not via WebSocket or event subscription.
- **Rationale**: llama-swap does not expose real-time swap events. Polling is simple, reliable, and sufficient for the use case. The 5-second interval is lightweight enough to not impact performance.

### D21.3 — Peer Health Check Proxies Through Bridge
- **Decision**: Peer health checks are proxied through the bridge (`/api/role-model/local/peers/health?url=`) rather than calling peers directly from the frontend.
- **Rationale**: Follows the same proxy pattern used for other local operations. Frontend should not know vendor/peer ports directly. Also avoids CORS issues.

### D21.4 — Peer Configuration Uses Simple JSON File
- **Decision**: Peer configuration is persisted to `runtimeStateRoot/peers.json` as a simple array, not in SQLite.
- **Rationale**: Peer config is small, rarely changing, and does not need relational queries. JSON file is simpler and matches the pattern used for model overrides and local policy.

### D21.5 — `backend` Variable Used to Avoid Temporal Dead Zone
- **Decision**: The auto-swap polling `setInterval` references `backend.listLocalModels()` after the `backend` object is created, using `let backend` + `return backend` instead of returning inline.
- **Rationale**: `setInterval` cannot reference `backend` before it's initialized. Moving the interval setup after object creation avoids the temporal dead zone.
