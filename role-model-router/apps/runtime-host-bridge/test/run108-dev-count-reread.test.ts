import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import {
  buildTrackBLearningEvidenceSummary,
  collectPagedComparisonGroups,
} from "../src/track-b-learning-pass.js";
import { decodeExternalizedOperatorReadback } from "../src/track-b-runtime.js";

/**
 * Run 108 addendum-01 A1.1: the post-closeout audit reported a dev=1 -> dev=0 re-derivation
 * anomaly - the ONLY train case ever recorded (job evaluation-replay-4cce4530..., writer.summarize,
 * group comparison:supervised-replay:3487ded3...) carries developmentPartition on its stored
 * result_json, one learner receipt (2026-10-01T01:02:10Z) counted developmentComparisons=1, and
 * later re-derivations of the same family reportedly read 0 while decisive/holdout/distinct
 * persisted. The audit located the suspected drop site "between the durable readback and the
 * family attribution".
 *
 * This suite re-derives the family evidence from a durable-shaped group exactly the way the
 * learner re-derivation sees it (the evaluation:list-groups row: top-level group_json fields plus
 * the full result_json under the `result` key), and pins every link of the read chain:
 *
 *   1. the derivation itself (buildTrackBLearningEvidenceSummary reads
 *      group.result.developmentPartition),
 *   2. the paged input.groups assembly (collectPagedComparisonGroups must not project rows),
 *   3. the externalized readback artifact (decodeExternalizedOperatorReadback must return the
 *      stored page with the partition intact).
 *
 * The fixture bytes mirror the live dev store row verified 2026-10-08
 * (group comparison:supervised-replay:3487ded38ecd45e199e5a22b151cefc6f64e2b8899727e83e56ca89ca337e778,
 * family taskTypeId "writer.summarize", holdout baselinePackageId sha256:b99cab45...).
 */

const TRAIN_GROUP_ID =
  "comparison:supervised-replay:3487ded38ecd45e199e5a22b151cefc6f64e2b8899727e83e56ca89ca337e778";
const TRAIN_SOURCE_CANDIDATE = "deepseek.personal.run103.global.deepseek-v4-flash";
const TRAIN_COUNTERFACTUAL_CANDIDATE =
  "openai.personal.openai-codex-subscription.global.gpt-5.6-sol";
const TRAIN_FAMILY = "writer.summarize";
const TRAIN_HOLDOUT_ID =
  "sha256:b99cab45c7e37165536f07315130ded06087fb8566f49457406d43037d50301f";
const DEV_CASE_ID = "replay:7e1b67fa2e5aeaa664cceade149c5fe6cea934d487666e9cbde1b9edacac0eb9:2";

