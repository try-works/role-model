Phase 1 AS-IS analyst draft (child `as104_learner_conformance`, brief `E:\tmp\collab\briefs\as104_learner_conformance.md`)
Status: COMPLETE with one PARTIAL section (`replay.disposition` state enumeration; 15-minute box).
Public worktree: `D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity` (baseline `84d5996c`)
Private worktree: `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity` (baseline `5df90b6d`)
Tasks: `T1.2d`, `T1.2e`, `T1.2i` — requirements `R6`, `R7`, `R8`, `R11`

## T1.2d Capture classification path

### `buildRequestClassification` (T1.2d check 1)

Claim: the capture classification builder is `buildRequestClassification` at
`role-model-router/apps/runtime-host-bridge/src/index.ts:8148` (public worktree, baseline `84d5996c`).

```ts
function buildRequestClassification(input: {
  readonly taskTypeId?: string | null;
  readonly roleId?: string | null;
  readonly toolClasses?: readonly string[] | null;
}): TrackBRouteAdvisoryClassification | null {
```

Quoted core (same file):

- `:8163-8166`
  ```ts
  const declaredTaskTypeId = boundedRequestClassificationId(input.taskTypeId);
  const knownTaskTypes = new Set(canonicalTaxonomy.tasks.map((task) => task.id));
  const taskTypeId =
    declaredTaskTypeId && knownTaskTypes.has(declaredTaskTypeId) ? declaredTaskTypeId : null;
  ```
- `:8168-8170` `const roleId = declaredRoleId && knownRoleIds.has(declaredRoleId) ? declaredRoleId : null;`
- `:8172` `if (!taskTypeId && !roleId && !taxonomyVersion && toolClassIds.length === 0) return null;`

Implication (`R6`): the builder has no fallback of any kind; a value survives only when the caller
passes a declared taxonomy id.

Call sites (three, all in the same file):

| Line | Context | `taskTypeId` argument |
| --- | --- | --- |
| `:26518` | routed-answer capture (`classification:` inside the answer record) | `plan.routingRequest.taskType ?? null` |
| `:27509` | failed-request capture | `plan.routingRequest.taskType ?? null` |
| `:28375` | supervised-replay capture | `plan.routingRequest.taskType ?? null` |

### Role fallback chain vs the task's missing fallback (T1.2d check 2)

At all three call sites the arguments are literally identical in shape:

```ts
taskTypeId: plan.routingRequest.taskType ?? null,
roleId:
  plan.routingRequest.requestedRoleId ??
  plan.taxonomyIdentity?.roleId ??
  plan.routingRequest.roleModelIntent?.role?.id ??
  null,
toolClasses: plan.routingRequest.roleModelIntent?.toolClasses ?? null,
```

