# Phase 1 AS-IS - replay selection, router eligibility and catalog modality path

Brief: `E:\tmp\collab\briefs\as104_replay_catalog.md` (receipt token `r104-as-replay-catalog-2P6N`)
Worktree: `D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity` (baseline `84d5996c`).
All paths below are relative to that worktree; the catalog package lives under `role-model-router/`.
Status: COMPLETE (checks 1-9 answered; check 10 = `## Unverified`).

## T1.2a Replay selection path

**Check 1 - `selectReplayCandidates`, its filtering logic, both call sites.**

- Definition: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts:296`
  (`export function selectReplayCandidates(input: { configuredEndpointIds; healthyEndpointIds?;
  sourceEndpointId?; excludedEndpointIds?; rotationKey?; cap? }): readonly string[]`).
- Exact filtering (`:330-340`): for each `configuredEndpointIds` entry - skip empty, skip already seen,
  `if (excluded.has(normalized)) continue;`, skip the source endpoint
  (`if (normalized === input.sourceEndpointId) continue;`), skip anything not in `healthyEndpointIds` when a
  healthy list was supplied. Then optional rotation ordering by `sha256(rotationKey + "\n" + endpointId)`
  (`:341-350`) and truncation to `cap` (default `DEFAULT_REPLAY_CANDIDATE_CAP = 3`, `:240`, `:351-355`).
- Call site 1 (on-demand capture path): `role-model-router/apps/runtime-host-bridge/src/cli.ts:7772`
  `const distinctReplayCandidates = selectReplayCandidates({ configuredEndpointIds: candidateEndpointIds,
  sourceEndpointId: capturedSourceEndpointId, rotationKey: requestId, ...(evalJudgeEndpointId ? {
  excludedEndpointIds: [evalJudgeEndpointId] } : {}) });`
- Call site 2 (durable auto-replay tick): `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts:979`
  `selectReplayCandidates({ configuredEndpointIds: input.configuredEndpointIds, ...(input.healthyEndpointIds
  ? { healthyEndpointIds: input.healthyEndpointIds } : {}), sourceEndpointId: capture.sourceEndpointId,
  ...(effectiveJudgeEndpointId ? { excludedEndpointIds: [effectiveJudgeEndpointId] } : {}),
  rotationKey: capture.captureRef })`.
- Both sites feed the identical admission call (`decideReplayAdmission`, `:161`); admission consumes only
  `distinctCandidateCount: candidates.length` (`cli.ts:7805`, `track-b-auto-replay.ts:1007`).
  Implication for `R1`: the selection rule is a pure id-subset operation with no request metadata input, so an
  image-bearing capture and a text-only capture with the same ids select the same arms.

**Check 2 - replay refusal vocabulary today, and `no_eligible_target` handling.**

- Closed list: `REPLAY_REFUSAL_CODES` at `track-b-replay-policy.ts:12-117` (`as const`; type at `:119`):
  `replay_disabled_channel`, `capture_unavailable`, `scope_denied`, `authorization_revoked`,
  `retention_expired`, `privacy_denied`, `no_distinct_candidate_configured`, `budget_exhausted`,
  `duplicate_already_processed`, `amplification_depth_exceeded`, `policy_unknown`, `dependency_unavailable`,
  `replay_dispatch_offer_refused`, `replay_window_elapsed`, `benchmark_source_not_replayable`,
  `synthetic_probe_not_replayable`, `judge_candidate_overlap`, `judge_unresolved`, `replay_boundary_unavailable`,
  `replay_capture_idempotency_conflict`, `replay_evaluation_receipt_missing`, `replay_branch_append_unavailable`,
  `replay_job_not_ready_for_evaluation`, `replay_awaiting_evaluation_in_flight`, `replay_partial_trial_scores`.
  (25 codes. The comment at `:3-9` states the intent: "the replay path has no hidden capability, tool, task,
  role, model, endpoint, or transcript precondition. Every refusal is one of the codes below and names the
  blocking input." - there is no modality/capability code in that list.)
- Producers: `decideReplayAdmission` (`:161-238`) emits the first twelve by named input, including
  `benchmark_source_not_replayable` (`:184-189`, `if (input.sourceIsBenchmark) return refuse(
  "benchmark_source_not_replayable", "benchmark traffic is never a replay or evaluation source")`) and
  `synthetic_probe_not_replayable` (`:196-201`), `judge_unresolved` (`:207-212`). The durable tick emits
  `judge_candidate_overlap` at `track-b-auto-replay.ts:968-978` (deferred when its alternative-judge fallback is
  exhausted). `replay_dispatch_offer_refused` is documented at `track-b-replay-policy.ts:25-30` as the
  already-admitted queue-refusal signal.
- `no_eligible_target` is **not** a replay refusal code. It is a router/bridge error code produced by the
  dispatch path and only *classified* on the replay side: `role-model-router/apps/runtime-host-bridge/src/
  index.ts:9008-9009` (`code: "no_eligible_target"`, `message: "no_eligible_target: no targets for model
  ${input.requestedModel} satisfy the inferred request capabilities."`), again at `index.ts:26590`
  (`const refusalCode = circuitRefusal?.code ?? "no_eligible_target"`), and mapped to the contribution-outcome
  failure class at `contribution-outcome.ts:37` (member of that closed class list). Implication for `R2`: a
  modality-ineligible arm today surfaces as a provider-side dispatch failure class, not as a replay admission
  refusal - which is exactly the run-103 monitor signature (`no_eligible_target` on `replay-req-*`).

