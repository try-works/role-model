import { Schema } from "effect";

/**
 * S412/S413: Learning per-task ladder ranking. The REAL
 * /api/role-model/operator/learning payload ({ ladders: [...] }) is decoded at this I/O
 * boundary with an exact Schema; a malformed ladder is a typed decode failure, never a
 * fabricated row. Toggle state is PER ROW (roleId + NUL + taskTypeId + a per-row token), so
 * two rows may be pending and each result lands on its own row.
 */

export type LearningPayloadJson =
  | null
  | boolean
  | number
  | string
  | readonly LearningPayloadJson[]
  | { readonly [key: string]: LearningPayloadJson };

const LadderEndpointSchema = Schema.Struct({
  endpointId: Schema.String,
  rank: Schema.optional(Schema.NullOr(Schema.Number)),
  status: Schema.optional(Schema.NullOr(Schema.String)),
});

const LadderRowSchema = Schema.Struct({
  active: Schema.optional(Schema.NullOr(Schema.Boolean)),
  completeness: Schema.Struct({
    admitted: Schema.optional(Schema.NullOr(Schema.Number)),
    configured: Schema.optional(Schema.NullOr(Schema.Number)),
  }),
  ladderVersion: Schema.optional(Schema.NullOr(Schema.Number)),
  nextEligibleAtMs: Schema.optional(Schema.NullOr(Schema.Number)),
  rankedCount: Schema.optional(Schema.NullOr(Schema.Number)),
  roleId: Schema.String,
  rolledBack: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        atMs: Schema.optional(Schema.NullOr(Schema.Number)),
        on: Schema.Boolean,
        reason: Schema.optional(Schema.NullOr(Schema.String)),
      }),
    ),
  ),
  rungs: Schema.optional(Schema.Array(LadderEndpointSchema)),
  taskTypeId: Schema.String,
  taxonomyVersion: Schema.optional(Schema.NullOr(Schema.String)),
  topEndpoints: Schema.Array(LadderEndpointSchema),
});

const LearningErrorPayloadSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
});

const LearningLadderPayloadSchema = Schema.Struct({
  ladders: Schema.Array(LadderRowSchema),
});

type DecodedLadderRow = typeof LadderRowSchema.Type;
type DecodedLadderEndpoint = typeof LadderEndpointSchema.Type;

export interface LearningLadderEndpoint {
  readonly endpointId: string;
  readonly rank: number | null;
  readonly status: string | null;
}

export interface LearningLadderRow {
  readonly active: boolean | null;
  readonly completeness: { readonly admitted: number | null; readonly configured: number | null };
  readonly ladderVersion: number | null;
  readonly nextEligibleAtMs: number | null;
  readonly rankedCount: number | null;
  readonly roleId: string;
  readonly rolledBack: { readonly atMs: number | null; readonly on: boolean; readonly reason: string | null } | null;
  readonly rungs?: readonly LearningLadderEndpoint[];
  readonly taskTypeId: string;
  readonly taxonomyVersion: string | null;
  readonly topEndpoints: readonly LearningLadderEndpoint[];
}

export type LearningLadderParseResult =
  | { readonly ok: true; readonly rows: readonly LearningLadderRow[] }
  | { readonly ok: false; readonly error: string };

const endpointOfDecoded = (endpoint: DecodedLadderEndpoint): LearningLadderEndpoint => ({
  endpointId: endpoint.endpointId,
  rank: endpoint.rank ?? null,
  status: endpoint.status ?? null,
});

const rowOfDecoded = (row: DecodedLadderRow): LearningLadderRow | null => {
  if (row.roleId.length === 0 && row.taskTypeId.length === 0) return null;
  const rolledBack = row.rolledBack ?? null;
  const mapped: LearningLadderRow = {
    active: row.active ?? null,
    completeness: {
      admitted: row.completeness.admitted ?? null,
      configured: row.completeness.configured ?? null,
    },
    ladderVersion: row.ladderVersion ?? null,
    nextEligibleAtMs: row.nextEligibleAtMs ?? null,
    rankedCount: row.rankedCount ?? null,
    roleId: row.roleId,
    rolledBack:
      rolledBack === null
        ? null
        : { atMs: rolledBack.atMs ?? null, on: rolledBack.on, reason: rolledBack.reason ?? null },
    taskTypeId: row.taskTypeId,
    taxonomyVersion: row.taxonomyVersion ?? null,
    topEndpoints: row.topEndpoints.map(endpointOfDecoded),
  };
  return row.rungs === undefined ? mapped : { ...mapped, rungs: row.rungs.map(endpointOfDecoded) };
};

