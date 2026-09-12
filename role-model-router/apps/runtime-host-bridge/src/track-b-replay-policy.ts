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
  if (!input.budgetAvailable) {
    return refuse("budget_exhausted", "the replay budget window has no remaining capacity");
  }
  if (input.alreadyProcessed) {
    return refuse(
      "duplicate_already_processed",
      "this capture already has a terminal replay in the current budget window",
    );
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

export function resolveReplayToolPolicy(input: {
  readonly hasRecordedToolResults: boolean;
  readonly policyAllowsExecution?: boolean;
}): Readonly<{ toolPolicy: ReplayToolPolicy; reason: string }> {
  if (input.hasRecordedToolResults) {
    return {
      toolPolicy: "recorded_results_only",
      reason: "recorded_tool_results_available",
    };
  }
  return {
    toolPolicy: "sandboxed_allowlist",
    reason: "live_tool_execution_required",
  };
}

export const REPLAY_POLICY_SET_VERSION = "run97.replay-policy-set.v1";

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
}): ReplayPolicySet {
  const candidateCap = input?.candidateCap ?? DEFAULT_REPLAY_CANDIDATE_CAP;
  const counterfactualsPerDay = input?.counterfactualsPerDay ?? 100;
  const dispatchesPerDay = input?.dispatchesPerDay ?? 300;
  const trigger = policyRecord("replay.trigger.all-requests.v1", "1", {
    mode: "automatic-and-on-demand",
    ordering: "triage-priority-then-capture-age",
  });
  const tool = policyRecord("replay.tool.reuse-first.v1", "1", {
    default: "recorded_results_only",
    fallback: "sandboxed_allowlist",
  });
  const candidateSelection = policyRecord("replay.candidates.configured-set.v1", "1", {
    source: "configured-healthy-endpoints",
    excludeSourceCandidate: true,
    cap: candidateCap,
  });
  const budget = policyRecord("replay.budget.daily.v1", "1", {
    counterfactualsPerDay,
    dispatchesPerDay,
    countsDerivedDispatches: true,
  });
  const scorerSet = policyRecord("replay.scorers.routing-shadow.v1", "1", {
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
