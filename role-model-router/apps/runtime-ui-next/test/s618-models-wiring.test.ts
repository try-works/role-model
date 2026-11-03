import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { createModelsClient, defineModelsCommands, defineReadDiagnostics } from "../src/commands";
import { Message } from "../src/message";
import { createUpdate } from "../src/update";
import { benchmarkRoute, modelsRolesRoute, modelsRoute } from "../src/features/models/routes";
import type { Model } from "../src/model";
import type { ReadbackState } from "../src/readback";
import { shellModel } from "./support/runtime-shell";

/** S618 (task-92): /models family wiring. */

const models = {
  rows: [
    { id: "alpha", label: "alpha", meta: JSON.stringify({ capabilities: [], contextWindow: 1000, endpointIds: [], providerId: "p" }), value: "remote" },
    { id: "beta", label: "beta", meta: JSON.stringify({ capabilities: [], contextWindow: 2000, endpointIds: [], providerId: "p" }), value: "remote" },
  ],
  status: "ok" as const,
  token: 0,
};
const endpoints = {
  rows: [{ id: "e1", label: "e1", meta: JSON.stringify({ endpointId: "e1", healthStatus: "healthy", modelId: "alpha", roleIds: ["coder"] }), value: "local" }],
  status: "ok" as const,
  token: 0,
};

const render = async (modelsView?: Model["modelsView"]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({ route: { _tag: "Models" } }), commands: [] }),
    // SAFETY: renderToString infers Message=unknown for this fixture view; modelsRoute only emits typed messages.
    view: (_model, h) => ({ body: modelsRoute(models, endpoints, h as Parameters<typeof modelsRoute>[2], modelsView), title: "models" }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const update = createUpdate(defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })));

