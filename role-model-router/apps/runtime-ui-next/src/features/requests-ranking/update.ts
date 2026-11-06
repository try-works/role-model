import {
  type RequestsRankingField,
  type RequestsRankingQuery,
  type RequestsRankingRow,
  type RequestsRankingState,
  buildRequestsRankingQuery,
  requestsRankingMetricOf,
  requestsRankingTargetOf,
} from "./model";

/**
 * W1c (S505): pure requests-ranking update decisions. The parent createUpdate
 * remains the single dispatcher; it executes the same Commands from these plans.
 */
export type RequestsRankingFieldPlan =
  | Readonly<{ readonly kind: "error"; readonly state: RequestsRankingState }>
  | Readonly<{
      readonly kind: "query";
      readonly payload: RequestsRankingQuery;
      readonly state: RequestsRankingState;
    }>;

export const planRequestsRankingFieldChange = (
  state: RequestsRankingState,
  field: RequestsRankingField,
  value: string,
): RequestsRankingFieldPlan => {
  const nextState = { ...state, [field]: value, message: undefined };
  const metric = requestsRankingMetricOf(nextState.metric);
  const rankingTarget = requestsRankingTargetOf(nextState.rankingTarget);
  if (metric === undefined || rankingTarget === undefined) {
    const token = state.token + 1;
    return {
      kind: "error",
      state: {
        ...nextState,
        message: "Select a supported metric and ranking target.",
        status: "error",
        token,
      },
    };
  }
  const token = state.token + 1;
  return {
    kind: "query",
    payload: buildRequestsRankingQuery({ metric, rankingTarget }),
    state: { ...nextState, status: "loading", token },
  };
};

export const mergeRequestsRankingLoaded = (
  state: RequestsRankingState,
  rows: readonly RequestsRankingRow[],
  token: number,
): RequestsRankingState | undefined =>
  token === state.token
    ? { ...state, message: undefined, rows, status: rows.length === 0 ? "empty" : "ok" }
    : undefined;

export const mergeRequestsRankingFailed = (
  state: RequestsRankingState,
  message: string,
  token: number,
): RequestsRankingState | undefined =>
  token === state.token ? { ...state, message, status: "error" } : undefined;