/** The comparability block of the live train group (taskTypeId is the family key). */
function trainComparability() {
  return {
    counterfactualCandidateRef: TRAIN_COUNTERFACTUAL_CANDIDATE,
    counterfactualEvidenceRef: "artifact:2222222222222222222222222222222222222222222222222222222222222222",
    counterfactualOutcomeRef: "artifact:3333333333333333333333333333333333333333333333333333333333333333",
    environmentDigest: "artifact:4444444444444444444444444444444444444444444444444444444444444444",
    forkRef: "artifact:5555555555555555555555555555555555555555555555555555555555555555",
    inputRef: "artifact:6666666666666666666666666666666666666666666666666666666666666666",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash",
    judgeOrderPolicy: "source_first",
    judgeSource: "controller",
    policyId: "run96-routing-shadow",
    roleId: "writer",
    scorerSetVersion: "run96-routing-shadow-v3",
    sourceCandidateRef: TRAIN_SOURCE_CANDIDATE,
    sourceEvidenceRef: "artifact:7777777777777777777777777777777777777777777777777777777777777777",
    sourceOutcomeRef: "artifact:8888888888888888888888888888888888888888888888888888888888888888",
    taskRef: "artifact:9999999999999999999999999999999999999999999999999999999999999999",
    taskTypeId: TRAIN_FAMILY,
    taxonomyVersion: "1.0.0-alpha.1",
    toolPolicyDigest: "artifact:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
}

/**
 * The durable comparison-group row exactly as evaluation:list-groups answers it (top-level
 * group_json fields + the full result_json under `result`), verified live 2026-10-08.
 */
function trainGroupRow(input: { withDevelopmentPartition: boolean }) {
  const comparability = trainComparability();
  const result = {
    comparability,
    groupId: TRAIN_GROUP_ID,
    holdout: {
      caseIds: [
        "replay:7e1b67fa2e5aeaa664cceade149c5fe6cea934d487666e9cbde1b9edacac0eb9:0",
        "replay:7e1b67fa2e5aeaa664cceade149c5fe6cea934d487666e9cbde1b9edacac0eb9:1",
      ],
      holdoutId: TRAIN_HOLDOUT_ID,
      membershipDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      partition: "holdout",
    },
    judgeProvenance: {
      endpointIds: ["deepseek.personal.deepseek-api-key.global.deepseek-flash"],
      modes: ["identified"],
      orderPolicy: "source_first",
      presentationOrders: ["source"],
    },
    members: [
      {
        candidateRef: TRAIN_SOURCE_CANDIDATE,
        confidence: 1,
        dimensionScores: [
          {
            score: 0,
            scorerKey:
              "role_model_pairwise_judge.battle@2+ea60d2b24ad8:sha256:cad844e1:task_specific_quality",
          },
        ],
        disposition: "negative",
        missingDimensions: [],
        missingScores: [],
        role: "source",
        score: 0,
        scoreId: "trial-score:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        scoreIds: [
          "trial-score:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ],
      },
      {
        candidateRef: TRAIN_COUNTERFACTUAL_CANDIDATE,
        confidence: 1,
        dimensionScores: [],
        disposition: "positive",
        missingDimensions: [],
        missingScores: [],
        role: "counterfactual",
        score: 1,
        scoreId: "trial-score:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        scoreIds: [
          "trial-score:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        ],
      },
    ],
    outcome: "candidate",
    primaryMetric: { id: "role_model_pairwise_judge.battle", applied: true },
    scorerDisagreement: false,
    scorerOutcomes: [
      {
        scorerKey: "role_model_pairwise_judge.battle@2",
        outcome: "candidate",
        winnerRole: "counterfactual",
      },
    ],
    status: "finalized",
    trialIds: ["trial:3487ded3:0", "trial:3487ded3:1"],
    validityIssues: [],
    winnerRole: "counterfactual",
    winnerTrialId: "trial:3487ded3:1",
    ...(input.withDevelopmentPartition
      ? {
          developmentPartition: {
            caseIds: [DEV_CASE_ID],
            membershipDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          },
        }
      : {}),
  };
  return {
    groupId: TRAIN_GROUP_ID,
    trialIds: ["trial:3487ded3:0", "trial:3487ded3:1"],
    comparability,
    referenceProofs: {},
    holdout: {
      caseIds: [
        "replay:7e1b67fa2e5aeaa664cceade149c5fe6cea934d487666e9cbde1b9edacac0eb9:0",
        "replay:7e1b67fa2e5aeaa664cceade149c5fe6cea934d487666e9cbde1b9edacac0eb9:1",
      ],
      holdoutId: TRAIN_HOLDOUT_ID,
      membershipDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      partition: "holdout",
    },
    status: "finalized",
    result,
    createdAtMs: null,
  };
}

const NOW_MS = Date.parse("2026-10-08T12:00:00Z");

function rederive(groups: unknown[]) {
  return buildTrackBLearningEvidenceSummary({
    groups: groups as never,
    routePackage: TRAIN_SOURCE_CANDIDATE,
    nowMs: NOW_MS,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
    evidenceHalfLifeDays: 10,
  });
}

describe("run108 A1.1 dev-count re-derivation", () => {
  test("the train family re-derived from the durable group readback reads developmentComparisons 1", () => {
    const summary = rederive([trainGroupRow({ withDevelopmentPartition: true })]);
    // The top-level count the R2 gate reads.
    expect(summary.developmentComparisons).toBe(1);
    // The per-family attribution the learner receipt records.
    expect(summary.byFamily[TRAIN_FAMILY]).toBeDefined();
    expect(summary.byFamily[TRAIN_FAMILY].developmentComparisons).toBe(1);
    // The persisted dimensions the audit observed - they must not regress.
    expect(summary.decisiveComparisons).toBe(1);
    expect(summary.holdoutComparisons).toBe(1);
    expect(summary.distinctCaptures).toBe(1);
    // The effective count is class-weighted: the fixture carries no evidenceStrength, so the
    // comparison is DEFAULT_EVIDENCE_CLASS = counterfactual_replay at weight 0.9
    // (track-b-learning-pass.ts:773) - the live 01:02:10Z receipt records exactly this value
    // (effectiveDevelopmentComparisons 0.9).
    expect(summary.effectiveDevelopmentComparisons).toBe(0.9);
  });

  test("a group result WITHOUT the development partition reads 0 while decisive/holdout/distinct persist", () => {
    const summary = rederive([trainGroupRow({ withDevelopmentPartition: false })]);
    expect(summary.developmentComparisons).toBe(0);
    expect(summary.byFamily[TRAIN_FAMILY]).toBeDefined();
    expect(summary.byFamily[TRAIN_FAMILY].developmentComparisons).toBe(0);
    expect(summary.decisiveComparisons).toBe(1);
    expect(summary.holdoutComparisons).toBe(1);
    expect(summary.distinctCaptures).toBe(1);
    expect(summary.effectiveDevelopmentComparisons).toBe(0);
  });

  test("the paged input.groups assembly preserves the development partition", async () => {
    // The readPage answers the live page envelope ({groups, nextCursor}); the assembly must not
    // project the row down.
    const collected = await collectPagedComparisonGroups({
      readPage: async () => ({
        groups: [trainGroupRow({ withDevelopmentPartition: true })],
        nextCursor: null,
        hasMore: false,
      }),
    });
    const row = collected[0] as { result?: { developmentPartition?: unknown } };
    expect(row?.result?.developmentPartition).toBeDefined();
    const summary = rederive(collected);
    expect(summary.developmentComparisons).toBe(1);
    expect(summary.byFamily[TRAIN_FAMILY].developmentComparisons).toBe(1);
  });

  test("the externalized readback artifact preserves the development partition", () => {
    // The list-groups page larger than the inline frame is externalized: the durable-output row
    // stores the page, and decodeExternalizedOperatorReadback must return it with the partition
    // intact (the second suspected drop site from the audit).
    const scopeId = "standalone-runtime-dev";
    const root = mkdtempSync(path.join(os.tmpdir(), "run108-dev-reread-"));
    const workerRoot = path.join(root, scopeId, "track-b", "extensions", "workers", "evaluation-core");
    mkdirSync(workerRoot, { recursive: true });
    const page = {
      groups: [trainGroupRow({ withDevelopmentPartition: true })],
      nextCursor: null,
      hasMore: false,
      groupCount: 1,
      totalGroups: 50,
    };
    const resultJson = JSON.stringify(page);
    const outputKey = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const database = new DatabaseSync(path.join(workerRoot, "durable-output.sqlite"));
    database.exec(
      "CREATE TABLE durable_extension_outputs (output_key TEXT PRIMARY KEY, result_json TEXT, result_hash TEXT, byte_length INTEGER)",
    );
    database
      .prepare(
        "INSERT INTO durable_extension_outputs (output_key, result_json, result_hash, byte_length) VALUES (?,?,?,?)",
      )
      .run(outputKey, resultJson, outputKey, Buffer.byteLength(resultJson));
    database.close();
    try {
      const decoded = decodeExternalizedOperatorReadback({
        stateRoot: root,
        scopeId,
        value: {
          transferState: "externalized",
          resultHash: outputKey,
          byteLength: Buffer.byteLength(resultJson),
          durableLocator: { outputKey },
        },
      }) as { groups?: unknown[] };
      expect(Array.isArray(decoded.groups)).toBe(true);
      const row = (decoded.groups ?? [])[0] as {
        result?: { developmentPartition?: unknown };
      };
      expect(row?.result?.developmentPartition).toBeDefined();
      const summary = rederive(decoded.groups ?? []);
      expect(summary.developmentComparisons).toBe(1);
      expect(summary.byFamily[TRAIN_FAMILY].developmentComparisons).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
