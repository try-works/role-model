/**
 * v1.1 capture-side graph contracts.
 *
 * A route capture records message, tool, provider and response artifacts as opaque
 * ids. This module maps that recorded capture onto `ArtifactGraphNodeV2` /
 * `ArtifactGraphEdgeV2` (and `CaptureDegradationReceiptV1` when capture failed), so
 * the graph the runtime actually persists is the documented storage vocabulary.
 */
import { type TrackBContractEmission, emitTrackBContract } from "./track-b-contract-emission.js";

const BOUNDARY_PROTOCOL_VERSION = "1.1";

const runtimeChannel = (channel: string): "production" | "stage" | "development" =>
  channel === "production" || channel === "development" ? channel : "stage";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const MESSAGE_ROLES = new Set(["system", "developer", "user", "assistant", "tool", "observer"]);

const messageRole = (value: unknown): string => {
  const role = typeof value === "string" ? value.toLowerCase() : "";
  return MESSAGE_ROLES.has(role) ? role : "user";
};

const nodeEnvelope = (input: {
  readonly nodeId: string;
  readonly scopeId: string;
  readonly channel: string;
  readonly createdAt: string;
}): Record<string, unknown> => ({
  contract: "ArtifactGraphNodeV2",
  nodeId: input.nodeId,
  schemaVersion: "2.0.0",
  scopeId: input.scopeId,
  retentionState: "full_content_available",
  createdAt: input.createdAt,
  runtimeChannel: runtimeChannel(input.channel),
  boundaryProtocolVersion: BOUNDARY_PROTOCOL_VERSION,
});

const toolResultStatus = (
  tool: Record<string, unknown>,
): "ok" | "error" | "cancelled" | "timeout" => {
  const status = typeof tool.status === "string" ? tool.status.toLowerCase() : "";
  if (status === "failed" || status === "error" || status === "failure" || tool.isError === true) {
    return "error";
  }
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "timeout" || status === "timed_out") return "timeout";
  return "ok";
};

export interface CaptureGraphContractInput {
  readonly capture: Readonly<Record<string, unknown>>;
  readonly request: Readonly<Record<string, unknown>>;
  readonly channel: string;
  readonly scopeId: string;
  readonly createdAtMs?: number;
  /** Present for replay branch captures so the branch edge carries its branch id. */
  readonly branch?: {
    readonly kind: "replay" | "counterfactual";
    readonly branchId: string;
    readonly sourceNodeId: string;
  };
}

/**
 * Build the documented graph nodes for one recorded capture. Only recorded artifact
 * identities become nodes; a capture without an artifact identity contributes nothing.
 */
export function buildCaptureGraphNodes(
  input: CaptureGraphContractInput,
): Record<string, unknown>[] {
  const createdAt = new Date(input.createdAtMs ?? Date.now()).toISOString();
  const envelope = { scopeId: input.scopeId, channel: input.channel, createdAt };
  const nodes: Record<string, unknown>[] = [];
  const requestMessages = Array.isArray(input.request.messages) ? input.request.messages : [];
  const messageArtifactIds = asStringArray(input.capture.messageArtifactIds);
  messageArtifactIds.forEach((artifactId, index) => {
    const message = asRecord(requestMessages[index]) ?? {};
    const role = messageRole(message.role);
    nodes.push({
      ...nodeEnvelope({ ...envelope, nodeId: artifactId }),
      kind: "message",
      payload: {
        role,
        contentPartReferenceIds: [],
        providerGenerated: role === "assistant",
        sampled: role === "assistant",
      },
    });
  });
  const responseArtifactId = input.capture.responseArtifactId;
  if (typeof responseArtifactId === "string" && responseArtifactId) {
    nodes.push({
      ...nodeEnvelope({ ...envelope, nodeId: responseArtifactId }),
      kind: "message",
      payload: {
        role: "assistant",
        contentPartReferenceIds: [],
        providerGenerated: true,
        sampled: true,
      },
    });
  }
  const tools = Array.isArray(input.capture.tools) ? input.capture.tools : [];
  for (const [index, rawTool] of tools.entries()) {
    const tool = asRecord(rawTool);
    if (!tool) continue;
    const artifactId = String(tool.artifactId ?? tool.nodeId ?? "");
    if (!artifactId) continue;
    const toolKind =
      String(tool.kind ?? "tool_call") === "tool_result" ? "tool_result" : "tool_call";
    const callId = String(tool.callId ?? tool.toolCallId ?? `call:${index + 1}`);
    nodes.push({
      ...nodeEnvelope({ ...envelope, nodeId: artifactId }),
      kind: toolKind,
      payload:
        toolKind === "tool_call"
          ? {
              callId,
              toolName: String(tool.toolName ?? tool.toolId ?? "tool").slice(0, 256) || "tool",
              argumentsReferenceId: String(
                tool.argumentsArtifactId ?? tool.argumentsReferenceId ?? artifactId,
              ),
            }
          : {
              callId,
              resultReferenceIds: asStringArray(tool.resultReferenceIds).length
                ? asStringArray(tool.resultReferenceIds)
                : [artifactId],
              status: toolResultStatus(tool),
            },
    });
  }
  const providers = Array.isArray(input.capture.providers) ? input.capture.providers : [];
  for (const [index, rawProvider] of providers.entries()) {
    const provider = asRecord(rawProvider);
    if (!provider) continue;
    const artifactId = String(provider.nodeId ?? provider.artifactId ?? "");
    if (!artifactId) continue;
    nodes.push({
      ...nodeEnvelope({ ...envelope, nodeId: artifactId }),
      kind: index === 0 ? "provider_request" : "provider_response",
      payload: {
        providerId: String(provider.providerId ?? input.capture.endpointId ?? "provider"),
        endpointId: String(provider.endpointId ?? input.capture.endpointId ?? "endpoint"),
        modelId: String(provider.modelId ?? input.capture.modelId ?? "model"),
        direction: index === 0 ? "request" : "response",
        bodyCaptured: false,
      },
    });
  }
  if (input.branch) {
    const branchNodeId = String(input.capture.rootArtifactId ?? "");
    if (branchNodeId) {
      nodes.push({
        ...nodeEnvelope({ ...envelope, nodeId: branchNodeId }),
        kind: "summary",
        payload: { referenceIds: [branchNodeId], artifactClass: "summary" },
      });
    }
  }
  return nodes;
}

