import { createFileAliasStore } from "./alias-store.js";
import { type RoleModelCommandDependencies, createRoleModelCommandHandler } from "./commands.js";
import { DEFAULT_ROLE_MODEL_ENDPOINT, normalizeEndpoint } from "./config.js";
import { registerRoleModelProvider } from "./provider-registration.js";
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
import type { PiCommandContext, PiExtensionAPI } from "./types.js";

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
    const runtimeEndpoint = normalizeEndpoint(options.endpoint ?? DEFAULT_ROLE_MODEL_ENDPOINT);
    const roleModelModelIds = new Set<string>();
    let effectiveTaxonomy: CompactTaxonomy | undefined;
    const rememberRoleModelModels = (discovery: DownstreamOpenAIDiscovery) => {
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

    try {
      const result = await discover();
      rememberRoleModelModels(result.discovery);
      registerRoleModelProvider(pi, result.discovery);
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
        registerRoleModelProvider(pi, discovery);
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

    pi.on?.("before_provider_request", (event) =>
      injectRoleModelIntentIntoPayloadWithRuntimeTasks(
        event.payload,
        roleModelModelIds,
        effectiveTaxonomy,
        fetchRuntimeTaskChunk,
        readRuntimeRoleSummaries,
      ),
    );

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
