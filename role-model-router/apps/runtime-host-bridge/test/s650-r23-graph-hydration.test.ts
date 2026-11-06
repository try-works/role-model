import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";

import { composeBackendStorage } from "../src/composition-dag.js";
import { readHydratedObservationGraph } from "../src/observation-graph.js";

/** S650 (R23): production rich-graph persistence and typed SQL-row hydration. */

const storageFor = (scopeId: string) =>
  composeBackendStorage({
    channel: "development",
    runtimeStateRoot: mkdtempSync(path.join(os.tmpdir(), "s650-r23-graph-")),
    scopeId,
    trackBOperationsEndpoint: undefined,
    useFixtures: false,
  });

const writeGraphRow = (input: {
  readonly databasePath: string;
  readonly requestId: string;
  readonly artifactRef: { readonly scopeId: string; readonly artifactId: string; readonly contentHash: string };
}) => {
  const database = new DatabaseSync(input.databasePath);
  try {
    database
      .prepare(
        "INSERT INTO runtime_observations (request_id,routing_decision_id,endpoint_id,conversation_id,created_at_ms,observation_json) VALUES (?,?,?,?,?,?)",
      )
      .run(
        input.requestId,
        "decision-1",
        "endpoint-1",
        "conversation-1",
        Date.now(),
        JSON.stringify({
          requestId: input.requestId,
          artifactRef: input.artifactRef,
          graphPrimary: true,
        }),
      );
  } finally {
    database.close();
  }
};

describe("S650 R23 rich graph hydration", () => {
  test("production storage owns a graph store instead of falling back to a compact row", () => {
    const storage = storageFor("graph-production");
    expect(storage.graphStore).toBeDefined();
  });

  test("a persisted SQL pointer hydrates the rich graph and joins its identity", () => {
    const storage = storageFor("graph-hydrate");
    const graphStore = storage.graphStore;
    expect(graphStore).toBeDefined();
    if (!graphStore) throw new Error("graph store missing");
    const requestId = "request-hydrate";
    const content = JSON.stringify({
      requestId,
      marker: "rich-graph-payload",
      nodes: ["root", "child"],
      edges: [{ from: "root", to: "child", type: "contains" }],
    });
    const contentHash = createHash("sha256").update(content).digest("hex");
    const artifact = graphStore.write({
      scopeId: graphStore.scopeId,
      sourceId: requestId,
      content,
      contentHash,
    });
    const artifactRef = {
      scopeId: graphStore.scopeId,
      artifactId: artifact.artifactId,
      contentHash: artifact.contentHash,
    };
    writeGraphRow({ databasePath: storage.initialization.databasePath, requestId, artifactRef });

    expect(
      readHydratedObservationGraph({
        databasePath: storage.initialization.databasePath,
        graphStore,
        requestId,
      }),
    ).toEqual({
      requestId,
      scopeId: artifactRef.scopeId,
      artifactId: artifactRef.artifactId,
      contentHash: artifactRef.contentHash,
      graph: {
        requestId,
        marker: "rich-graph-payload",
        nodes: ["root", "child"],
        edges: [{ from: "root", to: "child", type: "contains" }],
      },
    });
  });

  test("a content-hash mismatch refuses hydration instead of returning a partial graph", () => {
    const storage = storageFor("graph-mismatch");
    const graphStore = storage.graphStore;
    expect(graphStore).toBeDefined();
    if (!graphStore) throw new Error("graph store missing");
    const requestId = "request-mismatch";
    const content = JSON.stringify({ requestId, marker: "real" });
    const contentHash = createHash("sha256").update(content).digest("hex");
    const artifact = graphStore.write({
      scopeId: graphStore.scopeId,
      sourceId: requestId,
      content,
      contentHash,
    });
    writeGraphRow({
      databasePath: storage.initialization.databasePath,
      requestId,
      artifactRef: {
        scopeId: graphStore.scopeId,
        artifactId: artifact.artifactId,
        contentHash: artifact.contentHash,
      },
    });
    expect(() =>
      readHydratedObservationGraph({
        databasePath: storage.initialization.databasePath,
        graphStore: { read: () => JSON.stringify({ requestId, marker: "tampered" }) },
        requestId,
      }),
    ).toThrow(/content hash mismatch/i);
  });
});
