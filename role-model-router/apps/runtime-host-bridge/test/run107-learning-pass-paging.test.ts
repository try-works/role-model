import { expect, test } from "vitest";

import {
  LEARNING_GROUP_MAX_PAGES,
  LEARNING_GROUP_PAGE_LIMIT,
  collectPagedComparisonGroups,
  runTrackBLearningPass,
} from "../src/track-b-learning-pass.js";

/**
 * Run 107 P1: the learner's evidence is the whole durable comparison-group set.
 *
 * `evaluation:list-groups` used to answer one fixed 256-row page and ignore its request. The live
 * stage root on 2026-09-24 held 699 finalized groups, so the pass counted an arbitrary window: the
 * newest validation receipt recorded `decision: insufficient_evidence` with
 * `familyEvidence.decisiveComparisons: 0` and an `excludedByReason` histogram over that window
 * alone, and no experience pack had been written since 2026-09-21.
 *
 * These tests pin the two halves of the fix: the reader walks cursors, and the evidence the pass
 * presents to the worker covers evidence that sits beyond the first page.
 */

const routePackage = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";

function group(input: { groupId: string; outcome: string; capture: string; taskTypeId?: string }) {
  const comparability = {
    counterfactualCandidateRef: routePackage,
    sourceCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
    inputRef: `artifact:${input.capture}`,
    policyId: "run96-routing-shadow",
    scorerSetVersion: "run96-routing-shadow-v3",
    taskRef: `artifact:${"b".repeat(64)}`,
    ...(input.taskTypeId ? { taskTypeId: input.taskTypeId } : {}),
  };
  return {
    groupId: input.groupId,
    status: "finalized",
    comparability,
    holdout: {
      holdoutId: `sha256:${"d".repeat(64)}`,
      membershipDigest: `sha256:${"e".repeat(64)}`,
      partition: "holdout",
      caseIds: [`case:${input.capture}`],
    },
    result: {
      groupId: input.groupId,
      status: "finalized",
      outcome: input.outcome,
      comparability,
      holdout: { caseIds: [`case:${input.capture}`] },
      members: [
        { trialId: "trial:source", scoreId: "score:source", score: 0.4, confidence: 1 },
        { trialId: "trial:candidate", scoreId: "score:candidate", score: 0.7, confidence: 0.9 },
      ],
    },
  };
}

/**
 * A first page of comparisons that belong to other route packages, so the window is full of
 * evidence this candidate cannot use - exactly the shape the live store has.
 */
function otherPackageGroup(index: number) {
  const groupId = `comparison:other:${String(index).padStart(4, "0")}`;
  const comparability = {
    counterfactualCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
    sourceCandidateRef: "moonshot.personal.kimi-code.global.kimi-k3",
    inputRef: `artifact:${String(index).padStart(4, "0")}${"0".repeat(60)}`,
    policyId: "run96-routing-shadow",
    scorerSetVersion: "run96-routing-shadow-v3",
    taskRef: `artifact:${"b".repeat(64)}`,
  };
  return {
    groupId,
    status: "finalized",
    comparability,
    holdout: { holdoutId: `sha256:${"d".repeat(64)}`, partition: "holdout", caseIds: [groupId] },
    result: {
      groupId,
      status: "finalized",
      outcome: "candidate",
      comparability,
      holdout: { caseIds: [groupId] },
      members: [
        { trialId: "trial:source", scoreId: "score:source", score: 0.4, confidence: 1 },
        { trialId: "trial:candidate", scoreId: "score:candidate", score: 0.7, confidence: 0.9 },
      ],
    },
  };
}

const firstPage = Array.from({ length: LEARNING_GROUP_PAGE_LIMIT }, (_, index) =>
  otherPackageGroup(index),
);

/** The decisive evidence for this candidate's package, deliberately on the second page. */
const secondPage = [
  group({ groupId: "comparison:mine:1", outcome: "candidate", capture: "1".repeat(64) }),
  group({ groupId: "comparison:mine:2", outcome: "source", capture: "2".repeat(64) }),
  group({ groupId: "comparison:mine:3", outcome: "candidate", capture: "3".repeat(64) }),
];

function passInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "supervised-replay:run107",
    channel: "development",
    scope: "standalone-runtime-stage",
    authorizationEpoch: 1,
    candidateId: "shadow-candidate-run107",
    routePackage,
    provenance: {
      policy: "run96-routing-shadow",
      task: `artifact:${"b".repeat(64)}`,
      scorer: "run96-routing-shadow-v3",
      split: "holdout",
      seed: 87,
      evidenceRef: `artifact:${"c".repeat(64)}`,
    },
    identity: { scorerSetVersion: "run96-routing-shadow-v3", judgeEndpointId: "endpoint:judge" },
    finalizedComparison: secondPage[0].result,
    finalizedComparisonReceipt: {
      payload: { kind: "evaluation_core_comparison_readback" },
      signature: "sig",
    },
    safetyReceipt: { payload: { kind: "knowledge_safety" }, signature: "sig" },
    evaluationAuthoritySecret: "run107-learning-pass-secret",
    nowMs: Date.parse("2026-09-24T00:00:00Z"),
    ...overrides,
  } as Parameters<typeof runTrackBLearningPass>[1];
}

function pagedRuntime() {
  const pages: Array<{ cursor: string | null; value: Record<string, unknown> }> = [];
  let capturedSummary: Record<string, unknown> | null = null;
  return {
    pages,
    get summary() {
      return capturedSummary;
    },
    async invoke(_extensionId: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability);
      const value = (envelope.capability === "knowledge:record-learning"
        ? envelope.payload
        : (envelope.value ?? {})) as Record<string, unknown>;
      if (capability === "evaluation:list-groups") {
        const cursor = typeof value.cursor === "string" ? value.cursor : null;
        pages.push({ cursor, value });
        if (cursor === null) {
          return { groups: firstPage, nextCursor: "comparison:other:0255", hasMore: true };
        }
        return { groups: secondPage, nextCursor: null, hasMore: false, totalGroups: 259 };
      }
      if (capability === "knowledge:validate-candidate") {
        capturedSummary = value.evidenceSummary as Record<string, unknown>;
        return {
          receipt: { receiptId: "validation:run107", decision: "insufficient_evidence" },
          promotionEligible: false,
        };
      }
      if (capability === "knowledge:record-learning") return { recorded: true };
      return {};
    },
  };
}

test("run107 P1 the evidence the pass presents counts comparisons beyond the first page", async () => {
  const runtime = pagedRuntime();
  await runTrackBLearningPass(runtime, passInput());

  expect(runtime.pages.map(page => page.cursor)).toEqual([null, "comparison:other:0255"]);
  expect(runtime.pages[0].value).toMatchObject({ page: true, limit: LEARNING_GROUP_PAGE_LIMIT });
  expect(runtime.summary).toMatchObject({
    decisiveComparisons: 3,
    holdoutComparisons: 3,
    distinctCaptures: 3,
  });
});

test("run107 P1 a runtime that answers the legacy plain array still yields one page of evidence", async () => {
  const runtime = {
    async invoke(_extensionId: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability);
      if (capability === "evaluation:list-groups") return secondPage;
      if (capability === "knowledge:validate-candidate") {
        return {
          receipt: { receiptId: "validation:run107-legacy", decision: "insufficient_evidence" },
          promotionEligible: false,
        };
      }
      if (capability === "knowledge:record-learning") return { recorded: true };
      return {};
    },
  };
  const receipt = await runTrackBLearningPass(runtime, passInput());
  expect(receipt).toMatchObject({ decision: "insufficient_evidence", promoted: false });
});

test("run107 P1 the page walk is bounded even when a runtime never stops offering a cursor", async () => {
  let calls = 0;
  const collected = await collectPagedComparisonGroups({
    readPage: async () => {
      calls += 1;
      return { groups: [], nextCursor: `cursor:${calls}`, hasMore: true };
    },
  });
  expect(collected).toEqual([]);
  expect(calls).toBe(LEARNING_GROUP_MAX_PAGES);
});
