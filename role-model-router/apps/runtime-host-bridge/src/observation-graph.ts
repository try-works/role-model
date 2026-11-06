import { DatabaseSync } from "node:sqlite";

import {
  type GraphArtifactReference,
  type RuntimeObservationGraphStore,
  hydrateRuntimeObservationGraphPointer,
  readRuntimeObservationStorageRecord,
} from "@role-model-router/sqlite-memory";

/** One SQL observation row joined to the content-addressed rich graph it points at. */
export interface HydratedObservationGraph {
  readonly requestId: string;
  readonly scopeId: string;
  readonly artifactId: string;
  readonly contentHash: string;
  readonly graph: Readonly<Record<string, unknown>>;
}

const isGraphArtifactReference = (value: unknown): value is GraphArtifactReference => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.scopeId === "string" &&
    typeof candidate.artifactId === "string" &&
    typeof candidate.contentHash === "string"
  );
};

const readLegacyReference = (
  databasePath: string,
  requestId: string,
  artifactId: string,
): GraphArtifactReference => {
  const database = new DatabaseSync(databasePath);
  try {
    const row = database
      .prepare(
        "SELECT scope_id,artifact_id,artifact_path,artifact_content_hash FROM legacy_graph_migration_refs WHERE source_table=? AND source_id=?",
      )
      .get("runtime_observations", requestId) as
      | {
          scope_id: string;
          artifact_id: string;
          artifact_path: string;
          artifact_content_hash: string;
        }
      | undefined;
    if (!row || row.artifact_id !== artifactId)
      throw new Error("graph observation pointer reference is missing or inconsistent");
    return {
      scopeId: row.scope_id,
      artifactId: row.artifact_id,
      artifactPath: row.artifact_path,
      contentHash: row.artifact_content_hash,
    };
  } finally {
    database.close();
  }
};

/**
 * R23 rich graph hydration: read the bounded SQL pointer from `runtime_observations`, resolve
 * either its inline artifact reference or the legacy reference row on the same database, then
 * dereference and validate the content-addressed graph through the backend graph store.
 * Returns null only when no SQL row exists; an inconsistent pointer throws instead of
 * returning a partial/compact graph.
 */
export function readHydratedObservationGraph(input: {
  readonly databasePath: string;
  readonly graphStore: Pick<RuntimeObservationGraphStore, "read">;
  readonly requestId: string;
}): HydratedObservationGraph | null {
  const pointer = readRuntimeObservationStorageRecord({
    databasePath: input.databasePath,
    requestId: input.requestId,
  });
  if (pointer === null) return null;
  const rawReference = pointer.artifactRef;
  const reference =
    typeof rawReference === "string"
      ? readLegacyReference(input.databasePath, input.requestId, rawReference)
      : isGraphArtifactReference(rawReference)
        ? rawReference
        : null;
  if (reference === null) throw new Error("graph observation pointer has no artifact reference");
  const graph = hydrateRuntimeObservationGraphPointer({
    databasePath: input.databasePath,
    pointer,
    graphStore: input.graphStore,
  });
  if (graph === null) throw new Error("graph observation pointer is not a rich graph pointer");
  return {
    requestId: input.requestId,
    scopeId: reference.scopeId,
    artifactId: reference.artifactId,
    contentHash: reference.contentHash,
    graph,
  };
}
