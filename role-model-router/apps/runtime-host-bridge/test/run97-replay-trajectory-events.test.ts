import { expect, test } from "vitest";

import { deriveSupervisedReplayTrajectoryEvents } from "../src/cli.js";

const artifactId = (seed: string) => seed.repeat(64).slice(0, 64);

test("run97 replay trajectory events come from durable capture artifacts", () => {
  const events = deriveSupervisedReplayTrajectoryEvents({
    sourceCapture: {
      requestId: "req-run97-tools",
      capturedAt: "2026-09-13T01:00:00.000Z",
      rootArtifactId: artifactId("a"),
      routeDecisionArtifactId: artifactId("b"),
      toolArtifactIds: [artifactId("c"), artifactId("d")],
      tools: [{ status: "completed" }, { status: "failed" }],
      responseArtifactId: artifactId("e"),
      response: { content: "done" },
    },
    counterfactualCaptures: [],
  });
  expect(events.length).toBeGreaterThanOrEqual(2);
  const types = events.map((event) => String(event.type));
  expect(types).toContain("route_selected");
  // A recorded tool failure is the recognized behavioral evidence the analyzer needs.
  expect(types).toContain("tool_failure");
  expect(types).toContain("tool_call");
  expect(types).toContain("model_response");
  for (const event of events) {
    expect(String(event.evidenceRef)).toMatch(/^artifact:[a-f0-9]{64}$/);
    expect(Number.isSafeInteger(event.timestampMs)).toBe(true);
    expect(String(event.id).length).toBeGreaterThan(0);
  }
  const ids = events.map((event) => String(event.id));
  expect(new Set(ids).size).toBe(ids.length);
  const timestamps = events.map((event) => Number(event.timestampMs));
  expect([...timestamps].sort((left, right) => left - right)).toEqual(timestamps);
});

test("run97 replay trajectory events stay empty when the capture records no time", () => {
  // R16: without recorded behavioral evidence the learner must degrade rather than
  // receive a fabricated timeline.
  const events = deriveSupervisedReplayTrajectoryEvents({
    sourceCapture: {
      requestId: "req-run97-untimed",
      rootArtifactId: artifactId("a"),
      toolArtifactIds: [artifactId("c")],
      responseArtifactId: artifactId("e"),
    },
    counterfactualCaptures: [],
  });
  expect(events).toEqual([]);
});

test("run97 replay trajectory events mark a recorded provider failure", () => {
  const events = deriveSupervisedReplayTrajectoryEvents({
    sourceCapture: {
      requestId: "req-run97-provider-error",
      capturedAt: "2026-09-13T01:05:00.000Z",
      rootArtifactId: artifactId("a"),
      toolArtifactIds: [],
      responseArtifactId: artifactId("e"),
      response: { failure: { errorClass: "provider_error" } },
    },
    counterfactualCaptures: [],
  });
  expect(events.map((event) => String(event.type))).toContain("provider_error");
});

test("run97 repeated recorded tool use is a recorded tool loop", () => {
  const events = deriveSupervisedReplayTrajectoryEvents({
    sourceCapture: {
      requestId: "req-run97-tool-loop",
      capturedAt: "2026-09-13T01:10:00.000Z",
      rootArtifactId: artifactId("a"),
      toolArtifactIds: [artifactId("c"), artifactId("d")],
      tools: [
        { toolName: "bash", status: "succeeded" },
        { toolName: "bash", status: "succeeded" },
      ],
      responseArtifactId: artifactId("e"),
    },
    counterfactualCaptures: [],
  });
  const types = events.map((event) => String(event.type));
  expect(types).toContain("tool_call");
  // The second use of the same tool is recorded repetition, not an interpretation of
  // the tool's output text.
  expect(types).toContain("tool_loop");
});

test("run97 trajectory events read the operations readback tool shape", () => {
  // Exactly what the durable capture readback returns: tools carry their own artifact
  // identity and the parsed tool content, with no parallel toolArtifactIds array.
  const events = deriveSupervisedReplayTrajectoryEvents({
    sourceCapture: {
      requestId: "req-run97-readback-shape",
      capturedAt: "2026-09-13T01:20:00.000Z",
      rootArtifactId: artifactId("a"),
      routeDecisionArtifactId: artifactId("b"),
      tools: [
        { kind: "tool_call", toolName: "bash", artifactId: artifactId("c") },
        { kind: "tool_result", toolName: "bash", artifactId: artifactId("d") },
      ],
      responseArtifactId: artifactId("e"),
    },
    counterfactualCaptures: [],
  });
  expect(events.length).toBeGreaterThanOrEqual(2);
  const types = events.map((event) => String(event.type));
  expect(types).toContain("tool_call");
  expect(types).toContain("tool_loop");
  expect(types).toContain("model_response");
});
