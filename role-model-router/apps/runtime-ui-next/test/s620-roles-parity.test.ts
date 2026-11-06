import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { createModelsClient, defineModelsCommands } from "../src/commands";
import { blankRoleDraft } from "../src/features/models/role-policy";
import { modelsRolesRoute } from "../src/features/models/routes";
import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";
import { READBACK_SPECS, type ReadbackState } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";

const rolePolicyBody = {
  roleDefinitions: [
    {
      default_system_instructions: "You are the coding role.",
      description: "Implements and reviews code.",
      forbidden_capabilities: [],
      name: "Coder",
      output_contracts: [],
      preferred_capabilities: ["tools"],
      required_capabilities: ["coding"],
      role_id: "coder",
      role_kind: "capability",
      routing_policy_overrides: { prefer: "fast" },
      safety_policy_refs: [],
      task_types_supported: ["code.review"],
      tool_policy: { allowed_tools: ["read_file"], mode: "limited" },
      primaryGroupId: "engineering",
    },
    {
      default_system_instructions: "You are legal.",
      description: "Reviews contracts.",
      forbidden_capabilities: [],
      name: "Legal",
      output_contracts: [],
      preferred_capabilities: [],
      required_capabilities: ["legal"],
      role_id: "legal",
      role_kind: "capability",
      routing_policy_overrides: {},
      safety_policy_refs: ["legal.safe"],
      task_types_supported: ["contract.review"],
      tool_policy: { allowed_tools: [], mode: "disabled" },
      primaryGroupId: "legal",
      riskLevel: "high",
    },
  ],
  taskDefinitions: [
    {
      allowed_roles: ["coder"],
      default_benchmark_suites: [],
      description: "Review a code change.",
      preferred_capabilities: [],
      quality_metrics: [],
      required_capabilities: ["coding"],
      required_inputs: [],
      task_type: "code.review",
    },
    {
      allowed_roles: ["legal"],
      default_benchmark_suites: [],
      description: "Review a contract.",
      preferred_capabilities: [],
      quality_metrics: [],
      required_capabilities: ["legal"],
      required_inputs: [],
      task_type: "contract.review",
    },
  ],
};

const rolePolicyReadback = (): ReadbackState => READBACK_SPECS.rolePolicy.parse(rolePolicyBody, 0);
const createDraft = (overrides: Partial<Record<string, string>> = {}) => ({
  ...blankRoleDraft(),
  description: "",
  instructions: "",
  kind: "assistant",
  name: "",
  roleId: "",
  toolPolicy: "allowed",
  ...overrides,
});
const renderRoles = async (
  modelsView?: Parameters<typeof modelsRolesRoute>[3],
  rolePolicy = rolePolicyReadback(),
): Promise<string> => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model: shellModel({ route: { _tag: "ModelsRoles" } }), commands: [] }),
        // SAFETY: renderToString infers Message=unknown; the route only emits typed messages.
        view: (_model, h) => ({
          body: modelsRolesRoute(
            { rows: [], status: "ok", token: 0 },
            { rows: [], status: "ok", token: 0 },
            h as Parameters<typeof modelsRolesRoute>[2],
            modelsView,
            rolePolicy,
          ),
          title: "roles",
        }),
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container.innerHTML;
};

