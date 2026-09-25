import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  MAX_RESUME_RENEWALS,
  SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
  type SupervisedReplayEvaluationResumeEntry,
  createSupervisedReplayEvaluationResumeStore,
  selectResumableSupervisedReplayEvaluations,
} from "../src/supervised-replay-evaluation-resume.js";

/**
 * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S17, measured on the real-traffic root: 301
 * of 434 resume entries sit at the attempt cap with outcome `abandoned`, and **all 301 correspond to replay
 * jobs that carry an evaluationJobId in a terminal state** - exactly the jobs addendum 04's S14 recovery pass
 * re-records. The give-up was reached while the completion could not yet create a missing evaluation; that
 * capability now exists, so re-recording an entry must actually give it a fresh budget rather than keeping
 * the exhausted counter, or the renewed attempt is abandoned on sight.
 */

function abandonedEntry(replayJobId: string): SupervisedReplayEvaluationResumeEntry {
  return {
    schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
    replayJobId,
    evaluationJobId: `evaluation-replay-${replayJobId}`,
    requestId: `req-${replayJobId}`,
    sourceCaptureRequestId: `req-${replayJobId}`,
    sourceEndpointId: "endpoint:source",
    sourceModelId: "model:source",
    counterfactualPackages: [
      { endpointId: "endpoint:candidate", modelId: "model:candidate", reasoningEffort: null },
    ],
    evaluationCriteria: { schemaVersion: "role-model.semantic-criteria.v1", requiredTerms: ["ok"] },
    evaluationCriteriaDigest: `sha256:${"f".repeat(64)}`,
    recordedAtMs: 1_000,
    attempts: SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
    resolvedAtMs: 2_000,
    outcome: "abandoned",
    lastError: "durable evaluation job evaluation-replay-… is unavailable for resume",
  };
}

test("run100v re-recording an abandoned entry renews its attempt budget", () => {
  const root = mkdtempSync(path.join(tmpdir(), "run100v-resume-renewal-"));
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "resume.json"),
      maxEntries: 8,
    });
    const abandoned = abandonedEntry("replay-job-renew");
    store.record(abandoned);
    expect(
      selectResumableSupervisedReplayEvaluations({ entries: store.list() }),
      "an entry at the cap is not selected until it is renewed",
    ).toHaveLength(0);

    // `record()` intentionally preserves the counter (that is why the renewal exists), so the recovery pass
    // renews the entry explicitly.
    expect(
      store.record({ ...abandoned, attempts: 0, resolvedAtMs: null, outcome: null }),
    ).toMatchObject({
      attempts: SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
    });
    const renewedOnce = store.renew("replay-job-renew", { now: 3_000 });
    expect(renewedOnce).toMatchObject({ attempts: 0, renewals: 1 });
    const renewed = store.get("replay-job-renew");
    expect(renewed?.attempts).toBe(0);
    expect(renewed?.resolvedAtMs).toBeNull();
    expect(renewed?.outcome).toBeNull();
    expect(selectResumableSupervisedReplayEvaluations({ entries: store.list() })).toHaveLength(1);

    // The renewal is bounded: after MAX_RESUME_RENEWALS the give-up stands.
    for (let attempt = 0; attempt < MAX_RESUME_RENEWALS; attempt += 1)
      store.renew("replay-job-renew", { now: 4_000 });
    expect(store.get("replay-job-renew")?.renewals).toBe(MAX_RESUME_RENEWALS);
    expect(store.renew("replay-job-renew", { now: 5_000 })).toBeNull();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