**Check 3 - does the replay candidate path consult modalities or capabilities today? No.**

Proven by the filter body quoted in check 1: the only inputs read are `configuredEndpointIds`,
`healthyEndpointIds`, `sourceEndpointId`, `excludedEndpointIds`, `rotationKey`, `cap`
(`track-b-replay-policy.ts:296-356`). Neither `ReplayAdmissionInput` (`:121-151`) nor
`ReplayAdmissionDecision` (`:153-155`) carries a modality, capability, attachment or content field; there is no
`modalities` token anywhere in the file. The capture metadata that could carry such a requirement
(`capture.messages`, `capture.sourceClass`, `capture.sourceEndpointId`, `capture.replayProduced`) is used only
for tool detection, source-class refusal, judge self-exclusion and amplification, never for eligibility.

## T1.2b Router eligibility rules

**Check 4 - the capability rule and the modality comparison.**

- `supportsCapabilityRequirement` is **exported**: `role-model-router/packages/core/src/router.ts:549`
  (`export function supportsCapabilityRequirement(supportedCapabilities: readonly string[],
  requirement: string): boolean`). Its doc comment (`:543-548`) names it "the single source of the
  capability-satisfaction rule" and records that it was exported by the run-103 post-lock repair so the
  runtime's published alias pools reflect request-time eligibility. Body: exact membership (`:553`),
  `code.edit` implies `code.read`/`code.write` (`:563-569`), `<req>.` family satisfaction (`:570-572`),
  `reasoning` satisfies `reasoning.*` (`:573-575`), and the `structured.output` / `response.json_schema` pair
  (`:576-587`).
- Router call sites: `router.ts:1130` and `router.ts:1420-1426` (`if (effectiveRequiredCapabilities.some(
  (capability) => !supportsCapabilityRequirement(supportedCapabilities, capability))) reasons.push(
  "CAPABILITY_MISSING");`) and the role-binding variant `:1470-1478`.
- Modality comparison (`router.ts:1434-1440`): `if (policySnapshot.required_modalities.some((modality) =>
  !candidate.declared.modalities.includes(modality))) { reasons.push("MODALITY_UNSUPPORTED"); }`.
  Membership semantics: the candidate must declare *every* required modality (no family implication, unlike
  capabilities).
- Other hard reasons in the same block that a replay guard would inherit if it mirrored dispatch:
  `CONTEXT_TOO_SMALL` (`:1441-1443`), `TOOLS_UNSUPPORTED` (`:1444-1446`), `TASK_NOT_SUPPORTED_BY_ROLE`
  (`:1448-1454`), `ROLE_NOT_ALLOWED` (`:1455-1462`), `ROLE_BINDING_*` (`:1464-1484`),
  `FORBIDDEN_CAPABILITY_PRESENT` (`:1427-1433`).

**Check 5 - the router reason vocabulary the replay path would need to mirror or import.**

