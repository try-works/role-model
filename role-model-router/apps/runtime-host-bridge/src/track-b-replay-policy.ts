import { createHash } from "node:crypto";

/**
 * Run 97 replay policy surface.
 *
 * Admission, candidate selection, tool semantics, and the governed policy set are
 * enumerated here so the replay path has no hidden capability, tool, task, role,
 * model, endpoint, or transcript precondition. Every refusal is one of the codes
 * below and names the blocking input.
 */

export const REPLAY_REFUSAL_CODES = [
  "replay_disabled_channel",
  "capture_unavailable",
  "scope_denied",
  "authorization_revoked",
  "retention_expired",
  "privacy_denied",
  "no_distinct_candidate_configured",
  "budget_exhausted",
  "duplicate_already_processed",
  "amplification_depth_exceeded",
  "policy_unknown",
  "dependency_unavailable",
  /**
   * Run 98 R2: the capture's durable replay job already failed terminally (timed_out,
   * expired, failed, cancelled), so its frozen window can never dispatch again. The
   * capture is retired instead of being re-deferred on every tick forever.
   */
  "replay_window_elapsed",
  /**
   * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01` (operator instruction
   * 2026-09-22: "benchmark traffic should never become considered for replay and evaluation, it must
   * always be excluded from replay and evals"). A benchmark run measures routing and answer quality
   * with its own pinned candidates and its own store; it is never a source of counterfactual replay
   * evidence. Terminal by design, so it is refused once and never re-queued.
   */
  "benchmark_source_not_replayable",
  /**
   * Run 100 addendum 16 item 3 / 8a: the capture's own durable evidence says its recorded reply is the
   * marker its instruction demanded ("Reply with exactly: ok", the alias and agent-path smoke probes).
   * Every arm that follows the instruction answers the same token, so a battle over it can only end as
   * a `single_outcome` tie - measured live: 31 of the newest 60 admissions (52%) were that class and 11
   * of the newest 16 finalized comparisons were the ties they produce. Terminal by design: the capture
   * cannot become discriminating evidence, so it is refused once and never re-queued or re-paid for.
   * The class travels on the capture (`replayEvidenceClass`, written with the root artifact) rather
   * than being inferred here from prompt size.
   */
  "synthetic_probe_not_replayable",
  /**
   * Run 98 addendum 56 §6: the capture's own endpoint is the endpoint that judges comparisons, so a battle would
   * have the judge score itself (the `judge_candidate_overlap` protection of addenda 30/33). Deferrable, because
   * the operator can change the controller; named, so the class is countable instead of arriving as `replay_failed`.
   */
  "judge_candidate_overlap",
  /**
   * Run 108: the configured judge could not be resolved for this capture (the controller-assignment read is
   * per capture, and its failure is silent: `resolveControllerJudge` answers `""`). Without the judge the arm
   * planner cannot exclude it, and the strongest alternative arm is planned - then judged by the controller
   * itself. Measured live: 45 of the newest 300 comparison groups carry `judge_self_evaluation`, and in the
   * newest 400 measured cases 142 of 144 have the judge as the counterfactual arm, interleaved with clean ones.
   * Deferrable: the assignment read usually succeeds on the next tick, and a capture is cheaper than a
   * comparison whose judge is one of its own arms.
   */
  "judge_unresolved",
  /**
   * Run 100 addendum 16 item 8a (live census 2026-09-25): the private Track B boundary was between
   * restarts, so the capture was skipped and is retryable — but the class arrived as `replay_failed`,
   * which names nothing and cannot be counted. Deferrable by design; the wait is now visible.
   */
  "replay_boundary_unavailable",
  /**
   * Run 100 addendum 16 item 8a: the boundary refuses the same capture idempotency key carrying different
   * immutable bytes. That is deterministic by construction (24 refused / 3 deferred lifetime), so it is
   * terminal on the first observation instead of spending the deferral budget and landing in
   * `replay_failed` wearing a code that says nothing.
   */
  "replay_capture_idempotency_conflict",
  /**
   * Run 100 addendum 24 §3 (census): two more live classes, named so they stop arriving as `replay_failed`.
   * Both are recoverable rather than terminal — a job in `awaiting_evaluation` with no evaluation id is exactly
   * what `isRecoverableHandoff` rebuilds from durable evidence, and a paid-for branch with no host dispatch
   * receipt is rebuilt from the dispatch's persisted `providerResultRef` — so both stay deferrable.
   */
  "replay_evaluation_receipt_missing",
  "replay_branch_append_unavailable",
] as const;

