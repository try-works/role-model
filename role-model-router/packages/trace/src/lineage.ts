import { createHash } from "node:crypto";

export const LIVE_TRACE_SCHEMA_VERSION = "run91-live-pi-trace.v1" as const;

export const LIVE_TRACE_STAGES = [
  "router_ingress",
  "routing_attempt",
  "upstream_execution",
  "runtime_observation",
  "message_graph",
  "contribution",
  "crowdsourcing",
  "recommendation",
] as const;

export type TraceLineageStageName = (typeof LIVE_TRACE_STAGES)[number];
export type TraceLineageDisposition =
  | "recorded"
  | "emitted"
  | "consumed"
  | "not_eligible"
  | "failed";
export type TraceLineageEffortSource = "none" | "client" | "variant" | "variant_coerced";

export interface TraceLineageStageReceipt {
  readonly stage_id: string;
  readonly stage: TraceLineageStageName;
  readonly request_id: string;
  readonly routing_decision_id: string;
  readonly endpoint_id: string;
  readonly model_id: string;
  readonly reasoning_effort: string | null;
  readonly effort_source: TraceLineageEffortSource;
  readonly receipt_id: string;
  readonly disposition: TraceLineageDisposition;
  readonly predecessor_stage_id?: string;
  readonly policy_receipt?: string;
  readonly artifact_hash?: string;
  /** Immutable causal event identity; never substitutes for the content id. */
  readonly occurrence_id?: string;
  /** Content-addressed payload identity, which may be shared by occurrences. */
  readonly content_id?: string;
  readonly predecessor_occurrence_id?: string;
  readonly pending_intent?: boolean;
  readonly source_ids?: readonly string[];
}

export interface TraceLineageManifestInput {
  readonly schema_version?: typeof LIVE_TRACE_SCHEMA_VERSION;
  readonly client_request_id?: string;
  readonly request_id: string;
  readonly routing_decision_id: string;
  readonly endpoint_id: string;
  readonly model_id: string;
  readonly reasoning_effort: string | null;
  readonly effort_source: TraceLineageEffortSource;
  readonly source_set: readonly string[];
  readonly stages: readonly TraceLineageStageReceipt[];
}

export interface TraceLineageManifest extends Omit<TraceLineageManifestInput, "schema_version"> {
  readonly schema_version: typeof LIVE_TRACE_SCHEMA_VERSION;
  readonly source_set_digest: string;
}

function assertOpaqueId(name: string, value: string): void {
  const hasControlCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (!value || value.length > 256 || hasControlCharacter) {
    throw new Error(`${name} must be a non-empty bounded opaque id.`);
  }
}

function assertEffort(
  reasoningEffort: string | null,
  effortSource: TraceLineageEffortSource,
): void {
  if (reasoningEffort !== null && !reasoningEffort) {
    throw new Error("reasoning_effort must be null or a non-empty value.");
  }
  if (reasoningEffort === null && effortSource !== "none") {
    throw new Error("effort_source must be none when reasoning_effort is null.");
  }
  if (reasoningEffort !== null && effortSource === "none") {
    throw new Error("effort_source is required for an efforted request.");
  }
}

