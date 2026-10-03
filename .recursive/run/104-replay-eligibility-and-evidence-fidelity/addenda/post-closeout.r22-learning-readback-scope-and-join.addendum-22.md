# Post-closeout addendum 22 — Learning readback: incomplete evidence join and role-less pack scope

Found while verifying the `stage-rc-43ccd509916f` operator UI on `:3457` (two defects the operator reported:
the Decisions table rendered almost every cell as `not reported`, and most Packs rows rendered scope
`scope-wide` instead of a role + task). Both are reproducible; neither is a display bug.

## R22-A: the Learning evidence join is bounded and silently incomplete

`scripts/track-b/runtime-operations-server.mjs` attaches the decision/pack `evidence` object through
`attachDecisionEvidence`/`attachRecordEvidence` → `readCandidateJoinIndex` + `readComparisonEvidenceIndex`
+ `readValidationReceiptIndex`. Every column the Decisions table renders (Models · judge score, Judge,
Evidence, Decision, Receipt) is read from that object, and `runtime-ui/app/routes/learning.tsx` renders its
honest `NOT_REPORTED` placeholder for a field the object does not carry. So a join that returns nothing
renders as a table of absences.

The join is bounded:

| constant | value | effect |
| --- | --- | --- |
| `CANDIDATE_EVIDENCE_PAGE_LIMIT` | 64 | candidates read per page |
| `CANDIDATE_EVIDENCE_MAX_PAGES` | 4 | ≤256 candidates walked, stopping early once every wanted id is found |
| `COMPARISON_EVIDENCE_FILTER_LIMIT` | 256 | group ids per filtered request |
| `maxRequests` | `2 * ceil(distinctGroupIds / 256)` | then `truncated = true` |

Measured live against the running stage runtime, the same query is not stable:

| call | `?limit=100&origin=live` rows with `evidence` |
| --- | --- |
| 1 | 94 / 100 |
| 2 | **0 / 100** |
| 3–7 | 100 / 100 |
| `limit=300`, `limit=500` | 100% (one distinct candidate) |

The readback already publishes `evidenceJoin {requestedGroups, resolvedGroups, requests, truncated,
unavailable}`, but `learning.tsx` never renders it (`grep evidenceJoin` → 0 hits). A degraded join is
therefore indistinguishable from genuinely absent evidence, which is exactly how the operator read it.

## R22-B: the pack scope is role-less because the caller never passes `roleId`

`scope-wide` is accurate output, not a rendering fault. `resolvePackScope` resolves the pack's scope from
the pack's own `record.scope`, then the joined validation receipt's `familyEvidence`, then the comparison
group's `comparability`; a row whose three sources are all silent is `scopeWide: true`.

Measured on the stage state root (`knowledge_learning_records`, `kind='pack'`): **40 packs, 27
endpoint-id-only, 13 role+task.** For **27 of 27** the source candidate also lacks role/task — **zero packs
lost it at promotion** — and both UI fallbacks are absent (no receipt `familyEvidence`, no comparison
`roleId`). The candidate population splits sharply:

| candidate `scopeId` | count | `scope.roleId` coverage |
| --- | --- | --- |
| `runtime:<hash>` | 113 | **0%** |
| `standalone-runtime-stage` | 108 | ~64% |

The stamp itself copies from the candidate
(`extensions/knowledge-worker/index.mjs` `promoteCandidate`, ~2544–2563), and the candidate's scope is
built by `derive` from `value.taskTypeId ?? value.scope.taskTypeId` and `value.roleId ?? value.scope.roleId`
(~1718–1756, 1803–1808). The producer that supplies that envelope is
`role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`:

- line ~10641 (`buildLearnedExperienceCandidate`) hardcodes `taskTypeId: "task:route-selection"`;
- the shadow-pipeline caller (~11625–11645) passes `observation.taskTypeId`, `observation.taxonomyVersion`
  and `observation.classification` — but **never `roleId`**, even though `observation.classification`
  carries `roleId` and `track-b-runtime.ts` already consumes `input.roleId` at ~8775 and ~10707.

So `input.roleId` is always `undefined` on that path, the candidate's scope is role-less, and the promoted
pack can never be role-scoped. The evidence to fix it exists: **83/131** comparison groups carry
`comparability.roleId` and **81/124** validation receipts carry `familyEvidence.taskTypeId`.


## Verification (browser, live runtime on :3457)

The :3457 stage runtime had crashed, so the verification relaunched it with the R22 patched
distribution and the rebuilt UI. Playwright (playwright-core, msedge) drove the two pages:

- **Packs**: the R22-B3 note renders verbatim - `shown packs are scope-wide: they name only a routing
  target, so no role or task could be resolved for them from the pack, its validation receipt or its
  comparison` - and the table lists real roles (`researcher`, `designer`, `writer`, `support`,
  `operator`).
- **Decisions**: the evidence columns now render verdict words (`promoted`, `source`,
  `comparison`, `validation`) and judge/model names (`deepseek`, `gpt`, `flash`, `luna`) beside
  the remaining bounded `not reported` cells - the join populates evidence instead of returning an
  all-null page.

API evidence: `/api/role-model/operator/learning/decisions?limit=100&origin=live` answers
`100/100` rows with `evidence`, and `evidenceJoin` now carries `candidateJoin
{requestedCandidates, resolvedCandidates, pages, exhausted, failed, unavailable}`.

Test evidence: `tests/track-b/run101-a48-learning-evidence-readback.test.mjs` A48-R8 and A48-R9 now
pass (the evidence cap and the >256-group page); the A48-R1 externalized-page test remains a
pre-existing, independent failure (it exercises `adapters.evaluation.groups` directly, not the
learning join). Public UI: `learning-evidence-join-note.test.tsx` 11 tests pass;
`learning-task-family`, `learning-floor-progress`, `learning` 35 tests pass.

The 28 remaining scope-wide packs are legacy - promoted before the R22-B role plumbing; packs derived
from replay comparisons after this change carry their role and task.

Screenshots: `E:\tmp\run104-phase5\r22-decisions.png`, `E:\tmp\run104-phase5\r22-packs.png`.


### Coverage after the fix (measured on the live :3457 readback)

`/learning/decisions?limit=60&origin=live`:

| what | count |
| --- | --- |
| rows | 60 |
| rows with an evidence object | **60 / 60** |
| rows naming a role (`roleId`) | 52 / 60 |
| rows naming a task | 60 / 60 |
| rows with `validationRef` + `comparisonId` | 60 / 60 |
| rows with `replayRef` / `captureRef` / `counts` | 0 / 60 |

The eight role-less rows are all `text.chat` - a generic chat family whose taxonomy entry carries no
role - so `not reported` is the honest answer there, not a join failure. `replayRef`, `captureRef`
and `counts` are likewise genuinely absent from these comparison groups: the receipt says so in words
(`the receipt carries no comparison counts`) rather than rendering an invented zero. That is the
distinction R22-A exists to preserve - a bounded read and an absent fact no longer look identical.

The Decisions page also shows the same comparison backing many rows
(`comparison:supervised-replay:…69171b37813292265ca1` across `operator.debug.ui` and
`operator.config`). That is the live shape: the newest live requests all consult one advisory
candidate, so they share its comparison. It is not a join artifact.

## Scope of this addendum
R22-A and R22-B only. The activation model (one active route package per scope, ramped by cohort — observed
as a single `knowledge_route_rollouts` row with one `activePackageId`) is deliberately **not** changed here:
concurrent per-role/per-task pack activation is an architecture change to the rollout contract, not a bug fix.
