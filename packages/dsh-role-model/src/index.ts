/**
 * `@try-works/dsh-role-model` — connect this harness to an externally running
 * role-model runtime.
 *
 * The plugin owns its own provider route and its own outbound transport, so every
 * request it serves can carry `role_model` intent metadata (the capability that
 * lets the runtime route on role, task, capability, modality, and tool needs).
 *
 * Activation is deliberately total: a missing runtime, a refused endpoint, or an
 * absent optional service leaves the harness healthy and records a diagnostic, so
 * `/role-model doctor` can explain the state rather than the plugin failing the
 * whole profile.
 *
 * @module @try-works/dsh-role-model
 */

import z from "@deepseek-ai/schemastery";
import { createRoleModelAdapter } from "./adapter.js";
import { createRoleModelCommandHandler } from "./commands.js";
import {
  type ConfigField,
  DEFAULT_ENDPOINT,
  DEFAULT_PROVIDER_ROUTE,
  DEFAULT_REQUEST_TIMEOUT_MS,
  type RoleModelConfig,
  createRoleModelConfig,
} from "./config.js";
import { createRoleModelCatalog } from "./downstream-openai.js";
import { type HostLlmClasses, loadHostLlmClasses } from "./host-llm.js";
import { discoverRoleModelRuntime } from "./runtime-discovery.js";
import { inspectRequest, listRecentRequests } from "./runtime-inspection.js";
import {
  SKILL_DESCRIPTION,
  type SkillRegistration,
  createSkillRegistration,
  skillDirectoryFromModuleUrl,
} from "./skills.js";

/** Plugin name used by loader diagnostics. */
export const name = "@try-works/dsh-role-model";

/** Services this plugin consumes when they are present. */
export const inject = ["llm"];

/**
 * Configuration schema.
 *
 * Exported so the loader validates a patch row before activation and can show the
 * fields in a settings surface. Values are read through
 * {@link createRoleModelConfig}, which owns the normalization rules.
 *
 * Every user-changeable field is marked `.volatile()`. That marker is what makes
 * the Harness settings system generate a form for this plugin: it walks the schema,
 * and a schema with no volatile field yields no form — which means no settings
 * namespace, and therefore no row for this route on the Models page, since that page
 * only lists configurable providers whose namespace exists. Without the markers the
 * configuration surface is inert and the endpoint cannot be edited from the UI.
 */
export const Config = z.object({
  /** Runtime endpoint, without a trailing slash and without `/v1`. */
  endpoint: z.string().default(DEFAULT_ENDPOINT).volatile(),
  /** Whether non-loopback endpoints are permitted. */
  allowRemote: z.boolean().default(false).volatile(),
  /** Timeout for runtime metadata calls, in milliseconds. */
  requestTimeoutMs: z.number().min(1).default(DEFAULT_REQUEST_TIMEOUT_MS).volatile(),
  /** Provider route this plugin owns. Lower-case; never title-cased. */
  providerRoute: z.string().default(DEFAULT_PROVIDER_ROUTE).volatile(),
  /** Alias selected by `/role-model alias use`; empty means "no preference". */
  selectedAlias: z.string().default("").volatile(),
  /** Explicit host `dsh-llm` module path; empty means "auto-resolve". */
  hostLlmModule: z.string().default("").volatile(),
});

/** Raw configuration as it arrives from the bundle's patch row. */
export type RoleModelPluginConfig = {
  endpoint?: string | undefined;
  allowRemote?: ConfigField;
  requestTimeoutMs?: ConfigField;
  providerRoute?: ConfigField;
  selectedAlias?: ConfigField;
  hostLlmModule?: ConfigField;
};

/** The subset of the Cordis context activation uses. */
interface ActivationContext {
  readonly logger: {
    info(message: unknown): void;
    warn(message: unknown): void;
    error(message: unknown): void;
  };
  get(service: string): unknown;
  /**
   * Register a disposal-scoped resource. Present on every real Cordis context;
   * optional here so activation can be exercised in isolation.
   */
  effect?(callback: () => unknown): () => void;
}

/** A configurable-provider directory entry, as DSH declares it. */
interface ConfigurableProviderEntry {
  provider: string;
  displayName: string;
  settingsNs: string;
  settingsPath: readonly string[];
  declared?: boolean;
  error?: string;
}

