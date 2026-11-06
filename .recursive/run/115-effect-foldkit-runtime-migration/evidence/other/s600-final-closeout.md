# S600 - run-115 audit remediation: final closeout (2026-10-31)

Independent review chain: 3 review rounds by s9b-reviewer, all HOLDs resolved; final verdict PASS (bounded caveats, non-HOLD).

## Objective items - final dispositions
1. UI P0s (CLOSED): LocalPolicy renders the wired editor (TTL/concurrency/auto-unload + Save/Reset) dispatching PUT /api/role-model/local/policy via an injectable client (s589 RED-GREEN). SessionReadiness derives bootstrap/health/authority/credentials from the operator status readback with honest unavailable/unknown/failed states and not-reported copy for manifest/drift (s590, four states). All 14 handler-less controls are wired or reason-disabled: storage retention (policy save with real host payloads policyId/scope/maxBytes/maxAgeDays; dry-run captures currentPlan.manifestHash; execute POSTs the hash and is disabled until bound; busy/saved/error status), operator learning mode+rollback (POST /operator/learning/mode and /rollback, injectable client, persisted select), local logs refresh; reason-disabled with data-reason-disabled text + disabled/aria-disabled state: peer add endpoint, peer register/+role/select-all, llama-swap load/all-roles, replay create, extensions pause/download-validate (s595, 5 tests incl. behavioral reason assertions; genuine REDs incl. s595-operator-red.log).
2. Foldkit parity (CLOSED): router weights editor with six hydrated inputs persisted as routing.weights ONLY for custom scoring (host validator contract), save hydrates host weights when untouched (s591, 3 tests + s584); 10 missing route tags gained port-captured stories; s565 iterates the full route union.
3. R27 Layer DAG (CLOSED): closed scoped DAG (readiness->permits->backend->bootstrap->refresh->drains->benchmarks->server->cli->host) with one shared composed readiness owner; production cli.ts eagerly acquires it via Layer.buildWithScope before any imperative resource, readiness is marked only by the host leaf, acquisition failure aborts startup, and the r27-dag drain releases in reverse (s593 4/4 incl. composed admission; s598 3/3 CLI-level mirror; genuine behavioral RED s593-red.log).
4. Re-gate at final HEAD (CLOSED): product HEAD fbab6294 gated 0.0.20-453-gfbab6294: validate-packaging PASS, verify PASS (CLI boots the eager DAG path), audit-rendered-ui 20/20, dialog a11y PASS, compare-release vs preserved 0.0.20 = 6 same / 2 additive-shape / 1 environment-state / 0 different. UI suite 833/833, tsc 0; host-bridge tsc 0.

## Bounded caveats recorded as follow-ups (not owner-gated)
- DAG nodes are the acquisition/readiness spine; individual backend/bootstrap/refresh/server resources remain built imperatively.
- s598 mirrors the CLI sequence rather than invoking cli.ts main directly.
- Post-DAG startup failure cleanup relies on process exit; normal shutdown is covered by the r27-dag drain.

## Owner-gated (excluded from this scope, unchanged)
R15 real-client live provider; R16 like-for-like seeding approval; R39-live CI dispatch/toggle; stage/prod Run88 identity; pixel visual-delta sign-off (image provider 429/no PNG decoder). E1/E2 deferred by owner.
