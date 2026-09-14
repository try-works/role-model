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
  readonly policyIdsResolvable: boolean;
  readonly dependenciesAvailable: boolean;
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

export function selectReplayCandidates(input: {
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly sourceEndpointId?: string | null;
  readonly cap?: number;
}): readonly string[] {
  const cap = input.cap ?? DEFAULT_REPLAY_CANDIDATE_CAP;
  if (!Number.isSafeInteger(cap) || cap < 1) return [];
  const healthy =
    input.healthyEndpointIds === undefined
      ? null
      : new Set(input.healthyEndpointIds.filter((value) => value.trim().length > 0));
  const selected: string[] = [];
  const seen = new Set<string>();
  for (const endpointId of input.configuredEndpointIds) {
    const normalized = endpointId.trim();
    if (!normalized || seen.has(normalized)) continue;
    if (input.sourceEndpointId !== undefined && input.sourceEndpointId !== null) {
      if (normalized === input.sourceEndpointId) continue;
    }
    if (healthy && !healthy.has(normalized)) continue;
    seen.add(normalized);
    selected.push(normalized);
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
