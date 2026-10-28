import { describe, expect, it } from "vitest";

import { Message } from "../src/message";
import {
  createProviderAccountClient,
  createProviderAccountPayload,
  initialProviderAccountState,
  updateProviderKeyPayload,
  validateProviderAccountDraft,
  type ProviderAccountDraft,
} from "../src/provider-account";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S396b (M8): provider account create/update-key/delete-model form. Exact host requests:
 * POST /accounts (original buildProviderPayload contract), POST /accounts/repair/update-key
 * {providerAccountId, apiKey}, DELETE /accounts/{providerAccountId}/models/{modelId}.
 */

const draft: ProviderAccountDraft = {
  apiKey: "sk-live",
  authMode: "api-key-static",
  baseUrlOverride: "",
  existingHealthStatus: "",
  existingRotationState: "",
  existingStatus: "",
  oauthConnected: "false",
  roleIdsInput: "",
  credentialRef: "OPENAI_API_KEY",
  modelInput: "",
  providerAccountId: "openai.personal.default",
  providerId: "openai",
  providerKind: "openai",
  selectedModelIds: ["gpt-6", "gpt-6"],
  variantId: "default",
};

const stateWithDraft = (extra: Partial<ReturnType<typeof initialProviderAccountState>> = {}) => ({
  ...initialProviderAccountState(),
  draft,
  token: 1,
  ...extra,
});

const modelWith = (providerAccount: ReturnType<typeof initialProviderAccountState>) =>
  shellModel({ providerAccount });

const authOf = (model: ReturnType<typeof shellModel>) =>
  model.providerAccount ?? initialProviderAccountState();

const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];

describe("S396b provider account client (exact HTTP)", () => {
  const recordingFetch = () => {
    const calls: Array<{ readonly body?: string; readonly method?: string; readonly url: string }> = [];
    // SAFETY: production always passes a JSON string body; this stub only records it.
    const fetchImpl = (async (url: string, init?: { readonly body?: string; readonly method?: string }) => {
      calls.push({ body: init?.body, method: init?.method, url });
      return new Response(JSON.stringify({ providerAccountId: draft.providerAccountId }), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    return { calls, fetchImpl };
  };

  it("POSTs the exact original create payload to /accounts", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const client = createProviderAccountClient({ fetchImpl });
    const payload = createProviderAccountPayload(stateWithDraft());
    await client.create(payload);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("/api/role-model/accounts");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      accountScope: "workspace-default",
      allowedModels: ["gpt-6"],
      authMode: "api-key-static",
      baseUrlOverride: "",
      budgetPolicyRef: "budget.default",
      credentialRef: { backend: "env", ref: "OPENAI_API_KEY" },
      deniedModels: [],
      entitlementTags: ["chat"],
      healthStatus: "healthy",
      modelRoleBindings: [
        { disabledRoleIds: [], enabledRoleIds: [], modelId: "gpt-6", roleAssignmentMode: "include", roleIds: [] },
      ],
      orgScope: "personal",
      providerAccountId: "openai.personal.default",
      providerId: "openai",
      providerKind: "openai",
      quotaPolicyRef: "quota.default",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      rotationState: "stable",
      status: "active",
    });
  });

  it("POSTs the exact update-key body and DELETEs one encoded model", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const client = createProviderAccountClient({ fetchImpl });
    await client.updateKey(updateProviderKeyPayload(draft));
    await client.deleteModel(draft.providerAccountId, "gpt-6 mini");
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", "/api/role-model/accounts/repair/update-key"],
      ["DELETE", "/api/role-model/accounts/openai.personal.default/models/gpt-6%20mini"],
    ]);
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      apiKey: "sk-live",
      providerAccountId: "openai.personal.default",
    });
  });
});

describe("S396b provider account form state machine", () => {
  it("validates without dropping the draft", () => {
    const state = stateWithDraft({ draft: { ...draft, apiKey: "", providerId: "", selectedModelIds: [] } });
    expect(validateProviderAccountDraft(state)).toEqual(["Select a provider.", "Enter an API key."]);
    expect(state.draft.providerId).toBe("");
  });

  it("refuses a second create while one is pending (no double submit)", () => {
    const saving = stateWithDraft({ status: "saving" as const });
    expect(commandsOf(shellUpdate(modelWith(saving), Message.ProviderAccountCreateRequested({})))).toEqual([]);
    const idle = stateWithDraft();
    const result = shellUpdate(modelWith(idle), Message.ProviderAccountCreateRequested({}));
    expect(commandsOf(result)).toHaveLength(1);
    expect(commandsOf(result)[0]?.name).toBe("CreateProviderAccount");
    expect(JSON.parse(String(commandsOf(result)[0]?.args?.payload)).allowedModels).toEqual(["gpt-6"]);
  });

  it("keeps the draft on a save failure", () => {
    const result = shellUpdate(modelWith(stateWithDraft({ status: "saving" as const })), Message.ProviderAccountFailed({ message: "conflict", token: 1 }));
    expect(authOf(result.model).status).toBe("error");
    expect(authOf(result.model).error).toBe("conflict");
    expect(authOf(result.model).draft).toEqual(draft);
  });

  it("deletes exactly one model and keeps the rest", () => {
    const state = stateWithDraft({ draft: { ...draft, selectedModelIds: ["gpt-6", "gpt-6-mini"] } });
    const result = shellUpdate(modelWith(state), Message.ProviderAccountModelDeleted({ modelId: "gpt-6", token: 1 }));
    expect(authOf(result.model).draft.selectedModelIds).toEqual(["gpt-6-mini"]);
  });
});

