import { describe, expect, test } from "vitest";
import { createRoleModelExtension } from "../src/extension.js";
import { loadCompactTaxonomy } from "../src/taxonomy/load-compact-taxonomy.js";
import type { PiCommandContext, PiModelSelection } from "../src/types.js";
import { createDiscovery } from "./fixtures.js";

type RegisteredCommandConfig = {
  handler: (args?: string, context?: PiCommandContext) => Promise<void>;
};

describe("Pi extension registration", () => {
  test("registers the role-model provider and one role-model command", async () => {
    const providers: Array<{ name: string; config: unknown }> = [];
    const commands: Array<{ name: string; config: unknown }> = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
      }),
    });

    await extension({
      registerProvider(name: string, config: unknown) {
        providers.push({ name, config });
      },
      registerCommand(name: string, config: unknown) {
        commands.push({ name, config });
      },
    });

    expect(providers).toEqual([expect.objectContaining({ name: "role-model" })]);
    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe("role-model");
    expect(commands[0]?.config).toEqual(
      expect.objectContaining({
        handler: expect.any(Function),
      }),
    );
    expect(commands[0]?.config).not.toEqual(
      expect.objectContaining({
        run: expect.any(Function),
      }),
    );
  });

  test("passes Pi setModel into alias selection command dependencies", async () => {
    const commands: Array<{ name: string; config: RegisteredCommandConfig }> = [];
    const activeModels: unknown[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      writeSelectedAlias: async () => undefined,
    });

    await extension({
      registerProvider() {
        // registered during setup and startup discovery
      },
      registerCommand(name: string, config: RegisteredCommandConfig) {
        commands.push({ name, config });
      },
      async setModel(model: PiModelSelection) {
        activeModels.push(model);
        return true;
      },
    });

    await commands[0]?.config.handler("alias use role-model/auto", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });

    expect(activeModels).toEqual([
      expect.objectContaining({
        provider: "role-model",
        id: "role-model/auto",
      }),
    ]);
  });

  test("refreshes effective taxonomy during setup and alias refresh", async () => {
    const commands: Array<{ name: string; config: RegisteredCommandConfig }> = [];
    const taxonomyResolutions: string[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      resolveTaxonomy: async () => {
        taxonomyResolutions.push("resolved");
        return {
          source: "runtime",
          taxonomy: loadCompactTaxonomy(),
        };
      },
    });

    await extension({
      registerProvider() {
        // registered during setup and refresh
      },
      registerCommand(name: string, config: RegisteredCommandConfig) {
        commands.push({ name, config });
      },
    });

    await commands[0]?.config.handler("setup", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });
    await commands[0]?.config.handler("alias refresh", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });

    expect(taxonomyResolutions).toHaveLength(3);
  });

  test("injects provider requests with the resolved runtime taxonomy when available", async () => {
    const callbacks: Array<
      (event: { type: "before_provider_request"; payload: unknown }) => unknown
    > = [];
    const runtimeTaxonomy = {
      ...loadCompactTaxonomy(),
      manifest: {
        ...loadCompactTaxonomy().manifest,
        contentRevision: "extension-runtime-taxonomy",
      },
    };
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      resolveTaxonomy: async () => ({
        source: "runtime",
        taxonomy: runtimeTaxonomy,
      }),
    });

    await extension({
      registerProvider() {
        // registered during startup discovery
      },
      registerCommand() {
        // registered below startup discovery
      },
      on(event, callback) {
        if (event === "before_provider_request") callbacks.push(callback);
      },
    });

    const payload = callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "role-model/auto",
        messages: [{ role: "user", content: "Implement this small bug fix." }],
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        role_model: expect.objectContaining({
          intent: expect.objectContaining({
            content_revision: "extension-runtime-taxonomy",
          }),
        }),
      }),
    );
  });

  test("loads runtime task chunks for request candidate roles before injecting intent", async () => {
    const callbacks: Array<
      (event: { type: "before_provider_request"; payload: unknown }) => unknown
    > = [];
    const packageTaxonomy = loadCompactTaxonomy();
    const taskChunkRequests: string[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      endpoint: "http://127.0.0.1:3456",
      resolveTaxonomy: async () => ({
        source: "runtime",
        taxonomy: {
          ...packageTaxonomy,
          manifest: {
            ...packageTaxonomy.manifest,
            contentRevision: "runtime-summary-only",
          },
        },
      }),
      fetchRuntimeTaskChunk: async (roleId) => {
        taskChunkRequests.push(roleId);
        return [
          {
            id: "coder.test.write",
            label: "Runtime Regression Test Writer",
            description: "Runtime-specific coding task chunk.",
            primaryRole: "coder",
            compatibleRoles: ["coder"],
            requiredCapabilities: ["code.read", "code.write"],
            preferredCapabilities: ["tools.command_execution"],
            requiredModalities: ["text"],
            toolClasses: ["filesystem.write", "shell.execute"],
            classifier: {
              useWhen: "Runtime says regression test prompts should prefer this task.",
              doNotUseWhen: "Use coder.edit for implementation-only prompts.",
            },
            variants: ["write"],
          },
        ];
      },
    });

    await extension({
      registerProvider() {
        // registered during startup discovery
      },
      registerCommand() {
        // registered below startup discovery
      },
      on(event, callback) {
        if (event === "before_provider_request") callbacks.push(callback);
      },
    });

    const payload = await callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "role-model/auto",
        messages: [
          { role: "user", content: "Implement this small bug fix and add a regression test." },
        ],
      },
    });

    expect(taskChunkRequests).toEqual(["tester"]);
    expect(payload).toEqual(
      expect.objectContaining({
        role_model: expect.objectContaining({
          intent: expect.objectContaining({
            content_revision: "runtime-summary-only",
            role_hint_id: "tester",
          }),
        }),
      }),
    );
  });

  test("injects provider requests for direct Role-Model model records", async () => {
    const callbacks: Array<
      (event: { type: "before_provider_request"; payload: unknown }) => unknown
    > = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery({
          models: [
            createDiscovery().models[0]
              ? {
                  ...createDiscovery().models[0],
                  id: "claude-3.7-sonnet",
                  type: "model",
                }
              : createDiscovery().models[0],
          ] as never,
          setup: { recommendedModel: "claude-3.7-sonnet", notes: ["Use discovery"] },
        }),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
    });

    await extension({
      registerProvider() {
        // registered during startup discovery
      },
      registerCommand() {
        // registered below startup discovery
      },
      on(event, callback) {
        if (event === "before_provider_request") callbacks.push(callback);
      },
    });

    const payload = callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "claude-3.7-sonnet",
        messages: [{ role: "user", content: "Review this diff for security risks." }],
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        role_model: expect.objectContaining({
          intent: expect.objectContaining({
            role_hint_id: "security",
            task_type: "security.audit",
          }),
        }),
      }),
    );
  });
});
