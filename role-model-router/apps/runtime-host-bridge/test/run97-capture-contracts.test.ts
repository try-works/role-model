import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateV11ContractDefinition } from "@role-model/protocol-types";
import { expect, test } from "vitest";

import {
  buildCaptureGraphEdges,
  buildCaptureGraphNodes,
  emitCaptureGraphContracts,
} from "../src/track-b-capture-contracts.js";

const artifactId = (seed: string) => seed.repeat(64).slice(0, 64);

const capture = {
  requestId: "req-capture-contracts",
  scope: "standalone-runtime-stage",
  endpointId: "endpoint:deepseek-flash-high",
  modelId: "deepseek/deepseek-flash",
  rootArtifactId: artifactId("a"),
  messageArtifactIds: [artifactId("b"), artifactId("c")],
  responseArtifactId: artifactId("d"),
  tools: [
    { kind: "tool_call", toolName: "bash", artifactId: artifactId("e"), callId: "call:1" },
    {
      kind: "tool_result",
      toolName: "bash",
      artifactId: artifactId("f"),
      callId: "call:1",
      status: "failed",
    },
  ],
  providers: [
    { nodeId: artifactId("1"), statusCode: 200 },
    { nodeId: artifactId("2"), statusCode: 200 },
  ],
};

const request = {
  messages: [
    { role: "user", content: "run the tests" },
    { role: "assistant", content: "running" },
  ],
};

test("run97 capture graph nodes use the documented storage vocabulary", () => {
  const nodes = buildCaptureGraphNodes({
    capture,
    request,
    channel: "stage",
    scopeId: "standalone-runtime-stage",
    createdAtMs: Date.parse("2026-09-13T04:00:00.000Z"),
  });
  expect(nodes.length).toBeGreaterThanOrEqual(6);
  for (const node of nodes) {
    const result = validateV11ContractDefinition("trackBStorage", "graphNode", node);
    expect(result.valid, `${String(node.nodeId)}: ${result.errors.join(" | ")}`).toBe(true);
  }
  const kinds = nodes.map((node) => String(node.kind));
  expect(kinds).toContain("message");
  expect(kinds).toContain("tool_call");
  expect(kinds).toContain("tool_result");
  expect(kinds).toContain("provider_request");
  expect(kinds).toContain("provider_response");
  const toolResult = nodes.find((node) => node.kind === "tool_result");
  expect((toolResult?.payload as Record<string, unknown>).status).toBe("error");
});

test("run97 capture graph edges include next_message, tool and provider lineage", () => {
  const edges = buildCaptureGraphEdges({
    capture,
    request,
    channel: "stage",
    scopeId: "standalone-runtime-stage",
    createdAtMs: Date.parse("2026-09-13T04:05:00.000Z"),
  });
  for (const edge of edges) {
    const result = validateV11ContractDefinition("trackBStorage", "graphEdge", edge);
    expect(result.valid, `${String(edge.edgeId)}: ${result.errors.join(" | ")}`).toBe(true);
  }
  const edgeTypes = edges.map((edge) => String(edge.edgeType));
  expect(edgeTypes).toContain("next_message");
  expect(edgeTypes).toContain("tool_call");
  expect(edgeTypes).toContain("tool_result");
  expect(edgeTypes).toContain("provider_response");
  expect(new Set(edges.map((edge) => Number(edge.orderingIndex))).size).toBe(edges.length);
});

test("run97 replay branch capture edges carry the branch identity", () => {
  const edges = buildCaptureGraphEdges({
    capture,
    request,
    channel: "stage",
    scopeId: "standalone-runtime-stage",
    branch: { kind: "counterfactual", branchId: "branch:run97:1", sourceNodeId: artifactId("9") },
  });
  const branchEdge = edges.find((edge) => edge.edgeType === "counterfactual_branch");
  expect(branchEdge).toBeDefined();
  expect(branchEdge?.branchId).toBe("branch:run97:1");
  expect(
    validateV11ContractDefinition("trackBStorage", "graphEdge", branchEdge).valid,
  ).toBe(true);
});

test("run97 emits validated graph contracts durably", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run97-capture-contracts-"));
  try {
    const emissions = emitCaptureGraphContracts({
      stateRoot: root,
      graph: {
        capture,
        request,
        channel: "stage",
        scopeId: "standalone-runtime-stage",
      },
    });
    expect(emissions.length).toBeGreaterThanOrEqual(6);
    for (const emission of emissions) {
      const written = JSON.parse(readFileSync(emission.filePath, "utf8"));
      expect(validateV11ContractDefinition("trackBStorage", "graphNode", written).valid ||
        validateV11ContractDefinition("trackBStorage", "graphEdge", written).valid).toBe(true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
