/**
 * The `/role-model` command surface.
 *
 * The handler is a pure function of an argument line and injected dependencies, so
 * every string is testable without a host. It never throws: a runtime problem, a
 * bad alias, or a missing capability produces a `{ok: false}` result whose text
 * explains the state and the fix, because the user is usually running this command
 * *because* something is wrong.
 *
 * The product name is always lower-case `role-model`.
 *
 * @module @try-works/dsh-role-model/commands
 */

import { DEFAULT_ENDPOINT } from "./config.js";
import { createRoleModelCatalog } from "./downstream-openai.js";
import {
  classifyRoleModelModelId,
  formatInvalidRoleModelModelId,
  normalizeRoleModelModelId,
  recommendedRoleModelModelId,
} from "./model-guidance.js";
import type { InspectedRequest, RuntimeRequestRecord } from "./runtime-inspection.js";
import type { DownstreamOpenAIDiscovery } from "./types.js";

/** The result of one command invocation. */
export interface RoleModelCommandResult {
  readonly ok: boolean;
  readonly text: string;
}

/** One discovery outcome, structurally what `discoverRoleModelRuntime` returns. */
export interface CommandDiscovery {
  readonly discovery: DownstreamOpenAIDiscovery;
  readonly state: "ready" | "fallback";
  readonly warnings: readonly string[];
  readonly health?: Record<string, unknown> | undefined;
  readonly version?: Record<string, unknown> | undefined;
}

/** Everything the command surface needs from the plugin. */
export interface RoleModelCommandDependencies {
  /** Discover the runtime; may throw a classified discovery error. */
  readonly discover: () => Promise<CommandDiscovery>;
  /** Re-register the provider route from a fresh discovery. */
  readonly refreshProvider?: (() => Promise<void>) | undefined;
  /** The alias recorded in configuration, or null. */
  readonly readSelectedAlias?: (() => string | null) | undefined;
  /** Record the selected alias in configuration. */
  readonly writeSelectedAlias?: ((alias: string) => void) | undefined;
  /** The model currently active in this session, when known. */
  readonly getActiveModelId?: (() => string | undefined) | undefined;
  /** Recent runtime requests. */
  readonly listRecentRequests?: ((limit?: number) => Promise<RuntimeRequestRecord[]>) | undefined;
  /** One request joined with its router decision. */
  readonly inspectRequest?: ((requestId: string) => Promise<InspectedRequest | null>) | undefined;
  /** The configured endpoint, for messages. */
  readonly endpoint?: string | undefined;
}

/** Optional host context the handler can use, when present. */
export interface RoleModelCommandContext {
  readonly getActiveModelId?: (() => string | undefined) | undefined;
}

/** The help block, shown for `help` and for an unknown command. */
const HELP = [
  "/role-model status            show the runtime, catalog and selection state",
  "/role-model doctor            explain every discovery check",
  "/role-model setup             re-register the provider route",
  "/role-model ui                print the runtime URL",
  "/role-model alias list        list the aliases the runtime advertises",
  "/role-model alias recommended print the runtime recommendation",
  "/role-model alias use <id>    record the selected alias",
  "/role-model alias current     print the current selection",
  "/role-model alias refresh     re-register from a fresh discovery",
  "/role-model requests [limit]  list recent runtime requests",
  "/role-model explain <id>      explain one request and its routing decision",
].join("\n");

/** Split an argument line into words. */
function words(value: string): string[] {
  return value.trim().split(/\s+/u).filter(Boolean);
}

