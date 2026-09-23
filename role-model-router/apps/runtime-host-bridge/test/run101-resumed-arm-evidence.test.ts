import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW,
  HandoffEvidenceUnavailableError,
  SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
  createSupervisedReplayEvaluationResumeStore,
  resumePendingSupervisedReplayEvaluations,
} from "../src/supervised-replay-evaluation-resume.js";
import { resolveResumedArmEvidence } from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S21/S23, measured on the real-traffic root
 * (`:3457`, build `0.0.14-543-g42aab8a2`):
 *
 *   265 replay jobs name an evaluation that Evaluation Core has never seen. Thirteen of them still have every
 *   arm's branch capture in the retention ring, and their dispatch records name those captures
 *   (`replay-req-<uuid>-<nonce>-branch`) - yet each one is refused with
 *
 *     `durable replay evaluation has no recorded counterfactual branch to evaluate`
 *
 *   The resumed completion read the *source* capture with the canonical extractor
 *   (`extractSourceOutputText`: `responseText`, then `response.content` in any shape, then `outputText`, then
 *   the assistant turn) and read each *arm* with a narrower inline test that accepted only a string
 *   `response.content` or a string `outputText`. Any other shape dropped the arm silently, and dropping every
 *   arm produced a claim about durable state ("has no recorded counterfactual branch") that the stores
 *   disprove. The claim also hid the real cause behind eight identical attempts and an unqualified
 *   `abandoned`.
 *
 * These cases pin the contract the boundary actually documents, and the disposition the operator needs.
 */

const CANDIDATES = [
  { endpointId: "endpoint:alpha", modelId: "model:alpha", reasoningEffort: "max" },
  { endpointId: "endpoint:beta", modelId: "model:beta", reasoningEffort: null },
] as const;

const BRANCH_IDS = new Map([
  ["endpoint:alpha", "replay-req-alpha-aaaa-branch"],
  ["endpoint:beta", "replay-req-beta-bbbb-branch"],
]);

const readFrom = (byRequestId: Readonly<Record<string, unknown>>) => async (requestId: string) =>
  (byRequestId[requestId] as Record<string, unknown> | undefined) ?? null;

test("run101 S21 an arm whose readback carries the bounded response excerpt resolves", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readFrom({
      "replay-req-alpha-aaaa-branch": {
        requestId: "replay-req-alpha-aaaa-branch",
        routingDecisionId: "decision:alpha",
        modelId: "model:alpha-resolved",
        responseText: "the alpha answer",
      },
    }),
  });
  expect(resolved.unreadable).toEqual([{ endpointId: "endpoint:beta", reason: "capture_missing" }]);
  expect(resolved.arms).toHaveLength(1);
  expect(resolved.arms[0]?.endpointId).toBe("endpoint:alpha");
  expect(resolved.arms[0]?.outputText).toBe("the alpha answer");
  expect(resolved.arms[0]?.routingDecisionId).toBe("decision:alpha");
});

test("run101 S21 a structured response content and a provider-recorded output both resolve", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readFrom({
      "replay-req-alpha-aaaa-branch": {
        response: { role: "assistant", content: [{ type: "text", text: "structured alpha" }] },
      },
      "replay-req-beta-bbbb-branch": {
        providers: [{ outputText: "provider-recorded beta" }],
      },
    }),
  });
  expect(resolved.unreadable).toHaveLength(0);
  expect(resolved.arms.map((arm) => arm.outputText)).toEqual([
    "structured alpha",
    "provider-recorded beta",
  ]);
});

test("run101 S21 an arm with no readable output is named, never silently dropped", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readFrom({
      "replay-req-alpha-aaaa-branch": { responseText: "alpha" },
      "replay-req-beta-bbbb-branch": { response: { role: "assistant", content: "" } },
    }),
  });
  expect(resolved.arms).toHaveLength(1);
  expect(resolved.unreadable).toEqual([
    { endpointId: "endpoint:beta", reason: "capture_has_no_output" },
  ]);
});

test("run101 S21 an arm whose capture is gone is named as a missing capture", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readFrom({}),
  });
  expect(resolved.arms).toHaveLength(0);
  expect(resolved.unreadable.map((arm) => arm.reason)).toEqual([
    "capture_missing",
    "capture_missing",
  ]);
});

