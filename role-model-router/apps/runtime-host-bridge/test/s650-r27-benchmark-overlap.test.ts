import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import { BenchmarkBusyError, BenchmarkCancelledError, makeBenchmarkGateOwner } from "../src/benchmark-gate.js";
import { readBenchmarkRunProgress } from "../src/benchmark-progress.js";
import { runRoutingCapabilityBenchmark } from "../src/benchmark-runner.js";

function initBenchmarkDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS observed_performance_samples (sample_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, request_id TEXT, routing_decision_id TEXT, source_type TEXT NOT NULL, timestamp_ms INTEGER NOT NULL, sample_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_performance_samples_by_difficulty (sample_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, difficulty_bucket TEXT NOT NULL, request_id TEXT, routing_decision_id TEXT, source_type TEXT NOT NULL, timestamp_ms INTEGER NOT NULL, sample_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots (snapshot_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, measured_at_ms INTEGER NOT NULL, profile_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots_by_difficulty (snapshot_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, difficulty_bucket TEXT NOT NULL, measured_at_ms INTEGER NOT NULL, profile_json TEXT NOT NULL);
  `);
  database.close();
}

const endpoint = (endpointId: string, modelId: string) => ({ endpointId, modelId, sourceType: "remote" as const, healthStatus: "healthy" });

describe("S650 R27 benchmark cancellation/overlap", () => {
  test("a second real runner on the same judge is refused with the first id and makes no upstream call; cancel rejects the first and a third gets a fresh slot", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "s650-r27-overlap-"));
    const makeDb = async (name: string) => {
      const file = path.join(root, name, "state", "memory.db");
      await mkdir(path.dirname(file), { recursive: true });
      initBenchmarkDatabase(file);
      return file;
    };
    const databasePathA = await makeDb("a");
    const databasePathB = await makeDb("b");
    const databasePathC = await makeDb("c");
    const endpoints = [endpoint("ep-a", "model/a"), endpoint("ep-b", "model/b")];
    const judgeEndpointId = "ep-b";

    const rawGate = makeBenchmarkGateOwner({ mode: "reject-overlap" });
    const admissions = new Map<string, ReturnType<typeof rawGate.begin>>();
    const gate = {
      ...rawGate,
      begin: (runId: string) => {
        const admission = rawGate.begin(runId);
        admissions.set(runId, admission);
        return admission;
      },
    };

    let releaseA: (() => void) | null = null;
    const blockedA = new Promise<void>((resolve) => { releaseA = resolve; });
    let enteredA: (() => void) | null = null;
    const enteredAPromise = new Promise<void>((resolve) => { enteredA = resolve; });
    let callsA = 0;
    let callsB = 0;
    let callsC = 0;
    let releaseC: (() => void) | null = null;
    const blockedC = new Promise<void>((resolve) => { releaseC = resolve; });
    let enteredC: (() => void) | null = null;
    const enteredCPromise = new Promise<void>((resolve) => { enteredC = resolve; });
    const makeDeps = (name: string, execute: () => Promise<{ contentText: string }>, signal?: AbortSignal) => ({
      benchmarkArtifactRoot: path.join(root, name),
      benchmarkGate: gate,
      databasePath: path.join(root, name, "state", "memory.db"),
      deriveEndpointVersion: () => "v1",
      listConfiguredEndpoints: async () => endpoints,
      ...(signal === undefined ? {} : { signal }),
      executeChatCompletions: execute,
    });
    const depsA = makeDeps("a", async () => {
      callsA += 1;
      enteredA?.();
      await blockedA;
      return { contentText: '{"answer":"a"}' };
    });
    const depsB = makeDeps("b", async () => { callsB += 1; return { contentText: '{"answer":"b"}' }; });
    const depsC = makeDeps("c", async () => { callsC += 1; enteredC?.(); await blockedC; return { contentText: '{"answer":"c"}' }; });
    const requestA = { endpointIds: ["ep-a"], judgeEndpointId, mode: "quick" as const, caseIds: ["h04-tool-read-router"], runId: "run-overlap-a", useJudge: false };
    const requestB = { ...requestA, runId: "run-overlap-b" };
    const requestC = { ...requestA, runId: "run-overlap-c" };

    const runA = runRoutingCapabilityBenchmark(depsA, requestA);
    await enteredAPromise;
    expect(rawGate.running()).toBe(true);
    await expect(runRoutingCapabilityBenchmark(depsB, requestB)).rejects.toBeInstanceOf(BenchmarkBusyError);
    expect(callsB).toBe(0);
    expect(callsA).toBe(1);
    const firstAdmission = admissions.get("run-overlap-a");
    expect(firstAdmission?.ok).toBe(true);
    if (firstAdmission?.ok === true) expect(firstAdmission.signal.aborted).toBe(false);

    rawGate.cancel("operator cancelled A");
    if (firstAdmission?.ok === true) expect(firstAdmission.signal.aborted).toBe(true);
    releaseA?.();
    await expect(runA).rejects.toBeInstanceOf(BenchmarkCancelledError);
    expect(readBenchmarkRunProgress("run-overlap-a")?.status).toBe("failed");
    expect(rawGate.running()).toBe(false);

    const runC = runRoutingCapabilityBenchmark(depsC, requestC);
    await enteredCPromise;
    expect(callsC).toBeGreaterThan(0);
    const thirdAdmission = admissions.get("run-overlap-c");
    expect(thirdAdmission?.ok).toBe(true);
    if (thirdAdmission?.ok === true) expect(thirdAdmission.signal.aborted).toBe(false);

    // A late finish from the first admission must not release the third run's slot.
    if (firstAdmission?.ok === true) firstAdmission.finish();
    expect(rawGate.running()).toBe(true);
    releaseC?.();
    const resultC = await runC;
    expect(resultC.endpointGrades).toHaveLength(1);
    expect(readBenchmarkRunProgress("run-overlap-c")?.status).toBe("completed");
    expect(rawGate.running()).toBe(false);
  }, 30_000);
});