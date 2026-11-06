import {
  type LearningRankingState,
  type LearningRollbackPayload,
  initialLearningRankingState,
  learningLadderRowKey,
  learningRollbackPayload,
} from "./model";

/**
 * W1c (S507): pure learning-ranking update decisions. Parent createUpdate keeps
 * command execution and readback updates; these plans only compute row state.
 */
export type LearningLadderTogglePlan =
  | Readonly<{ readonly kind: "noop" }>
  | Readonly<{ readonly kind: "set"; readonly key: string; readonly state: LearningRankingState }>
  | Readonly<{
      readonly kind: "confirm";
      readonly key: string;
      readonly state: LearningRankingState;
    }>
  | Readonly<{
      readonly kind: "rollback";
      readonly key: string;
      readonly payload: LearningRollbackPayload;
      readonly state: LearningRankingState;
      readonly token: number;
    }>;

export const planLearningLadderToggle = (
  state: LearningRankingState,
  input: {
    readonly roleId: string;
    readonly rolledBack: boolean;
    readonly scopeId: string | undefined;
    readonly taskTypeId: string;
  },
): LearningLadderTogglePlan => {
  if (input.scopeId === undefined || input.scopeId.length === 0) {
    const key = learningLadderRowKey({ roleId: input.roleId, taskTypeId: input.taskTypeId });
    if (state.phases[key]?.phase === "pending") return { kind: "noop" };
    return {
      key,
      kind: "set",
      state: {
        ...state,
        phases: {
          ...state.phases,
          [key]: {
            error: "Learning scope is unavailable from the records readback; rollback is disabled.",
            phase: "error",
          },
        },
      },
    };
  }
  const scopeId = input.scopeId;
  const key = learningLadderRowKey({ roleId: input.roleId, taskTypeId: input.taskTypeId }, scopeId);
  const phase = state.phases[key]?.phase ?? "idle";
  if (phase === "pending") return { kind: "noop" };
  if (phase !== "confirming") {
    const phases = Object.fromEntries(
      Object.entries(state.phases).filter(([, entry]) => entry.phase !== "confirming"),
    );
    return {
      key,
      kind: "confirm",
      state: { ...state, phases: { ...phases, [key]: { phase: "confirming", scopeId } }, scopeId },
    };
  }
  const token =
    (state.nextToken ??
      Math.max(0, ...Object.values(state.phases).map((entry) => entry.token ?? 0))) + 1;
  return {
    key,
    kind: "rollback",
    payload: learningRollbackPayload(
      { roleId: input.roleId, taskTypeId: input.taskTypeId },
      input.rolledBack,
      scopeId,
    ),
    state: {
      ...state,
      nextToken: token,
      phases: { ...state.phases, [key]: { phase: "pending", scopeId, token } },
      scopeId,
    },
    token,
  };
};

export const mergeLearningLadderUpdated = (
  state: LearningRankingState,
  input: {
    readonly freshScope: string | undefined;
    readonly roleId: string;
    readonly scopeId: string;
    readonly taskTypeId: string;
    readonly token: number;
  },
): LearningRankingState | undefined => {
  const key = learningLadderRowKey(
    { roleId: input.roleId, taskTypeId: input.taskTypeId },
    input.scopeId,
  );
  const entry = state.phases[key];
  if (
    input.freshScope !== input.scopeId ||
    state.scopeId !== input.scopeId ||
    entry?.phase !== "pending" ||
    entry.scopeId !== input.scopeId ||
    entry.token !== input.token
  )
    return undefined;
  return {
    ...state,
    nextToken: state.nextToken ?? input.token,
    phases: {
      ...state.phases,
      [key]: { phase: "idle", scopeId: input.scopeId, token: input.token },
    },
  };
};

export const mergeLearningLadderFailed = (
  state: LearningRankingState,
  input: {
    readonly freshScope: string | undefined;
    readonly message: string;
    readonly roleId: string;
    readonly scopeId: string;
    readonly taskTypeId: string;
    readonly token: number;
  },
): LearningRankingState | undefined => {
  const key = learningLadderRowKey(
    { roleId: input.roleId, taskTypeId: input.taskTypeId },
    input.scopeId,
  );
  const entry = state.phases[key];
  if (
    input.freshScope !== input.scopeId ||
    state.scopeId !== input.scopeId ||
    entry?.phase !== "pending" ||
    entry.scopeId !== input.scopeId ||
    entry.token !== input.token
  )
    return undefined;
  return {
    ...state,
    phases: {
      ...state.phases,
      [key]: { error: input.message, phase: "error", scopeId: input.scopeId, token: input.token },
    },
  };
};

export { initialLearningRankingState };
