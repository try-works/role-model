import { describe, expect, test } from "vitest";
import { createRoleModelCommandHandler } from "../src/commands.js";
import type { DownstreamOpenAIDiscovery } from "../src/types.js";
import { RoleModelDiscoveryError } from "../src/runtime-discovery.js";
import { createDiscovery } from "./fixtures.js";

const discovery: DownstreamOpenAIDiscovery = {
  contractVersion: "role-model.downstream.openai.v1",
  kind: "openai-compatible",
  providerId: "role-model-runtime",
  displayName: "Role-Model Runtime",
  baseUrl: "http://127.0.0.1:3456",
  endpoints: {
    health: "http://127.0.0.1:3456/healthz",
    models: "http://127.0.0.1:3456/v1/models",
    chatCompletions: "http://127.0.0.1:3456/v1/chat/completions",
    responses: "http://127.0.0.1:3456/v1/responses",
  },
  authentication: {
    type: "bearer",
    headerName: "Authorization",
    required: false,
    placeholderToken: "role-model-local",
    note: "placeholder only",
  },
  models: [
    {
      id: "role-model/auto",
      object: "model",
      owned_by: "role-model",
      endpoint_ids: ["local"],
      type: "alias",
      routingMode: "hybrid",
      targetModelIds: ["openai/gpt-5-mini"],
      canonicalModelIds: ["openai/gpt-5-mini"],
      providerIds: ["openai"],
      limits: {
        safeContextWindow: 120000,
        safeMaxOutputTokens: 8000,
        maxContextWindow: 120000,
        maxOutputTokens: 8000,
      },
      modalities: {
        guaranteedInput: ["text"],
        availableInput: ["text"],
        conditionalInput: [],
        output: ["text"],
      },
      capabilities: { tools: true, reasoning: true, structuredOutput: true },
      piMapping: { contextWindow: 120000, maxTokens: 8000 },
      sources: ["runtime"],
    },
  ],
  setup: { recommendedModel: "role-model/auto", notes: [] },
  freshness: {
    generatedAt: "2026-06-22T00:00:00Z",
    catalogVersion: "test",
    catalogCapturedAt: null,
    runtimeConfigHash: "test",
  },
};