export type ReplayRefusalCode = (typeof REPLAY_REFUSAL_CODES)[number];

export interface ReplayAdmissionInput {
  readonly channelReplayEnabled: boolean;
  readonly captureAvailable: boolean;
  readonly scopeAuthorized: boolean;
  readonly authorizationEpochValid: boolean;
  readonly retentionReplayable: boolean;
  readonly privacyReplayable: boolean;
  readonly distinctCandidateCount: number;
  readonly budgetAvailable: boolean;
  readonly alreadyProcessed: boolean;
  readonly sourceIsReplayProduced: boolean;
  /**
   * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01`: the capture's request is
   * benchmark-originated, so it may never become replay or evaluation input.
   */
  readonly sourceIsBenchmark: boolean;
  /**
   * Run 100 addendum 16 item 3 / 8a: the capture carries the non-discriminating class its own durable
   * evidence proved (see `synthetic_probe_not_replayable`). Optional, so a caller that has no capture
   * class to state keeps its behaviour.
   */
  readonly sourceIsSyntheticProbe?: boolean;
  readonly policyIdsResolvable: boolean;
  readonly dependenciesAvailable: boolean;
  /**
   * Run 108: `false` when the caller plans arms and could not resolve the configured judge, so the exclusion
   * that keeps the judge out of its own comparison is unavailable. Omit it where the caller does not plan arms
   * (the automatic tick's pre-filter), which is why it is optional and defaults to "resolved".
   */
  readonly judgeResolved?: boolean;
}

export type ReplayAdmissionDecision =
  | Readonly<{ admitted: true }>
  | Readonly<{ admitted: false; code: ReplayRefusalCode; detail: string }>;

function refuse(code: ReplayRefusalCode, detail: string): ReplayAdmissionDecision {
  return { admitted: false, code, detail };
}

