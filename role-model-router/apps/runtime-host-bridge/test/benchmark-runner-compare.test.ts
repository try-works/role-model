import { mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import type { BenchmarkCompareRecord } from "../src/benchmark-artifacts.js";
import {
  resetBenchmarkJudgeRuntimeForTests,
  runRoutingCapabilityBenchmark,
} from "../src/benchmark-runner.js";

function initBenchmarkDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS observed_performance_samples (
      sample_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      request_id TEXT,
      routing_decision_id TEXT,
      source_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      sample_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_performance_samples_by_difficulty (
      sample_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      difficulty_bucket TEXT NOT NULL,
      request_id TEXT,
      routing_decision_id TEXT,
      source_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      sample_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      measured_at_ms INTEGER NOT NULL,
      profile_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots_by_difficulty (
      snapshot_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      difficulty_bucket TEXT NOT NULL,
      measured_at_ms INTEGER NOT NULL,
      profile_json TEXT NOT NULL
    );
  `);
  database.close();
}

describe("benchmark-runner compare remediation", () => {
  let artifactRoot = "";

  afterEach(() => {
    artifactRoot = "";
    resetBenchmarkJudgeRuntimeForTests();
    vi.restoreAllMocks();
  });

  test("writes fallback compare artifact when judge compare parse fails", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-compare-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const localEndpoint = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
      healthStatus: "healthy",
    };
    const remoteEndpoint = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [localEndpoint, remoteEndpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (
        _body: Record<string, unknown>,
        requestId: string,
        requestOptions?: { endpointId?: string },
      ) => {
        if (requestId.startsWith("bench-judge-compare-")) {
          return { contentText: "not valid compare json" };
        }
        if (requestId.startsWith("bench-judge-")) {
          return { contentText: '{"score":0.5,"rationale":"partial"}' };
        }
        if (requestOptions?.endpointId === localEndpoint.endpointId) {
          return { contentText: '{"answer":"local"}' };
        }
        if (requestOptions?.endpointId === remoteEndpoint.endpointId) {
          return { contentText: '{"answer":"remote"}' };
        }
        return { contentText: "unexpected" };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [localEndpoint.endpointId, remoteEndpoint.endpointId],
      judgeEndpointId: remoteEndpoint.endpointId,
      mode: "quick",
      caseIds: ["h04-tool-read-router"],
      useJudge: true,
    });

    const comparePath = path.join(
      artifactRoot,
      result.runId,
      "judge",
      "compare",
      "h04-tool-read-router.json",
    );
    const compare = JSON.parse(await readFile(comparePath, "utf8")) as BenchmarkCompareRecord;
    expect(compare.compareFallback).toBe(true);
    expect(compare.compareError).toBe("compare_parse_failed");
    expect(compare.rationale).toContain("[compare_unavailable]");
    expect(compare.relativeRanking.length).toBe(2);

    const manifest = JSON.parse(
      await readFile(path.join(artifactRoot, result.runId, "manifest.json"), "utf8"),
    ) as { compareArtifactCount: number };
    expect(manifest.compareArtifactCount).toBe(1);
  });
});
