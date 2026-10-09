import { describe, expect, test } from "vitest";

import { deriveLearnerCandidatesFromDurableEvidence } from "../src/track-b-learner-derivation.js";

/**
 * Run 108 addendum 03, item D: the decision -> learning-scope derivation must not lose the task family.
 *
 * Measured live 2026-10-09 over all 114 \`knowledge:eval-consumer\` rows in the copied knowledge-worker store:
 * 25 derivations carry \`scope.taskTypeId\` and 89 do not. The split is by producer, not by traffic: the 25 are
 * the live request's shadow pipeline (scopeId \`standalone-runtime-dev\`), which passes the family it holds
 * in-process, while the 89 come from this durable derivation pass (scopeId \`runtime:d0b9cd2795369ff0c7afd08254b37e4d\`),
 * which resolves the family from the replay-core job alone. That job record has no family fields at all
 * (477 \`replay:job\` rows in the copied replay-core store: keys are jobId/replayId/scope/scopeId/channel/…
 * plus \`scope\` as a string), so \`text(job.taskTypeId)\` is null for every derivation.
 *
 * 65 of those 89 family-less derivations name a finalized comparison whose own \`comparability\` block carries
 * the family (\`coder.edit\`/\`coder\`/\`1.0.0-alpha.1\`) - the derivation pass already reads that record for
 * \`counterfactualCandidateRef\` and still wrote a scope without the family. The knowledge-worker reads the
 * family from \`scope.taskTypeId\` (extensions/knowledge-worker/index.mjs:2323-2330 -> deriveFamilyVerdict),
 * so a scope without it is a receipt without \`familyEvidence\`: "the receipt carries no comparison counts".
 */

const WINNER = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high";
const SOURCE = "deepseek.personal.deepseek-api-key.global.deepseek-flash-max";
const GROUP_ID = `comparison:supervised-replay:${"a".repeat(64)}`;
const REPLAY_ID = "b".repeat(64);
const DECISION_ID = "decision-req-9321145a-e941-4c5c-8491-360b58227987";
/** The live derivation-pass scope (measured), not the operator scope the live pipeline uses. */
const RUNTIME_SCOPE = "runtime:d0b9cd2795369ff0c7afd08254b37e4d";
const GRAPH_REF = `artifact:${"c".repeat(64)}`;
const SOURCE_EVIDENCE = `artifact:${"1".repeat(64)}`;
const COUNTERFACTUAL_EVIDENCE = `artifact:${"2".repeat(64)}`;
const REPLAY_REF = "4".repeat(64);

function proof(reference: string) {
  return {
    authority: "evaluation-reference-store",
    authorizationEpoch: 1,
    channel: "development",
    purpose: "evaluation",
    reference,
    referenceDigest: `sha256:${"9".repeat(64)}`,
    resolved: true,
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    scope: RUNTIME_SCOPE,
  };
}

/** The family the comparison was actually built with - what the live groups carry today. */
const COMPARISON_FAMILY = {
  taskTypeId: "coder.edit",
  roleId: "coder",
  taxonomyVersion: "1.0.0-alpha.1",
};

function comparison(family: Record<string, string>) {
  return {
    groupId: GROUP_ID,
    comparisonId: GROUP_ID,
    status: "finalized",
    outcome: "candidate",
    holdout: {
      holdoutId: `sha256:${"3".repeat(64)}`,
      membershipDigest: `sha256:${"4".repeat(64)}`,
      caseIds: [`replay:${REPLAY_ID}:0`, `replay:${REPLAY_ID}:1`],
    },
    comparability: {
      policyId: "run96-routing-shadow",
      scorerSetVersion: "run96-routing-shadow-v3",
      sourceCandidateRef: SOURCE,
      counterfactualCandidateRef: WINNER,
      sourceEvidenceRef: SOURCE_EVIDENCE,
      counterfactualEvidenceRef: COUNTERFACTUAL_EVIDENCE,
      forkRef: `artifact:${"5".repeat(64)}`,
      ...family,
    },
    referenceProofs: {
      sourceEvidenceRef: proof(SOURCE_EVIDENCE),
      counterfactualEvidenceRef: proof(COUNTERFACTUAL_EVIDENCE),
    },
    members: [
      {
        candidateRef: SOURCE,
        disposition: "negative",
        role: "source",
        score: 0,
        confidence: 1,
        trialId: `trial:${"6".repeat(64)}`,
        scoreId: `trial-score:${"7".repeat(64)}`,
      },
      {
        candidateRef: WINNER,
        disposition: "positive",
        role: "counterfactual",
        score: 1,
        confidence: 1,
        trialId: `trial:${"8".repeat(64)}`,
        scoreId: `trial-score:${"9".repeat(64)}`,
      },
    ],
  };
}

/**
 * The replay-core job record as the durable store actually holds it: no family fields, \`scope\` is a string.
 * A fixture that invents \`taskTypeId\` on this record would hide the very loss this suite pins.
 */
