import { createHash } from "node:crypto";

import { supportsCapabilityRequirement } from "@role-model-router/core";

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
   * Run 101 R4: `replay.dispatch` refused a capture the tick had already
   * admitted. The queue dedupes on `captureRef` and validates the payload, so
   * this is a defect signal rather than an admission decision; the capture stays
   * on the legacy path for that tick instead of being lost.
   */
  "replay_dispatch_offer_refused",
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
  /**
   * Run 101 (live, found by the R5 kill-recovery drill): the durable replay job is still `queued`
   * because one of its arms failed *retryably* and the job went back for another attempt, so the
   * handoff's `recordEvaluationReceipt` refuses it with `replay job is not awaiting evaluation`
   * (replay-core `index.mjs:1888`). The replay is not finished, not failing - the capture is simply
   * early. Deferrable, and named so the class stops arriving as `replay_failed`.
   */
  "replay_job_not_ready_for_evaluation",
  /**
   * Run 101 (live census 2026-09-28): the durable replay job has already handed its branches to
   * Evaluation Core, so a re-lease is refused (`extensions/replay-core/index.mjs:965`). That is work in
   * progress - the deferral budget already treats it as in-flight - but the refusal arrived as
   * `replay_failed`, which names nothing. Deferrable, and now countable.
   */
  "replay_awaiting_evaluation_in_flight",
  /**
   * Run 101 (live `req-752e67dd…` at 08:33:58Z): a trial carries some scores but not the whole batch, so
   * Evaluation Core refuses it with `partial evaluation trial scores require recovery`
   * (`extensions/evaluation-core/index.mjs:2943`). Deferrable, and named so it stops arriving as
   * `replay_failed`. Unlike the in-flight class it *does* spend deferral budget and retires named on
   * exhaustion, because whether the partial batch is recoverable is not established.
   */
  "replay_partial_trial_scores",
  /**
   * Run 104 R2: the capture's request cannot be served by any arm the configured pool can offer.
   * R1's eligibility rule rejects such arms individually (`MODALITY_UNSUPPORTED` / `CAPABILITY_MISSING`)
   * before dispatch; when every arm is rejected the capture used to arrive as the generic
   * `no_distinct_candidate_configured`, which is deferrable by definition, so it was re-planned on
   * every tick and the disposition plane could not count the class. The named class travels with the
   * blocking modality or capability and the endpoint ids that were rejected. Terminal when every
   * declared arm says it cannot serve the input (the pool can never change that); deferrable when a
   * capable arm merely is unavailable (unhealthy or excluded), because the pool can change.
   */
  "candidate_input_unsupported",
  /**
   * Run 105 R1/R8: the capture carries no (role, task) classification, so it can never be admitted
   * to the replay/eval queue. Scope-wide packs do not exist in stage 3, so there is no ladder for an
   * unclassified request to fill and no advisory it could be served - the class is TERMINAL (no
   * future tick can classify a capture that never recorded a classification) and is named here so
   * the disposition plane counts it instead of it arriving as a generic refusal.
   */
  "no_route_classification",
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

/**
 * Run 104 R1: the request requirements a replay arm must be able to serve.
 *
 * A replay arm may only be planned against an endpoint that could serve the capture's request, so the
 * filter has to know what the request needed. The capture's own recorded decision is the authority;
 * captures written before that field existed are read from their message/attachment content and the
 * value is marked `inferred` so the operator can tell a recorded fact from a derivation.
 */
export interface ReplayRequestRequirements {
  readonly requiredCapabilities: readonly string[];
  readonly requiredModalities: readonly string[];
  readonly source: "recorded" | "inferred";
}

/** The declaration pair the router's eligibility rule reads, keyed by endpoint. */
export interface ReplayCandidateEligibilityProfile {
  readonly endpointId: string;
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
}

/**
 * Run 104 R1: the router's two candidate-input exclusion codes, named with the endpoint that carries them.
 * The vocabulary is the router's own (`toCandidateExclusion`, `packages/core/src/router.ts`), not a
 * replay-local restatement, so an operator sees the same names on both paths.
 */
export type ReplayEligibilityRejectionCode = "MODALITY_UNSUPPORTED" | "CAPABILITY_MISSING";

