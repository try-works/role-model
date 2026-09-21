import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
  type SupervisedReplayEvaluationResumeEntry,
  createSupervisedReplayEvaluationResumeStore,
  resumePendingSupervisedReplayEvaluations,
  selectResumableSupervisedReplayEvaluations,
} from "../src/supervised-replay-evaluation-resume.js";

/**
 * Run 99 R33 live finding (stage v158, `:3457`).
 *
 * Four durable evaluation jobs were stranded in `scoring` with every trial already scored:
 *
 *   `evaluation-replay-20d877706f1f75def03b`, `…579d95a584e91bcfc8cc`,
 *   `…d9ea1d0fc1806175b969`, `…edb0bc4e3bf91db0d4c5`
 *
 * The supervised-replay evaluation completer had been interrupted between "scores recorded" and
 * "comparison group finalized" (this run restarted the runtime repeatedly while deploying), and
 * nothing re-enters it: `EvaluationCore.reconcileTerminalJobs` completes a job only when a
 * *finalized* comparison group already covers its trials, and `evaluation:reconcile-jobs` has no
 * production caller. Those captures' comparisons therefore never reached the learner.
 *
 * The host now records a bounded resume entry for every supervised-replay evaluation it starts, and a
 * sweep re-runs the completion for entries whose evaluation job is not complete yet. Entries are
 * bounded, retried with an attempt cap, and never silently dropped: an entry that exhausts its
 * attempts is recorded as abandoned with its reason.
 */

function entry(replayJobId: string, recordedAtMs: number): SupervisedReplayEvaluationResumeEntry {
  return {
    schemaVersion: "role-model.supervised-replay-evaluation-resume.v1",
    replayJobId,
    evaluationJobId: `evaluation-replay-${replayJobId.slice(-20)}`,
    requestId: `replay-${replayJobId}`,
    sourceCaptureRequestId: `req-${replayJobId}`,
    sourceEndpointId: "endpoint:source",
    sourceModelId: "model:source",
    counterfactualPackages: [
      { endpointId: "endpoint:candidate", modelId: "model:candidate", reasoningEffort: null },
    ],
    evaluationCriteria: { schemaVersion: "role-model.semantic-criteria.v1", requiredTerms: ["ok"] },
    evaluationCriteriaDigest: `sha256:${"a".repeat(64)}`,
    recordedAtMs,
    attempts: 0,
    resolvedAtMs: null,
    outcome: null,
    lastError: null,
  };
}

function withRoot(run: (root: string) => Promise<void> | void): Promise<void> | void {
  const root = mkdtempSync(path.join(tmpdir(), "run99-evaluation-resume-"));
  const result = run(root);
  if (result instanceof Promise) {
    return result.finally(() => rmSync(root, { recursive: true, force: true }));
  }
  rmSync(root, { recursive: true, force: true });
}

