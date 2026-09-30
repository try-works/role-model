/**
 * The plugin-owned provider adapter.
 *
 * This is what puts role-model routes into DSH's LLM registry, and therefore into
 * the main model selector. It owns the outbound HTTP call, which is the whole point
 * of the design: because the adapter serializes the body itself, it can attach
 * `role_model` intent metadata at the top level — the capability that lets the
 * runtime route on role, task, capability, modality and tool needs.
 *
 * DSH validates adapter output strictly. Two rules are load-bearing and are pinned
 * by specs:
 *  - every `listModels` entry must name the owning provider exactly, and ids must be
 *    unique and non-empty, or `llm.listModels` throws `INVALID_CATALOG` and the
 *    entire selector group becomes a failure chip;
 *  - `resolveModel` must echo the requested provider and id exactly.
 *
 * @module @try-works/dsh-role-model/adapter
 */

import type { RoleModelConfigInput } from "./config.js";
import { createRoleModelCatalog } from "./downstream-openai.js";
import type {
  HostLlmAdapterConstructor,
  HostLlmErrorConstructor,
  HostLlmErrorOptions,
} from "./host-llm.js";
import { type ApplyRoleModelIntentOptions, applyRoleModelIntent } from "./intent.js";
import { type WireImageResolver, buildChatBody, streamChunksFromOpenAiSse } from "./openai-wire.js";
import { discoverRoleModelRuntime } from "./runtime-discovery.js";
import type { RoleModelCatalog, RoleModelCatalogEntry } from "./types.js";

/** A model entry as DSH's catalog expects it. */
export interface AdapterModelInfo {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly inputModalities?: readonly string[];
}

/** A resolved model description, as DSH expects it. */
export interface AdapterResolvedModel {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
  readonly inputModalities?: readonly string[];
  readonly context?: { readonly contextWindow: number };
  readonly defaultMaxTokens?: number;
  readonly reasoning?: {
    readonly efforts: readonly {
      readonly id: string;
      readonly name: string;
      readonly description?: string;
    }[];
    readonly defaultEffort?: string;
  };
}

/** The request shape the adapter consumes (a structural view of `GenerateOptions`). */
export interface AdapterGenerateOptions {
  readonly provider?: string | undefined;
  readonly model?: string | undefined;
  readonly messages?: readonly unknown[] | undefined;
  readonly system?: string | undefined;
  readonly tools?:
    | readonly {
        readonly name?: string;
        readonly description?: string;
        readonly parameters?: unknown;
      }[]
    | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly stop?: readonly string[] | undefined;
  readonly reasoningEffort?: string | undefined;
  readonly purpose?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

/** Options for {@link createRoleModelAdapter}. */
export interface CreateRoleModelAdapterOptions extends RoleModelConfigInput {
  /** Provider route this adapter owns. */
  readonly providerRoute: string;
  /** Placeholder bearer token from discovery, or the packaged default. */
  readonly placeholderToken?: string | undefined;
  /** Fetch implementation for runtime calls; defaults to the global fetch. */
  readonly fetch?: typeof fetch | undefined;
  /** The HOST's `LlmAdapter` constructor, so registration sees its class identity. */
  readonly LlmAdapterBase: HostLlmAdapterConstructor;
  /** The HOST's `LlmError` constructor, so failure codes survive normalization. */
  readonly LlmErrorClass: HostLlmErrorConstructor;
  /** Resolve an image attachment to a data URL, when the harness can. */
  readonly resolveImage?: WireImageResolver | undefined;
  /** Override the discovery call, for tests. */
  readonly discover?: (() => Promise<{ discovery: unknown }>) | undefined;
  /** Fired after a successful request, with the runtime's own request identity. */
  readonly onRequestRouted?:
    | ((info: {
        requestId?: string | undefined;
        routingDecisionId?: string | undefined;
        endpointId?: string | undefined;
      }) => void)
    | undefined;
}

/** The adapter surface this module produces. */
export interface RoleModelAdapter {
  providerInfo(provider: string): { id: string; name: string };
  listModels(provider: string): Promise<readonly AdapterModelInfo[]>;
  resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<AdapterResolvedModel>;
  stream(options: AdapterGenerateOptions): AsyncIterable<unknown>;
}

/** Normalize a provider-relative model id for lookup. */
function normalizeModelId(model: string): string {
  return model.startsWith("role-model/") ? model.slice("role-model/".length) : model;
}

/**
 * Map one HTTP failure to the host's provider-neutral error code.
 * @param status - HTTP status.
 * @param detail - provider error text.
 * @returns the stable code.
 */
function codeForStatus(status: number, detail: string): string {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 402 || /quota|balance|insufficient/iu.test(detail)) return "QUOTA";
  if (status === 429) return "RATE_LIMIT";
  if (status === 400 || status === 413 || status === 422) return "INVALID_REQUEST";
  if (/context[\s_-]?(length|window)/iu.test(detail)) return "CONTEXT_WINDOW_EXCEEDED";
  if (status >= 500) return "SERVER";
  return `HTTP_${String(status)}`;
}