export interface ReplayCandidateRejection {
  readonly endpointId: string;
  readonly code: ReplayEligibilityRejectionCode;
  readonly detail: string;
  /**
   * Run 104 R2: the blocking input this endpoint failed on. Carried by the rejection itself (the single
   * place that owns the eligibility rule) so a refusal can name the modality or capability without
   * re-deriving the rule at the call site.
   */
  readonly blockedModality?: string;
  readonly blockedCapability?: string;
}

/**
 * Run 104 R2: the named refusal for a capture no counterfactual arm can serve.
 * `outcome` is the disposition the caller must record: `refused` once when the declared pool can never
 * serve the input, `deferred` while a capable or still-undeclared arm may return.
 */
export interface ReplayCandidateShortfall {
  readonly code: "candidate_input_unsupported";
  readonly outcome: "refused" | "deferred";
  readonly blockedModality: string | null;
  readonly blockedCapability: string | null;
  readonly rejectedEndpointIds: readonly string[];
  readonly unavailableEndpointIds: readonly string[];
  readonly detail: string;
}

const REQUIREMENT_CONTAINER_KEYS = [
  "requestRequirements",
  "routingRequirements",
  "routingDecision",
  "decision",
  "requirements",
] as const;

const CAPABILITY_KEYS = ["requiredCapabilities", "required_capabilities"] as const;
const MODALITY_KEYS = ["requiredModalities", "required_modalities"] as const;

function readStringList(record: Record<string, unknown>, keys: readonly string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) continue;
    return [
      ...new Set(
        value
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim()),
      ),
    ];
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const CONTENT_MODALITY_TYPES: Readonly<Record<string, string>> = {
  image_url: "image",
  input_image: "image",
  image: "image",
  input_audio: "audio",
  audio: "audio",
  audio_url: "audio",
  video_url: "video",
  video: "video",
  file: "file",
  document: "file",
};

function modalityForMimeType(mimeType: string): string | null {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
  if (normalized === "application/pdf" || normalized === "application/x-pdf") return "pdf";
  return null;
}

/**
 * Run 104 R1 inference leg: read the non-text modalities a capture's own bytes demand. Conservative by
 * design - only a declared content type or attachment mime names a modality, so an ordinary transcript
 * infers `["text"]` and keeps today's behaviour byte-identical.
 */
function inferReplayRequiredModalities(capture: Record<string, unknown>): string[] {
  const found = new Set<string>();
  const messages = Array.isArray(capture.messages) ? capture.messages : [];
  for (const message of messages) {
    const record = asRecord(message);
    if (!record) continue;
    const content = Array.isArray(record.content) ? record.content : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      if (!partRecord) continue;
      const type = typeof partRecord.type === "string" ? partRecord.type.trim().toLowerCase() : "";
      const mapped = CONTENT_MODALITY_TYPES[type];
      if (mapped === "file") {
        const mime =
          (typeof partRecord.mimeType === "string" && partRecord.mimeType) ||
          (typeof partRecord.mime_type === "string" && partRecord.mime_type) ||
          (asRecord(partRecord.file)?.mime_type as string | undefined) ||
          "";
        const fromMime = typeof mime === "string" && mime ? modalityForMimeType(mime) : null;
        if (fromMime) found.add(fromMime);
        continue;
      }
      if (mapped) found.add(mapped);
    }
  }
  const attachments = Array.isArray(capture.attachments) ? capture.attachments : [];
  for (const attachment of attachments) {
    const record = asRecord(attachment);
    if (!record) continue;
    const mime = [
      record.mimeType,
      record.mime_type,
      record.contentType,
      record.content_type,
      record.type,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!mime) continue;
    const mapped = modalityForMimeType(mime);
    if (mapped) found.add(mapped);
  }
  return ["text", ...[...found].sort()];
}

/**
 * Run 104 R1: read the capture's request requirements. The recorded decision wins; only when no
 * container states modalities or capabilities does the reader fall back to content inference, and the
 * result then says so.
 */
