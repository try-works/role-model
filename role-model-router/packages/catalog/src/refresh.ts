import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogSnapshot, CatalogSnapshotModel, CatalogSnapshotProvider } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MODELS_DEV_API_URL = "https://models.dev/api.json";
const DEFAULT_MODELS_DEV_COMMIT_URL =
  "https://api.github.com/repos/anomalyco/models.dev/commits/dev";

interface ModelsDevApiModel {
  readonly id: string;
  readonly name?: string;
  readonly tool_call?: boolean;
  readonly reasoning?: boolean;
  readonly modalities?: {
    readonly input?: readonly string[];
    readonly output?: readonly string[];
  };
  readonly limit?: {
    readonly context?: number;
    readonly output?: number;
  };
  readonly cost?: {
    readonly input?: number;
    readonly output?: number;
  };
  readonly release_date?: string;
  readonly last_updated?: string;
}

interface ModelsDevApiProvider {
  readonly id?: string;
  readonly env?: readonly string[];
  readonly npm?: string;
  readonly api?: string;
  readonly name?: string;
  readonly doc?: string;
  readonly models?: Readonly<Record<string, ModelsDevApiModel>>;
}

type ModelsDevApiCatalog = Readonly<Record<string, ModelsDevApiProvider>>;

interface ModelsDevCommitResponse {
  readonly sha: string;
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
}

export interface RunCatalogRefreshCliResult {
  readonly snapshotPath: string;
  readonly providerCount: number;
  readonly modelCount: number;
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort((left, right) => left.localeCompare(right));
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

function deriveCapabilities(model: ModelsDevApiModel): string[] {
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
): CatalogSnapshotModel {
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
          }
        : undefined,
  };
}

function buildCatalogSnapshotFromModelsDev(
  apiCatalog: ModelsDevApiCatalog,
  commit: string,
  capturedAt: string,
): CatalogSnapshot {
  const providers = Object.entries(apiCatalog)
    .map(([providerId, provider]) => toCatalogSnapshotProvider(provider.id ?? providerId, provider))
    .sort((left, right) => left.providerId.localeCompare(right.providerId));

  const models = Object.entries(apiCatalog)
    .flatMap(([providerId, provider]) =>
      Object.values(provider.models ?? {}).map((model) =>
        toCatalogSnapshotModel(provider.id ?? providerId, model),
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

  const liveSnapshot = buildCatalogSnapshotFromModelsDev(
    apiCatalog,
    commitResponse.sha,
    capturedAt,
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