/** Read a non-blank string field from a loose record. */
function stringField(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Create the command handler.
 * @param deps - the plugin's discovery, configuration and inspection surfaces.
 * @returns the handler.
 */
export function createRoleModelCommandHandler(
  deps: RoleModelCommandDependencies,
): (args?: string, context?: RoleModelCommandContext) => Promise<RoleModelCommandResult> {
  const endpoint = deps.endpoint ?? DEFAULT_ENDPOINT;

  /** Render the failure block for a discovery error. */
  const discoveryFailure = (command: string, error: unknown): RoleModelCommandResult => {
    const state = (error as { state?: unknown }).state;
    const remediation = (error as { remediation?: unknown }).remediation;
    const reached = state === "auth-required" || state === "incompatible";
    return {
      ok: false,
      text: [
        `${command}: fail`,
        "check: endpoint reachability",
        `classification: ${typeof state === "string" ? state : "unknown"}`,
        `runtime reached: ${reached ? "yes" : "no"}`,
        `endpoint: ${endpoint}`,
        `reason: ${error instanceof Error ? error.message : String(error)}`,
        ...(typeof remediation === "string" && remediation.length > 0
          ? [`remediation: ${remediation}`]
          : []),
      ].join("\n"),
    };
  };

  const status = (result: CommandDiscovery, live: string | null): RoleModelCommandResult => {
    const catalog = createRoleModelCatalog(result.discovery, "role-model");
    const aliases = result.discovery.models.filter((model) => model.type === "alias");
    const stored = deps.readSelectedAlias?.() ?? null;
    const recommended = recommendedRoleModelModelId(result.discovery);
    const selected = live ?? stored ?? recommended;
    const discoverable =
      selected !== null &&
      result.discovery.models.some((model) => model.id === normalizeRoleModelModelId(selected));
    const version =
      stringField(result.version, "release_version") ??
      stringField(result.version, "version") ??
      "unknown";
    const build = stringField(result.version, "version");

    return {
      ok: true,
      text: [
        `displayName: ${result.discovery.displayName}`,
        `state: ${result.state}`,
        `endpoint: ${(deps.endpoint ?? result.discovery.baseUrl).replace(/\/v1$/u, "")}`,
        "runtime reachability: reachable",
        `runtime version: ${version}`,
        ...(build !== undefined && build !== version && build !== "unknown"
          ? [`runtime build: ${build}`]
          : []),
        `aliases: ${String(aliases.length)}`,
        `models: ${String(catalog.entries.length)}`,
        `selected alias: ${selected ?? "none"}`,
        `selected alias state: ${selected === null ? "none" : discoverable ? "discoverable" : "removed or no longer discoverable"}`,
        `recommended alias: ${recommended ?? "none"}`,
        ...(stored !== null ? [`stored alias: ${stored}`] : []),
        "provider: registered",
        "auth: placeholder",
        `endpoint trust: ${/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/u.test(endpoint) ? "local" : "remote"}`,
        `fallback: ${result.state === "fallback" ? "yes" : "no"}`,
        `warnings: ${result.warnings.length === 0 ? "none" : result.warnings.join(" | ")}`,
      ].join("\n"),
    };
  };

  const doctor = (result: CommandDiscovery): RoleModelCommandResult => {
    const catalog = createRoleModelCatalog(result.discovery, "role-model");
    const aliases = result.discovery.models.filter((model) => model.type === "alias");
    const degraded = catalog.diagnostics
      .filter((diagnostic) => diagnostic.degraded)
      .map((diagnostic) => diagnostic.id);
    return {
      ok: true,
      text: [
        "doctor: ok",
        "check: endpoint reachability",
        "classification: ready",
        "runtime reached: yes",
        `endpoint: ${endpoint}`,
        `health: ${result.health === undefined ? "unknown" : "ok"}`,
        `runtime version: ${stringField(result.version, "release_version") ?? stringField(result.version, "version") ?? "unknown"}`,
        "downstream discovery: ok",
        `fallback: ${result.state === "fallback" ? "yes" : "no"}`,
        "auth: ok",
        "endpoint trust: ok",
        "provider: registered",
        `aliases: ${aliases.length === 0 ? "missing" : "ok"}`,
        `degraded models: ${degraded.length === 0 ? "none" : degraded.join(", ")}`,
        `models: ${String(catalog.entries.length)}`,
        `warnings: ${result.warnings.length === 0 ? "none" : result.warnings.join(" | ")}`,
      ].join("\n"),
    };
  };

  const aliasUse = async (
    subcommand: string,
    alias: string | undefined,
  ): Promise<RoleModelCommandResult> => {
    return { ok: false, text: `Usage: /role-model alias ${subcommand} <alias>` };
  };

  return async function handle(
    args = "",
    context: RoleModelCommandContext = {},
  ): Promise<RoleModelCommandResult> {
    const parts = words(args);
    const command = parts[0] ?? "help";
    const subcommand = parts[1];
    const rest = parts[2];

    // `help` is answered without touching the runtime, so it works when everything
    // else is broken.
    if (command === "help") return { ok: true, text: HELP };
    if (!["setup", "status", "doctor", "ui", "alias", "requests", "explain"].includes(command)) {
      return { ok: false, text: `Unknown /role-model command: ${args}\n\n${HELP}` };
    }

    // Every other command needs a reachable runtime. Discovery runs exactly once
    // per invocation and its result is reused, so the command never probes twice.
    let discovered: CommandDiscovery;
    try {
      discovered = await deps.discover();
    } catch (error) {
      return discoveryFailure(command, error);
    }
    const activeModelId = context.getActiveModelId ?? deps.getActiveModelId;
    const live = activeModelId?.() ?? null;

    switch (command) {
      case "setup": {
        await deps.refreshProvider?.();
        const recommended = recommendedRoleModelModelId(discovered.discovery);
        return {
          ok: true,
          text: [
            `role-model provider configured at ${discovered.discovery.baseUrl.replace(/\/$/u, "")}`,
            `recommended alias: ${recommended ?? "none"}`,
          ].join("\n"),
        };
      }
      case "ui":
        return {
          ok: true,
          text: `role-model UI/runtime URL: ${discovered.discovery.baseUrl.replace(/\/v1$/u, "")}`,
        };
      case "status":
        return status(discovered, live);
      case "doctor":
        return doctor(discovered);
      case "requests": {
        if (deps.listRecentRequests === undefined) {
          return { ok: false, text: "Recent request inspection is unavailable in this context." };
        }
        const parsed = Number.parseInt(subcommand ?? "", 10);
        const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
        const requests = await deps.listRecentRequests(limit);
        if (requests.length === 0)
          return { ok: true, text: "No recent role-model runtime requests are available." };
        return {
          ok: true,
          text: requests
            .map((request) =>
              [
                `- ${request.requestId}`,
                `[${request.status ?? "unknown"}]`,
                ...(request.endpointId === undefined ? [] : [`endpoint=${request.endpointId}`]),
                ...(request.modelId === undefined ? [] : [`model=${request.modelId}`]),
                ...(request.roleId === undefined ? [] : [`role=${request.roleId}`]),
                ...(request.taskType === undefined ? [] : [`task=${request.taskType}`]),
              ].join(" "),
            )
            .join("\n"),
        };
      }
      case "explain": {
        if (deps.inspectRequest === undefined || deps.listRecentRequests === undefined) {
          return { ok: false, text: "Request inspection is unavailable in this context." };
        }
        if (subcommand === undefined)
          return { ok: false, text: "Usage: /role-model explain <request-id|latest>" };
        let requestId = subcommand;
        if (subcommand === "latest") {
          const recent = await deps.listRecentRequests(1);
          const newest = recent[0]?.requestId;
          if (newest === undefined) {
            return {
              ok: false,
              text: "No recent role-model runtime request is available to explain.",
            };
          }
          requestId = newest;
        }
        const inspected = await deps.inspectRequest(requestId);
        if (inspected === null)
          return { ok: false, text: `role-model runtime request not found: ${requestId}` };
        const observe =
          inspected.observeRequestPath?.startsWith("/") === true
            ? `${endpoint}${inspected.observeRequestPath}`
            : "not available";
        return {
          ok: true,
          text: [
            `request: ${inspected.requestId}`,
            `status: ${inspected.status ?? "unknown"}`,
            `endpoint: ${inspected.endpointId ?? inspected.selectedEndpointId ?? "unknown"}`,
            `model: ${inspected.modelId ?? inspected.selectedModelId ?? "unknown"}`,
            `provider: ${inspected.providerId ?? "unknown"}`,
            `role: ${inspected.roleId ?? "unknown"}`,
            `task: ${inspected.taskType ?? "unknown"}`,
            `strategy: ${inspected.strategyLabel ?? "unknown"}`,
            `selection reasons: ${inspected.selectionReasons === undefined || inspected.selectionReasons.length === 0 ? "none recorded" : inspected.selectionReasons.join(", ")}`,
            `observe: ${observe}`,
          ].join("\n"),
        };
      }
      case "alias": {
        const listed = discovered.discovery.models.filter((model) => model.type === "alias");
        const recommended = recommendedRoleModelModelId(discovered.discovery);
        switch (subcommand) {
          case "list": {
            if (listed.length === 0)
              return { ok: true, text: "No role-model aliases are available." };
            const stored = deps.readSelectedAlias?.() ?? null;
            return {
              ok: true,
              text: listed
                .map((model) => {
                  const markers = [
                    ...(model.id === recommended ? ["recommended"] : []),
                    ...(model.id === stored ? ["selected"] : []),
                  ];
                  return `- ${model.id}${model.id === recommended ? " (recommended)" : ""}${markers.length === 0 ? "" : ` [${markers.join(", ")}]`}`;
                })
                .join("\n"),
            };
          }
          case "recommended":
            return recommended === null
              ? { ok: false, text: "No role-model alias recommendation is available." }
              : { ok: true, text: `recommended alias: ${recommended}` };
          case "current": {
            const selected = activeModelId?.() ?? deps.readSelectedAlias?.() ?? recommended;
            return { ok: true, text: `Current role-model alias: ${selected ?? "none"}` };
          }
          case "refresh": {
            await deps.refreshProvider?.();
            return {
              ok: true,
              text: [
                `Refreshed role-model provider from ${discovered.discovery.baseUrl.replace(/\/$/u, "")}`,
                `models: ${String(discovered.discovery.models.length)}`,
                `recommended alias: ${recommended ?? "none"}`,
              ].join("\n"),
            };
          }
          case "use":
          case "choose": {
            if (rest === undefined) return aliasUse(subcommand, undefined);
            const requested = normalizeRoleModelModelId(rest);
            const found = discovered.discovery.models.find((model) => model.id === requested);
            if (found === undefined) {
              const text = formatInvalidRoleModelModelId(discovered.discovery, rest, true).replace(
                "invalid role-model model id:",
                "invalid role-model alias:",
              );
              return { ok: false, text };
            }
            deps.writeSelectedAlias?.(found.id);
            return {
              ok: true,
              text: [
                `selected alias: ${found.id}`,
                "active model: not changed (select it in the model selector; DSH owns the active model)",
              ].join("\n"),
            };
          }
          default:
            return {
              ok: false,
              text: [
                `Unknown /role-model alias subcommand: ${subcommand ?? "(none)"}`,
                "Usage: /role-model alias list|recommended|current|refresh|use <alias>",
              ].join("\n"),
            };
        }
      }
      default:
        return { ok: false, text: `Unknown /role-model command: ${args}\n\n${HELP}` };
    }
  };
}

/** Re-exported so callers can classify ids without another import. */
export { classifyRoleModelModelId };
