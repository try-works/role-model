import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { type ControlKey, parseControlFixture } from "../src/control";
import { type ReadbackKey, parseReadbackFixture } from "../src/readback";

const fixtureDir = path.join(import.meta.dirname, "fixtures", "s26o");
const read = (key: string): unknown =>
  JSON.parse(readFileSync(path.join(fixtureDir, `${key}.json`), "utf8"));

const readbackKeys: readonly ReadbackKey[] = [
  "storeReceipts",
  "queues",
  "localLogs",
  "routerCandidates",
  "requests",
  "routerDecisions",
  "localPeers",
  "systemPeers",
  "runtime",
  "sessionReadiness",
  "dashboard",
  "localSwap",
  "observeActivity",
  "observeLogs",
  "observeRouting",
  "router",
  "localPeerModels",
  "queueConfig",
  "downstreamOpenAI",
  "integrationProviders",
  "benchmarkSuite",
  "storageRetention",
  "models",
  "runtimeSummary",
  "health",
];
const controlKeys: readonly ControlKey[] = ["providers", "endpoints", "controlController"];
const expectedStatus: Partial<Record<ReadbackKey, string>> = {
  dashboard: "ok",
  localLogs: "empty",
  localPeers: "empty",
  localSwap: "empty",
  observeActivity: "ok",
  observeLogs: "empty",
  observeRouting: "empty",
  requests: "empty",
  routerDecisions: "empty",
  storeReceipts: "empty",
  systemPeers: "empty",
  queues: "ok",
  router: "ok",
  routerCandidates: "ok",
  runtime: "ok",
  sessionReadiness: "ok",
  localPeerModels: "empty",
  queueConfig: "ok",
  downstreamOpenAI: "ok",
  integrationProviders: "ok",
  benchmarkSuite: "ok",
  storageRetention: "ok",
  models: "ok",
  runtimeSummary: "ok",
  health: "ok",
};

describe("S26o captured-host parser contracts", () => {
  it("asserts the fixture manifest hashes and capture identity", () => {
    const manifest = JSON.parse(readFileSync(path.join(fixtureDir, "manifest.json"), "utf8")) as {
      artifact: { version: string; commit: string; sourceTree: string; sha: string };
      entries: Record<
        string,
        { url: string; status: number; capturedAt: string; sha256: string; artifact: unknown }
      >;
    };
    expect(manifest.artifact.version).toBe("0.0.20-18-g6c9aeba1");
    expect(manifest.artifact.commit).toBe("6c9aeba15acd09be4fc6776cef66a1041394b65a");
    expect(manifest.artifact.sourceTree).toBe("e79ccfc7ee4c1d9a8eeee07f7e3aee115f2d106e");
    for (const [file, entry] of Object.entries(manifest.entries)) {
      const bytes = readFileSync(path.join(fixtureDir, file));
      expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(entry.sha256);
      expect(entry.url.length).toBeGreaterThan(0);
      expect(entry.status).toBe(200);
      expect(entry.capturedAt.length).toBeGreaterThan(0);
      expect(entry.artifact).toBeDefined();
    }
  });

  it("rejects an invalid endpoints body instead of indexing a row", () => {
    expect(parseControlFixture("endpoints", [{}]).status).toBe("error");
  });

  for (const key of readbackKeys) {
    it(`readback ${key} accepts its captured packaged-host fixture`, () => {
      const state = parseReadbackFixture(key, read(key));
      expect(state.status).not.toBe("error");
      expect(state.message).toBeUndefined();
      if (expectedStatus[key] !== undefined) expect(state.status).toBe(expectedStatus[key]);
      if (expectedStatus[key] === "ok") expect(state.rows.length).toBeGreaterThan(0);
      const first: Partial<Record<ReadbackKey, [string, string]>> = {
        dashboard: ["Requests", "1"],
        downstreamOpenAI: ["contractVersion", "role-model.downstream.openai.v1"],
        health: ["Status", "—"],
        runtimeSummary: ["Endpoint", "http://127.0.0.1:3458"],
        observeActivity: ["moonshot/kimi-k2.5", ""],
        queueConfig: ["schemaVersion", "role-model.queue-policy.v1"],
        runtime: ["applied", "false"],
        sessionReadiness: ["Overall", "unobserved"],
      };
      const expectation = first[key];
      if (expectation !== undefined) {
        expect(state.rows[0]?.label).toBe(expectation[0]);
        expect(state.rows[0]?.value).toBe(expectation[1]);
      }
    });
  }
  for (const key of controlKeys) {
    it(`control ${key} accepts its captured packaged-host fixture`, () => {
      const state = parseControlFixture(key, read(key));
      expect(state.status).not.toBe("error");
      expect(state.error).toBeUndefined();
    });
  }
});
