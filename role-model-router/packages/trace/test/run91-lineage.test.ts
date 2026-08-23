import { describe, expect, it } from "vitest";

import {
  type TraceLineageManifestInput,
  createTraceLineageManifest,
  validateTraceLineageManifest,
} from "../src/index.js";

const common = {
  request_id: "req-run91-001",
  routing_decision_id: "decision-run91-001",
  endpoint_id: "deepseek.personal.deepseek-v4-pro.medium",
  model_id: "deepseek/deepseek-v4-pro",
  reasoning_effort: "medium",
  effort_source: "variant" as const,
};

const stageNames = [
  "router_ingress",
  "routing_attempt",
  "upstream_execution",
  "runtime_observation",
  "message_graph",
  "contribution",
  "crowdsourcing",
  "recommendation",
] as const;

function makeInput(overrides: Partial<TraceLineageManifestInput> = {}): TraceLineageManifestInput {
  return {
    schema_version: "run91-live-pi-trace.v1",
    client_request_id: "pi-run91-client-001",
    ...common,
    source_set: ["request:req-run91-001", "decision:decision-run91-001"],
    stages: stageNames.map((stage, index) => ({
      stage_id: `${stage}-receipt-001`,
      stage,
      ...common,
      receipt_id: `${stage}-receipt-001`,
      disposition: stage === "recommendation" ? "not_eligible" : "recorded",
      ...(stage === "recommendation" ? { policy_receipt: "recommendation-policy:disabled" } : {}),
      ...(stage === "message_graph" ? { artifact_hash: "sha256:graph-001" } : {}),
      predecessor_stage_id: index > 0 ? `${stageNames[index - 1]}-receipt-001` : undefined,
    })),
    ...overrides,
  };
}

describe("Run 91 live trace lineage", () => {
  it("creates an exact request-to-decision-to-graph manifest with effort identity", () => {
    const manifest = createTraceLineageManifest(makeInput());

    expect(manifest).toMatchObject({
      schema_version: "run91-live-pi-trace.v1",
      request_id: common.request_id,
      routing_decision_id: common.routing_decision_id,
      endpoint_id: common.endpoint_id,
      model_id: common.model_id,
      reasoning_effort: "medium",
      effort_source: "variant",
      source_set_digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(manifest.stages).toHaveLength(stageNames.length);
    expect(manifest.stages.find((stage) => stage.stage === "message_graph")).toMatchObject({
      artifact_hash: "sha256:graph-001",
    });
    expect(() => validateTraceLineageManifest(manifest)).not.toThrow();
  });

  it("refuses pending graph or outbox intent instead of claiming a terminal receipt", () => {
    const input = makeInput({
      stages: makeInput().stages.map((stage) =>
        stage.stage === "message_graph" ? { ...stage, pending_intent: true } : stage,
      ),
    });

    expect(() => createTraceLineageManifest(input)).toThrow(/pending intent/i);
  });

  it("requires an explicit policy receipt for not-eligible downstream stages", () => {
    const input = makeInput({
      stages: makeInput().stages.map((stage) =>
        stage.stage === "recommendation" ? { ...stage, policy_receipt: undefined } : stage,
      ),
    });

    expect(() => createTraceLineageManifest(input)).toThrow(/policy receipt/i);
  });

  it("rejects a stage joined to another request or effort instance", () => {
    const input = makeInput({
      stages: makeInput().stages.map((stage) =>
        stage.stage === "message_graph"
          ? { ...stage, request_id: "req-other", reasoning_effort: "low" }
          : stage,
      ),
    });

    expect(() => createTraceLineageManifest(input)).toThrow(/request_id|reasoning_effort/);
  });
});
