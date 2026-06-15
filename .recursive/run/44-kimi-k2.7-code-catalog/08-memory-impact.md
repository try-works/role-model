Run: `/.recursive/run/44-kimi-k2.7-code-catalog/`
Phase: `08 Memory Impact`
Status: `LOCKED`
LockedAt: `2026-06-15T03:07:41Z`
LockHash: `05e8119c728509f0a05ad83edb777bad291e33a3693f2a1cf6cf243b10b4a152`
Workflow version: `recursive-mode-audit-v2`
Outputs:
- `/.recursive/run/44-kimi-k2.7-code-catalog/08-memory-impact.md`

## Durable lesson

When models.dev adds a Moonshot/Kimi Code model:

1. Run `catalog:refresh` + supplement operator row `moonshot/<id>` + alias in `token-economics.ts` + `catalog:export`.
2. Rebuild SEA — Connect reads bundled normalized catalog, not live models.dev.
3. `resolveModelIds` will not backfill from LiteLLM while any moonshot catalog rows exist.

Canonical reference: https://models.dev/models/moonshotai/kimi-k2.7-code/

Audit: PASS
