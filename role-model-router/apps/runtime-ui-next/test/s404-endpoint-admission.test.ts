import { describe, expect, it } from "vitest";

import { CONTROL_SPECS } from "../src/control";
import {
  createEndpointAdmissionClient,
  endpointActivationPayloads,
  endpointBatchPayload,
  initialEndpointAdmissionState,
  type EndpointAdmissionDraft,
} from "../src/endpoint-admission";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S396c (M8): endpoint admission single/batch payloads, busy guard, error keeps draft, S208 removal. */

const draft: EndpointAdmissionDraft = {
  activationBatchId: "activation-batch-1",
  batchMode: "false",
  modelInput: "",
  providerAccountId: "openai.personal.default",
  reasoningEffort: "high",
  region: "global",
  selectedModelIds: ["gpt-6", "gpt-6-mini"],
};

const stateWithDraft = (extra: Partial<ReturnType<typeof initialEndpointAdmissionState>> = {}) => ({
  ...initialEndpointAdmissionState(),
  draft,
  ...extra,
});

const pendingRun = (activationIds: readonly string[]) => ({
  generation: 1,
  mode: "single" as const,
  pending: activationIds.map((activationId) => ({ activationId })),
  settled: [],
  status: "pending" as const,
});

const modelWith = (endpointAdmission: ReturnType<typeof initialEndpointAdmissionState>) =>
  shellModel({ endpointAdmission });

const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];
const names = (result: ReturnType<typeof shellUpdate>) => commandsOf(result).map((command) => command.name);

describe("S396c endpoint admission payloads", () => {
  it("builds one exact activation per selected model (single mode)", () => {
    expect(endpointActivationPayloads(draft)).toEqual([
      { modelId: "gpt-6", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
      { modelId: "gpt-6-mini", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
    ]);
  });

  it("builds the exact batch payload", () => {
    expect(endpointBatchPayload({ ...draft, batchMode: "true" })).toEqual({
      activationBatchId: "activation-batch-1",
      activations: [
        { modelId: "gpt-6", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
        { modelId: "gpt-6-mini", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
      ],
    });
  });

  it("POSTs the exact single and batch bodies", async () => {
    const calls: Array<{ readonly body?: string; readonly url: string }> = [];
    // SAFETY: this stub only records the JSON string bodies the client sends.
    const fetchImpl = (async (url: string, init?: { readonly body?: string }) => {
      calls.push({ body: init?.body, url });
      return new Response(JSON.stringify({}), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const client = createEndpointAdmissionClient({ fetchImpl });
    await client.activate(endpointActivationPayloads(draft)[0]!);
    await client.activateBatch(endpointBatchPayload(draft));
    expect(calls.map((call) => call.url)).toEqual([
      "/api/role-model/endpoints",
      "/api/role-model/endpoints/batch",
    ]);
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      modelId: "gpt-6",
      providerAccountId: "openai.personal.default",
      reasoningEffort: "high",
      region: "global",
    });
    expect(JSON.parse(calls[1]?.body ?? "{}").activationBatchId).toBe("activation-batch-1");
    expect(JSON.parse(calls[1]?.body ?? "{}").activations).toHaveLength(2);
  });
});

describe("S396c endpoint admission state machine", () => {
  it("single mode emits one ActivateEndpoint per model", () => {
    const result = shellUpdate(modelWith(stateWithDraft()), Message.EndpointAdmissionSubmitRequested({}));
    expect(names(result)).toEqual(["ActivateEndpoint", "ActivateEndpoint"]);
    const payloads = commandsOf(result).map((command) => JSON.parse(String(command.args?.payload)));
    expect(payloads.map((payload: { modelId: string }) => payload.modelId)).toEqual(["gpt-6", "gpt-6-mini"]);
  });

  it("batch mode emits ONE batch command", () => {
    const state = stateWithDraft({ draft: { ...draft, batchMode: "true" } });
    const result = shellUpdate(modelWith(state), Message.EndpointAdmissionSubmitRequested({}));
    expect(names(result)).toEqual(["ActivateEndpointBatch"]);
    expect(JSON.parse(String(commandsOf(result)[0]?.args?.payload)).activationBatchId).toBe("activation-batch-1");
  });

  it("refuses a second submit while saving, keeps the draft on failure and on validation", () => {
    const saving = stateWithDraft({ run: pendingRun(["model:gpt-6", "model:gpt-6-mini"]), status: "saving" as const });
    expect(commandsOf(shellUpdate(modelWith(saving), Message.EndpointAdmissionSubmitRequested({})))).toEqual([]);
    const firstFailure = shellUpdate(
      modelWith(saving),
      Message.EndpointAdmissionFailed({ activationId: "model:gpt-6", generation: 1, message: "conflict" }),
    );
    expect(firstFailure.model.endpointAdmission?.status).toBe("saving");
    const failed = shellUpdate(
      firstFailure.model,
      Message.EndpointAdmissionFailed({ activationId: "model:gpt-6-mini", generation: 1, message: "conflict" }),
    );
    expect(failed.model.endpointAdmission?.status).toBe("error");
    expect(failed.model.endpointAdmission?.error).toContain("conflict");
    expect(failed.model.endpointAdmission?.draft).toEqual(draft);
    const invalid = shellUpdate(
      modelWith(stateWithDraft({ draft: { ...draft, providerAccountId: "", selectedModelIds: [] } })),
      Message.EndpointAdmissionSubmitRequested({}),
    );
    expect(commandsOf(invalid)).toEqual([]);
    expect(invalid.model.endpointAdmission?.status).toBe("error");
    expect(invalid.model.endpointAdmission?.draft.providerAccountId).toBe("");
  });

  it("removes the S208 disabled reason now that the form is real", () => {
    expect("disabledReason" in (CONTROL_SPECS.endpoints.action ?? {})).toBe(false);
  });
});

describe("S405 batch activation bound", () => {
  const models = (count: number) => Array.from({ length: count }, (_, index) => "model-" + String(index));
  it("accepts 32 selected models in one batch command", () => {
    const state = stateWithDraft({ draft: { ...draft, batchMode: "true", selectedModelIds: models(32) } });
    const result = shellUpdate(modelWith(state), Message.EndpointAdmissionSubmitRequested({}));
    expect(names(result)).toEqual(["ActivateEndpointBatch"]);
    expect(JSON.parse(String(commandsOf(result)[0]?.args?.payload)).activations).toHaveLength(32);
  });
  it("refuses 33 selected models in batch mode with a typed validation error keeping the draft", () => {
    const state = stateWithDraft({ draft: { ...draft, batchMode: "true", selectedModelIds: models(33) } });
    const result = shellUpdate(modelWith(state), Message.EndpointAdmissionSubmitRequested({}));
    expect(commandsOf(result)).toEqual([]);
    expect(result.model.endpointAdmission?.status).toBe("error");
    expect(result.model.endpointAdmission?.error).toContain("at most 32");
    expect(result.model.endpointAdmission?.draft.selectedModelIds).toHaveLength(33);
  });
});