function sourceSetDigest(sourceSet: readonly string[]): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify([...sourceSet].sort()))
    .digest("hex")}`;
}

function validateStage(
  stage: TraceLineageStageReceipt,
  manifest: TraceLineageManifestInput,
  expectedPredecessor?: string,
): void {
  assertOpaqueId("stage_id", stage.stage_id);
  assertOpaqueId("receipt_id", stage.receipt_id);
  assertOpaqueId("request_id", stage.request_id);
  assertOpaqueId("routing_decision_id", stage.routing_decision_id);
  assertOpaqueId("endpoint_id", stage.endpoint_id);
  assertOpaqueId("model_id", stage.model_id);
  if (stage.request_id !== manifest.request_id) {
    throw new Error(`Trace stage ${stage.stage_id} request_id does not match manifest.`);
  }
  if (stage.routing_decision_id !== manifest.routing_decision_id) {
    throw new Error(`Trace stage ${stage.stage_id} routing_decision_id does not match manifest.`);
  }
  if (stage.endpoint_id !== manifest.endpoint_id) {
    throw new Error(`Trace stage ${stage.stage_id} endpoint_id does not match manifest.`);
  }
  if (stage.model_id !== manifest.model_id) {
    throw new Error(`Trace stage ${stage.stage_id} model_id does not match manifest.`);
  }
  if (stage.reasoning_effort !== manifest.reasoning_effort) {
    throw new Error(`Trace stage ${stage.stage_id} reasoning_effort does not match manifest.`);
  }
  if (stage.effort_source !== manifest.effort_source) {
    throw new Error(`Trace stage ${stage.stage_id} effort_source does not match manifest.`);
  }
  if (stage.pending_intent || (stage.disposition as string) === "pending") {
    throw new Error(`Trace stage ${stage.stage_id} has a pending intent and cannot be terminal.`);
  }
  if (stage.disposition === "not_eligible" && !stage.policy_receipt) {
    throw new Error(`Trace stage ${stage.stage_id} not_eligible requires a policy receipt.`);
  }
  if (
    stage.stage === "message_graph" &&
    ["recorded", "emitted", "consumed"].includes(stage.disposition) &&
    !stage.artifact_hash
  ) {
    throw new Error(`Trace stage ${stage.stage_id} message_graph requires an artifact hash.`);
  }
  if (
    stage.stage === "message_graph" &&
    ["recorded", "emitted", "consumed"].includes(stage.disposition)
  ) {
    if (!stage.occurrence_id)
      throw new Error(`Trace stage ${stage.stage_id} message_graph requires occurrence_id.`);
    if (!stage.content_id)
      throw new Error(`Trace stage ${stage.stage_id} message_graph requires content_id.`);
    assertOpaqueId("occurrence_id", stage.occurrence_id);
    assertOpaqueId("content_id", stage.content_id);
    if (stage.predecessor_occurrence_id !== undefined)
      assertOpaqueId("predecessor_occurrence_id", stage.predecessor_occurrence_id);
  }
  if (expectedPredecessor !== undefined && stage.predecessor_stage_id !== expectedPredecessor) {
    throw new Error(`Trace stage ${stage.stage_id} predecessor does not match stage order.`);
  }
}

export function validateTraceLineageManifest(manifest: TraceLineageManifest): void {
  if (manifest.schema_version !== LIVE_TRACE_SCHEMA_VERSION) {
    throw new Error(`Unsupported trace lineage schema ${manifest.schema_version}.`);
  }
  assertOpaqueId("request_id", manifest.request_id);
  assertOpaqueId("routing_decision_id", manifest.routing_decision_id);
  assertOpaqueId("endpoint_id", manifest.endpoint_id);
  assertOpaqueId("model_id", manifest.model_id);
  if (manifest.client_request_id !== undefined) {
    assertOpaqueId("client_request_id", manifest.client_request_id);
  }
  assertEffort(manifest.reasoning_effort, manifest.effort_source);
  if (
    manifest.source_set.length === 0 ||
    new Set(manifest.source_set).size !== manifest.source_set.length
  ) {
    throw new Error("Trace lineage source_set must contain at least one unique source.");
  }
  for (const source of manifest.source_set) {
    assertOpaqueId("source_set entry", source);
  }
  if (manifest.source_set_digest !== sourceSetDigest(manifest.source_set)) {
    throw new Error("Trace lineage source_set_digest does not match source_set.");
  }
  if (manifest.stages.length !== LIVE_TRACE_STAGES.length) {
    throw new Error(`Trace lineage requires exactly ${LIVE_TRACE_STAGES.length} stage receipts.`);
  }
  const stageIds = new Set<string>();
  const stageNames = new Set<string>();
  for (const [index, stage] of manifest.stages.entries()) {
    if (stageIds.has(stage.stage_id)) {
      throw new Error(`Trace lineage contains duplicate stage_id ${stage.stage_id}.`);
    }
    if (stageNames.has(stage.stage)) {
      throw new Error(`Trace lineage contains duplicate stage ${stage.stage}.`);
    }
    stageIds.add(stage.stage_id);
    stageNames.add(stage.stage);
    validateStage(stage, manifest, index > 0 ? manifest.stages[index - 1]?.stage_id : undefined);
    if (stage.stage !== LIVE_TRACE_STAGES[index]) {
      throw new Error(`Trace lineage stage order must be ${LIVE_TRACE_STAGES.join(", ")}.`);
    }
  }
}

export function createTraceLineageManifest(input: TraceLineageManifestInput): TraceLineageManifest {
  const manifest: TraceLineageManifest = {
    ...input,
    schema_version: LIVE_TRACE_SCHEMA_VERSION,
    source_set_digest: sourceSetDigest(input.source_set),
  };
  validateTraceLineageManifest(manifest);
  return manifest;
}
