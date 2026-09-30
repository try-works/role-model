Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `00 Requirements` (post-lock addendum 01)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (LOCKED)
- operator report (2026-10-01): the `Agent strategy` page's posture-diagnostics card prints the
  `ALIAS_POOL_EMPTY` marker twice, lists workload scopes on the role page, and shows the shipped
  `embedding` workload as resolvable although a real call through it fails
- operator decisions (2026-10-01, this thread): (1) repair the diagnostics scoping, duplication and
  placement as a post-lock addendum to run 103; (2) apply capability narrowing to the *published* alias
  pool; (3) repoint the shipped `embedding` example at a capability the canonical taxonomy already carries
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/00-requirements.post-lock-shipped-embedding-capability.addendum-01.md`
- `role-model-router/packages/core/src/router.ts` (exports `supportsCapabilityRequirement` as the single source of the rule)
- `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts` (capability-narrowed materialisation, repointed shipped example)
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (capability index for the derivation, endpoint narrowing in the page readback)
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-materialize.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-workload-examples.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/agent-strategy-live-aliases.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts` and `.test.ts` (page-scoped diagnostics, per-entry unresolvable scopes, resolvable aliases only)
- `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`
- `role-model-router/apps/runtime-ui/app/routes/agent-strategy.test.tsx`
- `docs/operations/05-agent-strategy-and-workload-postures.md`
Scope note: This is a requirements-level amendment to R6 (and one sentence of R5). It settles the
`embedding` capability spelling and it makes the published alias pool a promise the runtime can keep, so
the observable acceptance criteria of the original phase 00 document change for exactly those two points
and for nothing else.

## TODO

- [x] Record the operator report and the two decisions that change the requirement text
- [x] Reproduce both defects against the live development runtime
- [x] Amend R5 and R6 with the new observable criteria
- [x] Reconcile the amendment with the locked phase records
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Amended requirement text

### R6 (workloads) - amended

Original acceptance criterion (mutatis mutandis): *the two shipped workload examples validate, survive the
config round trip, materialise one alias per non-empty scope, and carry their capability pin into the
request.*

Amended:

- The shipped `embedding` example pins a capability the canonical taxonomy actually defines. The provider
  spelling `embeddings.text` is replaced by `knowledge.retrieval`; no shipped example may reference a
  capability the runtime's own taxonomy does not carry, because such an example warns as
  "unknown capability" by construction and teaches operators to ignore the warning.
- The operations guide, the one-click template and the runtime constant
  (`SHIPPED_WORKLOAD_EXAMPLES.embedding`) name the same capability.

### R5 (agent strategies and workloads materialise aliases) - amended

Original acceptance criterion (mutatis mutandis): *one alias per validated entry per execution scope,
with an empty scope reported as `ALIAS_POOL_EMPTY` rather than widened.*

Amended:

- The published pool reflects the **eligibility the router applies at request time**. An entry that pins
  `required_capabilities` narrows its pool to the models that satisfy every pinned capability under the
  router's own `supportsCapabilityRequirement` rule, and the readback reports the same narrowing for its
  candidate counts and eligible endpoint ids.
- A pinned capability nothing in the scope satisfies is reported as `ALIAS_POOL_EMPTY` for that scope. The
  runtime must not advertise candidates the first request would reject with `no_eligible_target`.

## Why the criteria changed

- Live reproduction (2026-10-01, packaged development runtime `:3458`): `embedding.remote-only` advertised
  **8 candidates** with no empty badge, while `POST` through the alias returned
  `400 capability_eligibility_error / no_eligible_target` naming all eight as
  `missing_capability.embeddings.text`. The page's claim and the request's outcome disagreed, which is the
  same class of defect the operator had already reported for the config write path: a surface that reports
  success for an operation that does not happen.
- The same readback reported `workload "embedding" references unknown capability "embeddings.text"`. The
  capability exists in the endpoint registry vocabulary (`supports_embeddings`) but not in
  `packages/core/data/taxonomy/capabilities.json`, so the shipped example could never validate cleanly.
- This deployment's admitted models declare
  `text.chat, tools.function_calling, reasoning, structured.output, code.edit`. Repointing to
  `knowledge.retrieval` therefore leaves the shipped `embedding` template **honestly unresolvable** here
  (`ALIAS_POOL_EMPTY` on every scope) instead of falsely green: no embedding-capable model is admitted yet.
  That is the intended outcome - the warning disappears because the spelling is canonical, and the pool
  reports the truth.

## Impact on the locked phase chain

- `00-requirements.md` keeps its locked decisions; this addendum is the effective requirement text for the
  two amended criteria, and Phase 3/Phase 4 records are reconciled against it.
- The requirement identifiers, the phase/task breakdown and the out-of-scope list are unchanged.

## Evidence

- Live reproduction on the packaged development runtime `:3458`: `POST /v1/chat/completions` with
  `model: embedding.remote-only` answered `400 capability_eligibility_error / no_eligible_target` naming
  all eight candidates as `missing_capability.embeddings.text`, while the page readback advertised eight
  candidates; `tester.remote-only` answered `200` on the same runtime.
- `.../evidence/logs/red/postlock-capability-pool-red.log` and
  `.../green/postlock-capability-pool-green.log` (materialisation + shipped examples),
  `.../green/postlock-capability-pool-suites-green.log` (focused bridge suites),
  `.../red/postlock-capability-pool-readback-red.log` and
  `.../green/postlock-capability-pool-readback-green.log` (readback integration, mutation-checked),
  `.../green/postlock-capability-pool-full-bridge-green.log` (full bridge suite).
- `.../red/postlock-diagnostics-scope-red.log` and
  `.../green/postlock-diagnostics-scope-green.log`,
  `.../green/postlock-diagnostics-ui-suites-green.log` (UI half).
- Live re-verification on the rebuilt packaged runtime after the repair (recorded in
  `03-implementation-summary.post-lock-capability-pool.addendum-02.md`).

## Coverage Gate

- [x] Both amended criteria are observable and testable (`agent-strategy-materialize.test.ts`,
      `agent-strategy-workload-examples.test.ts`, `agent-strategy-config-path.test.ts`)
- [x] The amendment is grounded in a live reproduction, not in a reading of the code
- [x] The doc, the constant and the template name one capability

Coverage: PASS

## Approval Gate

- [x] The operator chose the repoint over extending the taxonomy, and accepted that a repointed example
      reports an empty pool where no admitted model satisfies it (this thread, 2026-10-01)

Approval: PASS
