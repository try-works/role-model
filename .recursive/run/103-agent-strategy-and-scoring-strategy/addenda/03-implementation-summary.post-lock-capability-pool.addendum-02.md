Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation` (post-lock addendum 02)
Status: `LOCKED`
LockedAt: `2026-09-30T21:41:58Z`
LockHash: `b712f1f08015fbbe5a2280c80cd9ba4e28cf27bd985aa2e9a76c0dc99a11bae6`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/00-requirements.post-lock-shipped-embedding-capability.addendum-01.md` (the approved amendment this implements)
- operator report (2026-10-01): the Posture diagnostics card printed `ALIAS_POOL_EMPTY` twice, listed
  workload scopes on the Agent strategy page, and the shipped `embedding` workload looked resolvable
  although a call through `embedding.remote-only` failed with `no_eligible_target`
Outputs:
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-materialize.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-workload-examples.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-live-aliases.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts` and `agent-strategy.test.ts`
- `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`
- `role-model-router/apps/runtime-ui/app/routes/agent-strategy.test.tsx`
- `docs/operations/05-agent-strategy-and-workload-postures.md`
Scope note: Post-lock implementation record for the capability-pool repair and the Agent strategy /
Workloads page diagnostics cleanup, with the rebuilt-runtime verification. The config layout, the
decision receipts and the request-time router are unchanged.

## TODO

- [x] Reproduce all four reported symptoms against the live runtime
- [x] Narrow the published pool by `required_capabilities` with the router's own rule
- [x] Apply the same narrowing to the page readback's candidate counts and eligible endpoints
- [x] Repoint the shipped `embedding` example and update the guide, template and tests
- [x] Scope the diagnostics card to its page, drop the duplicated marker, and move unresolvable scopes onto their entry
- [x] Verify on the rebuilt packaged runtime and record the evidence
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## What changed

### The published pool is the pool the request path accepts

- `supportsCapabilityRequirement` is exported from `packages/core/src/router.ts` as the single source of
  the capability-satisfaction rule (`code.edit` satisfies `code.read`/`code.write`, a `<requirement>.`
  family satisfies the family root, `reasoning` satisfies `reasoning.*`, the structured-output pair).
- `materializeAgentStrategyAliases` accepts an optional `supportedCapabilitiesByModelId` index and, when an
  entry pins `required_capabilities`, narrows the scope's model ids to the models that satisfy every pin.
  The index is built in `index.ts` from the same per-execution-mode registry the router filters candidates
  with. Omitted index means "no narrowing" (pre-repair behaviour for callers that do not have one).
- `readPostureEntrySummaries` applies the same rule to the endpoints it reports, so `candidateCount`,
  `allowEndpointIds`, the "current leader" line and `poolEmpty` agree with what a request would find. An
  entry whose pin nothing satisfies now publishes no alias row and is reported as `ALIAS_POOL_EMPTY` for
  each scope, instead of advertising candidates the first call rejects.

### The shipped example uses a taxonomy capability

- `SHIPPED_WORKLOAD_EXAMPLES.embedding` pins `knowledge.retrieval` (canonical taxonomy) instead of
  `embeddings.text` (provider-registry spelling, absent from the taxonomy), per
  `00-requirements...addendum-01`. The operations guide, the Workloads template fallback and the tests name
  the same capability.
- In this deployment the repointed example is honestly unresolvable: no admitted model declares
  `knowledge.retrieval`, so the Workloads page reports four empty scopes for it instead of a false green.

### Page diagnostics

- `filterPostureDiagnosticsForKind` scopes the diagnostics card to the entries the page owns (a skipped
  scope by alias-id prefix; a violation/warning by the entry it names), so the Agent strategy page never
  shows a workload's scopes or warnings.
- Entry cards list only the scopes that can resolve (`resolvableAliases`), and report the rest in one
  plain-English line (`N scopes cannot resolve: … — no eligible candidate …`), owned by that entry. The
  duplicated `ALIAS_POOL_EMPTY (ALIAS_POOL_EMPTY)` rendering and the `Unknown capability warning:` prefix
  are gone.

## Live verification (rebuilt packaged runtime)

Rebuilt with the paired private distribution (`status PASS`, 13 extensions, sidecar
`7471af1f0a41e129c73cbe4eda9bfed2459c8df8767c30802267c31b279e4c7e`) and restarted on `127.0.0.1:3458`
from `role-model-dev.exe` sha256 `4e82a75599dae88bbc1db8cc46b48337e0c21330bcffef3734d62d0e68dc6fdc`.

- Readback (`GET /api/role-model/router/config`): `embedding` publishes **no** aliases and is reported
  skipped for all four scopes; `tester.*` and `batch.*` keep their three resolvable scopes with 8
  candidates each; `postureDiagnostics.warnings` is empty.
- The dev config's own `workloads.embedding` entry (which still pinned the old spelling) was migrated to
  `knowledge.retrieval` through the merge API; an added `fncall`/`editor` probe pair was removed again, so
  the operator state is `agent_strategies: tester` plus `workloads: batch, embedding`.
- Request path, unchanged and now consistent with the page: `POST /v1/chat/completions` with
  `model: embedding.remote-only` answers `400 capability_eligibility_error / no_eligible_target`, while
  `tester.remote-only` answers `200`.
- Agent strategy page: only `tester` is listed, with three scope rows and
  "1 scope cannot resolve: local-only — no eligible candidate for this scope."; the diagnostics card reads
  "The readback reports no posture violations or capability warnings for this page."
- Workloads page: `batch` shows its three scopes plus the same single-scope note; `embedding` shows "4
  scopes cannot resolve" with the empty state and the note, and the diagnostics card is empty.

## Evidence

- `.../evidence/logs/red/postlock-capability-pool-red.log`,
  `.../green/postlock-capability-pool-green.log` (materialisation + shipped examples)
- `.../green/postlock-capability-pool-suites-green.log` (focused bridge suites, 10 files / 121 tests)
- `.../red/postlock-capability-pool-readback-red.log`,
  `.../green/postlock-capability-pool-readback-green.log` (readback integration, mutation-checked)
- `.../green/postlock-capability-pool-narrowing-green.log` (partial narrowing: one of two models satisfies
  the pin, the alias publishes exactly that endpoint)
- `.../green/postlock-capability-pool-full-bridge-green.log` (full bridge suite: 319 files passed /
  3 skipped, 1949 tests passed / 5 skipped)
- `.../red/postlock-diagnostics-scope-red.log`, `.../green/postlock-diagnostics-scope-green.log`,
  `.../green/postlock-diagnostics-ui-suites-green.log` (UI: 65 files / 630 tests)
- `.../green/postlock-capability-pool-package-sea-green.log` (the rebuilt artifact's manifest)

## Impact on the Locked Phase Chain

- The locked phase records keep their decisions. `00-requirements.md` R5/R6 are amended by the approved
  addendum; this addendum is the implementation record for that amendment and for the diagnostics repair.
  No product file was added or removed, so the phase diff audits need no further reconciliation.
- `docs/operations/05-agent-strategy-and-workload-postures.md` now documents the capability narrowing rule
  and the repointed example.

## Coverage Gate

- [x] All four reported symptoms are reproduced live before the repair and re-checked after it
- [x] The narrowing rule is single-sourced (core export) and tested at unit, derivation, readback and
      full-suite level, including the partial-narrowing case
- [x] The shipped example's vocabulary matches the taxonomy, the guide and the template
- [x] The page lists only resolvable scopes and reports the rest on the owning entry, with no duplicated marker

Coverage: PASS

## Approval Gate

- [x] Operator decisions (2026-10-01, this thread): repair the diagnostics in run 103; make the published
      pool reflect request-time eligibility; repoint the shipped example rather than extending the taxonomy;
      track per-alias usage in a separate run

Approval: PASS