export function decideReplayAdmission(input: ReplayAdmissionInput): ReplayAdmissionDecision {
  if (!input.channelReplayEnabled) {
    return refuse("replay_disabled_channel", "replay is not enabled for this channel");
  }
  if (!input.captureAvailable) {
    return refuse("capture_unavailable", "no durable capture is available for this request");
  }
  if (!input.scopeAuthorized) {
    return refuse("scope_denied", "the requesting scope is not authorized for replay");
  }
  if (!input.authorizationEpochValid) {
    return refuse("authorization_revoked", "the replay authorization epoch is not current");
  }
  if (!input.retentionReplayable) {
    return refuse("retention_expired", "the captured material is no longer retained for replay");
  }
  if (!input.privacyReplayable) {
    return refuse("privacy_denied", "the capture classification does not permit replay");
  }
  /**
   * Checked before candidate selection and budget, because it is a property of the source rather than
   * of the work: a benchmark capture must not even reserve capacity.
   */
  if (input.sourceIsBenchmark) {
    return refuse(
      "benchmark_source_not_replayable",
      "benchmark traffic is never a replay or evaluation source",
    );
  }
  /**
   * Run 100 addendum 16 item 3 / 8a: checked with the benchmark rule and before candidate selection or
   * budget, because it is a property of the capture rather than of the work: a comparison over a reply
   * that is the marker the instruction demanded cannot discriminate two candidates, so it must not
   * reserve capacity, dispatch arms or reach evaluation at all.
   */
  if (input.sourceIsSyntheticProbe === true) {
    return refuse(
      "synthetic_probe_not_replayable",
      "the recorded reply is the marker the instruction demanded, so no battle over it can discriminate two candidates",
    );
  }
  /**
   * Run 108: checked before the arms are planned, because an unresolvable judge means the exclusion that keeps
   * the judge out of its own comparison is missing - and a comparison the judge is an arm of is ineligible
   * promotion evidence (`guidance/11`), so it would be paid for and then discarded.
   */
  if (input.judgeResolved === false) {
    return refuse(
      "judge_unresolved",
      "the configured judge could not be resolved, so the arms cannot exclude it",
    );
  }
  if (!Number.isSafeInteger(input.distinctCandidateCount) || input.distinctCandidateCount < 1) {
    return refuse(
      "no_distinct_candidate_configured",
      "no configured candidate differs from the source candidate",
    );
  }
  if (input.alreadyProcessed) {
    return refuse(
      "duplicate_already_processed",
      "this capture already has a terminal replay in the current budget window",
    );
  }
  if (!input.budgetAvailable) {
    return refuse("budget_exhausted", "the replay budget window has no remaining capacity");
  }
  if (input.sourceIsReplayProduced) {
    return refuse("amplification_depth_exceeded", "replay output is not a replay source");
  }
  if (!input.policyIdsResolvable) {
    return refuse("policy_unknown", "a required replay policy id does not resolve");
  }
  if (!input.dependenciesAvailable) {
    return refuse("dependency_unavailable", "a required replay dependency is unavailable");
  }
  return { admitted: true };
}

export const DEFAULT_REPLAY_CANDIDATE_CAP = 3;

/**
 * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01`: the benchmark harness is
 * the only writer of these request-id shapes (`bench-<case>-<endpoint>-turnN-<uuid>`,
 * `bench-judge-…`, `bench-judge-compare-…`, `bench-<runId>-…`), and the runtime prefixes its own
 * synthetic ids with `req-`, `replay-` or `replay-judge-`. The predicate is deliberately a prefix test
 * on the capture ref the queue already carries, so the rule is enforced at the boundary rather than
 * inferred from a payload field a future caller could omit.
 */
export function isBenchmarkReplaySourceRef(requestRef: unknown): boolean {
  return typeof requestRef === "string" && /^bench[-_]/u.test(requestRef.trim());
}

/**
 * Run 100 addendum 16 item 3 / 8a: the class a capture carries when its own durable evidence says the
 * recorded reply is the marker its instruction demanded. The private producer writes it with the
 * capture root (`replayEvidenceClass.class`), the pending projection forwards it as `sourceClass`, and
 * the admission decision reads it here - one name, three boundaries, no re-derivation.
 */
export const SYNTHETIC_PROBE_SOURCE_CLASS = "marker_echo_probe";

export function isSyntheticProbeSourceClass(value: unknown): boolean {
  // Exact: the class is a name this runtime writes, not free text. A caller that carries the name with
  // padding is not stating the class, and the boundary that reads the projection trims before asking.
  return value === SYNTHETIC_PROBE_SOURCE_CLASS;
}

/**
 * Run 100 phase-5 repair (operator instruction 2026-09-21: "the daily dispatch ceiling is only for the
 * production release, not for dev or stage, disregard it").
 *
 * The daily counterfactual/dispatch ceiling is a production delivery guard. On dev and stage the loop
 * must keep gathering evidence, so the ceiling is measured and receipted but must not refuse work.
 * The value is versioned configuration (`replayBudgetEnforcement`), resolved by the host and handed to
 * the ledger; this helper is the single place that turns it plus the runtime channel into a boolean.
 */
export type ReplayBudgetEnforcement = "production_only" | "always" | "never";

