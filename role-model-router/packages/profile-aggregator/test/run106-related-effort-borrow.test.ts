import { describe, expect, test } from "vitest";

import {
  type EffortBenchmarkEvidenceSubject,
  resolveRelatedEffortOverallScore,
} from "../src/index.js";

function subject(input: {
  readonly endpointId: string;
  readonly modelId?: string | null;
  readonly providerId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly overallScore?: number | null;
}): EffortBenchmarkEvidenceSubject {
  return {
    endpointId: input.endpointId,
    modelId: input.modelId ?? null,
    providerId: input.providerId ?? null,
    reasoningEffort: input.reasoningEffort ?? null,
    overallScore: input.overallScore ?? null,
  };
}

describe("resolveRelatedEffortOverallScore", () => {
  test("borrows a sibling fixed-effort benchmark score for a provider-default endpoint", () => {
    const subjects = [
      subject({ endpointId: "flash.default", modelId: "flash", reasoningEffort: null }),
      subject({
        endpointId: "flash.max",
        modelId: "flash",
        reasoningEffort: "max",
        overallScore: 0.9,
      }),
    ];

    expect(
      resolveRelatedEffortOverallScore({
        endpointId: "flash.default",
        modelId: "flash",
        reasoningEffort: null,
        subjects,
      }),
    ).toBe(0.9);
  });

  test("returns null when the provider-default endpoint already has exact benchmark evidence", () => {
    const subjects = [
      subject({
        endpointId: "flash.default",
        modelId: "flash",
        reasoningEffort: null,
        overallScore: 0.7,
      }),
      subject({
        endpointId: "flash.max",
        modelId: "flash",
        reasoningEffort: "max",
        overallScore: 0.9,
      }),
    ];

    expect(
      resolveRelatedEffortOverallScore({
        endpointId: "flash.default",
        modelId: "flash",
        reasoningEffort: null,
        subjects,
      }),
    ).toBeNull();
  });

  test("returns null when no same-model sibling fixed-effort benchmark exists", () => {
    const subjects = [
      subject({ endpointId: "flash.default", modelId: "flash", reasoningEffort: null }),
      subject({
        endpointId: "other.max",
        modelId: "other-model",
        reasoningEffort: "max",
        overallScore: 0.9,
      }),
    ];

    expect(
      resolveRelatedEffortOverallScore({
        endpointId: "flash.default",
        modelId: "flash",
        reasoningEffort: null,
        subjects,
      }),
    ).toBeNull();
  });

  test("never borrows for a fixed-effort endpoint", () => {
    const subjects = [
      subject({ endpointId: "flash.max", modelId: "flash", reasoningEffort: "max" }),
      subject({
        endpointId: "flash.high",
        modelId: "flash",
        reasoningEffort: "high",
        overallScore: 0.8,
      }),
    ];

    expect(
      resolveRelatedEffortOverallScore({
        endpointId: "flash.max",
        modelId: "flash",
        reasoningEffort: "max",
        subjects,
      }),
    ).toBeNull();
  });

  test("picks the highest-scoring sibling deterministically when several fixed-effort siblings exist", () => {
    const subjects = [
      subject({ endpointId: "flash.default", modelId: "flash", reasoningEffort: null }),
      subject({
        endpointId: "flash.low",
        modelId: "flash",
        reasoningEffort: "low",
        overallScore: 0.6,
      }),
      subject({
        endpointId: "flash.high",
        modelId: "flash",
        reasoningEffort: "high",
        overallScore: 0.8,
      }),
      subject({
        endpointId: "flash.max",
        modelId: "flash",
        reasoningEffort: "max",
        overallScore: 0.9,
      }),
    ];

    expect(
      resolveRelatedEffortOverallScore({
        endpointId: "flash.default",
        modelId: "flash",
        reasoningEffort: null,
        subjects,
      }),
    ).toBe(0.9);
  });
});
