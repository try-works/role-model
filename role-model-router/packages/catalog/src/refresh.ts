import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CatalogSnapshot,
  CatalogSnapshotModel,
  CatalogSnapshotProvider,
  PricingProvenance,
  ReasoningOption,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MODELS_DEV_API_URL = "https://models.dev/api.json";
const DEFAULT_MODELS_DEV_COMMIT_URL =
  "https://api.github.com/repos/anomalyco/models.dev/commits/dev";

export interface ModelsDevApiReasoningOption {
  readonly type: string;
  readonly values?: readonly string[];
  readonly [key: string]: unknown;
}

export interface ModelsDevApiModel {
  readonly id: string;
  readonly name?: string;
  readonly tool_call?: boolean;
  readonly reasoning?: boolean;
  readonly structured_output?: boolean;
  readonly modalities?: {
    readonly input?: readonly string[];
    readonly output?: readonly string[];
  };
  readonly limit?: {
    readonly context?: number;
    readonly output?: number;
  };
  readonly cost?: Readonly<Record<string, unknown>>;
  readonly reasoning_options?: readonly ModelsDevApiReasoningOption[];
  readonly release_date?: string;
  readonly last_updated?: string;
}

export interface ModelsDevApiProvider {
  readonly id?: string;
  readonly env?: readonly string[];
  readonly npm?: string;
  readonly api?: string;
  readonly name?: string;
  readonly doc?: string;
  readonly models?: Readonly<Record<string, ModelsDevApiModel>>;
}

export type ModelsDevApiCatalog = Readonly<Record<string, ModelsDevApiProvider>>;

interface ModelsDevCommitResponse {
  readonly sha: string;
}

export interface ModelsDevFirstPartySource {
  readonly providerId: string;
  readonly providerName: string;
  readonly commit: string;
  readonly capturedAt: string;
  readonly providerPath: string;
  readonly providerSha256: string;
  readonly modelSources: Readonly<
    Record<
      string,
      {
        readonly path: string;
        readonly sha256: string;
      }
    >
  >;
}

const DEEPSEEK_FIRST_PARTY_SOURCE_PATHS = {
  provider: "providers/deepseek/provider.toml",
  flash: "providers/deepseek/models/deepseek-v4-flash.toml",
  pro: "providers/deepseek/models/deepseek-v4-pro.toml",
} as const;

export interface CaptureModelsDevFirstPartySourceOptions {
  readonly commit: string;
  readonly capturedAt: string;
  readonly fetchImpl?: typeof fetch;
  readonly rawBaseUrl?: string;
}

/**
 * Capture the exact first-party DeepSeek source files at one immutable commit.
 * A missing file is an intentional hard failure; relay/provider rows are never
 * substituted for this source of truth.
 */
export async function captureModelsDevFirstPartySource(
  options: CaptureModelsDevFirstPartySourceOptions,
): Promise<ModelsDevFirstPartySource> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const rawBaseUrl = (
    options.rawBaseUrl ?? "https://raw.githubusercontent.com/anomalyco/models.dev"
  ).replace(/\/+$/u, "");
  const paths = [
    DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.provider,
    DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.flash,
    DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.pro,
  ] as const;
  const hashes: string[] = [];
  for (const sourcePath of paths) {
    const response = await fetchImpl(`${rawBaseUrl}/${options.commit}/${sourcePath}`);
    if (!response.ok) {
      throw new Error(
        `Missing first-party models.dev source ${sourcePath} at ${options.commit}: ${response.status}`,
      );
    }
    const body = await response.text();
    hashes.push(createHash("sha256").update(body, "utf8").digest("hex"));
  }
  return {
    providerId: "deepseek",
    providerName: "DeepSeek",
    commit: options.commit,
    capturedAt: options.capturedAt,
    providerPath: DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.provider,
    providerSha256: hashes[0] as string,
    modelSources: {
      "deepseek-v4-flash": {
        path: DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.flash,
        sha256: hashes[1] as string,
      },
      "deepseek-v4-pro": {
        path: DEEPSEEK_FIRST_PARTY_SOURCE_PATHS.pro,
        sha256: hashes[2] as string,
      },
    },
  };
}

interface LocalCatalogSupplement {
  readonly providers?: readonly CatalogSnapshotProvider[];
  readonly models?: readonly CatalogSnapshotModel[];
}