describe("role-model command dispatcher", () => {
  test("handles help through one command with internal subcommands", async () => {
    const handler = createRoleModelCommandHandler({ discover: async () => ({ discovery }) });
    const result = await handler("help");

    expect(result.ok).toBe(true);
    expect(result.text).toContain("/role-model setup");
    expect(result.text).toContain("/role-model alias choose");
  });

  test("reports status and doctor results from the configured endpoint", async () => {
    const handler = createRoleModelCommandHandler({
      discover: async () => ({ discovery, version: { version: "0.0.0-test" } }),
    });

    await expect(handler("status")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("Role-Model Runtime"),
    });
    await expect(handler("doctor")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("downstream discovery: ok"),
    });
  });

  test("supports setup, ui, recommended alias, use alias, and refresh workflows", async () => {
    const refreshed: string[] = [];
    let selectedAlias: string | null = null;
    const handler = createRoleModelCommandHandler({
      discover: async () => ({ discovery, version: { version: "0.0.0-test" } }),
      refreshProvider: async (nextDiscovery) => {
        refreshed.push(nextDiscovery.baseUrl);
      },
      readSelectedAlias: async () => selectedAlias,
      writeSelectedAlias: async (alias: string) => {
        selectedAlias = alias;
      },
    });

    await expect(handler("setup")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("role-model/auto"),
    });
    await expect(handler("ui")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("http://127.0.0.1:3456"),
    });
    await expect(handler("alias recommended")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("role-model/auto"),
    });
    await expect(handler("alias use role-model/auto")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("role-model/auto"),
    });
    await expect(handler("alias refresh")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("Refreshed Role-Model provider"),
    });

    expect(refreshed).toEqual(["http://127.0.0.1:3456", "http://127.0.0.1:3456"]);
    expect(selectedAlias).toBe("role-model/auto");
  });

  test("lists and chooses aliases without leaking secrets", async () => {
    let selectedAlias: string | null = null;
    const handler = createRoleModelCommandHandler({
      discover: async () => ({ discovery }),
      readSelectedAlias: async () => selectedAlias,
      writeSelectedAlias: async (alias: string) => {
        selectedAlias = alias;
      },
    });

    await expect(handler("alias list")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("role-model/auto"),
    });
    await expect(handler("alias choose role-model/auto")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("role-model/auto"),
    });
    await expect(handler("alias current")).resolves.toMatchObject({
      ok: true,
      text: expect.not.stringContaining("role-model-local"),
    });
  });

  test("status reports rich provider, trust, auth, fallback, selected alias, and warning state", async () => {
    const handler = createRoleModelCommandHandler({
      discover: async () => ({
        discovery: createDiscovery(),
        version: { version: "0.0.0-test" },
        health: { status: "healthy" },
        state: "ready",
        warnings: [],
        providerRegistered: true,
        modelDiagnostics: [],
      }),
      readSelectedAlias: async () => "role-model/auto",
    });

    await expect(handler("status")).resolves.toMatchObject({
      ok: true,
      text: expect.stringContaining("state: ready"),
    });
    const result = await handler("status");
    expect(result.text).toContain("aliases: 1");
    expect(result.text).toContain("selected alias: role-model/auto");
    expect(result.text).toContain("provider: registered");
    expect(result.text).toContain("auth: placeholder");
    expect(result.text).toContain("endpoint trust: local");
    expect(result.text).toContain("fallback: no");
  });

  test("doctor gives remediation for blocked remote endpoints", async () => {
    const handler = createRoleModelCommandHandler({
      discover: async () => {
        throw new RoleModelDiscoveryError({
          state: "blocked-remote",
          endpoint: "https://role-model.example.test",
          message: "Remote Role-Model endpoint blocked.",
          remediation: "Enable allowRemote only for trusted endpoints.",
        });
      },
    });

    const result = await handler("doctor");
    expect(result.ok).toBe(false);
    expect(result.text).toContain("state: blocked-remote");
    expect(result.text).toContain("remediation: Enable allowRemote");
  });

  test("alias list marks recommended, selected, ready, and degraded aliases", async () => {
    const handler = createRoleModelCommandHandler({
      discover: async () => ({
        discovery: createDiscovery(),
        state: "fallback",
        warnings: ["using compact /v1/models fallback"],
        modelDiagnostics: [{ id: "role-model/auto", degraded: true, reasons: ["missing piMapping.maxTokens"] }],
      }),
      readSelectedAlias: async () => "role-model/auto",
    });

    const result = await handler("alias list");
    expect(result.ok).toBe(true);
    expect(result.text).toContain("role-model/auto");
    expect(result.text).toContain("recommended");
    expect(result.text).toContain("selected");
    expect(result.text).toContain("ready");
    expect(result.text).toContain("degraded");
  });

  test("alias use sets Pi's active Role-Model model when supported", async () => {
    const activeSelections: unknown[] = [];
    let selectedAlias: string | null = null;
    const handler = createRoleModelCommandHandler({
      discover: async () => ({ discovery: createDiscovery(), state: "ready", warnings: [], modelDiagnostics: [] }),
      writeSelectedAlias: async (alias) => {
        selectedAlias = alias;
      },
      setActiveModel: async (model) => {
        activeSelections.push(model);
        return true;
      },
    });

    const result = await handler("alias use role-model/auto");
    expect(result.ok).toBe(true);
    expect(selectedAlias).toBe("role-model/auto");
    expect(activeSelections).toEqual([
      expect.objectContaining({
        provider: "role-model",
        id: "role-model/auto",
      }),
    ]);
    expect(result.text).toContain("active model: role-model/role-model/auto");
  });

  test("alias use reports active-model failure without claiming Pi switched models", async () => {
    const handler = createRoleModelCommandHandler({
      discover: async () => ({ discovery: createDiscovery(), state: "ready", warnings: [], modelDiagnostics: [] }),
      writeSelectedAlias: async () => undefined,
      setActiveModel: async () => false,
    });

    const result = await handler("alias use role-model/auto");
    expect(result.ok).toBe(false);
    expect(result.text).toContain("selected alias: role-model/auto");
    expect(result.text).toContain("active model: not changed");
  });
});
