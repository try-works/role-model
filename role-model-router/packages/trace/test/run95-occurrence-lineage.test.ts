import { describe, expect, it } from "vitest";

import { type TraceLineageManifestInput, createTraceLineageManifest } from "../src/index.js";

const stages = [
  "router_ingress",
  "routing_attempt",
  "upstream_execution",
  "runtime_observation",
  "message_graph",
  "contribution",
  "crowdsourcing",
  "recommendation",
] as const;

function input(): TraceLineageManifestInput {
  const common = {
    request_id: "request-occurrence-1",
    routing_decision_id: "decision-occurrence-1",
    endpoint_id: "deepseek.personal.deepseek-v4-flash-max",
    model_id: "deepseek/deepseek-v4-flash",
    reasoning_effort: "max",
    effort_source: "variant" as const,
  };
  return {
    ...common,
    source_set: ["request:request-occurrence-1"],
    stages: stages.map((stage, index) => ({
      ...common,
      stage_id: `stage-${stage}`,
      stage,
      receipt_id: `receipt-${stage}`,
      disposition: "recorded" as const,
      predecessor_stage_id: index ? `stage-${stages[index - 1]}` : undefined,
      ...(stage === "message_graph"
        ? {
            artifact_hash: "sha256:message-content-1",
            occurrence_id: "occurrence-message-1",
            content_id: "content-message-1",
            predecessor_occurrence_id: "occurrence-root-1",
          }
        : {}),
    })),
  };
}

describe("Run 95 occurrence-aware trace lineage", () => {
  it("requires message-graph receipts to bind separate occurrence and content identities", () => {
    const manifest = createTraceLineageManifest(input());
    expect(manifest.stages.find((stage) => stage.stage === "message_graph")).toMatchObject({
      occurrence_id: "occurrence-message-1",
      content_id: "content-message-1",
      predecessor_occurrence_id: "occurrence-root-1",
      reasoning_effort: "max",
      effort_source: "variant",
    });

    const base = input();
    const missingContent = {
      ...base,
      stages: base.stages.map((stage) => {
        if (stage.stage !== "message_graph") return stage;
        const { content_id: _contentId, ...withoutContent } = stage as typeof stage & {
          content_id?: string;
        };
        return withoutContent;
      }),
    } as TraceLineageManifestInput;
    expect(() => createTraceLineageManifest(missingContent)).toThrow(/content_id/i);
  });
});