describe("S620 roles page parity", () => {
  it("renders the catalog, task detail expansion, create options, edit values, and task allowlists", async () => {
    const html = await renderRoles({ expandedRoleId: "coder", selectedRoleId: "coder" });
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.textContent).toContain("Create role");
    expect(container.textContent).toContain("Role catalog");
    expect(container.textContent).toContain("Role task allowlists");
    expect(container.textContent).toContain("Edit selected role");
    expect(
      [...container.querySelectorAll("#role-create-kind option")].map((option) =>
        option.getAttribute("value"),
      ),
    ).toEqual(["assistant", "capability"]);
    expect(
      [...container.querySelectorAll("#role-create-tool-policy option")].map((option) =>
        option.getAttribute("value"),
      ),
    ).toEqual(["allowed", "limited", "disabled"]);
    expect(container.querySelector("[data-role-catalog-select='coder']")?.textContent).toContain(
      "Coder",
    );
    expect(container.querySelector("[data-role-task-detail='coder']")?.textContent).toBe(
      "Hide task detail",
    );
    expect(container.textContent).toContain("Review a code change.");
    expect(
      container
        .querySelector("[aria-label='Allow coder for code.review']")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(container.querySelector("#role-edit-id")?.getAttribute("value")).toBe("coder");
    expect(container.querySelector("#role-edit-name")?.getAttribute("value")).toBe("Coder");
    expect(container.querySelector("#role-edit-routing-overrides")?.textContent).toContain(
      "prefer",
    );
    expect(container.textContent).toContain("tool policy limited");
  });

  it("expands Task detail through the rendered catalog control", async () => {
    window.history.replaceState({}, "", "/models/roles");
    const container = document.createElement("div");
    container.id = "s620-roles";
    document.body.append(container);
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      const body = url.includes("/role-policy")
        ? rolePolicyBody
        : url.includes("/models")
          ? { models: [] }
          : url.includes("/endpoints")
            ? { endpoints: [] }
            : {};
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
    try {
      const end = Date.now() + 5000;
      while (
        document.querySelector("[data-role-task-detail='coder']") === null &&
        Date.now() < end
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const button = document.querySelector(
        "[data-role-task-detail='coder']",
      ) as HTMLButtonElement | null;
      if (button === null)
        throw new Error(
          `role catalog did not render: ${(document.body.textContent ?? "").slice(0, 400)}`,
        );
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.body.textContent).toContain("Review a code change.");
    } finally {
      handle.dispose();
      container.remove();
      window.history.replaceState({}, "", "/");
    }
  });

  it("starts an edit draft from the selected role before applying a field change", () => {
    const base = shellModel({
      route: { _tag: "ModelsRoles" },
      modelsView: { selectedRoleId: "coder" },
    });
    const model = { ...base, readbacks: { ...base.readbacks, rolePolicy: rolePolicyReadback() } };
    const changed = shellUpdate(
      model,
      Message.RoleEditDraftChanged({ field: "description", value: "Updated description" }),
    );
    expect(changed.model.modelsView?.roleEditDraft).toMatchObject({
      description: "Updated description",
      name: "Coder",
      roleId: "coder",
    });
  });

  it("sends the exact create, update, and task allowlist bodies", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineModelsCommands(
      createModelsClient({
        fetchImpl: async (input, init) => {
          const url = new URL(String(input), "http://localhost");
          calls.push({
            body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
            method: String(init?.method),
            path: url.pathname,
          });
          return new Response("{}", { status: 200 });
        },
      }),
    );
    const base = shellModel({
      route: { _tag: "ModelsRoles" },
      modelsView: { roleDraft: createDraft({ roleId: "new-role", name: "New role" }) },
    });
    const model = { ...base, readbacks: { ...base.readbacks, rolePolicy: rolePolicyReadback() } };
    const created = shellUpdate(model, Message.RoleCreateRequested());
    const createArgs = (created.commands ?? [])[0] as unknown as {
      args: { draftJson: string; token: number };
    };
    expect(created.commands?.[0]?.name).toBe("CreateRole");
    await Effect.runPromise(commands.createRole(createArgs.args).effect);
    expect(calls[0]).toEqual({
      body: JSON.parse(createArgs.args.draftJson),
      method: "POST",
      path: "/api/role-model/roles",
    });

    const editing = {
      ...model,
      modelsView: {
        selectedRoleId: "coder",
        roleEditDraft: createDraft({
          roleId: "coder",
          name: "Coder",
          roleKind: "capability",
          toolPolicyMode: "limited",
        }),
      },
    };
    const edited = shellUpdate(editing, Message.RoleEditSaveRequested());
    const editArgs = (edited.commands ?? [])[0] as unknown as {
      args: { draftJson: string; roleId: string; token: number };
    };
    expect(edited.commands?.[0]?.name).toBe("UpdateRole");
    await Effect.runPromise(commands.updateRole(editArgs.args).effect);
    expect(calls[1]).toEqual({
      body: JSON.parse(editArgs.args.draftJson),
      method: "PUT",
      path: "/api/role-model/roles/coder",
    });

    const toggled = shellUpdate(
      editing,
      Message.RoleTaskRoleToggled({ roleId: "legal", taskType: "code.review" }),
    );
    const saved = shellUpdate(toggled.model, Message.RoleTaskAllowlistsSaveRequested());
    const tasksArgs = (saved.commands ?? [])[0] as unknown as {
      args: { tasksJson: string; token: number };
    };
    expect(saved.commands?.[0]?.name).toBe("UpdateRoleTaskAllowlists");
    await Effect.runPromise(commands.updateTasks(tasksArgs.args).effect);
    expect(calls[2]).toEqual({
      body: JSON.parse(tasksArgs.args.tasksJson),
      method: "PUT",
      path: "/api/role-model/tasks",
    });
    expect(
      (calls[2]?.body as readonly { allowed_roles: readonly string[]; task_type: string }[]).find(
        (task) => task.task_type === "code.review",
      )?.allowed_roles,
    ).toEqual(["coder", "legal"]);
  });
});
