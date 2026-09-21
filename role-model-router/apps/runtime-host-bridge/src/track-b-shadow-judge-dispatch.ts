import { createHash } from "node:crypto";

import {
  PAIRWISE_JUDGE_MODE_IDENTIFIED,
  PAIRWISE_JUDGE_MODE_IDENTITY_BLIND,
  type PairwiseJudgeMode,
  type PairwiseJudgePresentation,
  TRACK_B_PAIRWISE_JUDGE_WINNER_TIE,
  type TrackBPairwiseJudge,
  type TrackBPairwiseJudgeDecision,
  type TrackBPairwiseJudgeRequest,
  buildPairwiseJudgeMessages,
  isPairwiseJudgeMode,
  pairwiseJudgePresentation,
  parsePairwiseJudgeResponse,
} from "./track-b-shadow-judge.js";

/**
 * Run 98 R10 (AC-R10-02): a judge that prefers A in one presentation and B in the
 * swapped presentation has measured a position-order effect, not a preference. The
 * dispatch fails with this typed reason so the caller records bounded missingness
 * instead of turning it into a silent tie.
 */
export const POSITION_ORDER_DISAGREEMENT = "position_order_disagreement" as const;

export class PairwiseJudgeOrderDisagreementError extends Error {
  readonly code = POSITION_ORDER_DISAGREEMENT;
  constructor(message = "pairwise judge disagreed with itself under swapped presentation order") {
    super(message);
    this.name = "PairwiseJudgeOrderDisagreementError";
  }
}

/**
 * Run 98 addendum 45 J2 — the pairwise judge is the configured controller.
 *
 * Operator instruction (2026-09-20): "the judge endpoint should simply be the controller. dont set an
 * endpoint or model id, just route to the configured controller endpoint", and, after the Configuration page
 * still showed a deepseek id: "i told you this should just use the controller. it seems to be hardcoded.
 * changing controller to kimi k3 does not change this endpoint. hardcode it to just use the controller!"
 *
 * The policy carries only the selector (`judgeSource`); the endpoint comes from the controller assignment at
 * judge time, and the `ROLE_MODEL_EVAL_JUDGE_ENDPOINT` out-of-band pin is gone. An unset controller — or the
 * explicit `disabled` selector — is a real answer ("no judge"), never "pick a candidate".
 */
export function resolveJudgeEndpointFromController(input: {
  readonly judgeSource?: unknown;
  readonly controllerEndpointId?: unknown;
}): string {
  if (input.judgeSource === "disabled") return "";
  return typeof input.controllerEndpointId === "string" ? input.controllerEndpointId.trim() : "";
}

/**
 * Run 97 RC04 (L4): the host side of the pairwise judge boundary.
 *
 * The route-learning pipeline owns the comparison contract; this module owns the one
 * provider dispatch that produces a real preference, so the automatic counterfactual
 * can be decisioned instead of tying on a deterministic term that neither branch
 * satisfies. The dispatch:
 *
 * - runs through the router's normal execution path (`executeChatCompletions`) against
 *   a judge endpoint the runtime can actually dispatch to,
 * - never reuses the source or counterfactual endpoint as its own judge when another
 *   endpoint is available (judge independence),
 * - records the call as a ledgered *derived* dispatch (`AC-R07-02`), so scorer/judge
 *   spend is visible in the same daily ceiling as candidate dispatches,
 * - fails closed: an unparseable or unbounded judge response is an error, and the
 *   pipeline persists it as score missingness rather than a fabricated tie.
 */

export interface RouterPairwiseJudgeExecution {
  readonly contentText?: string;
  readonly reasoningText?: string;
  readonly routingDecisionId?: string;
  readonly replayCost?: { readonly usd?: number };
  readonly responseBytes?: number;
}

