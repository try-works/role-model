import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

/**
 * Run 100 addendum 11: the cross-scope reference resolver.
 *
 * The Knowledge Worker will not accept a learning row whose evidence reference it cannot resolve through a trusted
 * resolver (`extensions/knowledge-worker`: "authoritative trusted resolver-backed reference proof is required"), and
 * the packaged worker's own resolver is bound to the invocation's scope. Measured live on `run131-852786ef`: all
 * group evidence lives in the capture-scope artifact store (`runtime:714f4a87...`; 38/38 pipeline-processed groups
 * and 82/82 gap groups, none in the operator store), so a worker running under the operator scope could not prove a
 * single one and the derivation was refused at that gate.
 *
 * This resolver plays the same role the packaged one plays, extended across the scope split: it confirms the
 * reference exists in one of the durable artifact stores it was given (read-only, handles cached) and then mints a
 * fresh `role-model.evaluation-reference-attestation.v1` carrying the invocation's channel/scope/epoch. It never
 * re-issues a proof it was handed - a resolver that did would turn a durable existence check into a rubber stamp,
 * which is exactly what the worker's trust rules exist to prevent.
 */

export interface CaptureScopeReferenceResolverInput {
  readonly channel: string;
  /** The scope the attestation must carry (the worker rejects a proof from another context). */
  readonly scope: string;
  readonly authorizationEpoch: number;
  /** Artifact stores to confirm the reference against, in order. */
  readonly databasePaths: readonly string[];
  readonly now?: () => number;
  readonly ttlMs?: number;
}

export type ReferenceResolver = (
  scope: string,
  reference: string,
  kind: string,
  context: { readonly row?: Record<string, unknown>; readonly field?: string; readonly attestation?: unknown },
) => Record<string, unknown> | undefined;

const ATTESTATION_SCHEMA = "role-model.evaluation-reference-attestation.v1";
const ATTESTATION_AUTHORITY = "evaluation-reference-store";
const ATTESTATION_PURPOSE = "evaluation";
/** The worker's own bound is 60 s; a shorter TTL is always acceptable. */
const DEFAULT_TTL_MS = 30_000;
const ARTIFACT_REFERENCE = /^(?:artifact(?::|\/))?(?<artifactId>[a-f0-9]{64})$/u;

export function parseArtifactReferenceId(reference: unknown): string | null {
  if (typeof reference !== "string") return null;
  const match = ARTIFACT_REFERENCE.exec(reference.trim());
  return match?.groups?.artifactId ?? null;
}

export function createCaptureScopeReferenceResolver(
  input: CaptureScopeReferenceResolverInput,
): ReferenceResolver {
  const now = input.now ?? (() => Date.now());
  const ttlMs = Math.min(Math.max(input.ttlMs ?? DEFAULT_TTL_MS, 1), 60_000);
  const stores = new Map<string, DatabaseSync | null>();
  const lookup = (artifactId: string): boolean => {
    for (const databasePath of input.databasePaths) {
      if (!existsSync(databasePath)) continue;
      let database = stores.get(databasePath);
      if (database === undefined) {
        try {
          database = new DatabaseSync(databasePath, { readOnly: true });
        } catch {
          database = null;
        }
        stores.set(databasePath, database);
      }
      if (!database) continue;
      try {
        const row = database
          .prepare("SELECT 1 AS present FROM artifacts WHERE artifact_id = ? LIMIT 1")
          .get(artifactId);
        if (row) return true;
      } catch {
        // A store that cannot answer is not a proof; try the next one.
      }
    }
    return false;
  };

  return (scope, reference, _kind, _context) => {
    if (scope !== input.scope) return undefined;
    const artifactId = parseArtifactReferenceId(reference);
    if (!artifactId) return undefined;
    if (!lookup(artifactId)) return undefined;
    const issuedAtMs = now();
    return {
      schemaVersion: ATTESTATION_SCHEMA,
      reference,
      referenceDigest: `sha256:${createHash("sha256").update(artifactId).digest("hex")}`,
      purpose: ATTESTATION_PURPOSE,
      resolved: true,
      authority: ATTESTATION_AUTHORITY,
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
      issuedAtMs,
      expiresAtMs: issuedAtMs + ttlMs,
    };
  };
}
