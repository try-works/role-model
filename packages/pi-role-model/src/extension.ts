import { createFileAliasStore } from "./alias-store.js";
import { type RoleModelCommandDependencies, createRoleModelCommandHandler } from "./commands.js";
import { createRoleModelConfig } from "./config.js";
import { findRoleModelDiscoveryModel, formatInvalidRoleModelModelId } from "./model-guidance.js";
import { createProviderRegistration, registerRoleModelProvider } from "./provider-registration.js";
import { injectRoleModelIntentIntoPayloadWithRuntimeTasks } from "./request-intent.js";
import { discoverRoleModelRuntime } from "./runtime-discovery.js";
import { inspectRequest, listRecentRequests } from "./runtime-inspection.js";
import type { CompactRoleTask, CompactTaxonomy } from "./taxonomy/compact-data.js";
import {
  type EffectiveTaxonomyResolution,
  fetchRuntimeRoleSummaries,
  fetchRuntimeRoleTaskChunk,
  resolveEffectiveTaxonomy,
} from "./taxonomy/resolve-effective-taxonomy.js";
import type { DownstreamOpenAIDiscovery } from "./types.js";
import type {
  PiCommandContext,
  PiExtensionAPI,
  PiExtensionContext,
  PiProviderModelConfig,
  PiRefreshModelsContext,
  PiThinkingLevel,
} from "./types.js";

export interface RoleModelExtensionOptions extends Partial<RoleModelCommandDependencies> {
  endpoint?: string;
  allowRemote?: boolean;
  aliasStorePath?: string;
  resolveTaxonomy?: () => Promise<EffectiveTaxonomyResolution>;
  fetchRuntimeTaskChunk?: (roleId: string) => Promise<readonly CompactRoleTask[]>;
  fetchRuntimeRoleSummaries?: () => Promise<CompactTaxonomy["roleSummaries"]>;
}