export function readReplayRequestRequirements(
  capture: Record<string, unknown>,
): ReplayRequestRequirements {
  const containers: Record<string, unknown>[] = [capture];
  for (const key of REQUIREMENT_CONTAINER_KEYS) {
    const nested = asRecord(capture[key]);
    if (nested) containers.push(nested);
  }
  let requiredCapabilities: string[] | null = null;
  let requiredModalities: string[] | null = null;
  for (const container of containers) {
    requiredCapabilities ??= readStringList(container, CAPABILITY_KEYS);
    requiredModalities ??= readStringList(container, MODALITY_KEYS);
  }
  if (requiredCapabilities !== null || requiredModalities !== null) {
    return {
      requiredCapabilities: requiredCapabilities ?? [],
      requiredModalities: requiredModalities ?? ["text"],
      source: "recorded",
    };
  }
  return {
    requiredCapabilities: [],
    requiredModalities: inferReplayRequiredModalities(capture),
    source: "inferred",
  };
}

/**
 * Run 104 R1: the router's own candidate-input rule, applied to one endpoint declaration.
 *
 * The capability half calls the exported `supportsCapabilityRequirement` (no second table); the modality
 * half is the router's `MODALITY_UNSUPPORTED` comparison (every required modality must be declared).
 */
export function evaluateReplayCandidateEligibility(input: {
  readonly endpointId: string;
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
  readonly requirements: ReplayRequestRequirements;
}): ReplayCandidateRejection | null {
  const missingModality = input.requirements.requiredModalities.find(
    (modality) => !input.modalities.includes(modality),
  );
  if (missingModality !== undefined) {
    return {
      endpointId: input.endpointId,
      code: "MODALITY_UNSUPPORTED",
      detail: `Endpoint does not support required modality ${missingModality}.`,
      blockedModality: missingModality,
    };
  }
  const missingCapability = input.requirements.requiredCapabilities.find(
    (capability) => !supportsCapabilityRequirement(input.capabilities, capability),
  );
  if (missingCapability !== undefined) {
    return {
      endpointId: input.endpointId,
      code: "CAPABILITY_MISSING",
      detail: `Endpoint is missing required capability ${missingCapability}.`,
      blockedCapability: missingCapability,
    };
  }
  return null;
}

/**
 * Run 104 R2: name the shortfall when no counterfactual arm can serve the capture's input.
 *
 * Terminal (`refused`) only when the *declared* pool is exhausted: every endpoint that could have been
 * an arm carries a profile and every one of them fails the router's own eligibility rule. Deferrable
 * (`deferred`) when a capable endpoint exists but is unavailable (unhealthy or excluded), or when a
 * configured endpoint still declares nothing - in both cases the pool can change, and the old
 * deferral behaviour is kept. `null` when an arm can serve the capture, or when no endpoint declares
 * anything at all (the pre-existing filters own that case and behaviour is unchanged).
 */
