import { createPiModelSelection } from "./downstream-openai.js";
import { RoleModelDiscoveryError } from "./runtime-discovery.js";
import type { DiscoveryResult, PiModelSelection, RoleModelCommandResult, RoleModelModelDiagnostic } from "./types.js";

export interface RoleModelCommandDependencies {
  discover(): Promise<DiscoveryResult>;
  refreshProvider?: (discovery: DiscoveryResult["discovery"]) => Promise<void> | void;
  readSelectedAlias?: () => Promise<string | null>;
  writeSelectedAlias?: (alias: string) => Promise<void>;
  setActiveModel?: (model: PiModelSelection) => Promise<boolean>;
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

function diagnosticsFor(result: DiscoveryResult, id: string): RoleModelModelDiagnostic | undefined {
  return result.modelDiagnostics?.find((diagnostic) => diagnostic.id === id);
}

function formatDiscoveryError(error: unknown): string {
  if (error instanceof RoleModelDiscoveryError) {
    return [
      `Role-Model runtime unavailable: ${error.message}`,
      `state: ${error.state}`,
      `endpoint: ${error.endpoint}`,
      `remediation: ${error.remediation}`,
    ].join("\n");
  }
  return `Role-Model runtime unavailable: ${error instanceof Error ? error.message : String(error)}`;
}

function versionText(result: DiscoveryResult): string {
  return typeof result.version?.version === "string" ? result.version.version : "unknown";
}

async function selectedAliasText(result: DiscoveryResult, readSelectedAlias?: () => Promise<string | null>): Promise<string> {
  return (await readSelectedAlias?.()) ?? result.discovery.setup.recommendedModel ?? "none";
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
      return fail(formatDiscoveryError(error));
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
      const selected = await selectedAliasText(result, dependencies.readSelectedAlias);
      const aliases = aliasRecords(result);
      return ok(
        [
          result.discovery.displayName,
          `state: ${result.state ?? "ready"}`,
          `endpoint: ${result.discovery.baseUrl}`,
          `version: ${versionText(result)}`,
          `aliases: ${aliases.length}`,
          `selected alias: ${selected}`,
          `provider: ${result.providerRegistered === false ? "not registered" : "registered"}`,
          `auth: ${result.discovery.authentication.required ? "required" : "placeholder"}`,
          `endpoint trust: ${result.discovery.baseUrl.startsWith("http://127.0.0.1") || result.discovery.baseUrl.startsWith("http://localhost") ? "local" : "remote"}`,
          `fallback: ${(result.state ?? "ready") === "fallback" ? "yes" : "no"}`,
          `warnings: ${result.warnings && result.warnings.length > 0 ? result.warnings.join("; ") : "none"}`,
        ].join("\n"),
      );
    }

    if (command === "doctor") {
      const aliases = aliasRecords(result);
      const degraded = (result.modelDiagnostics ?? []).filter((diagnostic) => diagnostic.degraded);
      return ok(
        [
          "doctor: ok",
          `endpoint: ${result.discovery.baseUrl}`,
          "health: ok",
          `version: ${versionText(result) === "unknown" ? "unknown" : "ok"}`,
          "downstream discovery: ok",
          `fallback: ${(result.state ?? "ready") === "fallback" ? "yes" : "no"}`,
          `auth: ${result.discovery.authentication.required ? "required" : "ok"}`,
          "endpoint trust: ok",
          `provider: ${result.providerRegistered === false ? "not registered" : "ok"}`,
          `aliases: ${aliases.length > 0 ? "ok" : "missing"}`,
          `degraded models: ${degraded.length > 0 ? degraded.map((diagnostic) => diagnostic.id).join(", ") : "none"}`,
          `models: ${result.discovery.models.length}`,
          `recommended alias: ${result.discovery.setup.recommendedModel ?? "none"}`,
        ].join("\n"),
      );
    }

    if (command === "alias" && subcommand === "list") {
      const selected = await dependencies.readSelectedAlias?.();
      const aliases = aliasRecords(result).map((model) => {
        const markers = ["ready"];
        const recommended = model.id === result.discovery.setup.recommendedModel ? " (recommended)" : "";
        if (model.id === result.discovery.setup.recommendedModel) markers.push("recommended");
        if (model.id === selected) markers.push("selected");
        if (diagnosticsFor(result, model.id)?.degraded) markers.push("degraded");
        return `- ${model.id}${recommended} [${markers.join(", ")}]`;
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
      const model = createPiModelSelection(result.discovery, alias);
      if (!model) {
        return fail(`selected alias: ${alias}\nactive model: not changed (Role-Model alias metadata is unavailable)`);
      }
      if (!dependencies.setActiveModel) {
        return ok(`selected alias: ${alias}\nactive model: not changed (Pi active-model selection is unavailable in this context)`);
      }
      const switched = await dependencies.setActiveModel(model);
      if (!switched) {
        return fail(`selected alias: ${alias}\nactive model: not changed (Pi rejected model selection; check provider auth)`);
      }
      return ok(`selected alias: ${alias}\nactive model: role-model/${alias}`);
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