describe("run99 R33 supervised replay evaluation resume", () => {
  it("persists resume entries durably and bounds the store", () => {
    withRoot((root) => {
      const filePath = path.join(root, "resume.json");
      const store = createSupervisedReplayEvaluationResumeStore({ filePath, maxEntries: 2 });
      store.record(entry("job-1", 1));
      store.record(entry("job-2", 2));
      store.record(entry("job-3", 3));

      const reopened = createSupervisedReplayEvaluationResumeStore({ filePath, maxEntries: 2 });
      const ids = reopened
        .list()
        .map((row) => row.replayJobId)
        .sort();
      expect(ids).toEqual(["job-2", "job-3"]);
      expect(reopened.list().every((row) => row.attempts === 0)).toBe(true);
    });
  });

  it("selects only unresolved entries below the attempt cap, oldest first", () => {
    const entries = [
      { ...entry("job-new", 30) },
      { ...entry("job-old", 10) },
      { ...entry("job-done", 20), resolvedAtMs: 40, outcome: "candidate" },
      { ...entry("job-stuck", 25), attempts: SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS },
    ];
    const selected = selectResumableSupervisedReplayEvaluations({ entries, limit: 10 });
    expect(selected.map((row) => row.replayJobId)).toEqual(["job-old", "job-new"]);
    expect(
      selectResumableSupervisedReplayEvaluations({ entries, limit: 1 }).map(
        (row) => row.replayJobId,
      ),
    ).toEqual(["job-old"]);
  });

  it("self-heals an entry whose evaluation job already completed", async () => {
    await withRoot(async (root) => {
      const store = createSupervisedReplayEvaluationResumeStore({
        filePath: path.join(root, "resume.json"),
      });
      store.record(entry("job-complete", 1));
      let completions = 0;
      const result = await resumePendingSupervisedReplayEvaluations({
        store,
        isEvaluationComplete: async () => true,
        complete: async () => {
          completions += 1;
          return { outcome: "candidate", comparisonGroupId: "comparison:x" };
        },
      });
      expect(completions).toBe(0);
      expect(result).toMatchObject({ resumed: 1, completed: 1, failed: 0, remaining: 0 });
      expect(store.list()[0]?.resolvedAtMs).not.toBeNull();
    });
  });

  it("re-runs the completion for a pending entry and resolves it with the comparison", async () => {
    await withRoot(async (root) => {
      const store = createSupervisedReplayEvaluationResumeStore({
        filePath: path.join(root, "resume.json"),
      });
      store.record(entry("job-pending", 1));
      const seen: string[] = [];
      const result = await resumePendingSupervisedReplayEvaluations({
        store,
        isEvaluationComplete: async () => false,
        complete: async (row) => {
          seen.push(row.replayJobId);
          return { outcome: "candidate", comparisonGroupId: "comparison:job-pending" };
        },
      });
      expect(seen).toEqual(["job-pending"]);
      expect(result).toMatchObject({ resumed: 1, completed: 1, failed: 0, remaining: 0 });
      const resolved = store.list()[0];
      expect(resolved?.resolvedAtMs).not.toBeNull();
      expect(resolved?.outcome).toBe("candidate");
    });
  });

  it("keeps a failed entry pending, counts the attempt, and abandons it at the cap", async () => {
    await withRoot(async (root) => {
      const store = createSupervisedReplayEvaluationResumeStore({
        filePath: path.join(root, "resume.json"),
      });
      store.record(entry("job-failing", 1));
      let calls = 0;
      const complete = async () => {
        calls += 1;
        throw new Error(
          "durable replay evaluation is missing branch capture for endpoint:candidate",
        );
      };

      const first = await resumePendingSupervisedReplayEvaluations({
        store,
        isEvaluationComplete: async () => false,
        complete,
      });
      expect(first).toMatchObject({ resumed: 1, completed: 0, failed: 1, remaining: 1 });
      expect(store.list()[0]?.attempts).toBe(1);
      expect(String(store.list()[0]?.lastError)).toMatch(/missing branch capture/i);

      for (let attempt = 0; attempt < SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS; attempt += 1) {
        await resumePendingSupervisedReplayEvaluations({
          store,
          isEvaluationComplete: async () => false,
          complete,
        });
      }
      const abandoned = store.list()[0];
      expect(abandoned?.resolvedAtMs).not.toBeNull();
      expect(abandoned?.outcome).toBe("abandoned");
      expect(abandoned?.attempts).toBe(SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS);
      await resumePendingSupervisedReplayEvaluations({
        store,
        isEvaluationComplete: async () => false,
        complete,
      });
      expect(calls).toBe(SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS);
    });
  });

  /**
   * Run 98 addendum 34 S5 (live stage v200): three real captures cycled for ever on
   * `replay job is awaiting evaluation and cannot be re-leased`. The resume entry was abandoned at the
   * cap, but the replay job stayed `awaiting_evaluation`, so the scheduler re-claimed it on every tick
   * and the capture neither evaluated nor failed. Abandoning an entry must therefore terminalize the
   * job behind it — exactly once, with the reason that exhausted the attempts.
   */
  it("terminalizes the replay job exactly once when an entry is abandoned", async () => {
    await withRoot(async (root) => {
      const store = createSupervisedReplayEvaluationResumeStore({
        filePath: path.join(root, "resume.json"),
      });
      store.record(entry("job-abandoned", 1));
      const abandoned: { readonly replayJobId: string; readonly reason: string }[] = [];
      const complete = async () => {
        throw new Error(
          "durable evaluation job evaluation-replay-67cc04911acd656424cf is unavailable for resume",
        );
      };
      const sweep = () =>
        resumePendingSupervisedReplayEvaluations({
          store,
          isEvaluationComplete: async () => false,
          complete,
          onAbandoned: (resolved, error) => {
            abandoned.push({
              replayJobId: resolved.replayJobId,
              reason: String((error as { message?: unknown })?.message ?? error),
            });
          },
        });

      for (let attempt = 0; attempt < SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS; attempt += 1) {
        await sweep();
        if (attempt < SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS - 1) {
          expect(abandoned).toHaveLength(0);
        }
      }
      expect(abandoned).toHaveLength(1);
      expect(abandoned[0]?.replayJobId).toBe("job-abandoned");
      expect(abandoned[0]?.reason).toMatch(/unavailable for resume/);

      // A later sweep neither retries the entry nor terminalizes the job twice.
      const after = await sweep();
      expect(after.resumed).toBe(0);
      expect(abandoned).toHaveLength(1);
    });
  });

  /**
   * Run 98 addendum 34 S5: the three live captures had already crossed the attempt cap *before* the
   * repair shipped, so the sweep no longer selected them and their replay jobs stayed
   * `awaiting_evaluation`. An abandoned entry must therefore be reconciled — once per runtime start —
   * even though it is not selectable any more.
   */
  it("reconciles an entry abandoned before the repair exactly once", async () => {
    await withRoot(async (root) => {
      const store = createSupervisedReplayEvaluationResumeStore({
        filePath: path.join(root, "resume.json"),
      });
      store.record({
        ...entry("job-pre-abandoned", 1),
        attempts: SUPERVISED_REPLAY_EVALUATION_MAX_ATTEMPTS,
      });
      store.recordFailure(
        "job-pre-abandoned",
        new Error(
          "durable evaluation job evaluation-replay-67cc04911acd656424cf is unavailable for resume",
        ),
      );
      const reconciled: string[] = [];
      const sweep = () =>
        resumePendingSupervisedReplayEvaluations({
          store,
          isEvaluationComplete: async () => false,
          complete: async () => {
            throw new Error("must not be re-selected");
          },
          onAbandoned: (resolved) => {
            reconciled.push(resolved.replayJobId);
          },
        });

      const first = await sweep();
      expect(first.resumed).toBe(0);
      expect(first.reconciled).toBe(1);
      expect(reconciled).toEqual(["job-pre-abandoned"]);
      const second = await sweep();
      expect(second.reconciled).toBe(0);
      expect(reconciled).toHaveLength(1);
    });
  });
});
