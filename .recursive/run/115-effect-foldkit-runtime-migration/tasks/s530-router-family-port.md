# S530 - port the router family to structural parity

Status: pending
TDD Mode: strict per page + structural acceptance gate
Public basis 50d251ab.

Reference sources: role-model-router/apps/runtime-ui/app/routes/router*.tsx and components/page-primitives.tsx; audit D:/DEV/rm-clean/audit/gaps-b.md keys _app_router_* and _app_router.

Deliver in order: /router (Alias inventory + Routing candidates tables), /router/candidates (Candidate inventory cards), /router/decisions (Decision ledger table with reference columns and filters), /router/config and /router/strategy (routing strategy editors), /router/workloads (Workload templates + Entries), /router/agent-strategy (Posture diagnostics + Entries), /control/controller (candidate cards + Use as controller promotion).

Strict RED per page: reference titles absent on HEAD. Acceptance per page: route-dump textLen >= 0.9 x reference and titles present; suites + UI tsc 0 + s247 3/3 + nonempty lint zero added-line; freeze hashes; independent review; no commit. No other families.