/** Read the provider error text from a decoded body. */
function errorDetail(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) {
      const error = (parsed as { error?: unknown }).error;
      if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        return [record.code, record.type, record.message]
          .filter((value) => typeof value === "string")
          .join(" ");
      }
      const message = (parsed as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
  } catch {
    // A gateway may not return JSON; the HTTP status is authoritative.
  }
  return body.slice(0, 200);
}

/** Parse a `Retry-After` header into milliseconds. */
function retryAfterMs(header: string | null): number | undefined {
  if (header === null) return undefined;
  if (/^\d+(?:\.\d+)?$/u.test(header)) return Number(header) * 1000;
  const at = Date.parse(header);
  if (Number.isNaN(at)) return undefined;
  const delta = at - Date.now();
  return delta > 0 ? delta : undefined;
}

/**
 * Create the provider adapter for one role-model route.
 *
 * @param options - route, endpoint, and the HOST's error/adapter classes.
 * @returns the adapter, structurally an `LlmAdapter` of the host's own class.
 */
export function createRoleModelAdapter(options: CreateRoleModelAdapterOptions): RoleModelAdapter {
  const fetchImpl = options.fetch ?? fetch;
  const providerRoute = options.providerRoute;
  const placeholderToken = options.placeholderToken ?? "role-model-local";
  let cachedCatalog: RoleModelCatalog | undefined;

  /** Build an error using the host's class, so the code survives normalization. */
  const failure = (message: string, code: string, errorOptions: HostLlmErrorOptions = {}): Error =>
    new options.LlmErrorClass(message, code, errorOptions);

  /** Discover the runtime, reusing the last successful catalog when it cannot be reached. */
  const catalog = async (): Promise<RoleModelCatalog> => {
    try {
      const result =
        options.discover === undefined
          ? await discoverRoleModelRuntime({
              ...options,
              endpoint: options.endpoint,
              fetch: fetchImpl,
            })
          : await options.discover();
      const discovery = (result as { discovery: Parameters<typeof createRoleModelCatalog>[0] })
        .discovery;
      cachedCatalog = createRoleModelCatalog(discovery, providerRoute);
      return cachedCatalog;
    } catch (error) {
      // A cached catalog keeps the selector group usable through an outage; only a
      // cold failure with no cache is reported as a catalog failure.
      if (cachedCatalog !== undefined) return cachedCatalog;
      const state = (error as { state?: unknown }).state;
      throw failure(
        `role-model runtime is unavailable for route "${providerRoute}": ${error instanceof Error ? error.message : String(error)}`,
        state === "blocked-remote" || state === "remote-untrusted" || state === "invalid-endpoint"
          ? "INVALID_CONFIG"
          : "SERVER",
        { cause: error },
      );
    }
  };

  /** Find one catalog entry by bare or qualified id. */
  const entryFor = (
    catalogValue: RoleModelCatalog,
    model: string,
  ): RoleModelCatalogEntry | undefined => {
    const normalized = normalizeModelId(model);
    return catalogValue.entries.find((entry) => entry.id === normalized || entry.id === model);
  };

  /** The request options the intent injector needs. */
  const intentOptions = (modelIds: ReadonlySet<string>): ApplyRoleModelIntentOptions => ({
    roleModelModelIds: modelIds,
    providerRoutes: new Set([providerRoute]),
  });

  /**
   * The adapter object.
   *
   * Built as a fresh object whose prototype is the HOST's `LlmAdapter.prototype`,
   * so `adapter instanceof HostLlmAdapter` holds. `registerAdapter` validates by
   * shape rather than by class, but keeping the host's prototype chain means any
   * inherited or future class-level behaviour resolves to the host's own copy
   * rather than being absent.
   */
  const adapter: RoleModelAdapter = Object.assign(
    Object.create(options.LlmAdapterBase.prototype) as RoleModelAdapter,
    {
      providerInfo(provider: string) {
        // The route name verbatim and lower-case: this string is what the model
        // selector shows as the group label, so it is never title-cased.
        return { id: provider, name: provider };
      },

      async listModels(provider: string): Promise<readonly AdapterModelInfo[]> {
        if (provider !== providerRoute) {
          throw failure(`role-model adapter does not own provider "${provider}"`, "NO_ADAPTER");
        }
        const value = await catalog();
        return value.entries.map((entry) => ({
          provider: providerRoute,
          id: entry.id,
          name: entry.name,
          ...(entry.reasoning === undefined
            ? {}
            : { description: entry.reasoning.efforts.map((effort) => effort.id).join("/") }),
          inputModalities: entry.inputModalities,
        }));
      },

      async resolveModel(provider: string, model: string): Promise<AdapterResolvedModel> {
        if (provider !== providerRoute) {
          throw failure(`role-model adapter does not own provider "${provider}"`, "NO_ADAPTER");
        }
        const value = await catalog();
        const entry = entryFor(value, model);
        if (entry === undefined) {
          throw failure(
            `role-model route "${providerRoute}" does not describe model "${model}"`,
            "UNKNOWN_MODEL",
          );
        }
        return {
          // DSH requires the resolved identity to echo the request exactly.
          provider: providerRoute,
          id: model,
          name: entry.name,
          inputModalities: entry.inputModalities,
          context: { contextWindow: entry.contextWindow },
          defaultMaxTokens: entry.maxTokens,
          ...(entry.reasoning === undefined ? {} : { reasoning: entry.reasoning }),
        };
      },

      async *stream(request: AdapterGenerateOptions): AsyncIterable<unknown> {
        const provider = request.provider ?? providerRoute;
        if (provider !== providerRoute) {
          throw failure(`role-model adapter does not own provider "${provider}"`, "NO_ADAPTER");
        }
        const signal = request.signal;
        // Honour cancellation before any work: discovery is a network call too, and
        // an already-aborted request must not perform one.
        if (signal?.aborted === true) {
          throw failure("role-model request aborted", "ABORTED", { cause: signal.reason });
        }

        const value = await catalog();
        const modelId = request.model ?? value.recommendedModel ?? value.entries[0]?.id;
        if (modelId === undefined) {
          throw failure(
            `role-model route "${providerRoute}" advertises no models`,
            "INVALID_CONFIG",
          );
        }
        const entry = entryFor(value, modelId);
        if (entry === undefined) {
          throw failure(
            `role-model route "${providerRoute}" does not describe model "${modelId}"`,
            "UNKNOWN_MODEL",
          );
        }

        // Attach intent metadata unless this is an auxiliary call or the request
        // already carries it; the injector returns the input untouched in those cases.
        const withIntent = await applyRoleModelIntent(
          {
            provider,
            model: modelId,
            messages: request.messages,
            tools: request.tools,
            ...(request.purpose === undefined ? {} : { purpose: request.purpose }),
          },
          intentOptions(new Set(value.entries.map((candidate) => candidate.id))),
        );

        const body = buildChatBody({
          model: modelId,
          messages: (request.messages ?? []) as never,
          ...(request.system === undefined ? {} : { system: request.system }),
          ...(request.tools === undefined ? {} : { tools: request.tools as never }),
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { maxTokens: request.maxTokens }),
          ...(request.stop === undefined ? {} : { stop: request.stop }),
          ...(request.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: request.reasoningEffort }),
          ...(options.resolveImage === undefined ? {} : { resolveImage: options.resolveImage }),
        });
        const roleModel = (withIntent.request as { role_model?: unknown }).role_model;
        const payload = roleModel === undefined ? body : { ...body, role_model: roleModel };

        let response: Response;
        try {
          response = await fetchImpl(`${value.baseUrl}/chat/completions`, {
            method: "POST",
            signal,
            redirect: "error",
            headers: {
              "content-type": "application/json",
              accept: "text/event-stream",
              authorization: `Bearer ${value.apiKey === "" ? placeholderToken : value.apiKey}`,
            },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          // Read the flag through a widened boolean. The pre-flight guard narrows
          // `aborted` to `false` here, so comparing it to `true` is statically dead
          // and TypeScript rejects the comparison, while the linter requires an
          // optional chain — hoisting the value satisfies both without suppressing
          // either rule.
          const aborted: boolean = signal?.aborted ?? false;
          if (aborted) {
            throw failure("role-model request aborted", "ABORTED", { cause: error });
          }
          throw failure(
            `role-model transport failed: ${error instanceof Error ? error.message : String(error)}`,
            "TRANSPORT",
            { cause: error },
          );
        }

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const detail = errorDetail(text);
          const code = codeForStatus(response.status, detail);
          const delay = retryAfterMs(response.headers.get("retry-after"));
          throw failure(`role-model request failed (${String(response.status)}): ${detail}`, code, {
            status: response.status,
            ...(delay === undefined ? {} : { providerRetryAfterMs: delay }),
          });
        }

        // Surface the runtime's own request identity, which is what a routing
        // decision read-back is keyed by.
        options.onRequestRouted?.({
          ...(response.headers.get("x-role-model-request-id") === null
            ? {}
            : { requestId: response.headers.get("x-role-model-request-id") ?? undefined }),
          ...(response.headers.get("x-role-model-routing-decision-id") === null
            ? {}
            : {
                routingDecisionId:
                  response.headers.get("x-role-model-routing-decision-id") ?? undefined,
              }),
          ...(response.headers.get("x-role-model-endpoint-id") === null
            ? {}
            : { endpointId: response.headers.get("x-role-model-endpoint-id") ?? undefined }),
        });

        if (response.body === null) {
          throw failure("role-model returned no response body", "EMPTY_RESPONSE");
        }
        try {
          yield* streamChunksFromOpenAiSse(response.body as unknown as AsyncIterable<Uint8Array>);
        } catch (error) {
          // The translator is total, so a throw here is transport-level: an abort
          // reads as ABORTED, anything else as a transport failure. The flag is read
          // through a widened boolean for the same reason as above.
          const aborted: boolean = signal?.aborted ?? false;
          if (aborted) {
            throw failure("role-model request aborted", "ABORTED", { cause: error });
          }
          throw failure(
            `role-model stream failed: ${error instanceof Error ? error.message : String(error)}`,
            "TRANSPORT",
            { cause: error },
          );
        }
      },
    },
  );

  return adapter;
}
