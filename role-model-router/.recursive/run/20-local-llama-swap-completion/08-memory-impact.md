# Run 20: Memory Impact

## Skill Usage

| Skill | Used | Purpose | Outcome |
|---|---|---|---|
| `ui-design-system` | ✅ Yes | Audit DESIGN_SYSTEM.md for Swiss design compliance | 0 blockers, 3 pre-existing warnings |

## Patterns Learned

### Pattern: Bridge Proxy for Vendor Endpoints
When the UI needs access to vendor-specific endpoints (like `/logs`) that are not part of the `VendorRuntime` interface, add a bridge proxy endpoint rather than exposing vendor details to the UI.

```typescript
// Backend: proxy to vendor
async getLocalLogs(): Promise<{ logs: string }> {
  const baseUrl = currentLlamaSwapVendor?.readStatus().baseUrl;
  const response = await fetch(`${baseUrl}/logs`);
  return { logs: await response.text() };
}

// Frontend: call bridge API
export async function fetchLocalLogs(): Promise<{ logs: string }> {
  return fetchJson<{ logs: string }>("/api/role-model/local/logs");
}
```

### Pattern: SQLite Append-Only Time-Series
For append-only event data (swap events), use SQLite with a simple table and index rather than JSON files. Provides efficient querying, ordering, and future aggregation.

```sql
CREATE TABLE llama_swap_events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  old_model_id TEXT,
  new_model_id TEXT,
  reason TEXT NOT NULL
);
CREATE INDEX llama_swap_events_timestamp_idx ON llama_swap_events (timestamp DESC);
```

## Run-Local Skill Usage Capture

| Skill | Availability | Attempted | Used | Worked Well | Issue | Recommendation |
|---|---|---|---|---|---|---|
| `ui-design-system` | Available | Yes | Yes | Audit found 0 blockers; clear structured output | Warnings are pre-existing (telemetry tokens, text opacities, accent contrast) | Use for future DESIGN_SYSTEM.md audits; warnings should be tracked as repo-level tech debt |

## Promoted to Memory

- **Pattern**: Bridge proxy for vendor endpoints (see above)
- **Pattern**: SQLite append-only time-series for events (see above)
- **Decision**: `loadedAt` fabrication is acceptable when vendor API lacks load times

## Not Promoted

- Worktree dependency installation (`corepack pnpm install`) — already captured in prior runs
- GitHub PR workflow for merging worktree branches — already captured in Run 19