const job = {
  jobId: REPLAY_ID,
  replayId: REPLAY_ID,
  state: "complete",
  scope: RUNTIME_SCOPE,
  scopeId: RUNTIME_SCOPE,
  channel: "development",
  sourceDecisionId: DECISION_ID,
  traceRootId: GRAPH_REF,
  sharedPrefixRef: `artifact:${"5".repeat(64)}`,
  baselineEndpointId: SOURCE,
  branches: [{ id: WINNER }],
  candidatePackages: [
    {
      endpointId: SOURCE,
      modelId: "deepseek/deepseek-flash",
      reasoningEffort: "max",
      samplingProfileId: "deterministic-v1",
    },
    {
      endpointId: WINNER,
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "high",
      samplingProfileId: "deterministic-v1",
    },
  ],
};

const report = {
  schemaVersion: "role-model.trajectory-signal-report.v1",
  routeDecisionId: DECISION_ID,
  graphRef: GRAPH_REF,
  signals: [{ signalInstanceId: `signal:${"a".repeat(16)}`, signalType: "semantic" }],
  evaluationProvenance: { groupId: GROUP_ID, status: "finalized", outcome: "candidate" },
  learningEvidence: {
    schemaVersion: "role-model.finalized-evaluation-signal.v1",
    groupId: GROUP_ID,
    outcome: "candidate",
    traceRef: GRAPH_REF,
    replayRef: REPLAY_REF,
    sourceGeneration: `sha256:${"b".repeat(64)}`,
    trialScoreRefs: [],
  },
};

const profile = {
  digest: `sha256:${"c".repeat(64)}`,
  effects: { routePackage: { values: [WINNER], evidenceRefs: [COUNTERFACTUAL_EVIDENCE] } },
};

type ConsumedScope = {
  scope: { routePackage?: string; taskTypeId?: string; roleId?: string; taxonomyVersion?: string };
};

/** Runs one derivation and returns the scope the consumer was actually handed. */
async function consumedScope(
  group: ReturnType<typeof comparison>,
  jobRecord: Record<string, unknown>,
): Promise<ConsumedScope["scope"]> {
  let consumed: ConsumedScope["scope"] | null = null;
  const summary = await deriveLearnerCandidatesFromDurableEvidence({
    groups: [group],
    attemptedGroupIds: new Set<string>(),
    limit: 2,
    channel: "development",
    scope: RUNTIME_SCOPE,
    evaluationAuthoritySecret: "secret",
    invoke: async (_extensionId, capability, value) => {
      if (capability === "replay:job") return jobRecord;
      if (capability === "signals:read") return [report];
      if (capability === "profile:estimate-finalized-evaluation") return profile;
      if (capability === "knowledge:eval-consumer") {
        consumed = (value as unknown as ConsumedScope).scope;
        return { id: `shadow-${"d".repeat(64)}` };
      }
      return null;
    },
  });
  expect(summary.derived).toBe(1);
  expect(consumed).not.toBeNull();
  return consumed as unknown as ConsumedScope["scope"];
}

describe("run108 addendum 03 D: the derivation scope carries the comparison's task family", () => {
  test("a decision whose comparison recorded the family derives a family-scoped learning scope", async () => {
    const scope = await consumedScope(comparison(COMPARISON_FAMILY), job);
    // The three fields the knowledge-worker reads (index.mjs:2323-2330) before it can emit familyEvidence.
    expect(scope.taskTypeId).toBe("coder.edit");
    expect(scope.roleId).toBe("coder");
    expect(scope.taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(scope.routePackage).toBe(WINNER);
  });

  test("a comparison that recorded no family derives a scope with no family key (nothing is invented)", async () => {
    const scope = await consumedScope(comparison({}), job);
    expect("taskTypeId" in scope).toBe(false);
    expect("roleId" in scope).toBe(false);
    expect("taxonomyVersion" in scope).toBe(false);
  });

  test("a family the job itself declares still travels (per-field fallback, not replacement)", async () => {
    const declared = {
      ...job,
      taskTypeId: "writer.release_notes",
      taxonomyVersion: "2.0.0",
      roleId: "writer",
    };
    const scope = await consumedScope(comparison({}), declared);
    expect(scope.taskTypeId).toBe("writer.release_notes");
    expect(scope.roleId).toBe("writer");
    expect(scope.taxonomyVersion).toBe("2.0.0");
  });

  test("the fallback is per field: a partially declared family completes from the comparison", async () => {
    const partial = { ...job, taskTypeId: "coder.edit" };
    const scope = await consumedScope(comparison(COMPARISON_FAMILY), partial);
    expect(scope.taskTypeId).toBe("coder.edit");
    expect(scope.roleId).toBe("coder");
    expect(scope.taxonomyVersion).toBe("1.0.0-alpha.1");
  });
});