/** A command definition, as the harness's command registry accepts it. */
interface CommandDefinitionLike {
  name: string;
  description: string;
  input?: { hint: string };
  handler: (invocation: { rawInput: string }) => Promise<
    { kind: "text"; text: string } | { kind: "error"; text: string }
  >;
}

/** The subset of the LLM service the plugin registers into. */
interface LlmService {
  /** Register an adapter for one or more provider routes. */
  registerAdapter(providers: string[], adapter: unknown): () => void;
  /** Optional: describe the route in the provider settings directory. */
  registerConfigurableProviders?(entries: readonly ConfigurableProviderEntry[]): () => void;
}

/** The subset of the commands service the plugin registers into. */
interface CommandsService {
  register(definition: CommandDefinitionLike): () => void;
}

/** The subset of the skills service the plugin registers into. */
interface SkillsService {
  register(registration: SkillRegistration): () => void;
}

/** The subset of the config editor the plugin writes alias state through. */
interface ConfigEditorService {
  edit(
    entry: { id: string },
    change: (current: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<void>;
}

/** Options for {@link createRoleModelPlugin}, injectable for tests. */
export interface RoleModelPluginOptions {
  readonly fetch?: typeof fetch | undefined;
  /** Pre-loaded host classes; when absent they are resolved at activation. */
  readonly hostLlm?: HostLlmClasses | undefined;
}

/**
 * Build the plugin's `apply` function.
 *
 * Exposed as a factory so activation can be exercised directly, without a live
 * Cordis host, and so the transport can be substituted in tests.
 *
 * @param options - injectable transport.
 * @returns the `apply(ctx, config)` entry point.
 */
export function createRoleModelPlugin(
  options: RoleModelPluginOptions = {},
): (ctx: ActivationContext, config: RoleModelPluginConfig) => Promise<void> {
  return async function apply(
    ctx: ActivationContext,
    config: RoleModelPluginConfig,
  ): Promise<void> {
    const resolved: RoleModelConfig = createRoleModelConfig(config);
    const policy = {
      endpoint: resolved.endpoint,
      allowRemote: resolved.allowRemote,
      timeoutMs: resolved.requestTimeoutMs,
      providerRoute: resolved.providerRoute,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    };

    // Register the provider route. This is what puts role-model into the model
    // selector, so it must happen whenever the llm service exists — a runtime
    // outage degrades the catalog, it does not remove the route.
    const llm = ctx.get("llm") as LlmService | undefined;
    if (llm === undefined || typeof llm.registerAdapter !== "function") {
      ctx.logger.warn(
        `dsh-role-model: the llm service is not available; route "${resolved.providerRoute}" was not registered.`,
      );
      return;
    }

    const hostClasses =
      options.hostLlm ??
      (await loadHostLlmClasses({
        env: process.env,
        cwd: process.cwd(),
        ...(resolved.hostLlmModule === null ? {} : { moduleOverride: resolved.hostLlmModule }),
      }));
    if (hostClasses === undefined) {
      ctx.logger.warn(
        "dsh-role-model: could not locate the harness LLM module, so the route was not registered. " +
          "Set `hostLlmModule` to the harness's @deepseek-ai/dsh-llm entry, or DSH_HARNESS_ROOT to the checkout root.",
      );
      return;
    }
    ctx.logger.info(
      `dsh-role-model: host LLM classes from ${hostClasses.source.kind} at ${hostClasses.source.path}`,
    );

    const adapter = createRoleModelAdapter({
      endpoint: resolved.endpoint,
      allowRemote: resolved.allowRemote,
      requestTimeoutMs: resolved.requestTimeoutMs,
      providerRoute: resolved.providerRoute,
      LlmAdapterBase: hostClasses.LlmAdapter,
      LlmErrorClass: hostClasses.LlmError,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    });

    // One effect owns both registrations so unloading the plugin releases them.
    const register = (): (() => void) => {
      const disposeAdapter = llm.registerAdapter([resolved.providerRoute], adapter);
      const disposeDirectory = llm.registerConfigurableProviders?.([
        {
          provider: resolved.providerRoute,
          displayName: resolved.providerRoute,
          settingsNs: "dsh-role-model",
          settingsPath: [],
          declared: true,
        },
      ]);
      return () => {
        disposeDirectory?.();
        disposeAdapter();
      };
    };
    if (typeof ctx.effect === "function") ctx.effect(register);
    else register();

    // Register the command surface and the packaged skill. Both are optional
    // services: their absence degrades the plugin, it does not disable the route.
    //
    // Alias state lives in plugin configuration (the settled decision), so the
    // command surface reads the configured value and writes it back through the
    // config editor when one is available.
    const configEditor = ctx.get("configEditor") as ConfigEditorService | undefined;
    const readSelectedAlias = (): string | null => {
      const current = ctx.get("config") as { selectedAlias?: unknown } | undefined;
      const value = current?.selectedAlias;
      return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : resolved.selectedAlias;
    };
    const writeSelectedAlias = (alias: string): void => {
      const editor = configEditor;
      if (editor === undefined || typeof editor.edit !== "function") {
        ctx.logger.warn(
          `dsh-role-model: recorded alias "${alias}" for this session only; set \`selectedAlias\` in the plugin config to persist it.`,
        );
        return;
      }
      void editor
        .edit({ id: "dsh-role-model" }, (current: Record<string, unknown>) => ({
          ...current,
          selectedAlias: alias,
        }))
        .catch((error: unknown) => {
          ctx.logger.warn(`dsh-role-model: could not persist the selected alias: ${String(error)}`);
        });
    };

    const commands = ctx.get("commands") as CommandsService | undefined;
    if (commands !== undefined && typeof commands.register === "function") {
      const handler = createRoleModelCommandHandler({
        endpoint: resolved.endpoint,
        discover: () => discoverRoleModelRuntime(policy),
        refreshProvider: async () => {
          // Re-read the catalog; the adapter resolves models live per call, so
          // refreshing is a discovery probe rather than a re-registration.
          await discoverRoleModelRuntime(policy);
        },
        readSelectedAlias,
        writeSelectedAlias,
        listRecentRequests: (limit) =>
          listRecentRequests({
            endpoint: resolved.endpoint,
            ...(limit === undefined ? {} : { limit }),
            ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
          }),
        inspectRequest: (requestId) =>
          inspectRequest({
            endpoint: resolved.endpoint,
            requestId,
            ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
          }),
      });
      const registerCommand = (): (() => void) =>
        commands.register({
          name: "role-model",
          description: "Inspect and configure the role-model provider route.",
          input: { hint: "status | doctor | setup | alias | requests | explain" },
          async handler(invocation) {
            const result = await handler(invocation.rawInput);
            return result.ok
              ? { kind: "text", text: result.text }
              : { kind: "error", text: result.text };
          },
        });
      if (typeof ctx.effect === "function") ctx.effect(registerCommand);
      else registerCommand();
    } else {
      ctx.logger.warn(
        "dsh-role-model: the commands service is not available; /role-model was not registered.",
      );
    }

    const skills = ctx.get("skills") as SkillsService | undefined;
    if (skills !== undefined && typeof skills.register === "function") {
      const registration = createSkillRegistration(
        skillDirectoryFromModuleUrl(import.meta.url),
        SKILL_DESCRIPTION,
      );
      if (registration === undefined) {
        ctx.logger.warn(
          "dsh-role-model: the packaged role-model skill file was not found next to the bundle.",
        );
      } else {
        const registerSkill = (): (() => void) => skills.register(registration);
        if (typeof ctx.effect === "function") ctx.effect(registerSkill);
        else registerSkill();
      }
    }

    try {
      const result = await discoverRoleModelRuntime(policy);
      const catalog = createRoleModelCatalog(result.discovery, resolved.providerRoute);
      ctx.logger.info(
        `dsh-role-model: route "${resolved.providerRoute}" registered with ${String(catalog.entries.length)} models at ${catalog.baseUrl} (state ${result.state}).`,
      );
      for (const warning of result.warnings) ctx.logger.warn(`dsh-role-model: ${warning}`);
      for (const diagnostic of catalog.diagnostics) {
        ctx.logger.warn(
          `dsh-role-model: model "${diagnostic.id}" is degraded: ${diagnostic.reasons.join("; ")}`,
        );
      }
    } catch (error) {
      const state = (error as { state?: unknown }).state;
      const remediation = (error as { remediation?: unknown }).remediation;
      ctx.logger.warn(
        `dsh-role-model: route "${resolved.providerRoute}" is registered, but the runtime could not be reached${typeof state === "string" ? ` (${state})` : ""}: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (typeof remediation === "string" && remediation.length > 0) {
        ctx.logger.warn(`dsh-role-model: ${remediation}`);
      }
      // Activation stays successful: /role-model doctor reports the detail.
    }
  };
}

/** Default `apply` bound to the global fetch. */
export default createRoleModelPlugin();