export const parseLearningLadderPayload = (body: LearningPayloadJson): LearningLadderParseResult => {
  try {
    const decoded = Schema.decodeUnknownSync(LearningLadderPayloadSchema)(body);
    const rows: LearningLadderRow[] = [];
    for (const entry of decoded.ladders) {
      const row = rowOfDecoded(entry);
      if (row === null) return { error: "learning ladder row has an empty identity", ok: false };
      rows.push(row);
    }
    return { ok: true, rows };
  } catch {
    return { error: "learning ladder payload has an unknown shape", ok: false };
  }
};

export const parseStoredLadderRow = (meta: string): LearningLadderRow | null => {
  try {
    // SAFETY: readback meta is JSON serialized by this module from a decoded ladder row.
    const raw = JSON.parse(meta) as LearningPayloadJson;
    const parsed = parseLearningLadderPayload({ ladders: [raw] });
    return parsed.ok ? (parsed.rows[0] ?? null) : null;
  } catch {
    return null;
  }
};

export const learningLadderRowKey = (
  row: Pick<LearningLadderRow, "roleId" | "taskTypeId">,
  scopeId?: string,
): string =>
  (scopeId === undefined || scopeId.length === 0 ? "" : scopeId + "\u0000") + row.roleId + "\u0000" + row.taskTypeId;

export interface LearningRollbackPayload {
  readonly reason: "operator_ui_ladder_activate" | "operator_ui_ladder_rollback";
  readonly roleId: string;
  readonly rolledBack: boolean;
  readonly scopeId: string;
  readonly taskTypeId: string;
}

export const learningRollbackPayload = (
  row: Pick<LearningLadderRow, "roleId" | "taskTypeId">,
  rolledBack: boolean,
  scopeId: string,
): LearningRollbackPayload => ({
  reason: rolledBack ? "operator_ui_ladder_rollback" : "operator_ui_ladder_activate",
  roleId: row.roleId,
  rolledBack,
  scopeId,
  taskTypeId: row.taskTypeId,
});

export const LearningRankingPhaseSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  phase: Schema.Literals(["idle", "confirming", "pending", "error"]),
  scopeId: Schema.optional(Schema.String),
  token: Schema.optional(Schema.Number),
});
export type LearningRankingPhase = typeof LearningRankingPhaseSchema.Type;

export const LearningRankingStateSchema = Schema.Struct({
  nextToken: Schema.optional(Schema.Number),
  phases: Schema.Record(Schema.String, LearningRankingPhaseSchema),
  scopeId: Schema.optional(Schema.String),
});
export type LearningRankingState = typeof LearningRankingStateSchema.Type;

export const initialLearningRankingState = (): LearningRankingState => ({ phases: {} });

export interface LearningRankingClient {
  readonly rollbackLadder: (payload: LearningRollbackPayload) => Promise<void>;
}

interface LearningRankingClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

export const createLearningRankingClient = (
  options: LearningRankingClientOptions = {},
): LearningRankingClient => ({
  rollbackLadder: async (payload) => {
    const fetchImpl = options.fetchImpl ?? fetch;
    const headers: HeadersInit = options.token === undefined
      ? { accept: "application/json", "content-type": "application/json" }
      : { accept: "application/json", authorization: "Bearer " + options.token, "content-type": "application/json" };
    const response = await fetchImpl((options.baseUrl ?? "") + "/api/role-model/operator/learning/rollback-pack", {
      body: JSON.stringify(payload),
      headers,
      method: "POST",
    });
    const parsed: LearningPayloadJson = await response.json();
    if (!response.ok) {
      let detail = "learning ladder rollback failed";
      try {
        // SAFETY: the error body schema above decodes exactly these two optional strings.
        const decodedError = Schema.decodeUnknownSync(LearningErrorPayloadSchema)(parsed) as {
          readonly error?: string;
          readonly message?: string;
        };
        detail = decodedError.error ?? decodedError.message ?? detail;
      } catch {
        // keep the bounded default
      }
      throw new Error(detail);
    }
  },
});
