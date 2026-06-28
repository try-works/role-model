import { createFileAliasStore } from "./alias-store.js";
import { type RoleModelCommandDependencies, createRoleModelCommandHandler } from "./commands.js";
import { registerRoleModelProvider } from "./provider-registration.js";
import {
  injectRoleModelIntentIntoPayload,
  injectRoleModelIntentIntoPayloadWithRuntimeTasks,
} from "./request-intent.js";
import { discoverRoleModelRuntime } from "./runtime-discovery.js";
import { createRuntimeInspectionClient } from "./runtime-inspection.js";
import type { CompactRoleTask, CompactTaxonomy } from "./taxonomy/compact-data.js";
import {
  type EffectiveTaxonomyResolution,
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
  runtimeInspectionFetch?: typeof fetch;
}

export function createRoleModelExtension(options: RoleModelExtensionOptions = {}) {
  return async function roleModelExtension(pi: PiExtensionAPI): Promise<void> {
    const roleModelModelIds = new Set<string>();
    let effectiveTaxonomy: CompactTaxonomy | undefined;
    const refreshEffectiveTaxonomy = async () => {
      const taxonomyResolution =
        options.resolveTaxonomy ??
        (() =>
          resolveEffectiveTaxonomy({
            ...(options.endpoint ? { endpoint: options.endpoint } : {}),
          }));
      effectiveTaxonomy = (await taxonomyResolution()).taxonomy;
    };
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
    const discover =
      options.discover ??
      (() => {
        return discoverRoleModelRuntime({
          ...(options.endpoint ? { endpoint: options.endpoint } : {}),
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
      ...(options.listRuntimeRequests || options.explainLatestRuntimeRequest
        ? {
            listRuntimeRequests: options.listRuntimeRequests,
            explainLatestRuntimeRequest: options.explainLatestRuntimeRequest,
          }
        : createRuntimeInspectionClient({
            ...(options.endpoint ? { endpoint: options.endpoint } : {}),
            ...(options.runtimeInspectionFetch ? { fetch: options.runtimeInspectionFetch } : {}),
          })),
    });

    const fetchRuntimeTaskChunk =
      options.fetchRuntimeTaskChunk ??
      (options.endpoint
        ? (roleId: string) =>
            fetchRuntimeRoleTaskChunk({
              endpoint: options.endpoint,
              roleId,
            })
        : undefined);

    pi.on?.("before_provider_request", (event) =>
      fetchRuntimeTaskChunk
        ? injectRoleModelIntentIntoPayloadWithRuntimeTasks(
            event.payload,
            roleModelModelIds,
            effectiveTaxonomy,
            fetchRuntimeTaskChunk,
          )
        : injectRoleModelIntentIntoPayload(event.payload, roleModelModelIds, effectiveTaxonomy),
    );

    pi.registerCommand("role-model", {
      description: "Configure and inspect the Role-Model provider for Pi.",
      async handler(args = "", context?: PiCommandContext) {
        const result = await command(args);
        context?.ui?.notify?.(result.text, result.ok ? "info" : "error");
      },
    });
  };
}

export default createRoleModelExtension();