export interface RunCatalogRefreshCliOptions {
  readonly repoRoot?: string;
  readonly snapshotPath?: string;
  readonly supplementPath?: string;
  readonly apiUrl?: string;
  readonly commitUrl?: string;
  readonly capturedAt?: string;
  readonly fetchImpl?: typeof fetch;
  /** First-party source receipt captured at the same immutable models.dev commit. */
  readonly firstPartySource?: ModelsDevFirstPartySource;
}

export interface RunCatalogRefreshCliResult {
  readonly snapshotPath: string;
  readonly providerCount: number;
  readonly modelCount: number;
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort((left, right) => left.localeCompare(right));
}

function normalizeCostDimensionKey(key: string): string {
  return key.replace(/_([a-z0-9])/gu, (_match, character: string) => character.toUpperCase());
}

function normalizeCostDimensions(cost: Readonly<Record<string, unknown>> | undefined):
  | {
      readonly dimensions: Readonly<Record<string, number>>;
      readonly metadata: Readonly<Record<string, unknown>>;
    }
  | undefined {
  if (!cost) {
    return undefined;
  }

  const normalized: Record<string, number> = {};
  const metadata: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(cost)) {
    if (rawValue === undefined) {
      continue;
    }
    if (typeof rawValue !== "number") {
      if (["input", "output", "reasoning", "cache_read", "cache_write"].includes(rawKey)) {
        throw new Error(`Invalid models.dev cost dimension ${rawKey}`);
      }
      metadata[normalizeCostDimensionKey(rawKey)] = rawValue;
      continue;
    }
    if (!Number.isFinite(rawValue) || rawValue < 0) {
      throw new Error(`Invalid models.dev cost dimension ${rawKey}`);
    }
    const key = normalizeCostDimensionKey(rawKey);
    if (key in normalized) {
      throw new Error(`Cost dimension normalization collision for ${rawKey}`);
    }
    normalized[key] = rawValue;
  }
  return { dimensions: normalized, metadata };
}

function normalizeReasoningOptions(
  options: readonly ModelsDevApiReasoningOption[] | undefined,
): ReasoningOption[] | undefined {
  if (!options) {
    return undefined;
  }
  return options.map((option) => ({
    ...option,
    type: option.type,
    ...(option.values ? { values: [...option.values] } : {}),
  }));
}

function trimTrailingSlash(value: string | undefined): string {
  return (value ?? "").replace(/\/+$/u, "");
}

function inferAdapterFamilyHint(npmPackage: string): string {
  if (!npmPackage.startsWith("@ai-sdk/")) {
    return "ai-sdk-openai-compatible";
  }

  return `ai-sdk-${npmPackage.slice("@ai-sdk/".length).replace(/\//gu, "-")}`;
}

export function deriveCapabilities(model: ModelsDevApiModel): string[] {
  const capabilities: string[] = [];
  const outputModalities = new Set(model.modalities?.output ?? []);

  if (outputModalities.has("text")) {
    capabilities.push("text.chat");
  }
  if (model.tool_call) {
    capabilities.push("tools.function_calling");
  }
  if (model.reasoning) {
    capabilities.push("reasoning");
  }
  if (model.structured_output) {
    capabilities.push("structured.output");
  }

  return capabilities;
}

function toCatalogSnapshotProvider(
  providerId: string,
  provider: ModelsDevApiProvider,
): CatalogSnapshotProvider {
  const npmPackage = provider.npm ?? "@ai-sdk/openai-compatible";

  return {
    providerId,
    displayName: provider.name ?? providerId,
    npmPackage,
    apiBase: trimTrailingSlash(provider.api),
    docsUrl: provider.doc ?? undefined,
    envVars: unique(provider.env),
    adapterFamilyHint: inferAdapterFamilyHint(npmPackage),
  };
}