export const REPLAY_BUDGET_ENFORCEMENT_VALUES: readonly ReplayBudgetEnforcement[] = Object.freeze([
  "production_only",
  "always",
  "never",
]);

export function replayBudgetEnforcedForChannel(
  value: ReplayBudgetEnforcement | string | undefined,
  channel: string | undefined,
): boolean {
  if (value === "always") return true;
  if (value === "never") return false;
  // `production_only` is the shipped default: every other channel (stage, development, an unknown
  // channel) keeps gathering evidence.
  return (channel ?? "").trim().toLowerCase() === "production";
}

export function selectReplayCandidates(input: {
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly sourceEndpointId?: string | null;
  /**
   * Run 98 addendum 30 S2 (`guidance/11` `judgePolicy.excludeFromLiveEvaluation`): endpoints that may
   * never be *scored* candidates — in practice the designated judge. A battle must not contain the
   * endpoint that judges it: live data showed the judge judging itself in 861 of 863 battles, with the
   * deterministic and judge dimensions inverting for it.
   */
  readonly excludedEndpointIds?: readonly string[];
  /**
   * Run 98 addendum 33 S3 (the research §3: "rotate which candidate serves as the reference across prompts
   * so the graph becomes connected"): a stable per-capture key. When present, the eligible candidates are
   * ordered by a digest of the key, so successive captures explore different counterfactuals instead of
   * every capture comparing the same two candidates (the live store's 465-of-465 star).
   */
  readonly rotationKey?: string | null;
  readonly cap?: number;
}): readonly string[] {
  const cap = input.cap ?? DEFAULT_REPLAY_CANDIDATE_CAP;
  if (!Number.isSafeInteger(cap) || cap < 1) return [];
  const healthy =
    input.healthyEndpointIds === undefined
      ? null
      : new Set(input.healthyEndpointIds.filter((value) => value.trim().length > 0));
  const excluded = new Set(
    (input.excludedEndpointIds ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  const selected: string[] = [];
  const seen = new Set<string>();
  const eligible: string[] = [];
  for (const endpointId of input.configuredEndpointIds) {
    const normalized = endpointId.trim();
    if (!normalized || seen.has(normalized)) continue;
    if (excluded.has(normalized)) continue;
    if (input.sourceEndpointId !== undefined && input.sourceEndpointId !== null) {
      if (normalized === input.sourceEndpointId) continue;
    }
    if (healthy && !healthy.has(normalized)) continue;
    seen.add(normalized);
    eligible.push(normalized);
  }
  const rotationKey = typeof input.rotationKey === "string" ? input.rotationKey.trim() : "";
  const ordered = rotationKey
    ? [...eligible].sort((left, right) => {
        const leftDigest = createHash("sha256").update(`${rotationKey}\n${left}`).digest("hex");
        const rightDigest = createHash("sha256").update(`${rotationKey}\n${right}`).digest("hex");
        return leftDigest === rightDigest
          ? left.localeCompare(right)
          : leftDigest.localeCompare(rightDigest);
      })
    : eligible;
  for (const endpointId of ordered) {
    selected.push(endpointId);
    if (selected.length === cap) break;
  }
  return selected;
}

export type ReplayToolPolicy = "recorded_results_only" | "sandboxed_allowlist";

/**
 * Detect whether a durable route capture already carries recorded tool content.
 * The operations projection names the tool call/result artifacts `toolArtifactIds`;
 * older captures may use `toolResultArtifactIds`. Reuse is preferred whenever any
 * recorded tool artifact exists so replay does not re-execute tools needlessly.
 */
export function hasRecordedToolResults(capture: Record<string, unknown>): boolean {
  for (const field of ["toolArtifactIds", "toolResultArtifactIds", "toolCallArtifactIds"]) {
    const value = capture[field];
    if (
      Array.isArray(value) &&
      value.some((item) => typeof item === "string" && item.trim().length > 0)
    ) {
      return true;
    }
  }
  return false;
}

/** Detect tool calls or tool content anywhere in the durable capture. */
export function hasToolCalls(capture: Record<string, unknown>): boolean {
  if (hasRecordedToolResults(capture)) return true;
  const messages = Array.isArray(capture.messages) ? capture.messages : [];
  for (const message of messages) {
    if (!message || typeof message !== "object" || Array.isArray(message)) continue;
    const record = message as Record<string, unknown>;
    if (
      record.role === "tool" ||
      record.tool_calls !== undefined ||
      record.toolCalls !== undefined
    ) {
      return true;
    }
  }
  return false;
}

export function resolveReplayToolPolicy(input: {
  readonly hasRecordedToolResults: boolean;
  /** True when the capture actually contains tool calls or tool content. */
  readonly hasToolCalls?: boolean;
  readonly policyAllowsExecution?: boolean;
  /**
   * The replay IPC prohibits caller-supplied filesystem paths, so a caller cannot
   * ship a sandbox allowlist. Execution therefore requires a worker-side sandbox
   * policy; until one is configured the caller stays on recorded results only, which
   * still replays tool-bearing captures by reusing what the capture recorded.
   */
  readonly workerSandboxAvailable?: boolean;
}): Readonly<{ toolPolicy: ReplayToolPolicy; reason: string }> {
  // A capture with no tool content needs neither reuse nor execution, so it stays on
  // the reuse policy; execution only becomes relevant when tool calls exist without
  // recorded results to satisfy them.
  if (
    input.hasRecordedToolResults ||
    input.hasToolCalls === false ||
    input.workerSandboxAvailable !== true
  ) {
    return {
      toolPolicy: "recorded_results_only",
      reason: input.hasRecordedToolResults
        ? "recorded_tool_results_available"
        : input.hasToolCalls === false
          ? "capture_contains_no_tool_calls"
          : "recorded_results_only_until_worker_sandbox_configured",
    };
  }
  return {
    toolPolicy: "sandboxed_allowlist",
    reason: "live_tool_execution_required",
  };
}

/** A bounded, read-only sandbox for captures whose tool calls need execution. */
export function defaultReplaySandbox(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    executableAllowlist: ["/usr/bin/true"],
    sideEffectClass: "read_only",
    network: "none",
    filesystem: "none",
    maxBytes: 1_048_576,
    maxDurationMs: 30_000,
  });
}