export interface CreateRouterPairwiseJudgeInput {
  readonly executeChatCompletions: (
    // The host owns the concrete chat-completions body type; `never` keeps this
    // contract assignable without duplicating the router's request schema here.
    body: never,
    requestId: string,
    // The host passes its stream writer here; the judge never streams.
    streamWriter?: never,
    options?: {
      readonly endpointId?: string;
      readonly executionTrafficClass?: "live" | "benchmark" | "health" | "synthetic" | "replay";
    },
  ) => Promise<RouterPairwiseJudgeExecution>;
  readonly endpoints: readonly { readonly endpointId: string; readonly modelId: string }[];
  readonly excludedEndpointIds?: readonly string[];
  /**
   * Run 98 addendum 30 S1 (`guidance/11` `judgePolicy.excludeFromLiveEvaluation`): the **designated**
   * judge endpoint. When set, that endpoint is the judge or there is no judge — the factory never
   * falls back to another endpoint, and it refuses a pair that contains the designation. When unset
   * the legacy independence-first selection is kept for callers that have not adopted the policy.
   */
  readonly judgeEndpointId?: string;
  /**
   * Run 98 addendum 45 J2: provenance for a judge resolved from the controller assignment. Recorded on the
   * judge object and on the comparison manifest, so an audit can tell where the judge came from and when the
   * assignment it was read from last changed.
   */
  readonly judgeSource?: "controller" | "disabled";
  readonly judgeAssignmentUpdatedAtMs?: number | null;
  readonly taskText: string;
  /** Run 98 R10: judge mode; defaults to the identified judge (previous behaviour). */
  readonly mode?: PairwiseJudgeMode;
  /**
   * Run 98 R10 (AC-R10-02): `dual_order` dispatches the swapped presentation too and
   * fails closed on disagreement; `source_first` keeps the single dispatch.
   */
  readonly orderPolicy?: "source_first" | "dual_order";
  /**
   * Run 98 addendum 33 S2 (`guidance/07`: "Randomize execution order where order can bias tools or
   * caches"; the research's Balanced Position Calibration): what to do when the two presentations
   * disagree.
   *
   * - `balanced` (default): the flip is *evidence of position bias*, not a preference, so the pair is
   *   calibrated to an explicit tie (0.5/0.5) and the flip is recorded. This keeps the sample instead of
   *   discarding every order-sensitive pair.
   * - `strict_consistency`: the pair is refused outright (the pre-repair behaviour).
   * - `fails_closed`: alias of `strict_consistency`, kept because that is what the live policy named.
   */
  readonly orderAggregation?: "balanced" | "strict_consistency" | "fails_closed";
  /**
   * Run 98 R10 (AC-R10-01): when the primary dispatch is identity-blind, also probe the
   * identified judge so agreement is measured for every decision.
   */
  readonly measureAgreement?: boolean;
  readonly recordJudgeObservation?: (row: {
    readonly judgeMode: PairwiseJudgeMode;
    readonly outcome: "complete" | "failed" | "order_disagreement";
    readonly presentation: PairwiseJudgePresentation;
    readonly agreement?: boolean;
  }) => void;
  readonly recordDerivedDispatch?: (row: {
    readonly judgeEndpointId: string;
    readonly attempt: number;
    readonly costMicros: number;
    readonly bytes: number;
    readonly outcome: "complete" | "failed";
  }) => void;
}

