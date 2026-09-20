import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
} from "../src/learning-policy-file.js";
import { createRouterPairwiseJudge } from "../src/track-b-shadow-judge-dispatch.js";
import { createRun97PairwiseJudgeScorer } from "../src/track-b-runtime.js";

/**
 * Run 98 addendum 45 J1/J2 — the pairwise judge is the configured controller.
 *
 * Operator instruction (2026-09-20): "i told you this should just use the controller. it seems to be
 * hardcoded. changing controller to kimi k3 does not change this endpoint. hardcode it to just use the
 * controller! controller is set by the user."
 *
 * The policy no longer carries an endpoint id; it carries `judgeSource`. The endpoint is the controller
 * assignment, so the same policy judges with a different endpoint the moment the operator changes the
 * controller — and `disabled`, or no controller at all, judges nothing.
 */
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const rootWithPolicy = (global: Record<string, unknown>): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a45-"));
  roots.push(root);
  mkdirSync(path.join(root, "shared"), { recursive: true });
  writeFileSync(
    path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
    JSON.stringify({
      schemaVersion: "role-model.route-learning-activation-policy.v1",
      policyVersion: 3,
      global,
      channels: {},
      scopes: {},
    }),
    "utf8",
  );
  return root;
};

const judgeFor = (input: {
  readonly judgeSource: "controller" | "disabled";
  readonly controllerEndpointId: string;
}) =>
  createRouterPairwiseJudge({
    executeChatCompletions: async () => ({ contentText: "" }),
    endpoints: [
      { endpointId: input.controllerEndpointId, modelId: "model:controller" },
      { endpointId: "endpoint:source", modelId: "model:source" },
      { endpointId: "endpoint:counterfactual", modelId: "model:counterfactual" },
    ],
    excludedEndpointIds: ["endpoint:source", "endpoint:counterfactual"],
    judgeEndpointId:
      input.judgeSource === "disabled" ? "" : input.controllerEndpointId,
    judgeSource: input.judgeSource,
    judgeAssignmentUpdatedAtMs: 1234,
    taskText: "Review the diff.",
  });

test("run98 a45: the policy publishes judgeSource and the retired id is not read", () => {
  const snapshot = readLearningPolicyFile({
    repoRoot: rootWithPolicy({ judgeSource: "controller" }),
    channel: "stage",
  });
  expect(snapshot?.effective.judgeSource).toBe("controller");
  expect(snapshot?.effective).not.toHaveProperty("judgeEndpointId");

  const disabled = readLearningPolicyFile({
    repoRoot: rootWithPolicy({ judgeSource: "disabled" }),
    channel: "stage",
  });
  expect(disabled?.effective.judgeSource).toBe("disabled");

  // A stored document from before the retirement still loads: the retired name is ignored, not honoured.
  const legacy = readLearningPolicyFile({
    repoRoot: rootWithPolicy({
      judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
    }),
    channel: "stage",
  });
  expect(legacy?.effective.judgeSource).toBe("controller");
  expect(legacy?.effective).not.toHaveProperty("judgeEndpointId");
  // The retired name is also out of the *hashed* document, so the digest the router reports is the same
  // digest the policy store reports for the stored policy (both hash the migrated document).
  const migrated = readLearningPolicyFile({
    repoRoot: rootWithPolicy({}),
    channel: "stage",
  });
  expect(legacy?.digest).toBe(migrated?.digest);
});

test("run98 a45: the same policy judges with whichever endpoint is the controller", () => {
  const first = judgeFor({
    judgeSource: "controller",
    controllerEndpointId: "moonshot.personal.moonshot-oauth.global.kimi-k3",
  });
  expect(first?.endpointId).toBe("moonshot.personal.moonshot-oauth.global.kimi-k3");
  expect(first?.judgeSource).toBe("controller");
  expect(first?.judgeAssignmentUpdatedAtMs).toBe(1234);

  // Changing the controller changes the judge with no policy write: same inputs, different endpoint.
  const second = judgeFor({
    judgeSource: "controller",
    controllerEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
  });
  expect(second?.endpointId).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high");

  // `disabled` judges nothing, and never falls back to a candidate in the pair.
  expect(
    judgeFor({ judgeSource: "disabled", controllerEndpointId: "endpoint:controller" }),
  ).toBeUndefined();
  // A pair that contains the controller is not judged (no self-evaluation).
  expect(
    createRouterPairwiseJudge({
      executeChatCompletions: async () => ({ contentText: "" }),
      endpoints: [
        { endpointId: "endpoint:controller", modelId: "model:controller" },
        { endpointId: "endpoint:other", modelId: "model:other" },
      ],
      excludedEndpointIds: ["endpoint:controller", "endpoint:other"],
      judgeEndpointId: "endpoint:controller",
      judgeSource: "controller",
      taskText: "Review the diff.",
    }),
  ).toBeUndefined();
});

/**
 * Run 98 addendum 48 (live v281 finding, reported by the operator's runtime events):
 * `extension evaluation-core failed: duplicate scorer ID has incompatible version`.
 *
 * Evaluation Core keys its durable scorer registry on `id@version` and refuses different bytes under the same
 * key. The judge change therefore has to live in the *definition body* (so a controller/selector change is a
 * new key), and run-varying provenance — the assignment timestamp — must stay off the manifest entirely.
 */
test("run98 a48: a judge selector change is a new scorer version and run-varying provenance stays off it", () => {
  const controller = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge",
    judgeMode: "identity_blind",
    judgeSource: "controller",
  });
  const disabled = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge",
    judgeMode: "identity_blind",
    judgeSource: "disabled",
  });
  expect(controller.version).not.toBe(disabled.version);
  expect(controller.digest).not.toBe(disabled.digest);

  // Stable across calls: nothing run-varying may enter the definition, or the durable registry refuses the
  // second registration of the same `id@version`.
  const again = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge",
    judgeMode: "identity_blind",
    judgeSource: "controller",
  });
  expect(again.version).toBe(controller.version);
  expect(again.digest).toBe(controller.digest);
  expect(controller).not.toHaveProperty("judgeAssignmentUpdatedAtMs");
});

test("run98 a48: the judge assignment timestamp travels on the decision, not the manifest", async () => {
  const judge = createRouterPairwiseJudge({
    executeChatCompletions: async () => ({
      contentText: '{"winner":"B","confidence":0.9}',
      routingDecisionId: "decision:judge",
    }),
    endpoints: [{ endpointId: "endpoint:judge", modelId: "model:judge" }],
    excludedEndpointIds: ["endpoint:source", "endpoint:counterfactual"],
    judgeEndpointId: "endpoint:judge",
    judgeSource: "controller",
    judgeAssignmentUpdatedAtMs: 4_242,
    taskText: "Review the diff.",
  });
  expect(judge).toBeDefined();
  const decision = await judge!.dispatch({
    requestId: "req-a48",
    channel: "stage",
    scope: "scope:a48",
    authorizationEpoch: 1,
    evaluationJobId: "eval-a48",
    judgeEndpointId: "endpoint:judge",
    source: {
      trialId: "t1",
      candidateRef: "candidate:source",
      outputRef: "artifact:source",
      outputDigest: "sha256:source",
      outputText: "source output",
    },
    counterfactual: {
      trialId: "t2",
      candidateRef: "candidate:counterfactual",
      outputRef: "artifact:counterfactual",
      outputDigest: "sha256:counterfactual",
      outputText: "counterfactual output",
    },
  });
  expect(decision.judgeEndpointId).toBe("endpoint:judge");
  expect(decision.judgeAssignmentUpdatedAtMs).toBe(4_242);
});
