import { join } from "node:path";
import { aliasStatePath, readAliasState, writeAliasState } from "./alias-store.js";
import { buildModelsCatalog } from "./catalog.js";
import {
  absoluteCatalogPath,
  assertUserLevelConfigPath,
  backupCodexFiles,
  buildManagedProviderBlock,
  catalogPathForHome,
  readTextFileIfExists,
  removeManagedBlock,
  resolveCodexHome,
  upsertManagedBlock,
  writeTextFileAtomic,
} from "./codex-config.js";
import { adapterBaseUrl, createRoleModelConfig } from "./config.js";
import { startForwarder, stopForwarder } from "./forwarder.js";
import { formatInvalidRoleModelModelId, recommendedRoleModelModelId } from "./model-guidance.js";
import {
  nativeAliasesPath,
  resolveNativeAliasedModelId,
  writeNativeAliases,
} from "./native-alias.js";
import { RoleModelDiscoveryError, discoverRoleModelRuntime } from "./runtime-discovery.js";
import { inspectRequest, listRecentRequests } from "./runtime-inspection.js";
import type { DiscoveryResult, RoleModelCommandResult } from "./types.js";

function ok(text: string): RoleModelCommandResult {
  return { ok: true, text };
}

function fail(text: string): RoleModelCommandResult {
  return { ok: false, text };
}

const HELP = [
  "codex-role-model help",
  "codex-role-model setup",
  "codex-role-model uninstall",
  "codex-role-model status",
  "codex-role-model doctor",
  "codex-role-model start",
  "codex-role-model stop",
  "codex-role-model refresh-catalog",
  "codex-role-model alias list|recommended|use <alias>|current",
  "codex-role-model requests [limit]",
  "codex-role-model explain <request-id|latest>",
].join("\n");

function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/ROLE_MODEL_CODEX_API_KEY=\S+/g, "ROLE_MODEL_CODEX_API_KEY=[redacted]");
}

function formatDiscoveryFailure(error: unknown): RoleModelCommandResult {
  if (error instanceof RoleModelDiscoveryError) {
    return fail(
      redactSecrets(
        [
          "doctor: fail",
          `check: ${error.state}`,
          `endpoint: ${error.endpoint}`,
          error.message,
          error.remediation,
        ].join("\n"),
      ),
    );
  }
  return fail(redactSecrets(error instanceof Error ? error.message : String(error)));
}

async function discover(): Promise<DiscoveryResult> {
  return discoverRoleModelRuntime(createRoleModelConfig());
}

function aliasIds(result: DiscoveryResult): Set<string> {
  return new Set(result.discovery.models.map((model) => model.id));
}

function forwarderStatePath(codexHome: string): string {
  return join(codexHome, "role-model", "forwarder.json");
}