describe("S396b provider account controlled form", () => {
  it("field changes drive the typed draft and model add/remove keeps the list", () => {
    const state = stateWithDraft();
    const changed = shellUpdate(modelWith(state), Message.ProviderAccountFieldChanged({ field: "providerId", value: "acme" }));
    expect(authOf(changed.model).draft.providerId).toBe("acme");
    expect(authOf(changed.model).draft.selectedModelIds).toEqual(["gpt-6", "gpt-6"]);
    const typed = shellUpdate(changed.model, Message.ProviderAccountFieldChanged({ field: "modelInput", value: "gpt-7" }));
    const added = shellUpdate(typed.model, Message.ProviderAccountModelAdded({}));
    expect(authOf(added.model).draft.selectedModelIds).toEqual(["gpt-6", "gpt-7"]);
    expect(authOf(added.model).draft.modelInput).toBe("");
    const removed = shellUpdate(added.model, Message.ProviderAccountModelRemoved({ modelId: "gpt-6" }));
    expect(authOf(removed.model).draft.selectedModelIds).toEqual(["gpt-7"]);
  });
});

describe("S402 provider account payload branches", () => {
  it("sends an empty baseUrlOverride when the draft is empty and the value when present", () => {
    const empty = createProviderAccountPayload(stateWithDraft());
    expect(empty.baseUrlOverride).toBe("");
    const present = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, baseUrlOverride: "https://api.example" } }));
    expect(present.baseUrlOverride).toBe("https://api.example");
  });
  it("projects fresh api-key, oauth not connected, oauth connected and existing-account lifecycles", () => {
    const apiKey = createProviderAccountPayload(stateWithDraft());
    expect([apiKey.status, apiKey.healthStatus, apiKey.rotationState]).toEqual(["active", "healthy", "stable"]);
    const oauthPending = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, authMode: "oauth2-device-code", apiKey: "", credentialRef: "" } }));
    expect([oauthPending.status, oauthPending.healthStatus, oauthPending.rotationState]).toEqual(["disabled", "credentials-missing", "in-progress"]);
    const oauthConnected = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, authMode: "oauth2-device-code", apiKey: "", credentialRef: "", oauthConnected: "true" } }));
    expect([oauthConnected.status, oauthConnected.healthStatus, oauthConnected.rotationState]).toEqual(["active", "healthy", "stable"]);
    const existingOauth = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, authMode: "oauth2-device-code", apiKey: "", credentialRef: "", existingHealthStatus: "healthy", existingRotationState: "stable", existingStatus: "active" } }));
    expect([existingOauth.status, existingOauth.healthStatus, existingOauth.rotationState]).toEqual(["active", "healthy", "stable"]);
    const existingApiKey = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, existingHealthStatus: "credentials-missing", existingRotationState: "not-required", existingStatus: "disabled" } }));
    expect([existingApiKey.status, existingApiKey.healthStatus, existingApiKey.rotationState]).toEqual(["disabled", "credentials-missing", "not-required"]);
  });
  it("computes non-empty role bindings from the role selection", () => {
    const payload = createProviderAccountPayload(stateWithDraft({ draft: { ...draft, roleIdsInput: "role-b, role-a" } }));
    expect(payload.modelRoleBindings).toEqual([
      { disabledRoleIds: [], enabledRoleIds: ["role-a", "role-b"], modelId: "gpt-6", roleAssignmentMode: "include", roleIds: ["role-a", "role-b"] },
    ]);
  });
  it("refuses update-key and delete requests while a save is in flight", () => {
    const saving = stateWithDraft({ status: "saving" as const });
    expect(commandsOf(shellUpdate(modelWith(saving), Message.ProviderAccountUpdateKeyRequested({})))).toEqual([]);
    expect(commandsOf(shellUpdate(modelWith(saving), Message.ProviderAccountModelDeleteRequested({ modelId: "gpt-6" })))).toEqual([]);
  });
});