function toCatalogSnapshotModel(
  providerId: string,
  model: ModelsDevApiModel,
  firstPartySource?: ModelsDevFirstPartySource,
): CatalogSnapshotModel {
  const normalizedCost = normalizeCostDimensions(model.cost);
  const costDimensionsPer1M = normalizedCost?.dimensions;
  const costMetadata = normalizedCost?.metadata;
  const hasAdditionalCostDimensions = Object.keys(model.cost ?? {}).some(
    (key) => key !== "input" && key !== "output",
  );
  const isFirstPartyDeepSeek =
    providerId === "deepseek" &&
    (model.id === "deepseek-v4-flash" || model.id === "deepseek-v4-pro");
  const firstPartyModelSource = firstPartySource?.modelSources[model.id];
  const provenance: PricingProvenance | undefined =
    isFirstPartyDeepSeek && firstPartySource && firstPartyModelSource
      ? {
          vendor: "models.dev",
          commit: firstPartySource.commit,
          sourcePaths: [firstPartySource.providerPath, firstPartyModelSource.path],
          sourceHashes: [firstPartySource.providerSha256, firstPartyModelSource.sha256],
          capturedAt: firstPartySource.capturedAt,
          unit: "USD per 1M tokens",
          currency: "USD",
        }
      : undefined;

  return {
    modelId: `${providerId}/${model.id}`,
    providerId,
    displayName: model.name ?? model.id,
    version: model.release_date ?? model.last_updated ?? "unversioned",
    capabilities: deriveCapabilities(model),
    modalities: unique([...(model.modalities?.input ?? []), ...(model.modalities?.output ?? [])]),
    contextWindow: model.limit?.context ?? 0,
    maxOutputTokens: model.limit?.output ?? 0,
    pricing:
      typeof model.cost?.input === "number" && typeof model.cost?.output === "number"
        ? {
            inputPer1M: model.cost.input,
            outputPer1M: model.cost.output,
            currency: "USD",
            ...(hasAdditionalCostDimensions && costDimensionsPer1M ? { costDimensionsPer1M } : {}),
            ...(costMetadata && Object.keys(costMetadata).length > 0 ? { costMetadata } : {}),
            ...(hasAdditionalCostDimensions ? { costUnit: "USD per 1M tokens" } : {}),
            ...(provenance ? { provenance } : {}),
          }
        : undefined,
    reasoningOptions: normalizeReasoningOptions(model.reasoning_options),
  };
}

export function buildCatalogSnapshotFromModelsDev(
  apiCatalog: ModelsDevApiCatalog,
  commit: string,
  capturedAt: string,
  firstPartySource?: ModelsDevFirstPartySource,
): CatalogSnapshot {
  const directDeepSeekRows = Object.entries(apiCatalog).flatMap(([providerId, provider]) =>
    Object.values(provider.models ?? {}).filter(
      (model) =>
        (provider.id ?? providerId) === "deepseek" &&
        (model.id === "deepseek-v4-flash" || model.id === "deepseek-v4-pro"),
    ),
  );
  if (directDeepSeekRows.length > 0) {
    if (!firstPartySource || firstPartySource.commit !== commit) {
      throw new Error(
        "First-party models.dev DeepSeek V4 source receipt is required at the snapshot commit",
      );
    }
    for (const model of directDeepSeekRows) {
      if (!firstPartySource.modelSources[model.id]) {
        throw new Error(`Missing first-party source receipt for deepseek/${model.id}`);
      }
    }
  }

  const providers = Object.entries(apiCatalog)
    .map(([providerId, provider]) => toCatalogSnapshotProvider(provider.id ?? providerId, provider))
    .sort((left, right) => left.providerId.localeCompare(right.providerId));

  const models = Object.entries(apiCatalog)
    .flatMap(([providerId, provider]) =>
      Object.values(provider.models ?? {}).map((model) =>
        toCatalogSnapshotModel(provider.id ?? providerId, model, firstPartySource),
      ),
    )
    .sort((left, right) => left.modelId.localeCompare(right.modelId));

  return {
    source: {
      vendor: "models.dev",
      commit,
      capturedAt,
      schemaVersion: "models.dev.v1",
    },
    providers,
    models,
  };
}

