import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import { decodeExternalizedOperatorReadback } from "../src/track-b-runtime.js";

/**
 * Run 99 R28: oversized operator readbacks cross the packaged boundary as an externalized
 * transfer marker. Observed live: the Learning rollout readback (7 974 bytes) and the pack
 * records readback (28 149 bytes) answered `{transferState, resultHash, byteLength}`, so the
 * packs page rendered "No pack records have been derived" while the durable payload was present
 * in the worker's `durable-output.sqlite`.
 */

const scopeId = "standalone-runtime-stage";

function stateRootWithPayload(
  payload: unknown,
  layout: "extensions/workers" | "workers" = "extensions/workers",
): { root: string; hash: string; key: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "run99-r28-readback-"));
  const workerRoot = path.join(root, scopeId, "track-b", ...layout.split("/"), "knowledge-store");
  mkdirSync(workerRoot, { recursive: true });
  const resultJson = JSON.stringify(payload);
  const hash = `sha256:${Buffer.from(resultJson).toString("hex").slice(0, 8)}`;
  const key = `sha256:${"a".repeat(64)}`;
  const database = new DatabaseSync(path.join(workerRoot, "durable-output.sqlite"));
  database.exec(
    "CREATE TABLE durable_extension_outputs (output_key TEXT PRIMARY KEY, result_json TEXT, result_hash TEXT, byte_length INTEGER)",
  );
  database
    .prepare(
      "INSERT INTO durable_extension_outputs (output_key, result_json, result_hash, byte_length) VALUES (?,?,?,?)",
    )
    .run(key, resultJson, hash, Buffer.byteLength(resultJson));
  database.close();
  return { root, hash, key };
}

describe("run99 R28 externalized operator readback", () => {
  test("reads the payload back from the worker store when only the transfer marker survived", () => {
    const payload = {
      schemaVersion: "role-model.route-package-rollout-state.v1",
      activePackageId: "pack-r28",
      cohortPercent: 10,
    };
    const space = stateRootWithPayload(payload);
    try {
      const decoded = decodeExternalizedOperatorReadback({
        stateRoot: space.root,
        scopeId,
        value: { transferState: "externalized", resultHash: space.hash, byteLength: 123 },
      });
      expect(decoded).toMatchObject(payload);
    } finally {
      rmSync(space.root, { recursive: true, force: true });
    }
  });

  test("reads the payload back by locator and keeps ordinary readbacks untouched", () => {
    const payload = { schemaVersion: "role-model.knowledge-learning-records.v1", records: [] };
    const space = stateRootWithPayload(payload);
    try {
      const decoded = decodeExternalizedOperatorReadback({
        stateRoot: space.root,
        scopeId,
        value: {
          businessOutput: { transferState: "externalized", resultHash: space.hash },
          durableLocator: { outputKey: space.key, resultHash: space.hash },
        },
      });
      expect(decoded).toMatchObject(payload);

      const inline = { schemaVersion: "role-model.learning-activity.v1", pipeline: [] };
      expect(
        decodeExternalizedOperatorReadback({ stateRoot: space.root, scopeId, value: inline }),
      ).toBe(inline);
      // A marker with no matching row is passed through rather than invented.
      const orphan = { transferState: "externalized", resultHash: "sha256:missing" };
      expect(
        decodeExternalizedOperatorReadback({ stateRoot: space.root, scopeId, value: orphan }),
      ).toBe(orphan);
    } finally {
      rmSync(space.root, { recursive: true, force: true });
    }
  });

  test("reads the operator host's own worker store, which is where operator readbacks live", () => {
    // The packaged operator extension host roots its workers at `<track-b>/workers/<id>`, so a
    // readback served by that host is not in `extensions/workers` (observed live for the 28 KB
    // pack-records payload while the rollout payload happened to exist in both stores).
    const payload = {
      schemaVersion: "role-model.knowledge-learning-records.v1",
      scopeId,
      records: [{ recordId: "pack-r28", kind: "pack", state: "validated" }],
    };
    const space = stateRootWithPayload(payload, "workers");
    try {
      const decoded = decodeExternalizedOperatorReadback({
        stateRoot: space.root,
        value: { transferState: "externalized", resultHash: space.hash, byteLength: 28_149 },
      });
      expect(decoded).toMatchObject(payload);
    } finally {
      rmSync(space.root, { recursive: true, force: true });
    }
  });
});
