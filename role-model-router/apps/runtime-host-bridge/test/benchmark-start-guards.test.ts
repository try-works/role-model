import { describe, expect, test } from "vitest";

import {
  EXECUTION_MODE_INELIGIBLE_ENDPOINT_WARNING_PREFIX,
  INSUFFICIENT_SUBJECTS_WARNING,
  JUDGE_SUBJECT_OVERLAP_WARNING,
  evaluateBenchmarkStartGuards,
  evaluateBenchmarkTargetEligibility,
  selectPreferredJudgeEndpoint,
} from "../src/benchmark-start-guards.js";

describe("benchmark-start-guards", () => {
  test("rejects start when useJudge and explicit endpointIds has fewer than two subjects", () => {
    const result = evaluateBenchmarkStartGuards({
      endpointIds: ["moonshot.kimi"],
      judgeEndpointId: "moonshot.kimi",
      useJudge: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.warnings).toContain(INSUFFICIENT_SUBJECTS_WARNING);
    expect(result.compareExpected).toBe(false);
  });

  test("allows start when two or more explicit subjects are configured", () => {
    const result = evaluateBenchmarkStartGuards({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      judgeEndpointId: "moonshot.kimi",
      useJudge: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.compareExpected).toBe(true);
  });

  test("warns when judge endpoint overlaps benchmark subjects", () => {
    const result = evaluateBenchmarkStartGuards({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      judgeEndpointId: "moonshot.kimi",
      useJudge: true,
    });
    expect(result.judgeSubjectOverlap).toBe(true);
    expect(result.warnings).toContain(JUDGE_SUBJECT_OVERLAP_WARNING);
  });

  test("does not flag overlap when judge is outside subject list", () => {
    const result = evaluateBenchmarkStartGuards({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      judgeEndpointId: "anthropic.claude",
      useJudge: true,
    });
    expect(result.judgeSubjectOverlap).toBe(false);
    expect(result.warnings).not.toContain(JUDGE_SUBJECT_OVERLAP_WARNING);
  });

  test("prefers a non-subject judge endpoint when one is available", () => {
    const judge = selectPreferredJudgeEndpoint({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      endpoints: [
        { endpointId: "local.lfm", modelId: "lfm2.5-1.2b-instruct" },
        { endpointId: "moonshot.kimi", modelId: "moonshot/kimi-k2.6" },
        { endpointId: "anthropic.claude", modelId: "claude-sonnet" },
      ],
    });
    expect(judge).toBe("anthropic.claude");
  });

  test("prefers remote Kimi as judge when overlap is unavoidable", () => {
    const judge = selectPreferredJudgeEndpoint({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      endpoints: [
        { endpointId: "local.lfm", modelId: "lfm2.5-1.2b-instruct" },
        { endpointId: "moonshot.kimi", modelId: "moonshot/kimi-k2.6" },
      ],
    });
    expect(judge).toBe("moonshot.kimi");
  });

  test("skips compare guard when useJudge is false", () => {
    const result = evaluateBenchmarkStartGuards({
      endpointIds: ["moonshot.kimi"],
      useJudge: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.compareExpected).toBe(false);
  });

  test("rejects benchmark targets excluded by the current execution mode", () => {
    const result = evaluateBenchmarkTargetEligibility({
      endpointIds: ["local.lfm", "moonshot.kimi"],
      judgeEndpointId: "moonshot.kimi",
      endpoints: [
        { endpointId: "local.lfm", executionModeEligible: true },
        { endpointId: "moonshot.kimi", executionModeEligible: false },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.ineligibleEndpointIds).toEqual(["moonshot.kimi"]);
    expect(result.warnings).toContain(
      `${EXECUTION_MODE_INELIGIBLE_ENDPOINT_WARNING_PREFIX}: moonshot.kimi`,
    );
  });
});