const renderBenchmark = async (modelsView?: Model["modelsView"]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({ route: { _tag: "Benchmark" } }), commands: [] }),
    // SAFETY: renderToString infers Message=unknown; benchmarkRoute only emits typed messages.
    view: (_model, h) => ({ body: benchmarkRoute(readbackWith({ rows: [] }), readbackWith({ rows: [] }), readbackWith({ rows: [] }), h as Parameters<typeof benchmarkRoute>[3], modelsView, endpoints), title: "benchmark" }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const renderRoles = async (modelsView?: Model["modelsView"]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({ route: { _tag: "ModelsRoles" } }), commands: [] }),
    // SAFETY: renderToString infers Message=unknown; modelsRolesRoute only emits typed messages.
    view: (_model, h) => ({ body: modelsRolesRoute(models, endpoints, h as Parameters<typeof modelsRolesRoute>[2], modelsView), title: "roles" }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const readbackWith = (input: { readonly rows: ReadbackState["rows"] }): ReadbackState => ({ rows: input.rows, status: "ok", token: 0 });

describe("S618 models route wiring", () => {
  it("renders every model as a real selectable control and selects the state model", async () => {
    const container = await render({ selectedModelId: "beta" });
    const buttons = container.querySelectorAll("[data-model-card]");
    expect(buttons).toHaveLength(2);
    expect(container.textContent).toContain("Runtime · beta");
    expect(container.querySelector("[data-model-card='beta']")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("stores model selection in state", () => {
    const model = shellModel({ route: { _tag: "Models" } });
    const next = update(model, Message.ModelCardSelected({ modelId: "beta" }));
    expect(next.model.modelsView?.selectedModelId).toBe("beta");
  });

  it("dispatches a role-binding command and records the optimistic override", () => {
    const base = shellModel({ route: { _tag: "Models" } });
    const model = { ...base, readbacks: { ...base.readbacks, modelEndpoints: endpoints } };
    const next = update(model, Message.ModelsRoleToggled({ enabled: false, modelId: "alpha", roleId: "coder" }));
    expect(next.commands ?? []).toHaveLength(1);
    expect(next.model.modelsView?.roleOverrides).toEqual([{ enabled: false, modelId: "alpha", roleId: "coder" }]);
  });

  it("persists the create-role draft and dispatches creation", () => {
    const base = shellModel({ route: { _tag: "ModelsRoles" } });
    const model = { ...base, readbacks: { ...base.readbacks, modelEndpoints: endpoints } };
    const typed = update(model, Message.RoleDraftChanged({ field: "roleId", value: "legal" }));
    const named = update(typed.model, Message.RoleDraftChanged({ field: "name", value: "Legal" }));
    expect(named.model.modelsView?.roleDraft?.roleId).toBe("legal");
    expect(named.model.modelsView?.roleDraft?.name).toBe("Legal");
    const created = update(named.model, Message.RoleCreateRequested());
    expect(created.commands ?? []).toHaveLength(1);
  });

  it("renders benchmark judge options from endpoint ids and stores the selected id", async () => {
    const endpointsWithModel = readbackWith({ rows: [
      { id: "e1", label: "e1", meta: JSON.stringify({ endpointId: "judge-1", modelId: "model-one" }), value: "remote" },
      { id: "e2", label: "e2", meta: JSON.stringify({ endpointId: "judge-2", modelId: "model-two" }), value: "remote" },
    ] });
    const container = document.createElement("div");
    container.innerHTML = (await (async () => {
      const rendered = await Effect.runPromise(renderToString({
        init: () => ({ model: shellModel({ route: { _tag: "Benchmark" } }), commands: [] }),
        // SAFETY: renderToString infers Message=unknown; benchmarkRoute only emits typed messages.
        view: (_model, h) => ({ body: benchmarkRoute({ rows: [], status: "ok", token: 0 }, { rows: [], status: "ok", token: 0 }, { rows: [], status: "ok", token: 0 }, h as Parameters<typeof benchmarkRoute>[3], undefined, endpointsWithModel), title: "benchmark" }),
      }, { isHydratable: false }));
      return { html: rendered.html };
    })()).html;
    const values = [...container.querySelectorAll("select[aria-label='Judge endpoint'] option")].map((option) => option.getAttribute("value"));
    expect(values).toEqual(["judge-1", "judge-2"]);
    expect(container.textContent).toContain("model-one (unknown)");
    const model = shellModel({ route: { _tag: "Benchmark" } });
    expect(update(model, Message.BenchmarkJudgeChanged({ value: "judge-2" })).model.modelsView?.benchmarkJudge).toBe("judge-2");
  });

  it("renders the host role_kind and tool-policy option values and routes a non-default selection", async () => {
    const container = await renderRoles({ roleDraft: { description: "", instructions: "", kind: "assistant", name: "", roleId: "", toolPolicy: "allowed" } });
    expect([...container.querySelectorAll("select[aria-label='Kind'] option")].map((option) => option.getAttribute("value"))).toEqual(["assistant", "capability"]);
    expect([...container.querySelectorAll("select[aria-label='Tool policy mode'] option")].map((option) => option.getAttribute("value"))).toEqual(["allowed", "limited", "disabled"]);
    const calls: Array<{ readonly body: unknown; readonly method: string; readonly path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response("{}", { status: 200 });
      },
    }));
    const model = shellModel({ route: { _tag: "ModelsRoles" }, modelsView: { roleDraft: { allowedTools: "", defaultSystemInstructions: "i", description: "d", forbiddenCapabilities: "", instructions: "i", kind: "capability", name: "n", outputContracts: "", preferredCapabilities: "", requiredCapabilities: "", roleId: "legal", roleKind: "capability", routingOverridesText: "{}", safetyPolicyRefs: "", taskTypesSupported: "", toolPolicy: "limited", toolPolicyMode: "limited" } } });
    const queued = update(model, Message.RoleCreateRequested());
    const args = (queued.commands ?? [])[0] as unknown as { readonly args: { readonly draftJson: string; readonly token: number } };
    await Effect.runPromise(commands.createRole(args.args).effect);
    expect(calls[0]?.body).toEqual({
      default_system_instructions: "i", description: "d", forbidden_capabilities: [], name: "n", output_contracts: [],
      preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "capability",
      routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { allowed_tools: [], mode: "limited" },
    });
  });

  it("sends the exact host contracts for all four model commands", async () => {
    const calls: Array<{ readonly body: unknown; readonly method: string; readonly path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        const url = new URL(String(input), "http://localhost");
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: url.pathname });
        return new Response("{}", { status: 200 });
      },
    }));
    await Effect.runPromise(commands.clearBenchmark({ token: 1 }).effect);
    await Effect.runPromise(commands.runBenchmark({ endpointIdsJson: JSON.stringify(["ep-a", "ep-b"]), judgeEndpointId: "judge-1", mode: "quick", token: 1 }).effect);
    await Effect.runPromise(commands.setRoles({ kind: "peer", modelId: "model-1", roleIdsJson: JSON.stringify(["coder"]), token: 1 }).effect);
    await Effect.runPromise(commands.setRoles({ kind: "llama-swap", modelId: "model-2", roleIdsJson: JSON.stringify(["writer"]), token: 1 }).effect);
    await Effect.runPromise(commands.createRole({ draftJson: JSON.stringify({
      default_system_instructions: "", description: "", forbidden_capabilities: [], name: "n", output_contracts: [],
      preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "assistant",
      routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { mode: "allowed" },
    }), token: 1 }).effect);
    expect(calls[0]).toEqual({ body: {}, method: "DELETE", path: "/api/role-model/benchmark/data" });
    expect(calls[1]).toEqual({ body: { endpointIds: ["ep-a", "ep-b"], judgeEndpointId: "judge-1", mode: "quick" }, method: "POST", path: "/api/role-model/benchmark/runs" });
    expect(calls[2]).toEqual({
      body: { disabledRoleIds: [], enabledRoleIds: ["coder"], roleAssignmentMode: "include", roleIds: ["coder"] },
      method: "PUT",
      path: "/api/role-model/local/peer/models/model-1/roles",
    });
    expect(calls[3]).toEqual({
      body: { disabledRoleIds: [], enabledRoleIds: ["writer"], roleAssignmentMode: "include", roleIds: ["writer"] },
      method: "PUT",
      path: "/api/role-model/local/llama-swap/models/model-2/roles",
    });
    expect(calls[4]).toEqual({
      body: {
        default_system_instructions: "", description: "", forbidden_capabilities: [], name: "n", output_contracts: [],
        preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "assistant",
        routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { mode: "allowed" },
      },
      method: "POST",
      path: "/api/role-model/roles",
    });
    expect(calls[4]?.body).toEqual({
      default_system_instructions: "", description: "", forbidden_capabilities: [], name: "n", output_contracts: [],
      preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "assistant",
      routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { mode: "allowed" },
    });
  });

  it("renders the remove flow and controller footer actions for the selected model", async () => {
    const container = await render({ selectedModelId: "beta" });
    expect(container.textContent).toContain("Remove model");
    expect(container.querySelector("[data-model-remove]")?.getAttribute("aria-label")).toContain("beta");
    expect(container.textContent).toContain("Make primary controller");
    expect(container.textContent).toContain("Eject controller");
    expect(container.textContent).toContain("Open Roles");
    expect(container.textContent).toContain("Open Benchmark");
  });

  it("upserts the provider account for remote role toggles and keeps peer/llama kinds local", () => {
    const fixtureEndpoints = {
      rows: [
        { id: "p", label: "p", meta: JSON.stringify({ endpointId: "p", modelId: "peer-model", providerId: "peer", sourceType: "local" }), value: "local" },
        { id: "l", label: "l", meta: JSON.stringify({ endpointId: "l", modelId: "llama-model", providerId: "llama-swap", sourceType: "local" }), value: "local" },
        { id: "r", label: "r", meta: JSON.stringify({ endpointId: "r", modelId: "remote-model", providerAccountId: "acct-1", providerId: "openai", sourceType: "remote" }), value: "remote" },
      ], status: "ok" as const, token: 0,
    };
    const base = shellModel({ route: { _tag: "Models" } });
    const model = { ...base, readbacks: { ...base.readbacks, modelEndpoints: fixtureEndpoints } };
    const kindOf = (modelId: string) => {
      const next = update(model, Message.ModelsRoleToggled({ enabled: true, modelId, roleId: "coder" }));
      return (next.commands ?? [])[0] as unknown as { readonly args: { readonly kind: string } };
    };
    expect(kindOf("peer-model").args.kind).toBe("peer");
    expect(kindOf("llama-model").args.kind).toBe("llama-swap");

    const roles = { rows: [{ id: "role-policy", label: "policy", meta: JSON.stringify({ roleDefinitions: [{ role_id: "architect" }, { role_id: "coder" }, { role_id: "security" }], taskDefinitions: [] }), value: "" }], status: "ok" as const, token: 0 };
    const sourceAccount = {
      accountScope: "workspace-default",
      allowedModels: ["remote-model"],
      authMode: "api-key",
      baseUrlOverride: null,
      budgetPolicyRef: "budget.default",
      credentialRef: "vault:acct-1",
      deniedModels: [],
      entitlementTags: ["tier-a"],
      healthStatus: "healthy",
      modelRoleBindings: [{ disabledRoleIds: [], enabledRoleIds: ["coder"], endpointId: "r", modelId: "remote-model", roleAssignmentMode: "include", roleIds: ["coder"] }],
      orgScope: "personal",
      providerAccountId: "acct-1",
      providerId: "openai",
      providerKind: "openai",
      quotaPolicyRef: "quota.default",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      rotationState: "stable",
      status: "active",
    };
    const accountsFor = (roleAssignmentMode: string, enabledRoleIds: readonly string[], disabledRoleIds: readonly string[]) => ({
      rows: [{ id: "account:0", label: "acct-1", meta: JSON.stringify({ ...sourceAccount, modelRoleBindings: [{ disabledRoleIds: [...disabledRoleIds], enabledRoleIds: [...enabledRoleIds], endpointId: "r", modelId: "remote-model", roleAssignmentMode, roleIds: [...enabledRoleIds] }] }), value: "openai" }], status: "ok" as const, token: 0,
    });
    const posted = (accounts: ReturnType<typeof accountsFor>, enabled: boolean, roleId: string) => {
      const remote = { ...base, readbacks: { ...base.readbacks, modelEndpoints: fixtureEndpoints, providerAccounts: accounts, rolePolicy: roles } };
      const next = update(remote, Message.ModelsRoleToggled({ enabled, modelId: "remote-model", roleId }));
      const command = (next.commands ?? [])[0] as unknown as { readonly args: { readonly accountJson: string }; readonly name: string };
      expect(command.name).toBe("UpsertProviderAccount");
      return JSON.parse(command.args.accountJson) as Record<string, unknown>;
    };

    const allBody = posted(accountsFor("include", ["architect", "coder"], []), true, "security");
    expect(allBody).toEqual({ ...sourceAccount, modelRoleBindings: [{ disabledRoleIds: [], enabledRoleIds: [], endpointId: "r", modelId: "remote-model", roleAssignmentMode: "all", roleIds: [] }] });
    const includeBody = posted(accountsFor("include", [], []), false, "coder");
    expect(includeBody).toEqual({ ...sourceAccount, modelRoleBindings: [{ disabledRoleIds: [], enabledRoleIds: [], endpointId: "r", modelId: "remote-model", roleAssignmentMode: "include", roleIds: [] }] });
    const excludeBody = posted(accountsFor("include", ["architect", "coder"], []), false, "coder");
    expect((excludeBody.modelRoleBindings as readonly Record<string, unknown>[])[0]).toEqual({ disabledRoleIds: ["coder", "security"], enabledRoleIds: [], endpointId: "r", modelId: "remote-model", roleAssignmentMode: "exclude", roleIds: [] });
  });

  it("does not silently fall back to the local role route when the account row is missing", () => {
    const base = shellModel({ route: { _tag: "Models" } });
    const endpoints = { rows: [{ id: "r", label: "r", meta: JSON.stringify({ endpointId: "r", modelId: "remote-model", providerAccountId: "acct-missing", providerId: "openai", sourceType: "remote" }), value: "remote" }], status: "ok" as const, token: 0 };
    const next = update({ ...base, readbacks: { ...base.readbacks, modelEndpoints: endpoints } }, Message.ModelsRoleToggled({ enabled: true, modelId: "remote-model", roleId: "coder" }));
    expect(next.commands ?? []).toHaveLength(0);
    expect(next.model.modelsView?.actionMessage).toBe("Provider account acct-missing was not found in the account readback; role eligibility was not saved.");
  });

  it("renders the disabled eject reason, confirm transition, and zero-endpoint guard", async () => {
    const plain = await render({ selectedModelId: "beta" });
    const eject = plain.querySelector("[data-model-eject-controller]");
    expect(eject?.hasAttribute("disabled")).toBe(true);
    expect(eject?.getAttribute("title")).toBe("Controller ejection is not supported by the host API; remove the controller model instead.");
    expect(plain.querySelector("[data-model-remove]")?.textContent).toBe("Remove model");
    const confirm = await render({ removeConfirmation: "beta", selectedModelId: "beta" });
    expect(confirm.querySelector("[data-model-remove]")?.textContent).toBe("Confirm remove model");
    const empty = await render({ selectedModelId: "beta" });
    const makePrimary = [...empty.querySelectorAll("button")].find((button) => button.textContent === "Make primary controller");
    expect(makePrimary?.getAttribute("aria-disabled")).toBe("true");
  });

  it("removes the selected endpoint instance and leaves a sibling untouched", () => {
    const multi = {
      rows: [
        { id: "e1", label: "e1", meta: JSON.stringify({ endpointId: "e1", modelId: "beta", providerAccountId: "acct-a", sourceType: "remote" }), value: "remote" },
        { id: "e2", label: "e2", meta: JSON.stringify({ endpointId: "e2", modelId: "beta", providerAccountId: "acct-b", sourceType: "remote" }), value: "remote" },
      ], status: "ok" as const, token: 0,
    };
    const base = shellModel({ route: { _tag: "Models" }, modelsView: { selectedModelId: "beta" } });
    const withEndpoints = { ...base, readbacks: { ...base.readbacks, modelEndpoints: multi } };
    const armed = update(withEndpoints, Message.ModelsRemoveRequested({ modelId: "beta" }));
    expect(armed.commands ?? []).toHaveLength(0);
    const removed = update(armed.model, Message.ModelsRemoveRequested({ modelId: "beta" }));
    const command = (removed.commands ?? [])[0] as unknown as { readonly args: { readonly endpointId: string; readonly accountId: string } };
    expect(command.args.endpointId).toBe("e1");
    expect(command.args.accountId).toBe("acct-a");
  });

  it("renders account role eligibility for a remote model", async () => {
    const remoteModels = { ...models, rows: [{ id: "remote-model", label: "Remote", meta: JSON.stringify({ endpointIds: ["r"] }), value: "openai" }] };
    const remoteEndpoints = { ...endpoints, rows: [{ id: "r", label: "r", meta: JSON.stringify({ endpointId: "r", modelId: "remote-model", providerAccountId: "acct-1", providerId: "openai", sourceType: "remote" }), value: "remote" }] };
    const roles = { rows: [{ id: "role-policy", label: "policy", meta: JSON.stringify({ roleDefinitions: [{ role_id: "coder" }, { role_id: "architect" }], taskDefinitions: [] }), value: "" }], status: "ok" as const, token: 0 };
    const accounts = { rows: [{ id: "account:0", label: "acct-1", meta: JSON.stringify({ modelRoleBindings: [{ modelId: "remote-model", endpointId: "r", roleAssignmentMode: "include", enabledRoleIds: ["coder"], roleIds: ["coder"] }], providerAccountId: "acct-1" }), value: "openai" }], status: "ok" as const, token: 0 };
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({ route: { _tag: "Models" } }), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; modelsRoute only emits typed messages.
      view: (_model, h) => ({ body: modelsRoute(remoteModels, remoteEndpoints, h as Parameters<typeof modelsRoute>[2], { selectedModelId: "remote-model" }, roles, accounts), title: "models" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("[data-models-account-eligibility='acct-1']")?.textContent).toContain("Account role eligibility");
    expect(container.querySelector("[data-models-account-eligibility='acct-1']")?.textContent).toContain("coder");
  });

  it("sends the exact host removal and controller requests", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response(JSON.stringify({ removedAccount: true }), { status: 200 });
      },
    }));
    await Effect.runPromise(commands.removeModel({ accountId: "acct-1", endpointId: "", kind: "peer", modelId: "model-1", token: 1 }).effect);
    await Effect.runPromise(commands.removeModel({ accountId: "acct-1", endpointId: "ep-1", kind: "endpoint", modelId: "model-1", token: 1 }).effect);
    await Effect.runPromise(commands.removeModel({ accountId: "acct-1", endpointId: "", kind: "llama-swap", modelId: "model-1", token: 1 }).effect);
    await Effect.runPromise(commands.removeModel({ accountId: "acct-1", endpointId: "", kind: "account-model", modelId: "model-1", token: 1 }).effect);
    expect(calls[0]).toEqual({ body: {}, method: "POST", path: "/api/role-model/local/peer/models/model-1/unload" });
    expect(calls[1]).toEqual({ body: {}, method: "DELETE", path: "/api/role-model/endpoints/ep-1" });
    expect(calls[2]).toEqual({ body: {}, method: "POST", path: "/api/role-model/local/llama-swap/models/model-1/unload" });
    expect(calls[3]).toEqual({ body: {}, method: "DELETE", path: "/api/role-model/accounts/acct-1/models/model-1" });
  });

  it("deletes the account only in the account-model path and reports the exact message", async () => {
    const calls: string[] = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push(String(init?.method) + " " + new URL(String(input), "http://localhost").pathname);
        return new Response(JSON.stringify({ removedAccount: true }), { status: 200 });
      },
    }));
    const result = await Effect.runPromise(commands.removeModel({ accountId: "acct-1", endpointId: "", kind: "account-model", modelId: "model-1", token: 1 }).effect);
    expect(result).toMatchObject({ _tag: "ModelsActionSucceeded", message: "Removed model-1 and deleted acct-1 because it was the last configured model on that account." });
    expect(calls).toEqual(["DELETE /api/role-model/accounts/acct-1/models/model-1"]);
  });

  it("wires benchmark mode/judge/run/clear", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const endpointsReadback = { ...base.readbacks.modelEndpoints, rows: [
      { id: "e1", label: "e1", meta: JSON.stringify({ endpointId: "e1" }), value: "local" },
      { id: "e2", label: "e2", meta: JSON.stringify({ endpointId: "e2" }), value: "local" },
    ], status: "ok" as const };
    const model = { ...base, readbacks: { ...base.readbacks, modelEndpoints: endpointsReadback } };
    const mode = update(model, Message.BenchmarkModeChanged({ value: "full" }));
    expect(mode.model.modelsView?.benchmarkMode).toBe("full");
    const judge = update(mode.model, Message.BenchmarkJudgeChanged({ value: "e1" }));
    expect(judge.model.modelsView?.benchmarkJudge).toBe("e1");
    expect((update(judge.model, Message.BenchmarkRunRequested()).commands ?? [])).toHaveLength(1);
    // The destructive clear is armed first (:3456 confirm guard), never dispatched by the first click.
    const armed = update(judge.model, Message.BenchmarkClearRequested());
    expect(armed.commands ?? []).toHaveLength(0);
    expect(armed.model.modelsView?.benchmarkClearPending).toBe(true);
    expect((update(armed.model, Message.BenchmarkClearConfirmed()).commands ?? [])).toHaveLength(1);
    const cancelled = update(armed.model, Message.BenchmarkClearCancelled());
    expect(cancelled.commands ?? []).toHaveLength(0);
    expect(cancelled.model.modelsView?.benchmarkClearPending).toBe(false);
  });
});
