import type { ProviderConfig } from "@earendil-works/pi-coding-agent";
import { describe, expect, test } from "vitest";
import { createRoleModelExtension } from "../src/extension.js";
import { loadCompactTaxonomy } from "../src/taxonomy/load-compact-taxonomy.js";
import type { PiCommandContext, PiExtensionAPI, PiModelSelection } from "../src/types.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

type RegisteredCommandConfig = {
  handler: (args?: string, context?: PiCommandContext) => Promise<void>;
};

type BeforeProviderRequestCallback = (
  event: { type: "before_provider_request"; payload: unknown },
  context?: { model?: PiModelSelection },
) => unknown;

function asPiExtensionApi(value: unknown): PiExtensionAPI {
  return value as PiExtensionAPI;
}

describe("Pi extension registration", () => {
  test("uses ROLE_MODEL_ENDPOINT for runtime request commands when no explicit endpoint is passed", async () => {
    const commands: Array<{ name: string; config: RegisteredCommandConfig }> = [];
    const fetchCalls: string[] = [];
    const originalEndpoint = process.env.ROLE_MODEL_ENDPOINT;
    const originalFetch = globalThis.fetch;
    process.env.ROLE_MODEL_ENDPOINT = "http://127.0.0.1:4567/";
    globalThis.fetch = async (input) => {
      fetchCalls.push(String(input));
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      const extension = createRoleModelExtension({
        discover: async () => ({
          discovery: createDiscovery(),
          state: "ready",
          warnings: [],
          modelDiagnostics: [],
        }),
      });

      await extension(
        asPiExtensionApi({
          registerProvider() {
            // registered during startup discovery
          },
          registerCommand(name: string, config: RegisteredCommandConfig) {
            commands.push({ name, config });
          },
        }),
      );

      await commands[0]?.config.handler("requests 1", {
        ui: { notify: () => undefined },
        isProjectTrusted: () => true,
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalEndpoint === undefined) {
        delete process.env.ROLE_MODEL_ENDPOINT;
      } else {
        process.env.ROLE_MODEL_ENDPOINT = originalEndpoint;
      }
    }

    expect(fetchCalls).toContain("http://127.0.0.1:4567/api/role-model/requests");
    expect(fetchCalls.every((call) => call.startsWith("http://127.0.0.1:4567/"))).toBe(true);
  });

  test("registers the role-model provider and one role-model command", async () => {
    const providers: Array<{ name: string; config: unknown }> = [];
    const commands: Array<{ name: string; config: unknown }> = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
      }),
    });

    await extension(
      asPiExtensionApi({
        registerProvider(name: string, config: unknown) {
          providers.push({ name, config });
        },
        registerCommand(name: string, config: unknown) {
          commands.push({ name, config });
        },
      }),
    );

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

  test("refreshes and durably publishes complete Pi 0.84.2 model records", async () => {
    const providers: ProviderConfig[] = [];
    const publications: unknown[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({ discovery: createDiscovery() }),
    });

    await extension(
      asPiExtensionApi({
        registerProvider(_name: string, config: ProviderConfig) {
          providers.push(config);
        },
        registerCommand() {
          // Registration is not under test here.
        },
      }),
    );

    const refreshed = await providers[0]?.refreshModels?.({
      allowNetwork: true,
      signal: new AbortController().signal,
      publish: async (publication) => {
        publications.push(publication);
        return true;
      },
    });

    expect(providers).toHaveLength(1);
    expect(refreshed).toHaveLength(createDiscovery().models.length);
    expect(refreshed?.[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        reasoning: expect.any(Boolean),
        input: expect.any(Array),
        cost: expect.any(Object),
        contextWindow: expect.any(Number),
        maxTokens: expect.any(Number),
      }),
    );
    expect(publications).toEqual([
      expect.objectContaining({
        persist: expect.objectContaining({
          checkedAt: expect.any(Number),
          models: expect.arrayContaining([
            expect.objectContaining({
              provider: "role-model",
              baseUrl: "http://127.0.0.1:3456/v1",
              api: "openai-completions",
            }),
          ]),
        }),
      }),
    ]);
  });

  test("fails closed when Pi clamps a fixed endpoint away from its required thinking level", async () => {
    const handlers = new Map<string, (event: unknown, context?: unknown) => unknown>();
    let thinkingLevel = "low";
    const endpointId = "deepseek.personal.global.deepseek-v4-pro:high";
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery({
          models: [
            createModelRecord({
              id: endpointId,
              type: "endpoint" as never,
              upstreamModelId: "deepseek/deepseek-v4-pro" as never,
              fixedEffort: "high" as never,
              capabilities: {
                reasoning: {
                  supported: true,
                  effortControl: true,
                  effortLevels: ["low", "high"],
                },
              } as never,
            }),
          ],
        }),
      }),
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {},
        registerCommand() {},
        on(event: string, handler: (event: unknown, context?: unknown) => unknown) {
          handlers.set(event, handler);
        },
        getThinkingLevel() {
          return thinkingLevel;
        },
        setThinkingLevel() {
          thinkingLevel = "medium";
        },
      }),
    );

    await expect(handlers.get("model_select")?.({ model: { id: endpointId } })).rejects.toThrow(
      "could not apply required thinking level high",
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

    await extension(
      asPiExtensionApi({
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
      }),
    );

    await commands[0]?.config.handler("alias use baseline.remote-only", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });

    expect(activeModels).toEqual([
      expect.objectContaining({
        provider: "role-model",
        id: "baseline.remote-only",
      }),
    ]);
  });

  test("forwards command context so status can reflect Pi's live active role-model selection", async () => {
    const commands: Array<{ name: string; config: RegisteredCommandConfig }> = [];
    const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      readSelectedAlias: async () => "hybrid.remote-only",
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during setup and startup discovery
        },
        registerCommand(name: string, config: RegisteredCommandConfig) {
          commands.push({ name, config });
        },
      }),
    );

    await commands[0]?.config.handler("status", {
      ui: {
        notify: (message, level) => {
          notifications.push({ message, level });
        },
      },
      getModel: () => ({
        id: "difficulty.remote-only",
        provider: "role-model",
        api: "openai-completions",
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      }),
      isProjectTrusted: () => true,
    });

    expect(notifications).toEqual([
      expect.objectContaining({
        level: "info",
        message: expect.stringContaining("selected alias: difficulty.remote-only"),
      }),
    ]);
  });
  test("injects provider requests with the resolved runtime taxonomy when available", async () => {
    const callbacks: BeforeProviderRequestCallback[] = [];
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
      fetchRuntimeTaskChunk: async () => [],
      fetchRuntimeRoleSummaries: async () => [],
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand() {
          // registered below startup discovery
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    const payload = await callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "baseline.remote-only",
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
    const callbacks: BeforeProviderRequestCallback[] = [];
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
      fetchRuntimeRoleSummaries: async () => packageTaxonomy.roleSummaries,
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand() {
          // registered below startup discovery
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    const payload = await callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "baseline.remote-only",
        messages: [
          { role: "user", content: "Implement this small bug fix and add a regression test." },
        ],
      },
    });

    expect(taskChunkRequests).toEqual(
      expect.arrayContaining(["tester", "coder", "architect", "security", "operator"]),
    );
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

  test("loads runtime task chunks on the default endpoint path without requiring explicit endpoint config", async () => {
    const callbacks: BeforeProviderRequestCallback[] = [];
    const taskChunkRequests: string[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      fetchRuntimeTaskChunk: async (roleId) => {
        taskChunkRequests.push(roleId);
        return [];
      },
      fetchRuntimeRoleSummaries: async () => loadCompactTaxonomy().roleSummaries,
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand() {
          // registered below startup discovery
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    await callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "baseline.remote-only",
        messages: [
          { role: "user", content: "Implement this small bug fix and add a regression test." },
        ],
      },
    });

    expect(taskChunkRequests).toEqual(
      expect.arrayContaining(["tester", "coder", "architect", "security", "operator"]),
    );
  });

  test("refreshes effective taxonomy during command setup and alias refresh", async () => {
    const callbacks: BeforeProviderRequestCallback[] = [];
    const commands: Array<{ name: string; config: RegisteredCommandConfig }> = [];
    let contentRevision = "startup-taxonomy";
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      resolveTaxonomy: async () => ({
        source: "runtime",
        taxonomy: {
          ...loadCompactTaxonomy(),
          manifest: {
            ...loadCompactTaxonomy().manifest,
            contentRevision,
          },
        },
      }),
      fetchRuntimeTaskChunk: async () => [],
      fetchRuntimeRoleSummaries: async () => [],
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand(name: string, config: RegisteredCommandConfig) {
          commands.push({ name, config });
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    contentRevision = "refreshed-taxonomy";
    await commands[0]?.config.handler("setup", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });
    await commands[0]?.config.handler("alias refresh", {
      ui: { notify: () => undefined },
      isProjectTrusted: () => true,
    });

    const payload = await callbacks[0]?.({
      type: "before_provider_request",
      payload: {
        model: "baseline.remote-only",
        messages: [{ role: "user", content: "Implement this small bug fix." }],
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        role_model: expect.objectContaining({
          intent: expect.objectContaining({
            content_revision: "refreshed-taxonomy",
          }),
        }),
      }),
    );
  });

  test("injects provider requests for direct Role-Model model records", async () => {
    const callbacks: BeforeProviderRequestCallback[] = [];
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
      fetchRuntimeTaskChunk: async () => [],
      fetchRuntimeRoleSummaries: async () => [],
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand() {
          // registered below startup discovery
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    const payload = await callbacks[0]?.({
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

  test("rejects foreign provider ids before sending Role-Model provider requests", async () => {
    const callbacks: BeforeProviderRequestCallback[] = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "ready",
        warnings: [],
        modelDiagnostics: [],
      }),
      fetchRuntimeTaskChunk: async () => [],
      fetchRuntimeRoleSummaries: async () => [],
    });

    await extension(
      asPiExtensionApi({
        registerProvider() {
          // registered during startup discovery
        },
        registerCommand() {
          // registered below startup discovery
        },
        on(event: string, callback: BeforeProviderRequestCallback) {
          if (event === "before_provider_request") callbacks.push(callback);
        },
      }),
    );

    await expect(
      callbacks[0]?.(
        {
          type: "before_provider_request",
          payload: {
            model: "gpt-4o",
            messages: [{ role: "user", content: "Reply with ok." }],
          },
        },
        {
          model: {
            provider: "role-model",
            baseUrl: "http://127.0.0.1:3456/v1",
            id: "gpt-4o",
            name: "gpt-4o",
            api: "openai-completions",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 1024,
          },
        },
      ),
    ).rejects.toThrow(/foreign provider ids are not valid under provider role-model/i);
  });
});