export function createRouterPairwiseJudge(
  input: CreateRouterPairwiseJudgeInput,
): TrackBPairwiseJudge | undefined {
  const excluded = new Set((input.excludedEndpointIds ?? []).filter((value) => value));
  const candidateEndpoints = input.endpoints.filter(
    (endpoint) =>
      endpoint &&
      typeof endpoint.endpointId === "string" &&
      endpoint.endpointId.length > 0 &&
      typeof endpoint.modelId === "string" &&
      endpoint.modelId.length > 0,
  );
  const controlsJudgeSelection =
    input.judgeSource === "controller" || input.judgeSource === "disabled";
  const designated =
    input.judgeSource === "disabled"
      ? null
      : typeof input.judgeEndpointId === "string" && input.judgeEndpointId.trim()
        ? input.judgeEndpointId.trim()
        : null;
  // Run 98 addendum 30 S1: a designated judge is the only judge. A pair that contains it is not
  // judged (self-evaluation is what corrupted 861 of 863 live battles), and a designation that is
  // not dispatchable fails closed rather than substituting a candidate.
  const judgeEndpoint = designated
    ? excluded.has(designated)
      ? undefined
      : candidateEndpoints.find((endpoint) => endpoint.endpointId === designated)
    : // Run 98 addendum 45 J2: once the caller states where the judge comes from, there is **no** fallback —
      // `disabled`, or a controller that did not resolve, means this pair is not judged. Only legacy callers
      // that pass no `judgeSource` keep the independence-first rule.
      controlsJudgeSelection
      ? undefined
      : (candidateEndpoints.find((endpoint) => !excluded.has(endpoint.endpointId)) ??
        candidateEndpoints[0]);
  if (!judgeEndpoint) return undefined;
  const taskText = typeof input.taskText === "string" ? input.taskText : "";

  return {
    endpointId: judgeEndpoint.endpointId,
    mode: isPairwiseJudgeMode(input.mode) ? input.mode : PAIRWISE_JUDGE_MODE_IDENTIFIED,
    orderPolicy: input.orderPolicy === "dual_order" ? "dual_order" : "source_first",
    ...(input.judgeSource ? { judgeSource: input.judgeSource } : {}),
    ...(input.judgeAssignmentUpdatedAtMs === undefined
      ? {}
      : { judgeAssignmentUpdatedAtMs: input.judgeAssignmentUpdatedAtMs }),
    async dispatch(request: TrackBPairwiseJudgeRequest) {
      const digest = createHash("sha256")
        .update(
          JSON.stringify({
            requestId: request.requestId,
            source: request.source.outputDigest,
            counterfactual: request.counterfactual.outputDigest,
          }),
        )
        .digest("hex")
        .slice(0, 16);
      // The capture the judge call produces must be classified as evaluation output by
      // the private boundary (shared/capture/replay-provenance.mjs), or it re-enters the
      // pending replay queue and amplifies.
      const mode: PairwiseJudgeMode = isPairwiseJudgeMode(input.mode)
        ? input.mode
        : PAIRWISE_JUDGE_MODE_IDENTIFIED;
      const orderPolicy = input.orderPolicy === "dual_order" ? "dual_order" : "source_first";
      const runJudge = async (options: {
        readonly mode: PairwiseJudgeMode;
        readonly presentation: PairwiseJudgePresentation;
        readonly attempt: number;
      }): Promise<{
        readonly decision: TrackBPairwiseJudgeDecision;
        readonly routerDecisionId: string;
      }> => {
        // The judge capture must stay inside the boundary's `replay-judge-<16 hex>` family
        // (run 97 RC04/L5), so the mode, presentation and attempt are folded into the
        // digest rather than appended to the id.
        const callDigest = createHash("sha256")
          .update(`${digest}:${options.mode}:${options.presentation.first}:${options.attempt}`)
          .digest("hex")
          .slice(0, 16);
        const judgeRequestId = `replay-judge-${callDigest}`;
        const messages = buildPairwiseJudgeMessages({
          taskText,
          sourceText: request.source.outputText,
          counterfactualText: request.counterfactual.outputText,
          sourceCandidateRef: request.source.candidateRef,
          counterfactualCandidateRef: request.counterfactual.candidateRef,
          mode: options.mode,
          presentation: options.presentation,
        });
        let execution: RouterPairwiseJudgeExecution;
        try {
          execution = await input.executeChatCompletions(
            {
              model: judgeEndpoint.modelId,
              messages: messages as never,
              temperature: 0,
              stream: false,
            } as never,
            judgeRequestId,
            undefined,
            { endpointId: judgeEndpoint.endpointId, executionTrafficClass: "replay" },
          );
        } catch (error) {
          input.recordDerivedDispatch?.({
            judgeEndpointId: judgeEndpoint.endpointId,
            attempt: options.attempt,
            costMicros: 0,
            bytes: 0,
            outcome: "failed",
          });
          input.recordJudgeObservation?.({
            judgeMode: options.mode,
            outcome: "failed",
            presentation: options.presentation,
          });
          throw error instanceof Error ? error : new Error("router judge dispatch failed");
        }
        const text =
          (typeof execution?.contentText === "string" && execution.contentText) ||
          (typeof execution?.reasoningText === "string" && execution.reasoningText) ||
          "";
        const parsed = parsePairwiseJudgeResponse(text, options.presentation);
        const observedCostUsd = execution?.replayCost?.usd;
        const costMicros =
          typeof observedCostUsd === "number" &&
          Number.isFinite(observedCostUsd) &&
          observedCostUsd >= 0
            ? Math.ceil(observedCostUsd * 1_000_000)
            : 0;
        const bytes =
          Number.isSafeInteger(execution?.responseBytes) && Number(execution?.responseBytes) >= 0
            ? Number(execution?.responseBytes)
            : Buffer.byteLength(text, "utf8");
        if (!parsed) {
          input.recordDerivedDispatch?.({
            judgeEndpointId: judgeEndpoint.endpointId,
            attempt: options.attempt,
            costMicros,
            bytes,
            outcome: "failed",
          });
          input.recordJudgeObservation?.({
            judgeMode: options.mode,
            outcome: "failed",
            presentation: options.presentation,
          });
          throw new Error("router judge returned an unparseable pairwise preference");
        }
        input.recordDerivedDispatch?.({
          judgeEndpointId: judgeEndpoint.endpointId,
          attempt: options.attempt,
          costMicros,
          bytes,
          outcome: "complete",
        });
        const routerDecisionId =
          typeof execution?.routingDecisionId === "string" && execution.routingDecisionId
            ? execution.routingDecisionId
            : "";
        if (!routerDecisionId) {
          throw new Error("router judge dispatch did not return a routing decision");
        }
        return {
          routerDecisionId,
          decision: {
            winner: parsed.winner,
            confidence: parsed.confidence,
            dispatchReceiptId: `router-judge:${judgeRequestId}`,
            routerDecisionId,
            judgeResultRef: `judge-result:${digest}`,
            judgeEndpointId: judgeEndpoint.endpointId,
            judgeMode: options.mode,
            presentation: options.presentation,
            // Run 98 addendum 48 (live v281: `duplicate scorer ID has incompatible version`): the
            // assignment timestamp is *run-varying* provenance, so it belongs on the decision — which is
            // immutable per dispatch — and never on the durable scorer manifest, whose `id@version` key
            // Evaluation Core refuses to reuse with different bytes.
            ...(input.judgeAssignmentUpdatedAtMs === undefined ||
            input.judgeAssignmentUpdatedAtMs === null
              ? {}
              : { judgeAssignmentUpdatedAtMs: input.judgeAssignmentUpdatedAtMs }),
          },
        };
      };

      const primaryPresentation = pairwiseJudgePresentation(false);
      const primary = await runJudge({ mode, presentation: primaryPresentation, attempt: 1 });

      // AC-R10-02: bound position-order effects with a swapped dispatch instead of
      // accepting a single-order preference as decisive.
      let calibrated: {
        readonly winner: typeof TRACK_B_PAIRWISE_JUDGE_WINNER_TIE;
        readonly confidence: number;
      } | null = null;
      if (orderPolicy === "dual_order") {
        const swappedPresentation = pairwiseJudgePresentation(true);
        const swapped = await runJudge({ mode, presentation: swappedPresentation, attempt: 2 });
        if (swapped.decision.winner !== primary.decision.winner) {
          input.recordJudgeObservation?.({
            judgeMode: mode,
            outcome: "order_disagreement",
            presentation: swappedPresentation,
          });
          const aggregation = input.orderAggregation ?? "balanced";
          if (aggregation === "balanced") {
            // Run 98 addendum 33 S2: a pair that flips under a swapped presentation measured a position
            // effect, so it is calibrated to an explicit tie instead of being discarded. The flip travels
            // with the decision so the comparison can report it (and so a judge's consistency is
            // measurable) without the pair being relabelled as unimpeachable evidence.
            calibrated = {
              winner: TRACK_B_PAIRWISE_JUDGE_WINNER_TIE,
              confidence: Math.min(primary.decision.confidence, swapped.decision.confidence, 0.5),
            };
          } else {
            throw new PairwiseJudgeOrderDisagreementError();
          }
        }
        if (!calibrated) {
          input.recordJudgeObservation?.({
            judgeMode: mode,
            outcome: "complete",
            presentation: swappedPresentation,
          });
        }
      }

      // AC-R10-01: measure agreement with the identified judge whenever the primary mode
      // is identity-blind. A probe failure is recorded and the primary decision stands.
      let judgeModeAgreement: boolean | undefined;
      if (input.measureAgreement === true && mode === PAIRWISE_JUDGE_MODE_IDENTITY_BLIND) {
        try {
          const probe = await runJudge({
            mode: PAIRWISE_JUDGE_MODE_IDENTIFIED,
            presentation: primaryPresentation,
            attempt: 3,
          });
          judgeModeAgreement = probe.decision.winner === primary.decision.winner;
          input.recordJudgeObservation?.({
            judgeMode: PAIRWISE_JUDGE_MODE_IDENTIFIED,
            outcome: "complete",
            presentation: primaryPresentation,
            agreement: judgeModeAgreement,
          });
        } catch {
          input.recordJudgeObservation?.({
            judgeMode: PAIRWISE_JUDGE_MODE_IDENTIFIED,
            outcome: "failed",
            presentation: primaryPresentation,
          });
        }
      }
      input.recordJudgeObservation?.({
        judgeMode: mode,
        outcome: "complete",
        presentation: primaryPresentation,
      });
      return {
        ...primary.decision,
        ...(calibrated
          ? {
              winner: calibrated.winner,
              confidence: calibrated.confidence,
              orderDisagreement: true,
            }
          : {}),
        ...(judgeModeAgreement === undefined ? {} : { judgeModeAgreement }),
      };
    },
  };
}