`toCandidateExclusion` (`router.ts:1240-1273`) is the closed map of `CandidateExclusion` codes to detail text:
`ACCOUNT_DISABLED`, `AUTH_UNAVAILABLE`, `BUDGET_EXCEEDED`, `CAPABILITY_MISSING`, `CONTEXT_TOO_SMALL`,
`DEPLOYMENT_CLASS_MISMATCH`, `ENTITLEMENT_MISSING`, `FORBIDDEN_CAPABILITY_PRESENT`, **`MODALITY_UNSUPPORTED`**
(`:1250`), `PACKAGE_NOT_INSTALLED`, `POLICY_DENY_ENDPOINT`, `POLICY_DENY_REMOTE`, `PROVIDER_OFFLINE`,
`QUOTA_EXHAUSTED`, `REGION_DISALLOWED`, `REVOKED`, `ROLE_BINDING_CAPABILITY_MISSING`,
`ROLE_BINDING_DISABLED`, `ROLE_BINDING_INACTIVE`, `ROLE_BINDING_TASK_NOT_ALLOWED`, `ROLE_NOT_ALLOWED`,
`TASK_NOT_SUPPORTED_BY_ROLE`, `TOOLS_UNSUPPORTED`, `VARIANT_INCOMPATIBLE`. The two codes `R1`/`R2` name
(`MODALITY_UNSUPPORTED`, `CAPABILITY_MISSING`) both exist here; a replay-side class must therefore either
import these names or state the mapping in its own vocabulary (the requirement's `candidate_input_unsupported`
would need to carry them as the blocking reason).

## T1.2c Catalog and registry modality path

**Check 6 - each hop from models.dev inputs to the registry value.**

1. Inputs (repo root `testdata/catalog/`): `models-dev-snapshot.json`, `models-dev-local-supplement.json`,
   `models-dev-local-overrides.json`, `litellm-model-prices.json`. The export CLI pins the overrides path
   explicitly: `packages/catalog/src/cli.ts:26` `overridesPath: path.join(repoRoot, "testdata", "catalog",
   "models-dev-local-overrides.json")`.
2. Refresh/merge: `packages/catalog/src/refresh.ts` - live model input/output modalities are unioned into the
   emitted list (`:309` `modalities: unique([...(model.modalities?.input ?? []), ...(model.modalities?.output
   ?? [])])`) and the supplement is unioned on top (`:425` `modalities: unique([...(liveModel.modalities ?? []),
   ...(supplementModel.modalities ?? [])])`).
3. Normalize/export: `packages/catalog/src/index.ts` - `normalizeCatalogSnapshot(snapshot, overrides)` and the
   model build at `:545-572`; alias-to-base inheritance already exists at `:476`
   (`modalities: unique(model.modalities ?? resolvedBase.model.modalities)`).
4. Emitted artifact: `packages/catalog/data/normalized-catalog.json` (6 595 models; `source.vendor =
   "models.dev"`, `source.commit = 978733d4459d91bee9af1c0839e0636deebb7194`,
   `capturedAt = 2026-08-15T04:06:41.477Z`) plus the ledger
   `packages/catalog/data/vendor-version-ledger.json` (same commit, `role: "catalog-source"`).
5. Registry/router: the bridge resolves configured models to endpoints whose `declared.modalities` is what
   `router.ts:1436` compares against `policySnapshot.required_modalities`. (The registry hydration code itself
   is in `runtime-host-bridge/src/index.ts` and `packages/endpoint-registry`; I did not walk that hop line by
   line inside the time box - see `## Unverified` item 2.)

**Check 7 - the stale `deepseek-v4-flash` value, end to end.**

- Local catalog values (read directly from `packages/catalog/data/normalized-catalog.json`):
  `deepseek/deepseek-v4-flash` -> `modalities: ["text"]`, `localOverrideApplied: true`;
  `deepseek/deepseek-flash` -> `modalities: ["image","text"]`, `localOverrideApplied: true`;
  `deepseek/deepseek-v4-pro` -> `modalities: ["text"]`, `localOverrideApplied: true`.
  There is **no** `deepseek/deepseek-v4.1-flash` entry in this catalog, i.e. the lineage the requirement
  describes does not exist locally yet; the deprecated-alias entry is what the runtime would resolve.