/**
 * Build the documented edges between the recorded nodes of one capture.
 */
export function buildCaptureGraphEdges(
  input: CaptureGraphContractInput,
): Record<string, unknown>[] {
  const createdAt = new Date(input.createdAtMs ?? Date.now()).toISOString();
  const envelope = { scopeId: input.scopeId, channel: input.channel, createdAt };
  const nodes = buildCaptureGraphNodes(input);
  const messageNodeIds = nodes
    .filter((node) => node.kind === "message")
    .map((node) => String(node.nodeId));
  const toolCallNodeIds = nodes
    .filter((node) => node.kind === "tool_call")
    .map((node) => String(node.nodeId));
  const toolResultNodeIds = nodes
    .filter((node) => node.kind === "tool_result")
    .map((node) => String(node.nodeId));
  const providerNodeIds = nodes
    .filter((node) => node.kind === "provider_request" || node.kind === "provider_response")
    .map((node) => String(node.nodeId));
  const edges: Record<string, unknown>[] = [];
  let orderingIndex = 0;
  const pushEdge = (
    sourceNodeId: string,
    targetNodeId: string,
    edgeType: string,
    extra: Record<string, unknown> = {},
  ): void => {
    edges.push({
      contract: "ArtifactGraphEdgeV2",
      edgeId: `edge:${edgeType}:${sourceNodeId}:${targetNodeId}`,
      scopeId: input.scopeId,
      sourceNodeId,
      targetNodeId,
      edgeType,
      orderingIndex,
      createdAt,
      runtimeChannel: runtimeChannel(input.channel),
      boundaryProtocolVersion: BOUNDARY_PROTOCOL_VERSION,
      ...extra,
    });
    orderingIndex += 1;
  };
  for (let index = 1; index < messageNodeIds.length; index += 1) {
    pushEdge(messageNodeIds[index - 1], messageNodeIds[index], "next_message");
  }
  const lastMessage = messageNodeIds.at(-1);
  if (lastMessage && toolCallNodeIds[0]) {
    pushEdge(lastMessage, toolCallNodeIds[0], "tool_call");
  }
  toolCallNodeIds.forEach((callNodeId, index) => {
    const resultNodeId = toolResultNodeIds[index];
    if (resultNodeId) pushEdge(callNodeId, resultNodeId, "tool_result");
  });
  if (providerNodeIds.length >= 2) {
    pushEdge(providerNodeIds[0], providerNodeIds[1], "provider_response");
  }
  if (input.branch) {
    pushEdge(
      input.branch.sourceNodeId,
      String(input.capture.rootArtifactId ?? ""),
      input.branch.kind === "counterfactual" ? "counterfactual_branch" : "replay_branch",
      { branchId: input.branch.branchId, replayId: input.branch.branchId },
    );
  }
  return edges;
}

/**
 * Persist the documented node/edge contracts for a recorded capture. Validation
 * failure is reported, never silently dropped.
 */
export function emitCaptureGraphContracts(input: {
  readonly stateRoot: string;
  readonly graph: CaptureGraphContractInput;
}): TrackBContractEmission[] {
  const emissions: TrackBContractEmission[] = [];
  for (const node of buildCaptureGraphNodes(input.graph)) {
    emissions.push(
      emitTrackBContract({
        stateRoot: input.stateRoot,
        scopeId: input.graph.scopeId,
        contract: node,
      }),
    );
  }
  for (const edge of buildCaptureGraphEdges(input.graph)) {
    emissions.push(
      emitTrackBContract({
        stateRoot: input.stateRoot,
        scopeId: input.graph.scopeId,
        contract: edge,
      }),
    );
  }
  return emissions;
}
