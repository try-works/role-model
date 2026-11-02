import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { createModelsClient, defineModelsCommands, defineReadDiagnostics } from "../src/commands";
import { Message } from "../src/message";
import { createUpdate } from "../src/update";
import { modelsRoute } from "../src/features/models/routes";
import type { Model } from "../src/model";
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
    expect(typed.model.modelsView?.roleDraft?.roleId).toBe("legal");
    const created = update(typed.model, Message.RoleCreateRequested());
    expect(created.commands ?? []).toHaveLength(1);
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
    await Effect.runPromise(commands.runBenchmark({ judgeEndpointId: "judge-1", mode: "quick", token: 1 }).effect);
    await Effect.runPromise(commands.setRoles({ kind: "peer", modelId: "model-1", roleIdsJson: JSON.stringify(["coder"]), token: 1 }).effect);
    await Effect.runPromise(commands.setRoles({ kind: "llama-swap", modelId: "model-2", roleIdsJson: JSON.stringify(["writer"]), token: 1 }).effect);
    await Effect.runPromise(commands.createRole({ draftJson: JSON.stringify({
      default_system_instructions: "", description: "", forbidden_capabilities: [], name: "n", output_contracts: [],
      preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "assistant",
      routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { mode: "allowed" },
    }), token: 1 }).effect);
    expect(calls[0]).toMatchObject({ method: "DELETE", path: "/api/role-model/benchmark/data" });
    expect(calls[1]).toEqual({ body: { judgeEndpointId: "judge-1", mode: "quick" }, method: "POST", path: "/api/role-model/benchmark/runs" });
    expect(calls[2]).toMatchObject({ method: "PUT", path: "/api/role-model/local/peer/models/model-1/roles" });
    expect(calls[2]?.body).toEqual({ disabledRoleIds: [], enabledRoleIds: ["coder"], roleAssignmentMode: "include", roleIds: ["coder"] });
    expect(calls[3]).toMatchObject({ method: "PUT", path: "/api/role-model/local/llama-swap/models/model-2/roles" });
    expect(calls[4]).toMatchObject({ method: "POST", path: "/api/role-model/roles" });
    expect(calls[4]?.body).toEqual({
      default_system_instructions: "", description: "", forbidden_capabilities: [], name: "n", output_contracts: [],
      preferred_capabilities: [], required_capabilities: [], role_id: "legal", role_kind: "assistant",
      routing_policy_overrides: {}, safety_policy_refs: [], task_types_supported: [], tool_policy: { mode: "allowed" },
    });
  });

  it("wires benchmark mode/judge/run/clear", () => {
    const model = shellModel({ route: { _tag: "Benchmark" } });
    const mode = update(model, Message.BenchmarkModeChanged({ value: "full" }));
    expect(mode.model.modelsView?.benchmarkMode).toBe("full");
    const judge = update(mode.model, Message.BenchmarkJudgeChanged({ value: "e1" }));
    expect(judge.model.modelsView?.benchmarkJudge).toBe("e1");
    expect((update(judge.model, Message.BenchmarkRunRequested()).commands ?? [])).toHaveLength(1);
    expect((update(judge.model, Message.BenchmarkClearRequested()).commands ?? [])).toHaveLength(1);
  });
});