- The entry the runtime actually calls is `deepseek-flash` (already image-capable locally), while the
  configured alias `deepseek-v4-flash` still says text-only - so an image-bearing request that resolves through
  the alias is filtered out by `MODALITY_UNSUPPORTED` at `router.ts:1436-1439`.
- The pinned upstream commit in the ledger (`978733d4`, 2026-08-15) is **older** than the commit the
  requirement cites for the lineage correction (`models.dev@67dcd8c9`); refreshing the snapshot is therefore
  part of the fix, and the ledger must be regenerated with the newly read commit.
- Where a correction has to land: either the supplement (`testdata/catalog/models-dev-local-supplement.json`,
  unioned at `refresh.ts:425`) or - if the alias is added as its own base+alias pair - the snapshot refresh plus
  the overrides file for local notes; the overrides path alone cannot do it (check 8).

**Check 8 - can the local overrides path express `modalities` today? No.**

`packages/catalog/src/index.ts:93-96` defines `interface ModelOverride { readonly capabilities?:
readonly string[]; readonly localNotes?: readonly string[]; }` - no `modalities` field. The model build reads
the override only for capabilities (`:557` `...(modelOverride?.capabilities ?? [])`) while modalities come from
the resolved model/base (`:559` `modalities: unique(resolved.model.modalities)`), so an override cannot change
modalities. (Note `refresh.ts` has its own `readonly modalities?:` type at `:33` for the *snapshot/supplement*
shape - that is the input format, not the overrides schema.) Implication for `R4`: "overrides can express
`modalities`" requires a schema change in `index.ts` plus the build line at `:559`.

**Check 9 - what regenerates `normalized-catalog.json` and the ledger, and the exact command.**

Root `package.json` (worktree root, `D:\DEV\role-model\.worktrees\104-...`) script block:
- `:27` `"catalog:export": "corepack pnpm --filter @role-model-router/catalog exec tsx src/cli.ts"` - exports
  the normalized catalog (this is the only writer of `packages/catalog/data/normalized-catalog.json` as far as
  I read).
- `:26` `"catalog:refresh": "corepack pnpm --filter @role-model-router/catalog exec tsx src/refresh.ts"` -
  refreshes the snapshot/inputs from upstream.
The vendor ledger `packages/catalog/data/vendor-version-ledger.json` carries the same `vendor`/`commit`/
`capturedAt` triple as the catalog's `source` block, so it is written by the same flow - I did not locate the
exact write call inside the time box (see `## Unverified` item 3).

## Unverified

1. Upstream truth of `models.dev@67dcd8c9` (`models/deepseek/deepseek-v4.1-flash.toml` input
   `["text","image"]`; `deepseek-v4-flash` as deprecated alias) - I did not fetch upstream in this time box; the
   local evidence is that the pinned snapshot is `978733d4` and contains no `deepseek-v4.1-flash` entry.
2. Hop 5 of check 6 (normalized-catalog.json -> endpoint registry -> `candidate.declared.modalities`): I read
   the router consumer side (`router.ts:1436`) but did not trace the registry hydration code line by line.
3. The exact write site for `vendor-version-ledger.json` (check 9) - inferred from the identical source triple,
   not read.
4. The complete producer list for the rarer refusal codes (`replay_dispatch_offer_refused`,
   `replay_window_elapsed`, `replay_boundary_unavailable`, `replay_capture_idempotency_conflict`,
   `replay_evaluation_receipt_missing`, `replay_branch_append_unavailable`,
   `replay_job_not_ready_for_evaluation`, `replay_awaiting_evaluation_in_flight`, `replay_partial_trial_scores`)
   - the codes and their doc comments are quoted from `track-b-replay-policy.ts:12-117`, but I only verified
   producers for `benchmark_source_not_replayable`, `judge_candidate_overlap`, `judge_unresolved` and the
   twelve first codes; the queue-side producers of the remaining nine were not enumerated.
5. Whether `deepseek-v4-flash` is reachable through `difficulty.remote-only` today (the run-103 readback says
   the failures were on `deepseek-v4-pro`); I did not re-read the live config.

Receipt token: r104-as-replay-catalog-2P6N
Audit: PARTIAL-PASS (checks 1-9 answered with file:line evidence; checks marked in `## Unverified` not closed)