async function readJsonFileIfPresent<T>(filePath: string): Promise<T | null> {
  try {
    await access(filePath);
  } catch {
    return null;
  }

  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function mergeSupplementProvider(
  liveProvider: CatalogSnapshotProvider | undefined,
  supplementProvider: CatalogSnapshotProvider,
): CatalogSnapshotProvider {
  if (!liveProvider) {
    return supplementProvider;
  }

  return {
    providerId: liveProvider.providerId,
    displayName: liveProvider.displayName || supplementProvider.displayName,
    npmPackage: liveProvider.npmPackage || supplementProvider.npmPackage,
    apiBase: liveProvider.apiBase || supplementProvider.apiBase,
    docsUrl: liveProvider.docsUrl ?? supplementProvider.docsUrl,
    envVars: unique([...(liveProvider.envVars ?? []), ...(supplementProvider.envVars ?? [])]),
    adapterFamilyHint: liveProvider.adapterFamilyHint || supplementProvider.adapterFamilyHint,
  };
}

function mergeSupplementModel(
  liveModel: CatalogSnapshotModel | undefined,
  supplementModel: CatalogSnapshotModel,
): CatalogSnapshotModel {
  if (!liveModel) {
    return supplementModel;
  }

  return {
    modelId: liveModel.modelId,
    providerId: liveModel.providerId,
    displayName: supplementModel.displayName || liveModel.displayName,
    version: supplementModel.version ?? liveModel.version,
    extends: supplementModel.extends ?? liveModel.extends,
    capabilities: unique([
      ...(liveModel.capabilities ?? []),
      ...(supplementModel.capabilities ?? []),
    ]),
    modalities: unique([...(liveModel.modalities ?? []), ...(supplementModel.modalities ?? [])]),
    contextWindow: liveModel.contextWindow || supplementModel.contextWindow,
    maxOutputTokens: liveModel.maxOutputTokens || supplementModel.maxOutputTokens,
    pricing: liveModel.pricing ?? supplementModel.pricing,
    requestShapeHints: supplementModel.requestShapeHints ?? liveModel.requestShapeHints,
    experimentalModes: supplementModel.experimentalModes ?? liveModel.experimentalModes,
    reasoningOptions: supplementModel.reasoningOptions ?? liveModel.reasoningOptions,
  };
}

function mergeCatalogSnapshotWithSupplement(
  snapshot: CatalogSnapshot,
  supplement: LocalCatalogSupplement | null,
): CatalogSnapshot {
  if (!supplement) {
    return snapshot;
  }

  const providersById = new Map(
    snapshot.providers.map((provider) => [provider.providerId, provider]),
  );
  for (const provider of supplement.providers ?? []) {
    providersById.set(
      provider.providerId,
      mergeSupplementProvider(providersById.get(provider.providerId), provider),
    );
  }

  const modelsById = new Map(snapshot.models.map((model) => [model.modelId, model]));
  for (const model of supplement.models ?? []) {
    modelsById.set(model.modelId, mergeSupplementModel(modelsById.get(model.modelId), model));
  }

  return {
    ...snapshot,
    providers: [...providersById.values()].sort((left, right) =>
      left.providerId.localeCompare(right.providerId),
    ),
    models: [...modelsById.values()].sort((left, right) =>
      left.modelId.localeCompare(right.modelId),
    ),
  };
}

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function runCatalogRefreshCli(
  options: RunCatalogRefreshCliOptions = {},
): Promise<RunCatalogRefreshCliResult> {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, "..", "..", "..", "..");
  const snapshotPath =
    options.snapshotPath ?? path.join(repoRoot, "testdata", "catalog", "models-dev-snapshot.json");
  const supplementPath =
    options.supplementPath ??
    path.join(repoRoot, "testdata", "catalog", "models-dev-local-supplement.json");
  const fetchImpl = options.fetchImpl ?? fetch;
  const capturedAt = options.capturedAt ?? new Date().toISOString();
  const apiUrl = options.apiUrl ?? DEFAULT_MODELS_DEV_API_URL;
  const commitUrl = options.commitUrl ?? DEFAULT_MODELS_DEV_COMMIT_URL;

  const [apiCatalog, commitResponse] = await Promise.all([
    fetchJson<ModelsDevApiCatalog>(apiUrl, fetchImpl),
    fetchJson<ModelsDevCommitResponse>(commitUrl, fetchImpl),
  ]);

  const includesDirectDeepSeekV4 = Object.entries(apiCatalog).some(([providerId, provider]) => {
    const resolvedProviderId = provider.id ?? providerId;
    return (
      resolvedProviderId === "deepseek" &&
      Object.values(provider.models ?? {}).some(
        (model) => model.id === "deepseek-v4-flash" || model.id === "deepseek-v4-pro",
      )
    );
  });
  const firstPartySource =
    options.firstPartySource ??
    (includesDirectDeepSeekV4
      ? await captureModelsDevFirstPartySource({
          commit: commitResponse.sha,
          capturedAt,
          fetchImpl,
        })
      : undefined);

  const liveSnapshot = buildCatalogSnapshotFromModelsDev(
    apiCatalog,
    commitResponse.sha,
    capturedAt,
    firstPartySource,
  );
  const supplement = await readJsonFileIfPresent<LocalCatalogSupplement>(supplementPath);
  const snapshot = mergeCatalogSnapshotWithSupplement(liveSnapshot, supplement);

  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  return {
    snapshotPath,
    providerCount: snapshot.providers.length,
    modelCount: snapshot.models.length,
  };
}

if (process.argv[1] === __filename) {
  const result = await runCatalogRefreshCli();
  console.log(result.snapshotPath);
  console.log(`${result.providerCount} providers`);
  console.log(`${result.modelCount} models`);
}
