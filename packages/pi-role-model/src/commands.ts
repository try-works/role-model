import type { DiscoveryResult, RoleModelCommandResult } from "./types.js";

export interface RoleModelCommandDependencies {
  discover(): Promise<DiscoveryResult>;
  refreshProvider?: (discovery: DiscoveryResult["discovery"]) => Promise<void> | void;
  readSelectedAlias?: () => Promise<string | null>;
  writeSelectedAlias?: (alias: string) => Promise<void>;
}

const HELP = [
  "/role-model setup - discover the local Role-Model runtime and register the provider",
  "/role-model status - show runtime and discovery status",
  "/role-model doctor - run endpoint diagnostics",
  "/role-model ui - show the configured Role-Model UI/runtime URL",
  "/role-model alias list - list Role-Model aliases visible to Pi",
  "/role-model alias recommended - show the runtime-recommended alias",
  "/role-model alias use <alias> - choose the alias Pi should use",
  "/role-model alias choose <alias> - choose the alias Pi should use",
  "/role-model alias refresh - refresh Role-Model provider aliases from runtime discovery",
  "/role-model alias current - show the selected alias",
].join("\n");

function ok(text: string): RoleModelCommandResult {
  return { ok: true, text };
}

function fail(text: string): RoleModelCommandResult {
  return { ok: false, text };
}

function aliasRecords(result: DiscoveryResult) {
  return result.discovery.models.filter((model) => model.type === "alias");
}

export function createRoleModelCommandHandler(dependencies: RoleModelCommandDependencies) {
  return async function handleRoleModelCommand(args = ""): Promise<RoleModelCommandResult> {
    const [command = "help", subcommand, ...rest] = args.trim().split(/\s+/).filter(Boolean);

    if (command === "help") {
      return ok(HELP);
    }

    let result: DiscoveryResult;
    try {
      result = await dependencies.discover();
    } catch (error) {
      return fail(`Role-Model runtime unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (command === "setup") {
      await dependencies.refreshProvider?.(result.discovery);
      const recommended = result.discovery.setup.recommendedModel ?? "none";
      return ok(`Role-Model provider configured at ${result.discovery.baseUrl}\nrecommended alias: ${recommended}`);
    }

    if (command === "ui") {
      return ok(`Role-Model UI/runtime URL: ${result.discovery.baseUrl}`);
    }

    if (command === "status") {
      const version = typeof result.version?.version === "string" ? result.version.version : "unknown";
      return ok(`${result.discovery.displayName}\nendpoint: ${result.discovery.baseUrl}\nversion: ${version}`);
    }

    if (command === "doctor") {
      return ok(
        [
          `endpoint: ${result.discovery.baseUrl}`,
          "health: ok",
          "downstream discovery: ok",
          `models: ${result.discovery.models.length}`,
          `recommended alias: ${result.discovery.setup.recommendedModel ?? "none"}`,
        ].join("\n"),
      );
    }

    if (command === "alias" && subcommand === "list") {
      const aliases = aliasRecords(result).map((model) => {
        const recommended = model.id === result.discovery.setup.recommendedModel ? " (recommended)" : "";
        return `- ${model.id}${recommended}`;
      });
      return ok(aliases.length > 0 ? aliases.join("\n") : "No Role-Model aliases are available.");
    }

    if (command === "alias" && subcommand === "recommended") {
      const recommended = result.discovery.setup.recommendedModel;
      return recommended ? ok(`Recommended Role-Model alias: ${recommended}`) : fail("No Role-Model alias recommendation is available.");
    }

    if (command === "alias" && (subcommand === "choose" || subcommand === "use")) {
      const alias = rest.join(" ");
      if (!alias) {
        return fail(`Usage: /role-model alias ${subcommand} <alias>`);
      }
      const exists = result.discovery.models.some((model) => model.id === alias);
      if (!exists) {
        return fail(`Unknown Role-Model alias: ${alias}`);
      }
      await dependencies.writeSelectedAlias?.(alias);
      return ok(`Selected Role-Model alias: ${alias}`);
    }

    if (command === "alias" && subcommand === "refresh") {
      await dependencies.refreshProvider?.(result.discovery);
      return ok(
        `Refreshed Role-Model provider from ${result.discovery.baseUrl}\nmodels: ${result.discovery.models.length}\nrecommended alias: ${result.discovery.setup.recommendedModel ?? "none"}`,
      );
    }

    if (command === "alias" && subcommand === "current") {
      const selected = (await dependencies.readSelectedAlias?.()) ?? result.discovery.setup.recommendedModel ?? "none";
      return ok(`Current Role-Model alias: ${selected}`);
    }

    return fail(`Unknown /role-model command: ${args || command}\n\n${HELP}`);
  };
}
