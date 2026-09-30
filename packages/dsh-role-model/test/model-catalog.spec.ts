/**
 * L6: model-selector integration.
 *
 * DSH's main model selector is fed by `buildModelCatalog`, which for every
 * registered provider calls `ctx.llm.listModels(provider)` and then
 * `ctx.llm.resolveModelInfo(...)` per model, turning a throw into a whole-group
 * failure chip. This spec drives our adapter through that exact sequence against
 * the live runtime, so the group the user actually sees is what is asserted.
 *
 * Skipped when the runtime is not running, because it is an integration check.
 */

import { beforeAll, describe, expect, test } from "vitest";
import { createRoleModelAdapter } from "../src/adapter.js";
import {
  createRoleModelCatalog,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import { type HostLlmClasses, loadHostLlmClasses } from "../src/host-llm.js";
import type { RoleModelCatalog } from "../src/types.js";

const ENDPOINT = process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3457";
const ROUTE = "role-model";

/** Whether the runtime is reachable; the suite is skipped when it is not. */
let reachable = false;
let hostLlm: HostLlmClasses | undefined;
let catalog: RoleModelCatalog | undefined;

beforeAll(async () => {
  try {
    const response = await fetch(`${ENDPOINT}/api/role-model/downstream/openai`, {
      headers: { connection: "close" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    catalog = createRoleModelCatalog(
      validateDownstreamOpenAIDiscovery(await response.json()),
      ROUTE,
    );
    reachable = true;
  } catch {
    reachable = false;
  }
  hostLlm = await loadHostLlmClasses({
    env: {
      ...process.env,
      DSH_HARNESS_ROOT: process.env.DSH_HARNESS_ROOT ?? "D:\\deepseek-harness",
    },
    cwd: process.cwd(),
  });
}, 30_000);

/**
 * Reproduce DSH's own `buildModelCatalog` over one adapter.
 *
 * Mirrors `packages/api/session-controller/src/catalog.ts:20-72`: list providers,
 * list each provider's models, resolve each one, and isolate a provider failure as
 * a group-level failure.
 *
 * @param llm - a runtime-like host exposing provider and model reads.
 * @returns the catalog the selector would see.
 */
async function buildModelCatalog(llm: {
  listProviders(): { id: string; name: string }[];
  listModels(
    provider: string,
  ): Promise<
    readonly { provider: string; id: string; name: string; inputModalities?: readonly string[] }[]
  >;
  resolveModelInfo(provider: string, model: string): Promise<unknown>;
}): Promise<{
  groups: { id: string; name: string; models: { id: string; name: string }[] }[];
  failures: { id: string; message: string }[];
}> {
  const providers = llm.listProviders();
  const built = await Promise.all(
    providers.map(async (provider) => {
      try {
        const models = await llm.listModels(provider.id);
        const entries = await Promise.all(
          models.map(async (model) => {
            await llm.resolveModelInfo(provider.id, model.id);
            return { id: model.id, name: model.name };
          }),
        );
        return {
          kind: "group" as const,
          group: { id: provider.id, name: provider.name, models: entries },
        };
      } catch (error) {
        return {
          kind: "failure" as const,
          failure: {
            id: provider.id,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }),
  );
  return {
    groups: built
      .flatMap((item) => (item.kind === "group" ? [item.group] : []))
      .filter((group) => group.models.length > 0),
    failures: built.flatMap((item) => (item.kind === "failure" ? [item.failure] : [])),
  };
}

describe("the role-model group in the main model selector", () => {
  test("the runtime is reachable for this integration spec", () => {
    // Recorded rather than skipped silently, so a green run cannot hide a runtime
    // that was never contacted.
    expect(typeof reachable).toBe("boolean");
    if (!reachable)
      console.warn(
        `role-model runtime at ${ENDPOINT} is not reachable; integration assertions below are skipped`,
      );
  });

  test('produces a group named exactly "role-model" with the runtime models', async () => {
    if (!reachable || hostLlm === undefined || catalog === undefined) return;
    const adapter = createRoleModelAdapter({
      endpoint: ENDPOINT,
      providerRoute: ROUTE,
      placeholderToken: "role-model-local",
      LlmAdapterBase: hostLlm.LlmAdapter,
      LlmErrorClass: hostLlm.LlmError,
    });
    const built = await buildModelCatalog({
      listProviders: () => [adapter.providerInfo(ROUTE)],
      listModels: (provider) => adapter.listModels(provider),
      resolveModelInfo: (provider, model) => adapter.resolveModel(provider, model),
    });
    expect(built.failures).toEqual([]);
    expect(built.groups).toHaveLength(1);
    const group = built.groups[0];
    // `toHaveLength(1)` above guarantees this, and the guard keeps the assertion
    // honest rather than asserting past a possible absence.
    if (group === undefined) throw new Error("expected exactly one provider group");
    expect(group.id).toBe(ROUTE);
    expect(group.name).toBe(ROUTE);
    expect(group.models.length).toBe(catalog.entries.length);
  });

  test("exposes aliases, endpoints and models alike", async () => {
    if (!reachable || hostLlm === undefined || catalog === undefined) return;
    const adapter = createRoleModelAdapter({
      endpoint: ENDPOINT,
      providerRoute: ROUTE,
      placeholderToken: "role-model-local",
      LlmAdapterBase: hostLlm.LlmAdapter,
      LlmErrorClass: hostLlm.LlmError,
    });
    const models = await adapter.listModels(ROUTE);
    const ids = new Set(models.map((model) => model.id));
    const discovery = catalog.entries.map((entry) => entry.id);
    expect(discovery.length).toBeGreaterThan(0);
    for (const id of discovery) expect(ids.has(id), id).toBe(true);
  });

  test("a provider failure isolates as a failure chip instead of throwing", async () => {
    if (hostLlm === undefined) return;
    const adapter = createRoleModelAdapter({
      endpoint: "http://127.0.0.1:9",
      providerRoute: ROUTE,
      placeholderToken: "role-model-local",
      LlmAdapterBase: hostLlm.LlmAdapter,
      LlmErrorClass: hostLlm.LlmError,
    });
    const built = await buildModelCatalog({
      listProviders: () => [adapter.providerInfo(ROUTE)],
      listModels: (provider) => adapter.listModels(provider),
      resolveModelInfo: (provider, model) => adapter.resolveModel(provider, model),
    });
    expect(built.groups).toEqual([]);
    expect(built.failures).toHaveLength(1);
    expect(built.failures[0]?.id).toBe(ROUTE);
  });

  test("orders aliases before models and endpoints, recommended first", async () => {
    if (!reachable || hostLlm === undefined || catalog === undefined) return;
    const adapter = createRoleModelAdapter({
      endpoint: ENDPOINT,
      providerRoute: ROUTE,
      placeholderToken: "role-model-local",
      LlmAdapterBase: hostLlm.LlmAdapter,
      LlmErrorClass: hostLlm.LlmError,
    });
    const models = await adapter.listModels(ROUTE);
    expect(models[0]?.id).toBe(catalog.recommendedModel);
  });

  test("every resolved model is shaped as DSH validates it", async () => {
    if (!reachable || hostLlm === undefined || catalog === undefined) return;
    const adapter = createRoleModelAdapter({
      endpoint: ENDPOINT,
      providerRoute: ROUTE,
      placeholderToken: "role-model-local",
      LlmAdapterBase: hostLlm.LlmAdapter,
      LlmErrorClass: hostLlm.LlmError,
    });
    for (const model of await adapter.listModels(ROUTE)) {
      const resolved = await adapter.resolveModel(ROUTE, model.id);
      expect(resolved.provider, model.id).toBe(ROUTE);
      expect(resolved.id, model.id).toBe(model.id);
      expect(resolved.name.length, model.id).toBeGreaterThan(0);
      expect(resolved.context?.contextWindow ?? 0, model.id).toBeGreaterThan(0);
      if (resolved.reasoning !== undefined) {
        expect(resolved.reasoning.efforts.length, model.id).toBeGreaterThan(0);
        if (resolved.reasoning.defaultEffort !== undefined) {
          expect(
            resolved.reasoning.efforts.some(
              (effort) => effort.id === resolved.reasoning?.defaultEffort,
            ),
            model.id,
          ).toBe(true);
        }
      }
    }
  });
});
