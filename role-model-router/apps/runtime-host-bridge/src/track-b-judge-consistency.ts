import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Run 98 addendum 33 S2 (`guidance/11`; the research's Shi et al. "log position consistency per judge as
 * a first-class metric ... a judge whose consistency is near chance should be excluded from promotion
 * evidence entirely").
 *
 * The pairwise judge already measures a position-order flip per pair (addendum 30 S4's `dual_order`). What
 * was missing is the *aggregate*: nothing counted how often a given judge contradicts itself under a
 * swapped presentation, so a judge could be unreliable while every individual comparison looked fine.
 * This ledger is that aggregate: durable per-judge counts, bounded, and readable by the learner and the
 * operator surface.
 */

export const JUDGE_CONSISTENCY_SCHEMA_VERSION = "role-model.judge-position-consistency.v1";
export const DEFAULT_POSITION_CONSISTENCY_FLOOR = 0.5;
/**
 * A consistency figure only means something with a sample behind it. Ten order checks is the smallest
 * count at which one flip still leaves the judge above the default floor (9/10 = 0.9).
 */
export const MIN_POSITION_CONSISTENCY_CHECKS = 10;

export interface JudgeConsistencyRow {
  readonly judgeEndpointId: string;
  readonly judgeMode: string | null;
  readonly orderChecks: number;
  readonly orderDisagreements: number;
  readonly judgeModeChecks: number;
  readonly judgeModeAgreements: number;
  readonly updatedAtMs: number;
}

export interface JudgeConsistencyLedger {
  readonly record: (input: {
    readonly judgeEndpointId: string;
    readonly judgeMode?: string | null;
    readonly orderCheck?: boolean;
    readonly orderDisagreement?: boolean;
    readonly modeCheck?: boolean;
    readonly modeAgreement?: boolean;
    readonly nowMs?: number;
  }) => JudgeConsistencyRow | null;
  readonly summary: (judgeEndpointId?: string | null) => readonly (JudgeConsistencyRow & {
    readonly consistency: number | null;
  })[];
}

const MAX_JUDGES = 32;

const consistencyOf = (row: JudgeConsistencyRow): number | null =>
  row.orderChecks > 0
    ? Math.round((1 - row.orderDisagreements / row.orderChecks) * 10_000) / 10_000
    : null;

export function createJudgeConsistencyLedger(options: {
  readonly filePath: string;
  readonly now?: () => number;
}): JudgeConsistencyLedger {
  const now = options.now ?? (() => Date.now());
  const load = (): { schemaVersion: string; judges: Record<string, JudgeConsistencyRow> } => {
    try {
      const parsed = JSON.parse(readFileSync(options.filePath, "utf8")) as {
        schemaVersion?: string;
        judges?: Record<string, JudgeConsistencyRow>;
      };
      if (parsed?.schemaVersion === JUDGE_CONSISTENCY_SCHEMA_VERSION && parsed.judges) {
        return { schemaVersion: JUDGE_CONSISTENCY_SCHEMA_VERSION, judges: parsed.judges };
      }
    } catch {
      // A missing or unreadable ledger starts empty; the schema version is written on first mutation.
    }
    return { schemaVersion: JUDGE_CONSISTENCY_SCHEMA_VERSION, judges: {} };
  };

  const persist = (file: {
    schemaVersion: string;
    judges: Record<string, JudgeConsistencyRow>;
  }): void => {
    mkdirSync(path.dirname(options.filePath), { recursive: true });
    const temporary = `${options.filePath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    renameSync(temporary, options.filePath);
  };

  return {
    record(input) {
      const judgeEndpointId =
        typeof input?.judgeEndpointId === "string" ? input.judgeEndpointId.trim() : "";
      if (!judgeEndpointId || judgeEndpointId.length > 200) return null;
      const file = load();
      const existing = file.judges[judgeEndpointId];
      const row: JudgeConsistencyRow = {
        judgeEndpointId,
        judgeMode:
          typeof input.judgeMode === "string" && input.judgeMode.trim()
            ? input.judgeMode.trim()
            : (existing?.judgeMode ?? null),
        orderChecks: (existing?.orderChecks ?? 0) + (input.orderCheck === true ? 1 : 0),
        orderDisagreements:
          (existing?.orderDisagreements ?? 0) + (input.orderDisagreement === true ? 1 : 0),
        judgeModeChecks: (existing?.judgeModeChecks ?? 0) + (input.modeCheck === true ? 1 : 0),
        judgeModeAgreements:
          (existing?.judgeModeAgreements ?? 0) + (input.modeAgreement === true ? 1 : 0),
        updatedAtMs: Number.isSafeInteger(input.nowMs) ? Number(input.nowMs) : now(),
      };
      const judges = { ...file.judges, [judgeEndpointId]: row };
      const keys = Object.keys(judges);
      if (keys.length > MAX_JUDGES) {
        // Bounded: keep the most recently updated judges.
        const keep = keys
          .sort((left, right) => (judges[right].updatedAtMs ?? 0) - (judges[left].updatedAtMs ?? 0))
          .slice(0, MAX_JUDGES);
        const trimmed: Record<string, JudgeConsistencyRow> = {};
        for (const key of keep) trimmed[key] = judges[key];
        persist({ schemaVersion: JUDGE_CONSISTENCY_SCHEMA_VERSION, judges: trimmed });
        return row;
      }
      persist({ schemaVersion: JUDGE_CONSISTENCY_SCHEMA_VERSION, judges });
      return row;
    },
    summary(judgeEndpointId) {
      const file = load();
      const rows = Object.values(file.judges)
        .filter((row) =>
          typeof judgeEndpointId === "string" && judgeEndpointId
            ? row.judgeEndpointId === judgeEndpointId
            : true,
        )
        .sort((left, right) => right.orderChecks - left.orderChecks);
      return rows.map((row) => ({ ...row, consistency: consistencyOf(row) }));
    },
  };
}

/**
 * Run 98 addendum 33 S2: is this judge's measured position consistency good enough to trust with promotion
 * evidence? A judge with too few checks is neither trusted nor refused on this axis — the sample is named,
 * and the caller decides — so a fresh deployment does not silently fail closed on an empty ledger.
 */
export function evaluateJudgePositionConsistency(input: {
  readonly row:
    | { readonly orderChecks: number; readonly orderDisagreements: number }
    | null
    | undefined;
  readonly floor: number;
  readonly minChecks?: number;
}): {
  readonly consistency: number | null;
  readonly checks: number;
  readonly belowFloor: boolean;
  readonly sufficientSample: boolean;
} {
  const checks = Number.isInteger(input.row?.orderChecks) ? Number(input.row?.orderChecks) : 0;
  const disagreements = Number.isInteger(input.row?.orderDisagreements)
    ? Number(input.row?.orderDisagreements)
    : 0;
  const consistency =
    checks > 0 ? Math.round((1 - disagreements / checks) * 10_000) / 10_000 : null;
  const minChecks = input.minChecks ?? MIN_POSITION_CONSISTENCY_CHECKS;
  const sufficientSample = checks >= minChecks;
  const floor = Number.isFinite(input.floor) ? input.floor : DEFAULT_POSITION_CONSISTENCY_FLOOR;
  return {
    consistency,
    checks,
    sufficientSample,
    belowFloor: sufficientSample && consistency !== null && consistency < floor,
  };
}