export function createRoleModelExtension(options: RoleModelExtensionOptions = {}) {
  return async function roleModelExtension(pi: PiExtensionAPI): Promise<void> {
    const runtimeEndpoint = createRoleModelConfig({
      ...(options.endpoint === undefined ? {} : { endpoint: options.endpoint }),
    }).endpoint;
    const roleModelModelIds = new Set<string>();
    let latestDiscovery: DownstreamOpenAIDiscovery | undefined;
    let latestProviderModels: PiProviderModelConfig[] = [];
    let effectiveTaxonomy: CompactTaxonomy | undefined;
    const rememberRoleModelModels = (discovery: DownstreamOpenAIDiscovery) => {
      latestDiscovery = discovery;
      roleModelModelIds.clear();
      for (const model of discovery.models) {
        roleModelModelIds.add(model.id);
        if (model.id.startsWith("role-model/")) {
          roleModelModelIds.add(model.id.slice("role-model/".length));
        }
        if (model.type === "alias") {
          roleModelModelIds.add(model.id);
        }
      }
    };
    const taxonomyResolution =
      options.resolveTaxonomy ??
      (() =>
        resolveEffectiveTaxonomy({
          endpoint: runtimeEndpoint,
        }));
    const refreshEffectiveTaxonomy = async () => {
      try {
        effectiveTaxonomy = (await taxonomyResolution()).taxonomy;
      } catch {
        // Request-time classification still falls back to package-local taxonomy loading.
      }
    };
    const discover =
      options.discover ??
      (() => {
        return discoverRoleModelRuntime({
          endpoint: runtimeEndpoint,
          ...(options.allowRemote === undefined ? {} : { allowRemote: options.allowRemote }),
        });
      });

    const refreshPiProviderModels = async (
      context: PiRefreshModelsContext,
    ): Promise<PiProviderModelConfig[]> => {
      if (context.signal.aborted || !context.allowNetwork) {
        const stored = context.stored?.models
          .filter((model) => model.provider === "role-model" && model.api === "openai-completions")
          .map(
            (model): PiProviderModelConfig => ({
              id: model.id,
              name: model.name,
              api: "openai-completions",
              reasoning: model.reasoning,
              ...(model.thinkingLevelMap ? { thinkingLevelMap: model.thinkingLevelMap } : {}),
              input: model.input,
              cost: model.cost,
              contextWindow: model.contextWindow,
              maxTokens: model.maxTokens,
              ...(model.headers ? { headers: model.headers } : {}),
              ...(model.compat
                ? {
                    compat: model.compat as PiProviderModelConfig["compat"],
                  }
                : {}),
            }),
          );
        return stored?.length ? stored : latestProviderModels;
      }
      const result = await discover();
      rememberRoleModelModels(result.discovery);
      const registration = createProviderRegistration(result.discovery);
      latestProviderModels = registration.config.models;
      const persistedModels = registration.config.models.map((model) => ({
        ...model,
        provider: registration.providerId,
        baseUrl: registration.config.baseUrl,
        api: registration.config.api,
      }));
      await context.publish({
        persist: { models: persistedModels, checkedAt: Date.now() },
        update: () => undefined,
      });
      await refreshEffectiveTaxonomy();
      return registration.config.models;
    };

    try {
      const result = await discover();
      rememberRoleModelModels(result.discovery);
      latestProviderModels = registerRoleModelProvider(
        pi,
        result.discovery,
        refreshPiProviderModels,
      ).config.models;
      await refreshEffectiveTaxonomy();
    } catch {
      // Pi should still load the command so `/role-model doctor` can explain endpoint failures.
    }

    const aliasStore =
      options.readSelectedAlias || options.writeSelectedAlias
        ? undefined
        : createFileAliasStore(options.aliasStorePath);

    const command = createRoleModelCommandHandler({
      discover,
      refreshProvider: async (discovery) => {
        rememberRoleModelModels(discovery);
        latestProviderModels = registerRoleModelProvider(pi, discovery, refreshPiProviderModels)
          .config.models;
        await refreshEffectiveTaxonomy();
      },
      readSelectedAlias: options.readSelectedAlias ?? aliasStore?.readSelectedAlias,
      writeSelectedAlias: options.writeSelectedAlias ?? aliasStore?.writeSelectedAlias,
      setActiveModel:
        options.setActiveModel ??
        (pi.setModel ? (model) => pi.setModel?.(model) ?? Promise.resolve(false) : undefined),
      listRecentRequests: (limit) =>
        listRecentRequests({
          endpoint: runtimeEndpoint,
          limit,
        }),
      inspectRequest: (requestId) =>
        inspectRequest({
          endpoint: runtimeEndpoint,
          requestId,
        }),
    });

    const fetchRuntimeTaskChunk =
      options.fetchRuntimeTaskChunk ??
      ((roleId: string) =>
        fetchRuntimeRoleTaskChunk({
          endpoint: runtimeEndpoint,
          roleId,
        }));

    const readRuntimeRoleSummaries =
      options.fetchRuntimeRoleSummaries ??
      (() =>
        fetchRuntimeRoleSummaries({
          endpoint: runtimeEndpoint,
        }));

    pi.on?.("before_provider_request", async (event, context) => {
      const payload =
        typeof event.payload === "object" && event.payload !== null
          ? (event.payload as Record<string, unknown>)
          : null;
      const payloadModel = typeof payload?.model === "string" ? payload.model : null;
      const selectedModelId = context?.model?.id ?? payloadModel;
      if (selectedModelId && pi.getThinkingLevel && pi.setThinkingLevel && latestDiscovery) {
        const selected = latestDiscovery.models.find((model) => model.id === selectedModelId);
        const mapped = selected
          ? createProviderRegistration(latestDiscovery).config.models.find(
              (model) => model.id === selected.id,
            )?.thinkingLevelMap
          : undefined;
        const fixed = mapped
          ? (Object.entries(mapped).filter(([, value]) => value !== null) as [
              PiThinkingLevel,
              string,
            ][])
          : [];
        if (fixed.length === 1 && pi.getThinkingLevel() !== fixed[0]?.[0]) {
          await pi.setThinkingLevel(fixed[0][0]);
          if (pi.getThinkingLevel() !== fixed[0][0]) {
            throw new Error(
              `Pi could not apply required thinking level ${fixed[0][0]} for ${selectedModelId}.`,
            );
          }
        }
      }
      if (
        context?.model?.provider === "role-model" &&
        latestDiscovery &&
        payloadModel &&
        !findRoleModelDiscoveryModel(latestDiscovery, payloadModel)
      ) {
        throw new Error(formatInvalidRoleModelModelId(latestDiscovery, payloadModel, "yes"));
      }

      return injectRoleModelIntentIntoPayloadWithRuntimeTasks(
        event.payload,
        roleModelModelIds,
        effectiveTaxonomy,
        fetchRuntimeTaskChunk,
        readRuntimeRoleSummaries,
      );
    });

    const syncNativeThinkingLevel = async (
      event: { model?: { id: string }; level?: PiThinkingLevel },
      context?: PiExtensionContext,
    ) => {
      const selectedModelId = event.model?.id ?? context?.model?.id;
      if (!selectedModelId || !latestDiscovery || !pi.getThinkingLevel) return;
      const selected = latestDiscovery.models.find((model) => model.id === selectedModelId);
      if (!selected) return;
      const mapped = createProviderRegistration(latestDiscovery).config.models.find(
        (model) => model.id === selected.id,
      )?.thinkingLevelMap;
      const fixed = mapped
        ? (Object.entries(mapped).filter(([, value]) => value !== null) as [
            PiThinkingLevel,
            string,
          ][])
        : [];
      if (fixed.length === 1 && pi.setThinkingLevel && pi.getThinkingLevel() !== fixed[0]?.[0]) {
        await pi.setThinkingLevel(fixed[0][0]);
        if (pi.getThinkingLevel() !== fixed[0][0]) {
          throw new Error(
            `Pi could not apply required thinking level ${fixed[0][0]} for ${selectedModelId}.`,
          );
        }
      }
      if (event.level && mapped?.[event.level] === null) {
        throw new Error(`Thinking level ${event.level} is unsupported for ${selectedModelId}.`);
      }
      // Read through Pi's native state so model_select and thinking_level_select remain the source of truth.
      pi.getThinkingLevel();
    };
    pi.on?.("model_select", syncNativeThinkingLevel);
    pi.on?.("thinking_level_select", syncNativeThinkingLevel);

    pi.registerCommand("role-model", {
      description: "Configure and inspect the Role-Model provider for Pi.",
      async handler(args = "", context?: PiCommandContext) {
        const result = await command(args, context);
        context?.ui?.notify?.(result.text, result.ok ? "info" : "error");
      },
    });
  };
}

export default createRoleModelExtension();
