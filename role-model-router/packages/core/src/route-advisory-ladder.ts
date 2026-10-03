import { Data, Option } from "effect";

import type { RouteAdvisoryRung } from "./types.js";

/**
 * Run 105 package C (R4, R5 + addendum A2): the advisory ladder walk.
 *
 * The walk is the ONLY new matching logic stage 3 adds. It is a pure function of the stored
 * rung list and the request's eligible endpoint set, so it is unit-testable next to the router
 * (D11: effect is declared as a workspace dependency of `packages/core` for exactly this module
 * and the tagged error below).
 *
 * The walk skips a rung ONLY when it is not routable:
 *   - `status: "unavailable"` (R4: the user removed the endpoint), or
 *   - the endpoint is not in the request's `eligibleEndpointIds` (R4: per-request eligibility).
 *
 * It is deliberately NOT band-aware (addendum A2): the score band is a GATE that decides whether
 * the walked preference is APPLIED, not a walk filter. Making the walk band-aware would change the
 * propensity semantics (`selectionProbability` is computed for ONE advised arm) and would make
 * "considered but not applied" indistinguishable from "applied".
 */
export type RungWalkOutcome = Data.TaggedEnum<{
  /** A routable rung was found; `rank`/`endpointId` name it and `skipped` counts the rungs passed over. */
  Walked: { readonly rank: number; readonly endpointId: string; readonly skipped: number };
  /** Every rung was non-routable: no routable rung exists, so no preference can be offered. */
  Starved: { readonly skipped: number };
  /** No ladder was supplied at all (back-compat: the caller's single preferred endpoint is used). */
  NoLadder: { readonly skipped: 0 };
}>;

export const RungWalkOutcome = Data.taggedEnum<RungWalkOutcome>();

/** Bounded so a hostile or corrupt ladder can never widen the observation row. */
export const ADVISORY_RUNG_SKIP_BOUND = 32;

/**
 * The tag this module raises when a caller hands it a ladder it cannot decode. The walk itself
 * never throws for a merely non-routable ladder (that is `Starved`); only a structurally invalid
 * rung list is a decode error, so a corrupt store row degrades to "no advisory" instead of
 * silently walking nonsense.
 */
export class RouteAdvisoryLadderDecodeError extends Data.TaggedError("RouteAdvisoryLadderDecodeError")<{
  readonly reason: string;
  readonly rungIndex: number;
}> {}

/**
 * R4/R5: walk the ladder rank-ascending and return the first ROUTABLE rung.
 *
 * `rungs` must already be rank-sorted by the source (the store sorts by rank); the walk sorts a
 * defensive copy so a caller's unordered array can never change the outcome.
 */
export function resolveAdvisoryRung(
  rungs: readonly RouteAdvisoryRung[] | null | undefined,
  eligibleEndpointIds: readonly string[],
): RungWalkOutcome {
  if (!Array.isArray(rungs) || rungs.length === 0) return RungWalkOutcome.NoLadder({ skipped: 0 });
  const eligible = new Set(
    (eligibleEndpointIds ?? []).filter(
      (endpointId): endpointId is string => typeof endpointId === "string" && endpointId.length > 0,
    ),
  );
  const ordered = [...rungs].sort((left, right) => left.rank - right.rank);
  let skipped = 0;
  for (const rung of ordered) {
    if (!rung || typeof rung.endpointId !== "string" || !Number.isInteger(rung.rank)) {
      throw new RouteAdvisoryLadderDecodeError({
        reason: "rung must carry a string endpointId and an integer rank",
        rungIndex: skipped,
      });
    }
    const routable = rung.status !== "unavailable" && eligible.has(rung.endpointId);
    if (routable) {
      return RungWalkOutcome.Walked({
        rank: rung.rank,
        endpointId: rung.endpointId,
        skipped: Math.min(skipped, ADVISORY_RUNG_SKIP_BOUND),
      });
    }
    skipped += 1;
  }
  return RungWalkOutcome.Starved({ skipped: Math.min(skipped, ADVISORY_RUNG_SKIP_BOUND) });
}

/** Option-shaped convenience: the walked rung, or `Option.none()` when there is none. */
export function resolveAdvisoryRungOption(
  rungs: readonly RouteAdvisoryRung[] | null | undefined,
  eligibleEndpointIds: readonly string[],
): Option.Option<{ readonly rank: number; readonly endpointId: string }> {
  const walk = resolveAdvisoryRung(rungs, eligibleEndpointIds);
  return walk._tag === "Walked"
    ? Option.some({ rank: walk.rank, endpointId: walk.endpointId })
    : Option.none();
}