test("run101 S23 evidence that is gone terminates under its own name without spending attempts", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run101-handoff-evidence-"));
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "resume.json"),
      maxEntries: 8,
    });
    store.record({
      schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
      replayJobId: "replay-job-gone",
      evaluationJobId: "evaluation-replay-gone",
      requestId: "req-gone",
      sourceCaptureRequestId: "req-gone",
      sourceEndpointId: "endpoint:source",
      sourceModelId: "model:source",
      counterfactualPackages: [
        { endpointId: "endpoint:alpha", modelId: "model:alpha", reasoningEffort: null },
      ],
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["ok"],
      },
      evaluationCriteriaDigest: `sha256:${"a".repeat(64)}`,
      recordedAtMs: 1_000,
      attempts: 0,
      resolvedAtMs: null,
      outcome: null,
      lastError: null,
    });
    const abandoned: string[] = [];
    const result = await resumePendingSupervisedReplayEvaluations({
      store,
      isEvaluationComplete: async () => false,
      complete: async () => {
        throw new HandoffEvidenceUnavailableError("endpoint:alpha=capture_missing");
      },
      onAbandoned: (entry) => {
        abandoned.push(entry.replayJobId);
      },
    });
    const entry = store.get("replay-job-gone");
    expect(result.outsideRetentionWindow).toBe(1);
    expect(entry?.outcome).toBe(HANDOFF_EVIDENCE_OUTSIDE_RETENTION_WINDOW);
    expect(entry?.attempts, "the attempt budget is not spent on a dead end").toBe(0);
    expect(entry?.lastError).toContain("capture_missing");
    expect(abandoned, "the replay job behind it is terminalized with the name").toEqual([
      "replay-job-gone",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("run101 S23 a retryable completion failure still spends an attempt and records its reason", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run101-handoff-retryable-"));
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "resume.json"),
      maxEntries: 8,
    });
    store.record({
      schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
      replayJobId: "replay-job-retry",
      evaluationJobId: "evaluation-replay-retry",
      requestId: "req-retry",
      sourceCaptureRequestId: "req-retry",
      sourceEndpointId: "endpoint:source",
      sourceModelId: "model:source",
      counterfactualPackages: [
        { endpointId: "endpoint:alpha", modelId: "model:alpha", reasoningEffort: null },
      ],
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["ok"],
      },
      evaluationCriteriaDigest: `sha256:${"b".repeat(64)}`,
      recordedAtMs: 1_000,
      attempts: 0,
      resolvedAtMs: null,
      outcome: null,
      lastError: null,
    });
    const result = await resumePendingSupervisedReplayEvaluations({
      store,
      isEvaluationComplete: async () => false,
      complete: async () => {
        throw new Error("judge candidate overlap: candidate is the judge");
      },
    });
    const entry = store.get("replay-job-retry");
    expect(result.failed).toBe(1);
    expect(result.outsideRetentionWindow).toBe(0);
    expect(entry?.attempts).toBe(1);
    expect(entry?.outcome).toBeNull();
    expect(entry?.lastError).toContain("judge candidate overlap");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S25, measured on the real-traffic root after the
 * first sweeps of the repaired build: two handoffs reached the new named disposition, but none of the thirteen
 * that still have their evidence were reached, because the terminal *scan* advances a few jobs per sweep
 * through a 512-job set while the handoffs that need it are the newest ones in it.
 *
 * The abandoned entries are the set that actually needs the decision, they are only 315, and the sweep already
 * walks them once per process to terminalize them. A handoff abandoned while its evidence may still exist (the
 * capture ring measures ~36 h of real traffic, so a day is the conservative half) now gets its bounded renewal
 * there instead of only being terminalized: the normal sweep then completes it, or lands it on the named
 * disposition. Only entries old enough that their evidence is certainly gone are terminalized as before.
 */
test("run101 S25 the abandoned drain renews a recent handoff and terminalizes an old one", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run101-abandoned-renewal-"));
  const now = Date.parse("2026-09-23T14:00:00Z");
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "resume.json"),
      maxEntries: 8,
    });
    const abandoned = (replayJobId: string, recordedAtMs: number) => ({
      schemaVersion: "role-model.supervised-replay-evaluation-resume.v1" as const,
      replayJobId,
      evaluationJobId: `evaluation-replay-${replayJobId}`,
      requestId: `req-${replayJobId}`,
      sourceCaptureRequestId: `req-${replayJobId}`,
      sourceEndpointId: "endpoint:source",
      sourceModelId: "model:source",
      counterfactualPackages: [
        { endpointId: "endpoint:alpha", modelId: "model:alpha", reasoningEffort: null },
      ],
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["ok"],
      },
      evaluationCriteriaDigest: `sha256:${"c".repeat(64)}`,
      recordedAtMs,
      attempts: SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
      resolvedAtMs: recordedAtMs + 1_000,
      outcome: "abandoned",
      lastError: "durable evaluation job … is unavailable for resume",
    });
    store.record(abandoned("replay-job-fresh", now - 60 * 60 * 1_000));
    store.record(abandoned("replay-job-stale", now - 10 * 24 * 60 * 60 * 1_000));

    const terminalized: string[] = [];
    const completed: string[] = [];
    const result = await resumePendingSupervisedReplayEvaluations({
      store,
      isEvaluationComplete: async () => false,
      complete: async (entry) => {
        completed.push(entry.replayJobId);
        return { outcome: "resolved" };
      },
      onAbandoned: (entry) => {
        terminalized.push(entry.replayJobId);
      },
      now: () => now,
    });

    expect(result.renewedFromDrain).toBe(1);
    expect(completed, "the renewed handoff is completed by the same sweep").toEqual([
      "replay-job-fresh",
    ]);
    expect(terminalized, "evidence that is certainly gone is still terminalized").toEqual([
      "replay-job-stale",
    ]);
    const fresh = store.get("replay-job-fresh");
    expect(fresh?.renewals).toBe(1);
    expect(fresh?.outcome).toBe("resolved");
    expect(store.get("replay-job-stale")?.outcome).toBe("abandoned");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