function parseConfigModel(contents: string): string | null {
  const match = contents.match(/^\s*model\s*=\s*("([^"]+)"|'([^']+)')/m);
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

function resolveSelectedExternalId(codexHome: string, discovery: DiscoveryResult): string {
  const aliasState = readAliasState(aliasStatePath());
  if (aliasState.selectedAlias) return aliasState.selectedAlias;
  const configModel = parseConfigModel(readTextFileIfExists(join(codexHome, "config.toml")));
  if (configModel) {
    return resolveNativeAliasedModelId(configModel, nativeAliasesPath(codexHome));
  }
  return (
    discovery.discovery.setup.recommendedModel ??
    discovery.discovery.models.find((m) => m.type === "alias")?.id ??
    discovery.discovery.models[0]?.id ??
    ""
  );
}

const MANAGED_MARK = "# BEGIN role-model-provider-managed";

function writeCatalogArtifacts(
  codexHome: string,
  discovery: DiscoveryResult,
  selectedExternalId: string,
  adapterPort: number,
): { catalogAbs: string; aliasesPath: string; configModelId: string; listed: string[] } {
  const catalogAbs = absoluteCatalogPath(codexHome);
  const catalogConfigPath = catalogPathForHome(codexHome);
  const aliasesPath = nativeAliasesPath(codexHome);
  const built = buildModelsCatalog(discovery, {
    selectedModelId: selectedExternalId,
    integrationMode: "signed-in",
  });
  writeTextFileAtomic(catalogAbs, `${JSON.stringify(built.catalog, null, 2)}\n`);
  writeNativeAliases(aliasesPath, built.aliases);
  const existing = readTextFileIfExists(join(codexHome, "config.toml"));
  if (existing.includes(MANAGED_MARK)) {
    const next = upsertManagedBlock(
      existing,
      buildManagedProviderBlock({
        model: built.configModelId,
        adapterPort,
        catalogPath: catalogConfigPath,
        integrationMode: "signed-in",
      }),
    );
    writeTextFileAtomic(join(codexHome, "config.toml"), next);
  }
  return {
    catalogAbs,
    aliasesPath,
    configModelId: built.configModelId,
    listed: built.listedExternalIds,
  };
}

export async function runCommand(argv: string[]): Promise<RoleModelCommandResult> {
  const [command = "help", ...rest] = argv;
  const config = createRoleModelConfig();
  const codexHome = resolveCodexHome();
  const userConfigPath = join(codexHome, "config.toml");

  try {
    switch (command) {
      case "help":
      case "--help":
      case "-h":
        return ok(HELP);

      case "setup": {
        const discovery = await discover();
        const model =
          discovery.discovery.setup.recommendedModel ??
          discovery.discovery.models.find((m) => m.type === "alias")?.id ??
          discovery.discovery.models[0]?.id;
        if (!model) return fail("setup: no aliases discovered");

        const catalogConfigPath = catalogPathForHome(codexHome);
        const catalogAbs = absoluteCatalogPath(codexHome);
        const built = buildModelsCatalog(discovery, {
          selectedModelId: model,
          integrationMode: "signed-in",
        });
        const existing = readTextFileIfExists(userConfigPath);
        const managed = buildManagedProviderBlock({
          model: built.configModelId,
          adapterPort: config.adapterPort,
          catalogPath: catalogConfigPath,
          integrationMode: "signed-in",
        });
        const next = upsertManagedBlock(existing, managed);
        if (!next.includes("openai_base_url =") || !next.includes("model_catalog_json =")) {
          return fail("setup: refused to write invalid managed block");
        }
        assertUserLevelConfigPath(userConfigPath, codexHome);
        const backupDir = backupCodexFiles(codexHome, [userConfigPath, catalogAbs]);
        writeTextFileAtomic(catalogAbs, `${JSON.stringify(built.catalog, null, 2)}\n`);
        writeNativeAliases(nativeAliasesPath(codexHome), built.aliases);
        writeAliasState({ selectedAlias: model });
        writeTextFileAtomic(userConfigPath, next);
        if (!process.env.ROLE_MODEL_CODEX_API_KEY) {
          process.env.ROLE_MODEL_CODEX_API_KEY = "role-model-local";
        }
        return ok(
          [
            "setup: ok",
            `backup: ${backupDir}`,
            `config: ${userConfigPath}`,
            `catalog: ${catalogAbs}`,
            `native_aliases: ${nativeAliasesPath(codexHome)}`,
            `adapter_base_url: ${adapterBaseUrl(config.adapterPort)}`,
            "integration: signed-in (openai_base_url; ChatGPT history preserved)",
            `model: ${built.configModelId}`,
            `picker_listed: ${built.listedExternalIds.join(", ")}`,
            "Restart Codex after setup. Compaction is Codex-managed (local /v1/responses).",
          ].join("\n"),
        );
      }

      case "uninstall": {
        assertUserLevelConfigPath(userConfigPath, codexHome);
        const existing = readTextFileIfExists(userConfigPath);
        const backupDir = backupCodexFiles(codexHome, [userConfigPath]);
        writeTextFileAtomic(userConfigPath, removeManagedBlock(existing));
        stopForwarder(forwarderStatePath(codexHome));
        return ok(
          `uninstall: ok\nbackup: ${backupDir}\nRemoved managed role-model provider block.`,
        );
      }

      case "refresh-catalog": {
        const discovery = await discover();
        const selected =
          resolveSelectedExternalId(codexHome, discovery) ||
          discovery.discovery.setup.recommendedModel;
        if (!selected) return fail("refresh-catalog: no selected model");
        const written = writeCatalogArtifacts(codexHome, discovery, selected, config.adapterPort);
        return ok(
          [
            "refresh-catalog: ok",
            `catalog: ${written.catalogAbs}`,
            `native_aliases: ${written.aliasesPath}`,
            `model: ${written.configModelId} -> ${selected}`,
            `picker_listed: ${written.listed.join(", ")}`,
            "Restart Codex Desktop/CLI to reload model_catalog_json.",
          ].join("\n"),
        );
      }

      case "status":
      case "doctor": {
        const discovery = await discover();
        const catalogAbs = absoluteCatalogPath(codexHome);
        const managedPresent = readTextFileIfExists(userConfigPath).includes(MANAGED_MARK);
        const lines = [
          `${command}: ok`,
          `endpoint: ${config.endpoint}`,
          `discovery: ${discovery.state ?? "ready"}`,
          `aliases: ${discovery.discovery.models.length}`,
          `recommended: ${discovery.discovery.setup.recommendedModel ?? "(none)"}`,
          `adapter: ${adapterBaseUrl(config.adapterPort)}`,
          `catalog: ${catalogAbs}`,
          `native_aliases: ${nativeAliasesPath(codexHome)}`,
          `managed_block: ${managedPresent ? "present" : "missing"}`,
          `auth_required: ${discovery.discovery.authentication.required}`,
        ];
        return ok(lines.join("\n"));
      }

      case "start": {
        const discovery = await discover();
        await startForwarder({
          listenPort: config.adapterPort,
          upstreamEndpoint: config.endpoint,
          aliasIds: aliasIds(discovery),
          stateFilePath: forwarderStatePath(codexHome),
          nativeAliasesPath: nativeAliasesPath(codexHome),
          nativeBaseUrl:
            process.env.CODEX_NATIVE_BASE_URL?.trim() || "https://chatgpt.com/backend-api/codex",
        });
        console.log(
          `start: ok\nadapter listening on ${adapterBaseUrl(config.adapterPort)}\nPress Ctrl+C to stop.`,
        );
        await new Promise<void>(() => {
          /* keep forwarder process alive */
        });
        return ok("start: stopped");
      }

      case "stop": {
        const stopped = stopForwarder(forwarderStatePath(codexHome));
        return ok(stopped ? "stop: ok" : "stop: ok (no forwarder state found)");
      }

      case "alias": {
        const discovery = await discover();
        const sub = rest[0] ?? "list";
        const aliases = discovery.discovery.models.filter((m) => m.type === "alias");
        if (sub === "list") {
          return ok(
            aliases
              .map(
                (a) =>
                  `- ${a.id}${a.id === discovery.discovery.setup.recommendedModel ? " [recommended]" : ""}`,
              )
              .join("\n") || "(no aliases)",
          );
        }
        if (sub === "recommended") {
          return ok(discovery.discovery.setup.recommendedModel ?? "(none)");
        }
        if (sub === "current") {
          const state = readAliasState(aliasStatePath());
          return ok(
            state.selectedAlias ?? recommendedRoleModelModelId(discovery.discovery) ?? "(none)",
          );
        }
        if (sub === "use") {
          const wanted = rest[1];
          if (!wanted) return fail("alias use requires <alias>");
          const id = wanted.startsWith("role-model/") ? wanted.slice("role-model/".length) : wanted;
          if (!aliases.some((a) => a.id === id)) {
            return fail(formatInvalidRoleModelModelId(discovery.discovery, wanted));
          }
          writeAliasState({ selectedAlias: id });
          const written = writeCatalogArtifacts(codexHome, discovery, id, config.adapterPort);
          return ok(
            `alias use: ${id}\nconfig model: ${written.configModelId}\npicker_listed: ${written.listed.join(", ")}\nRestart Codex to reload the catalog.`,
          );
        }
        return fail(`unknown alias subcommand: ${sub}`);
      }

      case "requests": {
        await discover();
        const limit = Number.parseInt(rest[0] ?? "10", 10) || 10;
        const rows = await listRecentRequests({ endpoint: config.endpoint, limit });
        return ok(
          rows
            .map((r) => `- ${r.requestId} [${r.status ?? "unknown"}] model=${r.modelId ?? "?"}`)
            .join("\n") || "(none)",
        );
      }

      case "explain": {
        await discover();
        const id = rest[0] ?? "latest";
        const target =
          id === "latest"
            ? (await listRecentRequests({ endpoint: config.endpoint, limit: 1 }))[0]?.requestId
            : id;
        if (!target) return fail("explain: no recent requests");
        const inspection = await inspectRequest({ endpoint: config.endpoint, requestId: target });
        if (!inspection) return fail(`explain: request not found: ${target}`);
        const intent = inspection.request?.roleModel?.intent;
        return ok(
          redactSecrets(
            [
              `request: ${target}`,
              `model: ${inspection.request?.modelId ?? "?"}`,
              `status: ${inspection.request?.status ?? "?"}`,
              `intent: ${intent ? JSON.stringify(intent) : "(none)"}`,
              `decision: ${inspection.routerDecision ? "present" : "absent"}`,
            ].join("\n"),
          ),
        );
      }

      default:
        return fail(`unknown command: ${command}\n\n${HELP}`);
    }
  } catch (error) {
    return formatDiscoveryFailure(error);
  }
}

export async function runCli(argv: string[]): Promise<void> {
  const result = await runCommand(argv);
  console.log(result.text);
  if (!result.ok) process.exitCode = 1;
}
