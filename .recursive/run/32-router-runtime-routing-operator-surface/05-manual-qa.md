# Run: `32-router-runtime-routing-operator-surface`

## Phase: `05 Manual QA`

Status: `COMPLETE`

## Runtime under test

- Worktree: `D:\DEV\role-model\.worktrees\32-router-runtime-routing-operator-surface`
- QA launcher:
  - `corepack pnpm --dir "D:\DEV\role-model\.worktrees\32-router-runtime-routing-operator-surface" --filter @role-model-router/runtime-host-bridge exec tsx "D:\DEV\role-model\.worktrees\32-router-runtime-routing-operator-surface\role-model-router\apps\runtime-host-bridge\scripts\start-for-qa.ts"`
- Runtime base URL: `http://127.0.0.1:3456`

## Live setup

- Confirmed:
  - `/healthz` returned `healthy`
  - `/api/role-model/router/summary` returned a structured Router snapshot
  - `/v1/models` returned mixed local-plus-remote models:
    - `gpt-5.4`
    - `openai/gpt-4.1-mini-fast`
    - `claude-3.7-sonnet`
- Seeded routed request:
  - `requestId = req-run32-router-003`
  - endpoint selected: `openai.personal.primary.us-east-1.fast`
  - model selected: `openai/gpt-4.1-mini-fast`

## Browser pass

Browser automation against `http://127.0.0.1:3456/` verified:

1. Router section present in the primary navigation.
2. Router overview page rendered:
   - routing posture
   - execution mode
   - controller summary
   - guidance posture
   - links to config and decisions
3. Router config page rendered:
   - persisted routing posture
   - guidance provenance
   - role/task policy inputs
4. Router candidates page rendered:
   - 1 local + 2 remote candidates
   - preferred/ignored posture
   - unified comparable inventory
5. Router decisions page rendered:
   - seeded request appeared in the ledger
   - direct links to Router detail and Observe detail were present
6. Router decision-detail page rendered:
   - chosen endpoint/model
   - raw decision bundle
   - routing diagnostics
   - linked request and endpoint profile
   - honest empty-state text for fallback endpoints:
     - `No fallback endpoints were recorded for this decision.`
7. Observe cross-link worked:
   - `Open Observe detail` navigated to the request detail surface for `req-run32-router-003`

## QA conclusion

- Configured state proof: satisfied through the seeded OpenAI fixture-backed routed request and populated Router summary/candidates/decisions/detail pages.
- Honest empty-state proof: satisfied through the decision-detail fallback-endpoints section.
- Browser usability proof: satisfied for Router overview, config, candidates, decisions, decision-detail, and Observe handoff.