export const REPLAY_POLICY_SET_VERSION = "run97.replay-policy-set.v1";

export type ReplayPolicyKey = "trigger" | "tool" | "candidateSelection" | "budget" | "scorerSet";

export const REPLAY_POLICY_IDS: Readonly<Record<ReplayPolicyKey, string>> = Object.freeze({
  trigger: "replay.trigger.all-requests.v1",
  tool: "replay.tool.reuse-first.v1",
  candidateSelection: "replay.candidates.configured-set.v1",
  budget: "replay.budget.daily.v1",
  scorerSet: "replay.scorers.routing-shadow.v1",
});

export const REPLAY_POLICY_REGISTRY_SCHEMA = "run97.replay-policy-registry.v1";

export interface ReplayPolicyRegistryEntry {
  readonly policyId: string;
  /** Version literals this runtime can resolve; a list enables N/N-1 readers. */
  readonly supportedVersions: readonly string[];
}

export interface ReplayPolicyRegistry {
  readonly schemaVersion: string;
  readonly entries: readonly ReplayPolicyRegistryEntry[];
}

export type ReplayPolicyResolution =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; code: "policy_unknown"; detail: string }>;

export function buildReplayPolicyRegistry(input?: {
  readonly policyVersions?: Partial<Record<ReplayPolicyKey, string>>;
}): ReplayPolicyRegistry {
  const versions = input?.policyVersions ?? {};
  const entries = (Object.keys(REPLAY_POLICY_IDS) as ReplayPolicyKey[]).map((key) => ({
    policyId: REPLAY_POLICY_IDS[key],
    supportedVersions: [versions[key] ?? "1"],
  }));
  return { schemaVersion: REPLAY_POLICY_REGISTRY_SCHEMA, entries };
}

