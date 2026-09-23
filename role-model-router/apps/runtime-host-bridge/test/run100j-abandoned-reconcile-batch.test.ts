import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  type SupervisedReplayEvaluationResumeEntry,
  createSupervisedReplayEvaluationResumeStore,
  resumePendingSupervisedReplayEvaluations,
} from "../src/supervised-replay-evaluation-resume.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S5, found while verifying the backlog repair
 * live: the "reconcile entries abandoned before this repair" pass walks **every** abandoned entry in the
 * store, once per process, and each entry costs two cross-boundary invocations now (fail the replay job and
 * terminalize its evaluation job). On a mature stage root the store holds 478 such entries, so the first
 * auto-replay tick spent minutes inside the sweep: `:3457` showed `ticks 0, running true` for nine minutes
 * with the operations-server child burning ~77% of a core, and no capture was replayed in that window.
 *
 * The pass is a bounded background drain, not a startup gate: at most
 * `MAX_ABANDONED_RECONCILIATIONS_PER_SWEEP` entries per sweep, with the once-per-process set carrying the
 * cursor so later ticks continue exactly where the previous one stopped and no entry is ever skipped.
 */

function abandonedEntry(index: number): SupervisedReplayEvaluationResumeEntry {
  const replayJobId = `replay-job-${String(index).padStart(4, "0")}`;
  return {
    schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
    replayJobId,
    evaluationJobId: `evaluation-replay-${replayJobId}`,
    requestId: `replay-${replayJobId}`,
    sourceCaptureRequestId: `req-${replayJobId}`,
    sourceEndpointId: "endpoint:source",
    sourceModelId: "model:source",
    counterfactualPackages: [
      { endpointId: "endpoint:candidate", modelId: "model:candidate", reasoningEffort: null },
    ],
    evaluationCriteria: { schemaVersion: "role-model.semantic-criteria.v1", requiredTerms: ["ok"] },
    evaluationCriteriaDigest: `sha256:${"c".repeat(64)}`,
    recordedAtMs: 1_000 + index,
    attempts: 8,
    resolvedAtMs: 2_000 + index,
    outcome: "abandoned",
    lastError: "durable routing-shadow trial is not recoverable without an evidence ref",
  };
}

test("run100j the abandoned-entry reconcile drain is bounded per sweep and never skips an entry", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run100j-abandoned-reconcile-"));
  try {
    const store = createSupervisedReplayEvaluationResumeStore({
      filePath: path.join(root, "resume.json"),
      maxEntries: 64,
    });
    const total = 40;
    for (let index = 0; index < total; index += 1) store.record(abandonedEntry(index));

    const reconciled: string[] = [];
    const onAbandoned = async (entry: SupervisedReplayEvaluationResumeEntry) => {
      reconciled.push(entry.replayJobId);
    };
    const sweep = () =>
      resumePendingSupervisedReplayEvaluations({
        store,
        isEvaluationComplete: async () => false,
        complete: async () => null,
        onAbandoned,
      });

    const first = await sweep();
    expect(first.reconciled).toBeLessThanOrEqual(25);
    expect(reconciled.length).toBe(first.reconciled);
    // The first sweep must not walk the whole store: that is what held the first tick open.
    expect(reconciled.length).toBeLessThan(total);

    const second = await sweep();
    expect(second.reconciled).toBeGreaterThan(0);
    expect(new Set(reconciled).size).toBe(reconciled.length);

    // Draining to the end covers every abandoned entry exactly once.
    for (let pass = 0; pass < 6 && reconciled.length < total; pass += 1) await sweep();
    expect(reconciled.length).toBe(total);
    expect(new Set(reconciled).size).toBe(total);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
