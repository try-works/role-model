import {
  type EndpointAdmissionField,
  type EndpointAdmissionState,
  endpointAdmissionBusy,
} from "../../endpoint-admission";
import {
  type EndpointActivationRun,
  endpointActivationFailureText,
  resetEndpointActivationRun,
} from "./model";
import { endpointActivationNeedsReset } from "./model";

/** W1c (S511): pure endpoint-admission update decisions. Parent createUpdate owns Commands. */
export const endpointAdmissionFieldChangedState = (
  state: EndpointAdmissionState,
  field: EndpointAdmissionField,
  value: string,
): EndpointAdmissionState | undefined => {
  if (endpointAdmissionBusy(state) || endpointActivationNeedsReset(state.run)) return undefined;
  return { ...state, draft: { ...state.draft, [field]: value }, error: undefined };
};

export const endpointAdmissionModelAddedState = (
  state: EndpointAdmissionState,
): EndpointAdmissionState | undefined => {
  if (endpointAdmissionBusy(state) || endpointActivationNeedsReset(state.run)) return undefined;
  const modelId = state.draft.modelInput.trim();
  if (modelId.length === 0) return undefined;
  return {
    ...state,
    draft: {
      ...state.draft,
      modelInput: "",
      selectedModelIds: [...new Set([...state.draft.selectedModelIds, modelId])],
    },
  };
};

export const endpointAdmissionModelRemovedState = (
  state: EndpointAdmissionState,
  modelId: string,
): EndpointAdmissionState | undefined => {
  if (endpointAdmissionBusy(state) || endpointActivationNeedsReset(state.run)) return undefined;
  return {
    ...state,
    draft: {
      ...state.draft,
      selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId),
    },
  };
};

export const endpointAdmissionResetState = (
  state: EndpointAdmissionState,
): EndpointAdmissionState | undefined =>
  state.run.pending.length > 0
    ? undefined
    : {
        ...state,
        error: undefined,
        pendingAction: undefined,
        run: resetEndpointActivationRun(state.run),
        status: "draft",
      };

export const endpointAdmissionCompletionState = (
  state: EndpointAdmissionState,
  run: EndpointActivationRun,
): EndpointAdmissionState => {
  const failureText = endpointActivationFailureText(run);
  const status =
    run.status === "pending"
      ? "saving"
      : run.status === "saved"
        ? "saved"
        : run.status === "partial"
          ? "partial"
          : "error";
  return {
    ...state,
    error: status === "saving" ? undefined : failureText,
    pendingAction: status === "saving" ? state.pendingAction : undefined,
    run,
    status,
  };
};
