import { createFileAliasStore } from "./alias-store.js";
import { discoverRoleModelRuntime } from "./runtime-discovery.js";
import { createRoleModelCommandHandler, type RoleModelCommandDependencies } from "./commands.js";
import { registerRoleModelProvider } from "./provider-registration.js";
import type { PiCommandContext, PiExtensionAPI } from "./types.js";

export interface RoleModelExtensionOptions extends Partial<RoleModelCommandDependencies> {
  endpoint?: string;
  aliasStorePath?: string;
}

export function createRoleModelExtension(options: RoleModelExtensionOptions = {}) {
  return async function roleModelExtension(pi: PiExtensionAPI): Promise<void> {
    const discover =
      options.discover ??
      (() => {
        return discoverRoleModelRuntime(options.endpoint ? { endpoint: options.endpoint } : {});
      });

    try {
      const result = await discover();
      registerRoleModelProvider(pi, result.discovery);
    } catch {
      // Pi should still load the command so `/role-model doctor` can explain endpoint failures.
    }

    const aliasStore =
      options.readSelectedAlias || options.writeSelectedAlias ? undefined : createFileAliasStore(options.aliasStorePath);

    const command = createRoleModelCommandHandler({
      discover,
      refreshProvider: (discovery) => {
        registerRoleModelProvider(pi, discovery);
      },
      readSelectedAlias: options.readSelectedAlias ?? aliasStore?.readSelectedAlias,
      writeSelectedAlias: options.writeSelectedAlias ?? aliasStore?.writeSelectedAlias,
    });

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
