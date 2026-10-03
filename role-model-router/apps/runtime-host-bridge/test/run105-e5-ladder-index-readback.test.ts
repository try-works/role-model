import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import { decodeExternalizedOperatorReadback } from "../src/track-b-runtime.js";

/**
 * Run 105 E5 (package E, R12): the operator records readback grows a sibling `ladders`
 * array. The store workers externalize any payload over the 16 KiB inline-frame cap, and the
 * ladder index pages every (role, task) row, so the decode path must recover a records payload
 * that carries the ladder index - the same guarantee run 99 R28 proved for the plain records
 * payload. No production change is expected here; this test pins the contract so a future
 * framing regression cannot silently eat the ladder index.
 */

const scopeId = "standalone-runtime-stage";

function ladderRow(index: number) {
  return {
    roleId: `role-${index}`,
    taskTypeId: `task-${index}`,
    taxonomyVersion: "1.0.0-alpha.1",
    topEndpoints: [
      { endpointId: `endpoint:a${index}`, rank: 1, status: "available" },
      { endpointId: `endpoint:b${index}`, rank: 2, status: "available" },
      { endpointId: `endpoint:c${index}`, rank: 3, status: "unavailable" },
    ],
    rankedCount: 5,
    completeness: { admitted: 3, configured: 7 },
    state: "partial",
    active: true,
    rolledBack: { on: false, reason: null, atMs: null },
    ladderVersion: 2,
    nextEligibleAtMs: null,
  };
}

function stateRootWithPayload(payload: unknown): { root: string; hash: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "run105-e5-readback-"));
  const workerRoot = path.join(root, scopeId, "track-b", "extensions", "workers", "knowledge-store");
  mkdirSync(workerRoot, { recursive: true });
  const resultJson = JSON.stringify(payload);
  const hash = `sha256:${Buffer.from(resultJson).toString("hex").slice(0, 8)}`;
  const database = new DatabaseSync(path.join(workerRoot, "durable-output.sqlite"));
  database.exec(
    "CREATE TABLE durable_extension_outputs (output_key TEXT PRIMARY KEY, result_json TEXT, result_hash TEXT, byte_length INTEGER)",
  );
  database
    .prepare(
      "INSERT INTO durable_extension_outputs (output_key, result_json, result_hash, byte_length) VALUES (?,?,?,?)",
    )
    .run(`sha256:${`f`.repeat(64)}`, resultJson, hash, Buffer.byteLength(resultJson));
  database.close();
  return { root, hash };
}

describe("run105 E5 ladder index readback", () => {
  test("recovers a records payload carrying the ladder index from the externalized store", () => {
    // 220 rows keep the payload well above the 16 KiB inline-frame cap, so the marker path is real.
    const ladders = Array.from({ length: 220 }, (_, index) => ladderRow(index));
    const payload = {
      schemaVersion: "role-model.knowledge-learning-records.v1",
      scopeId,
      laddersState: "reported",
      records: [{ recordId: "pack-legacy", kind: "pack", state: "validated" }],
      ladders,
    };
    const space = stateRootWithPayload(payload);
    try {
      const decoded = decodeExternalizedOperatorReadback({
        stateRoot: space.root,
        scopeId,
        value: { transferState: "externalized", resultHash: space.hash, byteLength: 28_149 },
      });
      expect(decoded).toMatchObject({ schemaVersion: "role-model.knowledge-learning-records.v1", scopeId });
      expect(Array.isArray(decoded.ladders)).toBe(true);
      expect(decoded.ladders).toHaveLength(220);
      expect(decoded.ladders[0]).toMatchObject({
        roleId: "role-0",
        taskTypeId: "task-0",
        completeness: { admitted: 3, configured: 7 },
        state: "partial",
        active: true,
        rolledBack: { on: false },
      });
      expect(decoded.records).toHaveLength(1);
      expect(decoded.laddersState).toBe("reported");
    } finally {
      rmSync(space.root, { recursive: true, force: true });
    }
  });
});
