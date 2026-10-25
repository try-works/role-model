import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseControlFixture, type ControlKey } from "../src/control";
import { parseReadbackFixture, type ReadbackKey } from "../src/readback";

const fixtureDir = path.join(import.meta.dirname, "fixtures", "s26o");
const read = (key: string): unknown => JSON.parse(readFileSync(path.join(fixtureDir, key + ".json"), "utf8"));

const readbackKeys: readonly ReadbackKey[] = [
  "storeReceipts","queues","localLogs","routerCandidates","requests","routerDecisions",
  "localPeers","systemPeers","runtime","sessionReadiness","dashboard","localSwap",
  "observeActivity","observeLogs","observeRouting","router","localPeerModels","queueConfig","downstreamOpenAI","integrationProviders",
];
const controlKeys: readonly ControlKey[] = ["providers", "endpoints", "controlController"];
const expectedStatus: Partial<Record<ReadbackKey, string>> = {
  dashboard: "empty", localLogs: "empty", localPeers: "empty", localSwap: "empty",
  observeActivity: "empty", observeLogs: "empty", observeRouting: "empty",
  requests: "empty", routerDecisions: "empty", storeReceipts: "empty", systemPeers: "empty",
  queues: "ok", router: "ok", routerCandidates: "ok", runtime: "ok", sessionReadiness: "ok",
  localPeerModels: "empty", queueConfig: "ok", downstreamOpenAI: "ok", integrationProviders: "ok",
};

describe("S26o captured-host parser contracts", () => {
  for (const key of readbackKeys) {
    it(`readback ${key} accepts its captured packaged-host fixture`, () => {
      const state = parseReadbackFixture(key, read(key));
      expect(state.status).not.toBe("error");
      expect(state.message).toBeUndefined();
      if (expectedStatus[key] !== undefined) expect(state.status).toBe(expectedStatus[key]);
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