So the **role** has a three-step fallback (declared role → the plan's resolved taxonomy identity →
the intent's role) while the **task** has a single source with no fallback. The resolved identity it
ignores is real: `buildBridgeTaxonomyIdentity` (`index.ts:10316`) resolves

```ts
const taskTypeId =
  declaredTaskTypeId ?? derivedTaskTypeId ?? input.declaredTaskTypeId ?? "text.chat";   // :10332-10334
const roleId =
  (declaredRoleIsTaxonomyRole && declaredRoleId ? declaredRoleId : undefined) ??
  (derivedRoleId && ... ? derivedRoleId : undefined) ??
  task?.primaryRole ??
  "writer";                                                                            // :10340-10348
```

Implication (`R6`): when `routingRequest.taskType` is absent (or is a capability name rather than a
taxonomy task id), the capture classification emits `taskTypeId: null` while `roleId` and
`taxonomyVersion` still populate the object, so the record is kept (it is not the `return null`
case) and telemetry shows `taxonomyTaskType` (`index.ts:23767`) while the learning rows carry
`taskTypeId: null`. The fallback the role has is exactly the one the task is missing.

## T1.2e Learner and validation path

### Validation receipt shape and where the floors are computed (T1.2e check 3)

Private worktree `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity`
(baseline `5df90b6d`), `extensions/profile-learner/index.mjs`:

- `:29-31` defaults:
  ```js
  minDecisiveComparisons: 3,
  minHoldoutComparisons: 1,
  minDistinctCaptures: 3,
  ```
- `:726` `const floors = { ...DEFAULT_YIELD_FLOORS, ...(input.floors ?? {}) };`
- `:797-799` the gate fails on `insufficient_decisive_evidence` / `missing_holdout` /
  `insufficient_distinct_captures`.
- `:813` `holdoutPassed` is attached to the non-learning receipt:
  ```js
  holdoutPassed: holdoutComparisons >= floors.minHoldoutComparisons,
  ```
- `:826` the yield report returns the floors: `floors: { ...floors },`
- `:673` the receipt gate itself: `!receipt.payload.holdoutPassed` throws
  `"verified profile validation receipt required"`.

### The readback projection drops the floor (T1.2e check 4)

Private `scripts/track-b/runtime-operations-server.mjs`:

- `resolvePackScope` (`:1957-1977`) joins `roleId` / `taskTypeId` / `taxonomyVersion` from
  `scope` → `familyEvidence` → `comparability`; it never reads a floor.
- `withReceiptReadings` (`:1993-2012`) is the only place a receipt reaches a learning row:
  ```js
  const family = receipt?.familyEvidence ?? null;
  ...
  return {
    ...evidence,
    verdict: receipt?.verdict ?? null,
    validationRef: receipt?.recordId ?? null,
    qualityDelta: receipt?.qualityDelta ?? null,
    claim: claim ?? null,
    counts: family ? { comparisons: (decisive ?? 0) + (development ?? 0), decisive, holdout } : null,
    countsState: receipt ? (family ? "reported" : "receipt_carries_none") : null,
  };
  ```
  The projected set is exactly `verdict` / `validationRef` / `qualityDelta` / `claim` / `counts` /
  `countsState`. **No floor field is projected anywhere in this file** (an earlier `rg -i floor` over
  it returns only `REPLAY_OWNER_LEASE_FLOOR_MS`, a retention-tier floor at `:5042-5049`, and a
  comment about "the learner's family floor" at `:7128` — none of them a readback projection).

Implication (`R7`): the decisive/holdout/development counts do reach the readback, but the policy
floor they are measured against does not; a consumer that asks the readback for the floor reads
null because no code path carries it.

### Finalization boundary and `candidate_not_validatable` (T1.2e check 5)

Private `extensions/evaluation-core/index.mjs` — the finalized boundary is the group insert:

- `:3759` the result object sets `status: "finalized",` alongside `outcome` and the winner fields.
- `:3775-3777` an existing row with different `group_json` throws
  `"evaluation comparison group conflict"` (idempotent otherwise).
- `:3782` `INSERT INTO evaluation_comparison_groups VALUES (?,?,?,?)` with `groupId, "finalized",
  canonical(group), canonical(result)` inside a `BEGIN IMMEDIATE` / `COMMIT`.
- `:3789-3793` every parent job covered by the new group is completed
  (`#completeDurableJob(jobId, { reason: DURABLE_COMPLETION_REASON })`).
- The job-side stranded class is named at `:723`
  `"evaluation_job_stranded_without_finalized_comparison"`.

`candidate_not_validatable` is not produced by the private evaluator; it is produced on the public
side by the promotion path:

- `role-model-router/apps/runtime-host-bridge/src/cli.ts:1842-1851`
  ```ts
  | { readonly kind: "not_validatable"; readonly reason: string };
  ...
  kind: "not_validatable",
  reason: `candidate_not_validatable:${input.candidateId}: no finalized comparison was available to validate`,
  ```
- `cli.ts:7442` `if (outcome.kind === "not_validatable") throw new Error(outcome.reason);`
- Reproduced expectations live in `test/run101-a44-promotion-validatability.test.ts:44-63`.

Implication (`R8`): the reproduction path is a promotion whose candidate has no finalized comparison
group covering its trials — the public CLI converts that to `candidate_not_validatable` and throws;
the private side parks the same work as a stranded job.

## T1.2i Private conformance path

### Reproduced failure and ratchet semantics (T1.2i check 6)

Command (private worktree, read-only):
`node --test tests/track-b/run99-r33-policy-consumers.test.mjs`

Observed: `pass 0 / fail 1` (~6.4 s), assertion at
`tests/track-b/run99-r33-policy-consumers.test.mjs:118`:

```
published policy fields with no consumer: perArmOutputEvidence, perArmOutputExclusionBound
(wire them or remove them, and shrink KNOWN_UNWIRED)
```

Measured unconsumed set — exactly these two fields:

| Field | Definition | Runtime consumer |
| --- | --- | --- |
| `perArmOutputEvidence` | `shared/route-learning/activation-policy.mjs:59`, policy value `shared/route-learning-activation-policy.json:14` | none found |
| `perArmOutputExclusionBound` | `shared/route-learning/activation-policy.mjs:60`, policy value `shared/route-learning-activation-policy.json:15` | none found |

Ratchet semantics (quoted from the test):

- `:33` `const KNOWN_UNWIRED = new Set([]);` with the comment "the list is empty by design and must
  stay that way (add it back only with a documented, dated exception)".
- `:22-27` `NON_CONSUMER_PATHS` = `shared/route-learning/activation-policy.mjs`, the policy JSON,
  `docs/route-learning/shadow-to-active.md`, `tests/track-b`.
- `:29-30` consumer roots `["extensions", "shared", "scripts", "cloud"]` plus the public
  `role-model-router/apps` tree when present (`:99-101`).
- `:40` `NON_CONSUMER_SEGMENTS = ["runtime-ui"]` — rendering a value is not consuming it.
- `:96` `assert.ok(fields.length > 20, "the shipped policy publishes its whole field set")`.
- `:110-118` a field is unwired when its name appears in no consumer file; the assertion is
  `deepEqual(unwired, [])`, so wiring a field must remove it and a newly published dead field fails.

**Discrepancy to carry to the controller:** the locked requirement (`R11`, `T1.2i`) states "24
unconsumed activation-policy fields"; at this baseline the measured count is **2**. The 24 figure
does not reproduce here; the phase artifact's `24` should be corrected or re-derived.

### Wire-or-remove disposition (T1.2i check 7, best-effort)

Both fields are documented as run-100 `R2` behaviour ("Where an arm's comparable output comes from",
"how many arms a capture may exclude"; `docs/route-learning/shadow-to-active.md:144-145`) and are
covered by `tests/track-b/run100-policy-bounds.test.mjs:22-38`, but nothing in the consumer roots
reads them.

| Field | Disposition | File that would consume it |
| --- | --- | --- |
| `perArmOutputEvidence` | wire (preferred; the documented behaviour exists) or remove | the arm-capture/arm-resolution path — private `scripts/track-b/runtime-operations-server.mjs` or the comparison builder in `extensions/evaluation-core/index.mjs` (best-effort: the exact function was not identified in the box) |
| `perArmOutputExclusionBound` | wire or remove, same locus | same refusal/exclusion counter that decides when a capture refuses for lost arms |

### `replay.disposition` states (T1.2e check 8) — PARTIAL

Verified in private `scripts/track-b/runtime-operations-server.mjs`:

- `:3149-3152` the disposition plane is a ledger pass-through, and "`replay_failed` outcomes the
  queue counters cannot express" are recorded.
- `:3498` a capture deferred four times records the same refusal then `replay_failed`.
- `:3515` `deferred / replay_failed` with `replay endpoint HTTP 409: {"error":"REPLAY_DISPATCH_INDETERMINATE: ...`.
- Run evidence already in the phase draft: live rows `replay_job_not_ready_for_evaluation` (5) and
  `replay_failed` (12).

The complete producer enum was **not** enumerated within the box; treat the state list as partial
(deferred, `replay_failed`, `replay_job_not_ready_for_evaluation` confirmed; the full set needs a
dedicated pass over the disposition writers).

## Unverified

- The full `replay.disposition` state set (see above; partial).
- Whether `perArmOutputEvidence` / `perArmOutputExclusionBound` have a consumer outside the scanned
  roots (the test scans `extensions`, `shared`, `scripts`, `cloud` and public
  `role-model-router/apps`; it reported none).
- The live learning readback (`:3457`) was not queried; the floor-drop finding is a code read, not a
  live capture. No runtime was touched.
- The "24 unwired fields" claim from `R11` — my reproduction yields 2; I did not find a path that
  yields 24 at this baseline.

Read-only disclosure: this child wrote exactly one file (this deliverable). No repo writes, no
commits, no runtime interaction, no agent spawning. One budget note: ~6 minutes of the 15-minute box
were consumed establishing identity after the spawn payload arrived empty (the known defect);
recovery followed `E:\tmp\collab\INBOX.md` -> brief `as104_learner_conformance.md`.

Receipt token: r104-as-learner-conf-7J3T
