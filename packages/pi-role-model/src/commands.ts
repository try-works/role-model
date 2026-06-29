import { createPiModelSelection } from "./downstream-openai.js";
import type {
  RoleModelRecentRequest,
  RoleModelRequestInspection,
} from "./runtime-inspection.js";
import { RoleModelDiscoveryError } from "./runtime-discovery.js";
import type {
  DiscoveryResult,
  PiCommandContext,
  PiModelSelection,
  RoleModelCommandResult,
  RoleModelModelDiagnostic,
} from "./types.js";

export interface RoleModelCommandDependencies {
  discover(): Promise<DiscoveryResult>;
  refreshProvider?: (discovery: DiscoveryResult["discovery"]) => Promise<void> | void;
  readSelectedAlias?: () => Promise<string | null>;
  writeSelectedAlias?: (alias: string) => Promise<void>;
  setActiveModel?: (model: PiModelSelection) => Promise<boolean>;
  listRecentRequests?: (limit?: number) => Promise<readonly RoleModelRecentRequest[]>;
  inspectRequest?: (requestId: string) => Promise<RoleModelRequestInspection | null>;
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
  "/role-model requests [limit] - list recent Role-Model runtime requests",
  "/role-model explain <request-id|latest> - show runtime routing diagnostics for a request",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableString(record: Record<string, unknown>, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extractRoleTask(record: RoleModelRecentRequest): { roleId: string | null; taskType: string | null } {
  const normalizedIntent = record.normalizedIntent;
  const roleModel = record.roleModel;
  const intent = isRecord(roleModel?.intent) ? roleModel.intent : null;
  return {
    roleId:
      (normalizedIntent && readNullableString(normalizedIntent, "roleId", "requestedRoleId")) ??
      (intent && readNullableString(intent, "role_hint_id")) ??
      null,
    taskType:
      (normalizedIntent && readNullableString(normalizedIntent, "taskType", "requestedTaskType")) ??
      (intent && readNullableString(intent, "task_type")) ??
      null,
  };
}

function formatRecentRequest(record: RoleModelRecentRequest): string {
  const { roleId, taskType } = extractRoleTask(record);
  const parts = [
    `- ${record.requestId}`,
    `[${record.status ?? "unknown"}]`,
    record.endpointId ? `endpoint=${record.endpointId}` : null,
    record.modelId ? `model=${record.modelId}` : null,
    roleId ? `role=${roleId}` : null,
    taskType ? `task=${taskType}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function readSelectionReasons(inspection: RoleModelRequestInspection): readonly string[] {
  const decision = inspection.routerDecision?.decision;
  if (!decision) {
    return [];
  }
  const snakeCase = readStringArray(decision.selection_reasons);
  if (snakeCase.length > 0) {
    return snakeCase;
  }
  return readStringArray(decision.selectionReasons);
}

function formatInspection(inspection: RoleModelRequestInspection): string {
  const request = inspection.request;
  const routerDecision = inspection.routerDecision;
  const { roleId, taskType } = extractRoleTask(request);
  const reasonCodes = readSelectionReasons(inspection);
  const observeUrl =
    routerDecision?.observeRequestPath && routerDecision.observeRequestPath.startsWith("/")
      ? `${inspection.runtimeBaseUrl}${routerDecision.observeRequestPath}`
      : null;
  return [
    `request: ${request.requestId}`,
    `status: ${request.status ?? "unknown"}`,
    `endpoint: ${request.endpointId ?? routerDecision?.selectedEndpointId ?? "unknown"}`,
    `model: ${request.modelId ?? routerDecision?.selectedModelId ?? "unknown"}`,
    `provider: ${request.providerId ?? "unknown"}`,
    `role: ${roleId ?? "unknown"}`,
    `task: ${taskType ?? "unknown"}`,
    `strategy: ${routerDecision?.strategyLabel ?? "unknown"}`,
    `selection reasons: ${reasonCodes.length > 0 ? reasonCodes.join(", ") : "none recorded"}`,
    `observe: ${observeUrl ?? "not available"}`,
  ].join("\n");
}

function resolveAliasId(result: DiscoveryResult, rawAlias: string): string | null {
  const trimmed = rawAlias.trim();
  if (!trimmed) {
    return null;
  }
  const candidates = new Set([trimmed]);
  if (trimmed.startsWith("role-model/")) {
    candidates.add(trimmed.slice("role-model/".length));
  } else {
    candidates.add(`role-model/${trimmed}`);
  }
  const match = result.discovery.models.find((model) => candidates.has(model.id));
  return match?.id ?? null;
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

function releaseVersionText(result: DiscoveryResult): string | null {
  return typeof result.version?.release_version === "string" ? result.version.release_version : null;
}

function runtimeDisplayVersionText(result: DiscoveryResult): string {
  return releaseVersionText(result) ?? versionText(result);
}

function runtimeBuildText(result: DiscoveryResult): string | null {
  const releaseVersion = releaseVersionText(result);
  const buildVersion = versionText(result);
  if (!releaseVersion || releaseVersion === buildVersion || buildVersion === "unknown") {
    return null;
  }
  return buildVersion;
}

function currentPiRoleModelAlias(context?: Pick<PiCommandContext, "getModel">): string | null {
  const model = context?.getModel?.();
  if (!model || model.provider !== "role-model" || typeof model.id !== "string") {
    return null;
  }
  return model.id.startsWith("role-model/") ? model.id.slice("role-model/".length) : model.id;
}

async function selectedAliasText(
  result: DiscoveryResult,
  readSelectedAlias?: () => Promise<string | null>,
  context?: Pick<PiCommandContext, "getModel">,
): Promise<string> {
  return (
    currentPiRoleModelAlias(context) ??
    (await readSelectedAlias?.()) ??
    result.discovery.setup.recommendedModel ??
    "none"
  );
}

export function createRoleModelCommandHandler(dependencies: RoleModelCommandDependencies) {
  return async function handleRoleModelCommand(
    args = "",
    context?: Pick<PiCommandContext, "getModel">,
  ): Promise<RoleModelCommandResult> {
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
      return ok(
        `Role-Model provider configured at ${result.discovery.baseUrl}\nrecommended alias: ${recommended}`,
      );
    }

    if (command === "ui") {
      return ok(`Role-Model UI/runtime URL: ${result.discovery.baseUrl}`);
    }

    if (command === "status") {
      const storedAlias = await dependencies.readSelectedAlias?.();
      const activeAlias = currentPiRoleModelAlias(context);
      const selected = await selectedAliasText(result, dependencies.readSelectedAlias, context);
      const aliases = aliasRecords(result);
      return ok(
        [
          result.discovery.displayName,
          `state: ${result.state ?? "ready"}`,
          `endpoint: ${result.discovery.baseUrl}`,
          `runtime version: ${runtimeDisplayVersionText(result)}`,
          ...(runtimeBuildText(result) ? [`runtime build: ${runtimeBuildText(result)}`] : []),
          `aliases: ${aliases.length}`,
          `selected alias: ${selected}`,
          activeAlias && storedAlias && activeAlias !== storedAlias
            ? `stored alias: ${storedAlias}`
            : null,
          `provider: ${result.providerRegistered === false ? "not registered" : "registered"}`,
          `auth: ${result.discovery.authentication.required ? "required" : "placeholder"}`,
          `endpoint trust: ${result.discovery.baseUrl.startsWith("http://127.0.0.1") || result.discovery.baseUrl.startsWith("http://localhost") ? "local" : "remote"}`,
          `fallback: ${(result.state ?? "ready") === "fallback" ? "yes" : "no"}`,
          `warnings: ${result.warnings && result.warnings.length > 0 ? result.warnings.join("; ") : "none"}`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
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
          `runtime version: ${versionText(result) === "unknown" ? "unknown" : "ok"}`,
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

    if (command === "requests") {
      if (!dependencies.listRecentRequests) {
        return fail("Recent request inspection is unavailable in this Pi context.");
      }
      const requestedLimit = Number.parseInt(subcommand ?? "", 10);
      const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;
      const requests = await dependencies.listRecentRequests(limit);
      return ok(
        requests.length > 0
          ? requests.map((request) => formatRecentRequest(request)).join("\n")
          : "No recent Role-Model runtime requests are available.",
      );
    }

    if (command === "explain") {
      if (!dependencies.inspectRequest || !dependencies.listRecentRequests) {
        return fail("Runtime request diagnostics are unavailable in this Pi context.");
      }
      const requested = [subcommand, ...rest].filter(Boolean).join(" ") || "latest";
      let requestId = requested;
      if (requested === "latest") {
        const latest = await dependencies.listRecentRequests(1);
        requestId = latest[0]?.requestId ?? "";
      }
      if (!requestId) {
        return fail("No recent Role-Model runtime request is available to explain.");
      }
      const inspection = await dependencies.inspectRequest(requestId);
      if (!inspection) {
        return fail(`Role-Model runtime request not found: ${requestId}`);
      }
      return ok(formatInspection(inspection));
    }

    if (command === "alias" && subcommand === "list") {
      const selected = await dependencies.readSelectedAlias?.();
      const aliases = aliasRecords(result).map((model) => {
        const markers = ["ready"];
        const recommended =
          model.id === result.discovery.setup.recommendedModel ? " (recommended)" : "";
        if (model.id === result.discovery.setup.recommendedModel) markers.push("recommended");
        if (model.id === selected) markers.push("selected");
        if (diagnosticsFor(result, model.id)?.degraded) markers.push("degraded");
        return `- ${model.id}${recommended} [${markers.join(", ")}]`;
      });
      return ok(aliases.length > 0 ? aliases.join("\n") : "No Role-Model aliases are available.");
    }

    if (command === "alias" && subcommand === "recommended") {
      const recommended = result.discovery.setup.recommendedModel;
      return recommended
        ? ok(`Recommended Role-Model alias: ${recommended}`)
        : fail("No Role-Model alias recommendation is available.");
    }

    if (command === "alias" && (subcommand === "choose" || subcommand === "use")) {
      const requestedAlias = rest.join(" ");
      if (!requestedAlias) {
        return fail(`Usage: /role-model alias ${subcommand} <alias>`);
      }
      const alias = resolveAliasId(result, requestedAlias);
      if (!alias) {
        return fail(`Unknown Role-Model alias: ${requestedAlias}`);
      }
      await dependencies.writeSelectedAlias?.(alias);
      const model = createPiModelSelection(result.discovery, alias);
      if (!model) {
        return fail(
          `selected alias: ${alias}\nactive model: not changed (Role-Model alias metadata is unavailable)`,
        );
      }
      if (!dependencies.setActiveModel) {
        return ok(
          `selected alias: ${alias}\nactive model: not changed (Pi active-model selection is unavailable in this context)`,
        );
      }
      const switched = await dependencies.setActiveModel(model);
      if (!switched) {
        return fail(
          `selected alias: ${alias}\nactive model: not changed (Pi rejected model selection; check provider auth)`,
        );
      }
      return ok(`selected alias: ${alias}\nactive model: ${model.id}`);
    }

    if (command === "alias" && subcommand === "refresh") {
      await dependencies.refreshProvider?.(result.discovery);
      return ok(
        `Refreshed Role-Model provider from ${result.discovery.baseUrl}\nmodels: ${result.discovery.models.length}\nrecommended alias: ${result.discovery.setup.recommendedModel ?? "none"}`,
      );
    }

    if (command === "alias" && subcommand === "current") {
      const selected = (await selectedAliasText(result, dependencies.readSelectedAlias, context)) ?? "none";
      return ok(`Current Role-Model alias: ${selected}`);
    }

    return fail(`Unknown /role-model command: ${args || command}\n\n${HELP}`);
  };
}
