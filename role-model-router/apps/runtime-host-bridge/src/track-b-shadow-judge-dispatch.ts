import { createHash } from "node:crypto";

import {
  buildPairwiseJudgeMessages,
  parsePairwiseJudgeResponse,
  type TrackBPairwiseJudge,
  type TrackBPairwiseJudgeRequest,
} from "./track-b-shadow-judge.js";

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
  readonly taskText: string;
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
  // Judge independence first: prefer an endpoint that is neither the source nor a
  // counterfactual candidate, falling back to the remaining dispatchable set.
  const judgeEndpoint =
    candidateEndpoints.find((endpoint) => !excluded.has(endpoint.endpointId)) ??
    candidateEndpoints[0];
  if (!judgeEndpoint) return undefined;
  const taskText = typeof input.taskText === "string" ? input.taskText : "";

  return {
    endpointId: judgeEndpoint.endpointId,
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
      const judgeRequestId = `replay-judge-${digest}`;
      const messages = buildPairwiseJudgeMessages({
        taskText,
        sourceText: request.source.outputText,
        counterfactualText: request.counterfactual.outputText,
        sourceCandidateRef: request.source.candidateRef,
        counterfactualCandidateRef: request.counterfactual.candidateRef,
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
          attempt: 1,
          costMicros: 0,
          bytes: 0,
          outcome: "failed",
        });
        throw error instanceof Error ? error : new Error("router judge dispatch failed");
      }
      const text =
        (typeof execution?.contentText === "string" && execution.contentText) ||
        (typeof execution?.reasoningText === "string" && execution.reasoningText) ||
        "";
      const parsed = parsePairwiseJudgeResponse(text);
      const observedCostUsd = execution?.replayCost?.usd;
      const costMicros =
        typeof observedCostUsd === "number" && Number.isFinite(observedCostUsd) && observedCostUsd >= 0
          ? Math.ceil(observedCostUsd * 1_000_000)
          : 0;
      const bytes =
        Number.isSafeInteger(execution?.responseBytes) && Number(execution?.responseBytes) >= 0
          ? Number(execution?.responseBytes)
          : Buffer.byteLength(text, "utf8");
      if (!parsed) {
        input.recordDerivedDispatch?.({
          judgeEndpointId: judgeEndpoint.endpointId,
          attempt: 1,
          costMicros,
          bytes,
          outcome: "failed",
        });
        throw new Error("router judge returned an unparseable pairwise preference");
      }
      input.recordDerivedDispatch?.({
        judgeEndpointId: judgeEndpoint.endpointId,
        attempt: 1,
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
        winner: parsed.winner,
        confidence: parsed.confidence,
        dispatchReceiptId: `router-judge:${judgeRequestId}`,
        routerDecisionId,
        judgeResultRef: `judge-result:${digest}`,
        judgeEndpointId: judgeEndpoint.endpointId,
      };
    },
  };
}
