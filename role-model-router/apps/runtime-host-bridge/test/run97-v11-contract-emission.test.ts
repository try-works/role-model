import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateV11Contract } from "@role-model/protocol-types";
import { expect, test } from "vitest";

import {
  buildLearnedExperienceCandidate,
  buildRoutePackageActivationReceipt,
  buildRoutePackageAttribution,
  buildRoutingEvaluationExecutionContext,
  buildRoutingRolloutGroupLifecycle,
  emitTrackBContract,
} from "../src/track-b-contract-emission.js";

const channel = "stage";
const scopeId = "standalone-runtime-stage";
const nowMs = Date.parse("2026-09-13T03:00:00.000Z");

function tempStateRoot(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(os.tmpdir(), "run97-contracts-"));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("run97 emits a validated execution context and finalized rollout group", () => {
  const { root, cleanup } = tempStateRoot();
  try {
    const execution = buildRoutingEvaluationExecutionContext({
      executionId: "execution:supervised-replay:1",
      purpose: "routing_replay",
      tasksetRef: "taskset:live-captures",
      harnessRef: "harness:pi-cli",
      runtimeRef: "runtime:stage:3457",
      routerPolicyVersion: "policy:run97:v1",
      sourceProjectionIds: ["artifact:source-projection"],
      channel,
      scopeId,
      createdAtMs: nowMs,
    });
    const executionEmission = emitTrackBContract({ stateRoot: root, scopeId, contract: execution });
    expect(executionEmission.ref).toContain("RoutingEvaluationExecutionContextV1");
    const group = buildRoutingRolloutGroupLifecycle({
      groupId: "comparison:supervised-replay:1",
      executionContextId: execution.executionId,
      state: "finalized",
      comparabilityKey: "task:route-selection|input:capture-1|policy:run97",
      rolloutRefs: ["rollout:source", "rollout:counterfactual"],
      scoreRefs: ["score:source", "score:counterfactual"],
      positiveRolloutRefs: ["rollout:counterfactual"],
      negativeRolloutRefs: ["rollout:source"],
      scorerSetVersion: "run96-semantic-criteria@2",
      policySnapshotRef: "policy:run97:v1",
      channel,
      scopeId,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    });
    const groupEmission = emitTrackBContract({ stateRoot: root, scopeId, contract: group });
    for (const emission of [executionEmission, groupEmission]) {
      const written = JSON.parse(readFileSync(emission.filePath, "utf8"));
      expect(validateV11Contract(written).valid).toBe(true);
      expect(emission.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  } finally {
    cleanup();
  }
});

test("run97 refuses to persist a lifecycle-incomplete contract before writing it", () => {
  const { root, cleanup } = tempStateRoot();
  try {
    const incomplete = buildRoutingRolloutGroupLifecycle({
      groupId: "comparison:supervised-replay:2",
      executionContextId: "execution:1",
      state: "finalized",
      comparabilityKey: "task:route-selection",
      rolloutRefs: ["rollout:source", "rollout:counterfactual"],
      scoreRefs: ["score:source", "score:counterfactual"],
      scorerSetVersion: "run96-semantic-criteria@2",
      channel,
      scopeId,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    });
    expect(() =>
      emitTrackBContract({ stateRoot: root, scopeId, contract: incomplete }),
    ).toThrow(/v1\.1 contract validation failed/);
  } finally {
    cleanup();
  }
});

test("run97 emits the learner, attribution and disabled activation contracts", () => {
  const { root, cleanup } = tempStateRoot();
  try {
    const experience = buildLearnedExperienceCandidate({
      experienceId: "experience:run97:1",
      scope: { taskTypeId: "task:route-selection" },
      experienceTextRef: "artifact:experience-text",
      sourceGroupIds: ["comparison:supervised-replay:1"],
      positiveRolloutRefs: ["rollout:counterfactual"],
      negativeRolloutRefs: ["rollout:source"],
      status: "shadow_validating",
      redactionStatus: "redacted",
      instructionHierarchyChecked: true,
      promptInjectionReviewed: true,
      channel,
      scopeId,
      createdAtMs: nowMs,
    });
    const attribution = buildRoutePackageAttribution({
      attributionId: "attribution:run97:1",
      routePackage: {
        packageId: "package:deepseek-flash-high",
        endpointId: "endpoint:deepseek-flash-high",
        modelId: "deepseek/deepseek-flash",
        modelRevision: "recorded-effort:high",
        samplingProfileId: "policy:run97:v1",
      },
      scope: { taskTypeId: "task:route-selection" },
      baselinePackageId: "package:baseline",
      qualityDelta: 0.05,
      costDelta: 0,
      latencyDelta: 0,
      sampleCount: 2,
      confidence: 0.6,
      evidenceManifestRef: "artifact:comparison:supervised-replay:1",
      channel,
      scopeId,
      createdAtMs: nowMs,
    });
    const activation = buildRoutePackageActivationReceipt({
      receiptId: "activation:run97:1",
      packageId: "package:deepseek-flash-high",
      scope: { taskTypeId: "task:route-selection" },
      policyGateId: "gate:route-package-activation",
      priorPackageId: "package:deepseek-flash-high",
      state: "disabled",
      channel,
      scopeId,
      activatedAtMs: nowMs,
    });
    for (const contract of [experience, attribution, activation]) {
      const emission = emitTrackBContract({ stateRoot: root, scopeId, contract });
      expect(validateV11Contract(JSON.parse(readFileSync(emission.filePath, "utf8"))).valid).toBe(
        true,
      );
    }
  } finally {
    cleanup();
  }
});
