import { Schema } from "effect";

import { EndpointActivationRunSchema, initialEndpointActivationRun } from "./endpoint-activation-tracker";

/**
 * S396c (M8): endpoint admission form. Single mode posts ONE activation per selected model to
 * POST /api/role-model/endpoints; batch mode posts { activationBatchId, activations } to
 * POST /api/role-model/endpoints/batch. Activation body fields mirror the host/original contract:
 * { providerAccountId, modelId, region, optional reasoningEffort }; batch id must match
 * ^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$ and carry 1..32 activations.
 */

export const EndpointAdmissionFieldSchema = Schema.Literals([
  "activationBatchId",
  "batchMode",
  "modelInput",
  "providerAccountId",
  "reasoningEffort",
  "region",
]);
export type EndpointAdmissionField = typeof EndpointAdmissionFieldSchema.Type;

export const EndpointAdmissionDraftSchema = Schema.Struct({
  activationBatchId: Schema.String,
  batchMode: Schema.String,
  modelInput: Schema.String,
  providerAccountId: Schema.String,
  reasoningEffort: Schema.String,
  region: Schema.String,
  selectedModelIds: Schema.Array(Schema.String),
});
export type EndpointAdmissionDraft = typeof EndpointAdmissionDraftSchema.Type;

export const EndpointAdmissionStateSchema = Schema.Struct({
  draft: EndpointAdmissionDraftSchema,
  error: Schema.optional(Schema.String),
  pendingAction: Schema.optional(Schema.Literals(["activate", "batch"])),
  run: EndpointActivationRunSchema,
  status: Schema.Literals(["draft", "saving", "saved", "partial", "error"]),
});
export type EndpointAdmissionState = typeof EndpointAdmissionStateSchema.Type;

export const initialEndpointAdmissionState = (): EndpointAdmissionState => ({
  draft: {
    activationBatchId: "",
    batchMode: "false",
    modelInput: "",
    providerAccountId: "",
    reasoningEffort: "",
    region: "global",
    selectedModelIds: [],
  },
  run: initialEndpointActivationRun(),
  status: "draft",
});

export const endpointAdmissionBusy = (state: EndpointAdmissionState): boolean =>
  state.run.pending.length > 0 || state.status === "saving" || state.pendingAction !== undefined;

export const validateEndpointAdmissionDraft = (state: EndpointAdmissionState): readonly string[] => {
  const errors: string[] = [];
  if (state.draft.providerAccountId.trim().length === 0) errors.push("Enter a provider account.");
  if (state.draft.selectedModelIds.length === 0) errors.push("Select at least one model.");
  if (state.draft.batchMode === "true") {
    if (new Set(state.draft.selectedModelIds).size > 32) {
      errors.push("Batch mode supports at most 32 activations.");
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(state.draft.activationBatchId.trim())) {
      errors.push("Enter a valid activation batch id.");
    }
  }
  return errors;
};

export interface EndpointActivationPayload {
  readonly modelId: string;
  readonly providerAccountId: string;
  readonly reasoningEffort?: string;
  readonly region: string;
}

export const endpointActivationPayloads = (
  draft: EndpointAdmissionDraft,
): readonly EndpointActivationPayload[] => {
  const region = draft.region.trim() || "global";
  const reasoningEffort = draft.reasoningEffort.trim();
  return [...new Set(draft.selectedModelIds)].map((modelId) => ({
    modelId,
    providerAccountId: draft.providerAccountId.trim(),
    ...(reasoningEffort.length === 0 ? {} : { reasoningEffort }),
    region,
  }));
};

export interface EndpointBatchPayload {
  readonly activations: readonly EndpointActivationPayload[];
  readonly activationBatchId: string;
}

export const endpointBatchPayload = (draft: EndpointAdmissionDraft): EndpointBatchPayload => ({
  activationBatchId: draft.activationBatchId.trim(),
  activations: endpointActivationPayloads(draft),
});

export interface EndpointAdmissionClient {
  readonly activate: (payload: EndpointActivationPayload) => Promise<unknown>;
  readonly activateBatch: (payload: EndpointBatchPayload) => Promise<unknown>;
}

interface EndpointAdmissionClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

export const createEndpointAdmissionClient = (
  options: EndpointAdmissionClientOptions = {},
): EndpointAdmissionClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl ?? "";
  const post = async (path: string, body: unknown): Promise<unknown> => {
    const response = await fetchImpl(base + path, {
      body: JSON.stringify(body),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.token === undefined ? {} : { authorization: "Bearer " + options.token }),
      },
      method: "POST",
    });
    const parsed: unknown = await response.json();
    if (!response.ok) {
      const record =
        parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Readonly<Record<string, unknown>>)
          : undefined;
      throw new Error(String(record?.error ?? record?.message ?? "endpoint activation failed"));
    }
    return parsed;
  };
  return {
    activate: async (payload) => post("/api/role-model/endpoints", payload),
    activateBatch: async (payload) => post("/api/role-model/endpoints/batch", payload),
  };
};
