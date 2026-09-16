import { createHash } from "node:crypto";

/**
 * Run 99 R33 (addendum 20 D7, `route-learning-contracts.schema.json` `executionContext`):
 * family-stratified, deterministic holdout identity.
 *
 * The canonical execution context declares `splitAlgorithm: stratified_hash_partition_v1` and a
 * `splitSeed`. Before this module the live routing-shadow pipeline derived its holdout only from the
 * request id, so two task families could share a split identity and a replay of a different family
 * could reuse the same holdout name. The identity is now derived from the declared algorithm, the
 * seed and the family, which makes it reproducible from the declaration and disjoint across
 * families.
 *
 * Note: this module owns the *split identity and declaration*. The live pipeline evaluates the
 * holdout partition per comparison (every evaluated case belongs to the holdout), so a train/holdout
 * case split inside a family is a separate, larger change to the evaluation contract.
 */

export const SPLIT_ALGORITHM = "stratified_hash_partition_v1" as const;

/**
 * The canonical membership binding Evaluation Core recomputes: the digest of
 * `{ partition: "holdout", caseIds }` over the holdout cases only. Exported so the supervised
 * pipeline can publish a membership that matches the partitions it actually stamps (a candidate
 * whose only case cannot be held out stays in the holdout set).
 */
export function computeHoldoutMembershipDigest(caseIds: readonly string[]): string {
  return `sha256:${digest({ partition: "holdout", caseIds: [...caseIds].map(String).sort() })}`;
}

/** The seed the live routing-shadow pipeline declares for its holdout split (deterministic). */
export const RUN99_HOLDOUT_SPLIT_SEED = 87;

export interface FamilyStratifiedHoldout {
  readonly holdoutId: string;
  readonly membershipDigest: string;
  readonly partition: "holdout";
  /** The holdout membership the durable comparison binds. */
  readonly caseIds: readonly string[];
  /** Run 99 R33 D7: the complementary train membership inside the same family. */
  readonly trainCaseIds: readonly string[];
  /** Every case the family supplied, with the partition the declaration assigns it. */
  readonly partitions: readonly {
    readonly caseId: string;
    readonly partition: "train" | "holdout";
  }[];
  readonly splitAlgorithm: typeof SPLIT_ALGORITHM;
  readonly splitSeed: number;
  readonly stratum: string | null;
}

const digest = (value: unknown): string => {
  const canonical =
    value && typeof value === "object"
      ? JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())
      : JSON.stringify(value);
  return createHash("sha256").update(canonical).digest("hex");
};

export function buildFamilyStratifiedHoldout(input: {
  readonly requestId: string;
  readonly taskTypeId?: string | null;
  readonly caseIds: readonly string[];
  readonly splitSeed: number;
}): FamilyStratifiedHoldout {
  const requestId = typeof input.requestId === "string" ? input.requestId.trim() : "";
  if (!requestId) throw new Error("holdout split requires a request id");
  if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) {
    throw new Error("holdout split requires at least one evaluation case");
  }
  const caseIds = [...new Set(input.caseIds.map((caseId) => String(caseId)))].sort();
  const stratum =
    typeof input.taskTypeId === "string" && input.taskTypeId.trim()
      ? input.taskTypeId.trim()
      : null;
  const splitSeed = Number.isSafeInteger(input.splitSeed) ? input.splitSeed : 0;
  // The identity is a function of the declaration (algorithm, seed, stratum) plus the request, so a
  // replay can rebuild it without the original process state.
  // Run 99 R33 (addendum 20 D7, second half): "the holdout is disjoint *within* each family". Each
  // case is assigned to train or holdout by the declared algorithm and seed (`stratified_hash_partition_v1`),
  // so the split is reproducible from the receipt and independent of arrival order.
  const partitionOf = (caseId: string): "train" | "holdout" => {
    const bucket = createHash("sha256")
      .update(`${SPLIT_ALGORITHM}:${splitSeed}:${stratum ?? ""}:${caseId}`)
      .digest();
    return bucket[0] % 2 === 0 ? "train" : "holdout";
  };
  let partitions = caseIds.map((caseId) => ({ caseId, partition: partitionOf(caseId) }));
  // A family with two or more cases must contribute to both sets, otherwise a "holdout" that holds
  // everything (or nothing) is not a split. The adjustment stays deterministic: the last case by id
  // moves, and the move is part of the declaration because it is a pure function of the case ids.
  if (caseIds.length >= 2 && partitions.every((row) => row.partition === "holdout")) {
    partitions = partitions.map((row, index) =>
      index === 0 ? { ...row, partition: "train" as const } : row,
    );
  } else if (caseIds.length >= 2 && partitions.every((row) => row.partition === "train")) {
    partitions = partitions.map((row, index) =>
      index === partitions.length - 1 ? { ...row, partition: "holdout" as const } : row,
    );
  }
  const holdoutCaseIds = partitions
    .filter((row) => row.partition === "holdout")
    .map((row) => row.caseId);
  const trainCaseIds = partitions
    .filter((row) => row.partition === "train")
    .map((row) => row.caseId);
  const holdoutId = `sha256:${digest({
    algorithm: SPLIT_ALGORITHM,
    seed: splitSeed,
    stratum,
    requestId,
  })}`;
  // Run 99 R33 live finding (stage v133): the membership digest is *not* the split identity. It is
  // the durable case binding that `evaluation-core` recomputes and verifies
  // (`#v3Holdout` -> `digestEvaluationHoldout({ partition, caseIds })`), and that helper binds
  // exactly those two fields. Carrying the algorithm/seed/stratum inside it made every supervised
  // replay fail closed with "evaluation holdout membership digest is not bound to its cases". The
  // declaration therefore travels beside the binding (below), where a receipt reader can still
  // rebuild the split, while the binding stays reproducible by the authority that enforces it.
  const membershipDigest = computeHoldoutMembershipDigest(holdoutCaseIds);
  return {
    holdoutId,
    membershipDigest,
    partition: "holdout",
    caseIds: holdoutCaseIds,
    trainCaseIds,
    partitions,
    splitAlgorithm: SPLIT_ALGORITHM,
    splitSeed,
    stratum,
  };
}