export function classifyReplayCandidateShortfall(input: {
  readonly configuredEndpointIds: readonly string[];
  readonly requirements?: ReplayRequestRequirements;
  readonly endpointProfiles?: readonly ReplayCandidateEligibilityProfile[];
  readonly sourceEndpointId?: string | null;
  readonly excludedEndpointIds?: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
}): ReplayCandidateShortfall | null {
  if (!input.requirements) return null;
  const profiles = new Map(
    (input.endpointProfiles ?? [])
      .filter((profile) => profile.endpointId.trim().length > 0)
      .map((profile) => [profile.endpointId.trim(), profile] as const),
  );
  if (profiles.size === 0) return null;
  const excluded = new Set(
    (input.excludedEndpointIds ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  const healthy =
    input.healthyEndpointIds === undefined
      ? null
      : new Set(
          input.healthyEndpointIds.map((value) => value.trim()).filter((value) => value.length > 0),
        );
  const rejected: ReplayCandidateRejection[] = [];
  const unavailable: string[] = [];
  let undeclared = 0;
  const seen = new Set<string>();
  for (const endpointId of input.configuredEndpointIds) {
    const normalized = endpointId.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    // The source can never be its own counterfactual arm, so it is not part of the pool this answers for.
    if (input.sourceEndpointId !== undefined && input.sourceEndpointId !== null) {
      if (normalized === input.sourceEndpointId) continue;
    }
    const profile = profiles.get(normalized);
    if (!profile) {
      undeclared += 1;
      continue;
    }
    const rejection = evaluateReplayCandidateEligibility({
      endpointId: normalized,
      capabilities: profile.capabilities,
      modalities: profile.modalities,
      requirements: input.requirements,
    });
    if (rejection) {
      rejected.push(rejection);
      continue;
    }
    if (excluded.has(normalized) || (healthy !== null && !healthy.has(normalized))) {
      unavailable.push(normalized);
      continue;
    }
    // A counterfactual arm can serve the capture; there is no shortfall to name.
    return null;
  }
  if (rejected.length === 0 && unavailable.length === 0) return null;
  const blockedModality = rejected.find((row) => row.blockedModality)?.blockedModality ?? null;
  const blockedCapability =
    rejected.find((row) => row.blockedCapability)?.blockedCapability ?? null;
  const rejectedEndpointIds = rejected.map((row) => row.endpointId);
  if (unavailable.length > 0 || undeclared > 0) {
    const reasons: string[] = [];
    if (unavailable.length > 0) {
      reasons.push(`capable but unavailable: ${unavailable.join(", ")}`);
    }
    if (undeclared > 0) {
      reasons.push(`${undeclared} configured endpoint(s) declare no modalities or capabilities`);
    }
    return {
      code: "candidate_input_unsupported",
      outcome: "deferred",
      blockedModality,
      blockedCapability,
      rejectedEndpointIds,
      unavailableEndpointIds: unavailable,
      detail:
        `no eligible replay arm can serve the capture's input yet; ${reasons.join("; ")}`.slice(
          0,
          512,
        ),
    };
  }
  const blocked =
    blockedModality !== null
      ? `required modality ${blockedModality}`
      : blockedCapability !== null
        ? `required capability ${blockedCapability}`
        : "the capture's required input";
  return {
    code: "candidate_input_unsupported",
    outcome: "refused",
    blockedModality,
    blockedCapability,
    rejectedEndpointIds,
    unavailableEndpointIds: [],
    detail: `candidate input unsupported: ${blocked}; rejected endpoints: ${
      rejectedEndpointIds.join(", ") || "none declared"
    }`.slice(0, 512),
  };
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
  /**
   * Run 104 R1: the capture's request requirements and the configured endpoints' declarations. An
   * endpoint with no profile is left to the pre-existing filters (unchanged behaviour for callers that
   * carry no declarations yet).
   */
  readonly requirements?: ReplayRequestRequirements;
  readonly endpointProfiles?: readonly ReplayCandidateEligibilityProfile[];
  readonly onRejected?: (rejection: ReplayCandidateRejection) => void;
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
  const profiles = new Map(
    (input.endpointProfiles ?? [])
      .filter((profile) => profile.endpointId.trim().length > 0)
      .map((profile) => [profile.endpointId.trim(), profile] as const),
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
    /**
     * Run 104 R1: the router's own capability/modality rule decides whether this arm could serve the
     * capture's request. Rejected arms are handed to the caller so they are recorded rather than
     * silently dropped.
     */
    const profile = profiles.get(normalized);
    if (profile && input.requirements) {
      const rejection = evaluateReplayCandidateEligibility({
        endpointId: normalized,
        capabilities: profile.capabilities,
        modalities: profile.modalities,
        requirements: input.requirements,
      });
      if (rejection) {
        input.onRejected?.(rejection);
        continue;
      }
    }
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
  if (process.env.ROLE_MODEL_FOCUS_DIAG) {
    console.error(
      `[select-diag] cfg=${input.configuredEndpointIds.map((c) => c.split(".").pop()).join(",")} source=${(input.sourceEndpointId || "").split(".").pop() || null} reqMod=${JSON.stringify(input.requirements ? input.requirements.requiredModalities : null)} reqCap=${JSON.stringify(input.requirements ? input.requirements.requiredCapabilities : null)} profiles=${(
        input.endpointProfiles || []
      )
        .map(
          (p) =>
            `${p.endpointId.split(".").pop()}:mod[${(p.modalities || []).join(",")}]:cap[${(p.capabilities || []).join(",")}]`,
        )
        .join("|")} => selected=${selected.map((c) => c.split(".").pop()).join(",")}`,
    );
  }
  return selected;
}

/**
 * Run 104 R1 pre-dispatch guard: re-check the planned arms against the same rules immediately before
 * dispatch, so a configuration change between planning and dispatch cannot turn into a provider-bound
 * 400. The caller fails cheaply with the reasons recorded here.
 */
export function recheckReplayCandidatesForDispatch(input: {
  readonly endpointIds: readonly string[];
  readonly requirements?: ReplayRequestRequirements;
  readonly endpointProfiles?: readonly ReplayCandidateEligibilityProfile[];
}): readonly ReplayCandidateRejection[] {
  if (!input.requirements) return [];
  const profiles = new Map(
    (input.endpointProfiles ?? [])
      .filter((profile) => profile.endpointId.trim().length > 0)
      .map((profile) => [profile.endpointId.trim(), profile] as const),
  );
  const rejections: ReplayCandidateRejection[] = [];
  for (const endpointId of input.endpointIds) {
    const normalized = endpointId.trim();
    const profile = profiles.get(normalized);
    if (!profile) continue;
    const rejection = evaluateReplayCandidateEligibility({
      endpointId: normalized,
      capabilities: profile.capabilities,
      modalities: profile.modalities,
      requirements: input.requirements,
    });
    if (rejection) rejections.push(rejection);
  }
  return rejections;
}

/**
 * Run 104 R1 (on-demand planner): turn the caller's requested arms plus the selection pass's rejections into
 * the set the plan may actually dispatch.
 *
 * The durable tick already drops the rejected arms, keeps the rest and only defers when nothing survives; the
 * on-demand planner did not - it still built `candidatePackages` from the unfiltered requested list and threw
 * when *any* requested arm was ineligible, so an image capture against `[text-only, image]` either dispatched
 * the text-only arm or aborted the whole replay. This helper is the single source of that decision so both
 * callers share it.
 *
 * Semantics:
 * - the plan is the caller's requested order, trimmed and deduped, minus the selection rejections and minus the
 *   arms the pre-dispatch re-check rejects;
 * - an endpoint with no declared profile is never dropped (its eligibility is unknown, not false);
 * - rejections are deduped by endpoint id, selection first, so the pre-dispatch detail cannot overwrite what
 *   the selection pass already recorded.
 */
export function planReplayDispatchArms(input: {
  readonly requestedEndpointIds: readonly string[];
  /** Rejections collected by `selectReplayCandidates`' `onRejected` callback. */
  readonly selectionRejections: readonly ReplayCandidateRejection[];
  readonly requirements?: ReplayRequestRequirements;
  readonly endpointProfiles?: readonly ReplayCandidateEligibilityProfile[];
}): {
  readonly plannedEndpointIds: readonly string[];
  readonly rejections: readonly ReplayCandidateRejection[];
} {
  const requested: string[] = [];
  const seen = new Set<string>();
  for (const endpointId of input.requestedEndpointIds) {
    const normalized = endpointId.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    requested.push(normalized);
  }

  const rejections: ReplayCandidateRejection[] = [];
  const rejectedIds = new Set<string>();
  for (const rejection of input.selectionRejections) {
    const normalized = rejection.endpointId.trim();
    if (!normalized || rejectedIds.has(normalized)) continue;
    rejectedIds.add(normalized);
    rejections.push(rejection);
  }
  const stale = recheckReplayCandidatesForDispatch({
    endpointIds: requested.filter((endpointId) => !rejectedIds.has(endpointId)),
    ...(input.requirements ? { requirements: input.requirements } : {}),
    ...(input.endpointProfiles ? { endpointProfiles: input.endpointProfiles } : {}),
  });
  for (const rejection of stale) {
    const normalized = rejection.endpointId.trim();
    if (!normalized || rejectedIds.has(normalized)) continue;
    rejectedIds.add(normalized);
    rejections.push(rejection);
  }

  return {
    plannedEndpointIds: requested.filter((endpointId) => !rejectedIds.has(endpointId)),
    rejections,
  };
}

/**
 * Run 104 R9: how a replay arm's reasoning effort relates to the source capture's.
 *
 * `mismatched` means both sides declared an effort and they differ - the comparison confounds capability with
 * effort, so it must be recorded as a comparability dimension (and excluded from promotion evidence) rather
 * than silently treated as a capability result. The two `*_unspecified` values are not mismatches: one side
 * simply ran with the model's default, which is a fact worth publishing but not a confound to exclude on.
 */
export type ReplayArmEffortComparability =
  | "matched"
  | "mismatched"
  | "source_effort_unspecified"
  | "arm_effort_unspecified";

export interface ReplayArmEffortRecord {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceModelId: string;
  readonly reasoningEffort: string | null;
  readonly sourceReasoningEffort: string | null;
  readonly comparability: ReplayArmEffortComparability;
}

export interface ReplayArmDescriptor {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
}

function normalizeEffort(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Run 104 R9: the comparability record for every counterfactual arm in one comparison. Pure: the caller
 * attaches the records to the replay payload so the receipt can answer "were these arms effort-matched?".
 */
export function classifyReplayArmEffort(input: {
  readonly arms: readonly ReplayArmDescriptor[];
  readonly sourceModelId: string;
  readonly sourceReasoningEffort: string | null;
}): readonly ReplayArmEffortRecord[] {
  const sourceEffort = normalizeEffort(input.sourceReasoningEffort);
  return input.arms.map((arm) => {
    const armEffort = normalizeEffort(arm.reasoningEffort);
    const comparability: ReplayArmEffortComparability =
      sourceEffort === null
        ? "source_effort_unspecified"
        : armEffort === null
          ? "arm_effort_unspecified"
          : armEffort === sourceEffort
            ? "matched"
            : "mismatched";
    return {
      endpointId: arm.endpointId,
      modelId: arm.modelId,
      sourceModelId: input.sourceModelId,
      reasoningEffort: arm.reasoningEffort ?? null,
      sourceReasoningEffort: input.sourceReasoningEffort ?? null,
      comparability,
    };
  });
}

/**
 * Run 104 R9 matched-effort path: when the source ran at a declared effort and the arm's own model is
 * configured at that same effort under a different endpoint id, the arm is repointed to that variant. The
 * repoint never crosses models and never invents an endpoint - it only chooses among endpoints the registry
 * already holds for the arm's own model. An arm without a matching variant is kept exactly as requested; the
 * caller records the resulting comparability with `classifyReplayArmEffort`.
 *
 * Run 106 note: this repair is a same-model patch on a decision taken upstream, and it can only act when the
 * requested arm's model has an effort variant that is not the source endpoint. Where the arm's model IS the
 * source's model, that is impossible by construction, so the arm keeps the effort it was handed and the
 * comparison is finalized `arm_effort_mismatch` - which the learner's admission floor discards. The
 * selection layer (`route-ladder-dispatch.planFocusDispatch`) is the layer that owns the choice, and it is
 * where the effort view now lives; this function is left exactly as the run-104 contract states it.
 */
export function preferEffortMatchedReplayArms(input: {
  readonly arms: readonly ReplayArmDescriptor[];
  readonly configuredEndpoints: readonly ReplayArmDescriptor[];
  readonly sourceModelId: string;
  readonly sourceReasoningEffort: string | null;
  readonly sourceEndpointId?: string | null;
}): readonly ReplayArmDescriptor[] {
  const sourceEffort = normalizeEffort(input.sourceReasoningEffort);
  if (sourceEffort === null) return input.arms;
  const sourceEndpointId =
    typeof input.sourceEndpointId === "string" ? input.sourceEndpointId.trim() : "";
  return input.arms.map((arm) => {
    if (normalizeEffort(arm.reasoningEffort) === sourceEffort) return arm;
    const variant = input.configuredEndpoints.find(
      (endpoint) =>
        endpoint.modelId === arm.modelId &&
        normalizeEffort(endpoint.reasoningEffort) === sourceEffort &&
        // Run 105 bug 3: the effort-matched sibling must not be the source endpoint itself, or the
        // counterfactual collapses back onto the source and the distinct-source gate rejects it.
        (sourceEndpointId === "" || endpoint.endpointId !== sourceEndpointId),
    );
    return variant ?? arm;
  });
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
