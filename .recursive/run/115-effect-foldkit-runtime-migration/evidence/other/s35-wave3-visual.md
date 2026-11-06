# S35 browser verification of the wave-3 row ports (real Chrome)

Served through the packaged executable with `--static-root` pointing at the rebuilt client, ephemeral loopback port, fresh temp state root.

| Route | Title | State | Evidence |
|---|---|---|---|
| `/local/choose` | Local choose | (static page) | renders "Choose peer-backed models or llama-swap models." |
| `/integrations/downstream` | Downstream integration | ok | real host read |
| `/integrations/upstream` | Upstream integration | ok (after settle) | real provider list: zenmux, zhipuai, zhipuai-coding-plan |
| `/observe/queues` | Queues | ok | queues config parsed |
| `/local/models` | Local choose | redirect | alias resolves to the Local choose view |
| `/local/matrix` | Local swap | empty | alias resolves to the Local swap view with an honest empty state |
| `/router/config` | Router | ok | alias resolves to Router with real summary (decision_only, 3 candidates) |

No `role=alert` on any route. `/integrations/upstream` showed `loading` at capture and settled to `ok`; recorded because a loading state that never settles would be a defect.

## Open

- `local-peer-models` is still refused: the packaged host returns an empty peer list, so the success state cannot be proven without a non-empty peer without mutating operator state. The empty state is proven; the row stays absent until a real non-empty capture exists.
- `legacy-redirect` is still refused as a whole: its 22 sources include targets that are not ported yet; only the three aliases above are honest today.
- Contract-strength work (fixture manifest, row-level expectations, invalid-body matrix, missing real bodies) is queued.
