import { Schema } from "effect";

/**
 * S439 (R13/M8): pure per-activation completion tracker for endpoint admission. The host has no
 * aggregate activation resource: single mode sends one POST /endpoints per selected model and
 * batch mode sends one atomic POST /endpoints/batch. This tracker attributes each callback to an
 * activation identity inside one frozen run generation; no host/schema change and no retry policy.
 */

export const EndpointActivationOutcomeSchema = Schema.Literals(["succeeded", "failed"]);
export type EndpointActivationOutcome = typeof EndpointActivationOutcomeSchema.Type;

export const EndpointActivationSettledSchema = Schema.Struct({
  activationId: Schema.String,
  message: Schema.optional(Schema.String),
  outcome: EndpointActivationOutcomeSchema,
});
export type EndpointActivationSettled = typeof EndpointActivationSettledSchema.Type;

export const EndpointActivationRunSchema = Schema.Struct({
  generation: Schema.Number,
  mode: Schema.Literals(["single", "batch"]),
  pending: Schema.Array(Schema.Struct({ activationId: Schema.String })),
  settled: Schema.Array(EndpointActivationSettledSchema),
  status: Schema.Literals(["idle", "pending", "partial", "saved", "error"]),
});
export type EndpointActivationRun = typeof EndpointActivationRunSchema.Type;

export const initialEndpointActivationRun = (): EndpointActivationRun => ({
  generation: 0,
  mode: "single",
  pending: [],
  settled: [],
  status: "idle",
});

export type BeginEndpointActivationRunResult =
  | { readonly kind: "busy"; readonly run: EndpointActivationRun }
  | { readonly kind: "invalid"; readonly run: EndpointActivationRun }
  | {
      readonly kind: "started";
      readonly run: EndpointActivationRun;
      readonly generation: number;
      readonly activationIds: readonly string[];
    };

/** Starts one frozen run. A pending run is never replaced and the generation does not advance. */
export const beginEndpointActivationRun = (
  run: EndpointActivationRun,
  input: { readonly mode: "single" | "batch"; readonly activationIds: readonly string[] },
): BeginEndpointActivationRunResult => {
  if (run.pending.length > 0 || run.status === "pending") return { kind: "busy", run };
  const activationIds = [...new Set(input.activationIds)];
  if (activationIds.length === 0) return { kind: "invalid", run };
  const generation = run.generation + 1;
  return {
    activationIds,
    generation,
    kind: "started",
    run: {
      generation,
      mode: input.mode,
      pending: activationIds.map((activationId) => ({ activationId })),
      settled: [],
      status: "pending",
    },
  };
};

export type SettleEndpointActivationResult =
  | { readonly kind: "ignored"; readonly run: EndpointActivationRun }
  | { readonly kind: "stale"; readonly run: EndpointActivationRun }
  | { readonly kind: "updated"; readonly run: EndpointActivationRun };

/**
 * Applies one terminal activation outcome. Generation is checked before any mutation (stale late
 * callbacks are inert); unknown/already-settled ids are ignored (first terminal wins); the run stays
 * pending until every planned activation settles.
 */
export const settleEndpointActivation = (
  run: EndpointActivationRun,
  input: {
    readonly activationId: string;
    readonly generation: number;
    readonly outcome: EndpointActivationOutcome;
    readonly message?: string;
  },
): SettleEndpointActivationResult => {
  if (input.generation !== run.generation) return { kind: "stale", run };
  if (!run.pending.some((entry) => entry.activationId === input.activationId)) {
    return { kind: "ignored", run };
  }
  const pending = run.pending.filter((entry) => entry.activationId !== input.activationId);
  const settled = [
    ...run.settled,
    {
      activationId: input.activationId,
      message: input.message,
      outcome: input.outcome,
    },
  ];
  const failed = settled.filter((entry) => entry.outcome === "failed");
  const status =
    pending.length > 0
      ? "pending"
      : failed.length === 0
        ? "saved"
        : failed.length === settled.length
          ? "error"
          : "partial";
  return { kind: "updated", run: { ...run, pending, settled, status } };
};

export const endpointActivationCanSubmit = (run: EndpointActivationRun): boolean =>
  run.pending.length === 0 && run.status !== "pending";

/** S439 policy: a settled run (saved/partial/error) requires an explicit reset before another submit. */
export const endpointActivationNeedsReset = (run: EndpointActivationRun): boolean =>
  run.settled.length > 0 || run.status === "saved" || run.status === "partial" || run.status === "error";

/** Clears displayed outcomes but keeps the generation monotonic, so late callbacks stay stale. */
export const resetEndpointActivationRun = (run: EndpointActivationRun): EndpointActivationRun => ({
  generation: run.generation,
  mode: "single",
  pending: [],
  settled: [],
  status: "idle",
});

/** Bounded per-activation failure text for rendering; no merged/dropped identity. */
export const endpointActivationFailureText = (run: EndpointActivationRun): string | undefined => {
  const failures = run.settled.filter((entry) => entry.outcome === "failed");
  if (failures.length === 0) return undefined;
  return failures
    .map((entry) => (entry.message === undefined || entry.message.length === 0 ? entry.activationId + ": activation failed" : entry.activationId + ": " + entry.message))
    .join("; ");
};
