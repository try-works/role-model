import { describe, expect, test } from "vitest";

import {
  type TraceLineageManifestInput,
  createTraceLineageManifest,
} from "../src/index.js";

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

function makeInput(effort: {
  reasoning_effort: string | null;
  effort_source: string;
}): TraceLineageManifestInput {
  const common = {
    request_id: "req-run106-effort",
    routing_decision_id: "decision-run106-effort",
    endpoint_id: "endpoint-run106-effort",
    model_id: "model/run106",
    reasoning_effort: effort.reasoning_effort,
    effort_source: effort.effort_source,
  };
  return {
    ...common,
    source_set: ["request:req-run106-effort"],
    stages: stageNames.map((stage, index) => ({
      ...common,
      stage_id: "stage-" + stage,
      stage,
      receipt_id: "receipt-" + stage,
      disposition: "recorded" as const,
      predecessor_stage_id: index ? "stage-" + stageNames[index - 1] : undefined,
      ...(stage === "message_graph"
        ? {
            artifact_hash: "sha256:graph",
            occurrence_id: "occurrence-message",
            content_id: "content-message",
            predecessor_occurrence_id: "occurrence-root",
          }
        : {}),
    })),
  };
}

describe("Run 106 trace lineage effort-source", () => {
  test("round-trips all four canonical effort states", () => {
    expect(
      createTraceLineageManifest(makeInput({ reasoning_effort: "high", effort_source: "named" })),
    ).toMatchObject({ reasoning_effort: "high", effort_source: "named" });

    expect(
      createTraceLineageManifest(makeInput({ reasoning_effort: null, effort_source: "disabled" })),
    ).toMatchObject({ reasoning_effort: null, effort_source: "disabled" });

    expect(
      createTraceLineageManifest(
        makeInput({ reasoning_effort: null, effort_source: "provider_default" }),
      ),
    ).toMatchObject({ reasoning_effort: null, effort_source: "provider_default" });

    expect(
      createTraceLineageManifest(makeInput({ reasoning_effort: null, effort_source: "none" })),
    ).toMatchObject({ reasoning_effort: null, effort_source: "none" });
  });

  test("rejects a named source without an effort level", () => {
    expect(() =>
      createTraceLineageManifest(makeInput({ reasoning_effort: null, effort_source: "named" })),
    ).toThrow(/effort|named/i);
  });

  test("rejects a non-named source carrying an effort level", () => {
    expect(() =>
      createTraceLineageManifest(makeInput({ reasoning_effort: "high", effort_source: "disabled" })),
    ).toThrow(/effort|disabled/i);
  });
});