export function withAdditionalReplayPolicy(
  registry: ReplayPolicyRegistry,
  entry: ReplayPolicyRegistryEntry,
): ReplayPolicyRegistry {
  return {
    schemaVersion: registry.schemaVersion,
    entries: [
      ...registry.entries.filter((existing) => existing.policyId !== entry.policyId),
      { policyId: entry.policyId, supportedVersions: [...entry.supportedVersions] },
    ],
  };
}

export function resolveReplayPolicySet(
  set: ReplayPolicySet,
  registry: ReplayPolicyRegistry = buildReplayPolicyRegistry(),
): ReplayPolicyResolution {
  for (const record of [set.trigger, set.tool, set.candidateSelection, set.budget, set.scorerSet]) {
    const entry = registry.entries.find((candidate) => candidate.policyId === record.policyId);
    if (!entry || !entry.supportedVersions.includes(record.policyVersion)) {
      return {
        ok: false,
        code: "policy_unknown",
        detail: `unresolved replay policy ${record.policyId}#${record.policyVersion}`,
      };
    }
  }
  return { ok: true };
}

export interface ReplayPolicyRecord {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly policyDigest: string;
}

export interface ReplayPolicySet {
  readonly policySetId: string;
  readonly policySetVersion: string;
  readonly policySetDigest: string;
  readonly trigger: ReplayPolicyRecord;
  readonly tool: ReplayPolicyRecord;
  readonly candidateSelection: ReplayPolicyRecord;
  readonly budget: ReplayPolicyRecord;
  readonly scorerSet: ReplayPolicyRecord;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function policyRecord(policyId: string, policyVersion: string, body: unknown): ReplayPolicyRecord {
  return { policyId, policyVersion, policyDigest: digest(body) };
}

export function buildReplayPolicySet(input?: {
  readonly candidateCap?: number;
  readonly counterfactualsPerDay?: number;
  readonly dispatchesPerDay?: number;
  readonly policyVersions?: Partial<Record<ReplayPolicyKey, string>>;
}): ReplayPolicySet {
  const candidateCap = input?.candidateCap ?? DEFAULT_REPLAY_CANDIDATE_CAP;
  const counterfactualsPerDay = input?.counterfactualsPerDay ?? 100;
  const dispatchesPerDay = input?.dispatchesPerDay ?? 300;
  const versions = input?.policyVersions ?? {};
  const trigger = policyRecord(REPLAY_POLICY_IDS.trigger, versions.trigger ?? "1", {
    mode: "automatic-and-on-demand",
    ordering: "triage-priority-then-capture-age",
  });
  const tool = policyRecord(REPLAY_POLICY_IDS.tool, versions.tool ?? "1", {
    default: "recorded_results_only",
    fallback: "sandboxed_allowlist",
  });
  const candidateSelection = policyRecord(
    REPLAY_POLICY_IDS.candidateSelection,
    versions.candidateSelection ?? "1",
    {
      source: "configured-healthy-endpoints",
      excludeSourceCandidate: true,
      cap: candidateCap,
    },
  );
  const budget = policyRecord(REPLAY_POLICY_IDS.budget, versions.budget ?? "1", {
    counterfactualsPerDay,
    dispatchesPerDay,
    countsDerivedDispatches: true,
  });
  const scorerSet = policyRecord(REPLAY_POLICY_IDS.scorerSet, versions.scorerSet ?? "1", {
    scorerSet: "run96-routing-shadow",
  });
  const body = { trigger, tool, candidateSelection, budget, scorerSet };
  return {
    policySetId: "run97.replay-policy-set",
    policySetVersion: REPLAY_POLICY_SET_VERSION,
    policySetDigest: digest(body),
    ...body,
  };
}
