export interface CatalogSnapshotSource {
  readonly vendor: string;
  readonly commit: string;
  readonly capturedAt: string;
  readonly schemaVersion: string;
}

export interface CatalogSnapshotProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly npmPackage: string;
  readonly apiBase: string;
  readonly docsUrl?: string;
  readonly envVars: readonly string[];
  readonly adapterFamilyHint: string;
}

export interface ExperimentalMode {
  readonly modeId: string;
  readonly label: string;
}

export interface ReasoningOption {
  readonly type: string;
  readonly values?: readonly string[];
  readonly [key: string]: unknown;
}

export type ReasoningOptionKind = "effort" | "toggle" | "budget_tokens" | (string & {});

export interface PricingProvenance {
  readonly vendor: string;
  readonly commit: string;
  readonly sourcePaths: readonly string[];
  readonly sourceHashes: readonly string[];
  readonly capturedAt: string;
  readonly unit?: string;
  readonly currency?: string;
}

export interface PricingHints {
  readonly inputPer1M: number;
  readonly outputPer1M: number;
  readonly currency: string;
  /**
   * Complete provider cost dimensions expressed per one million provider units.
   * Keys are normalized from models.dev's wire names (for example
   * `cache_read` becomes `cacheRead`), while unknown future keys are retained.
   */
  readonly costDimensionsPer1M?: Readonly<Record<string, number>>;
  /** Structured or provider-specific future cost data retained losslessly. */
  readonly costMetadata?: Readonly<Record<string, unknown>>;
  readonly costUnit?: string;
  readonly provenance?: PricingProvenance;
}

export interface RequestShapeHints {
  readonly providerShape: string;
  readonly bodyKeys: readonly string[];
  readonly headerKeys: readonly string[];
}

export interface CatalogSnapshotModel {
  readonly modelId: string;
  readonly providerId: string;
  readonly displayName: string;
  readonly version?: string;
  readonly extends?: string;
  readonly capabilities?: readonly string[];
  readonly modalities?: readonly string[];
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly pricing?: PricingHints;
  readonly requestShapeHints?: RequestShapeHints;
  readonly experimentalModes?: readonly ExperimentalMode[];
  readonly reasoningOptions?: readonly ReasoningOption[];
}

export interface CatalogSnapshot {
  readonly source: CatalogSnapshotSource;
  readonly providers: readonly CatalogSnapshotProvider[];
  readonly models: readonly CatalogSnapshotModel[];
}

export interface ProviderOverride {
  readonly providerKind?: string;
  readonly authFamily?: string;
  readonly adapterFamily?: string;
  readonly supportedAuthModes?: readonly string[];
  readonly controlPlaneRequirements?: readonly string[];
}

export interface ModelOverride {
  readonly capabilities?: readonly string[];
  readonly localNotes?: readonly string[];
}

export interface LocalCatalogOverrides {
  readonly providers?: Readonly<Record<string, ProviderOverride>>;
  readonly models?: Readonly<Record<string, ModelOverride>>;
}

export interface VendorVersionLedgerEntry {
  readonly vendor: string;
  readonly role: "catalog-source";
  readonly commit: string;
  readonly capturedAt: string;
  readonly schemaVersion: string;
}

export interface VendorVersionLedger {
  readonly ledgerVersion: "1";
  readonly vendors: readonly VendorVersionLedgerEntry[];
}

export interface NormalizedCatalogProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly npmPackage: string;
  readonly providerKind: string;
  readonly authFamily: string;
  readonly adapterFamily: string;
  readonly apiBase: string;
  readonly docsUrl: string | null;
  readonly envVars: readonly string[];
  readonly supportedAuthModes: readonly string[];
  readonly controlPlaneRequirements: readonly string[];
  readonly localOverrideApplied: boolean;
  readonly upstreamProvenance: CatalogSnapshotSource;
}

export interface ExtendsProvenance {
  readonly baseModelId: string | null;
  readonly chain: readonly string[];
}

export interface NormalizedCatalogModel {
  readonly modelId: string;
  readonly providerId: string;
  readonly providerKind: string;
  readonly authFamily: string;
  readonly displayName: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly pricing: PricingHints | null;
  readonly requestShapeHints: RequestShapeHints | null;
  readonly experimentalModes: readonly ExperimentalMode[];
  readonly reasoningEffortLevels: readonly string[];
  readonly reasoningOptionKinds: readonly ReasoningOptionKind[];
  readonly extendsProvenance: ExtendsProvenance;
  readonly localOverrideApplied: boolean;
  readonly localNotes: readonly string[];
  readonly upstreamProvenance: CatalogSnapshotSource;
}

export interface NormalizedCatalog {
  readonly catalogVersion: "1";
  readonly source: CatalogSnapshotSource;
  readonly providers: readonly NormalizedCatalogProvider[];
  readonly models: readonly NormalizedCatalogModel[];
}

export interface SerializedNormalizedCatalogV2 {
  readonly catalogVersion: "2";
  readonly source: CatalogSnapshotSource;
  readonly providers: readonly (Omit<
    NormalizedCatalogProvider,
    | "upstreamProvenance"
    | "localOverrideApplied"
    | "supportedAuthModes"
    | "controlPlaneRequirements"
  > & {
    readonly upstreamProvenance?: CatalogSnapshotSource;
    readonly localOverrideApplied?: true;
    readonly supportedAuthModes?: readonly string[];
    readonly controlPlaneRequirements?: readonly string[];
  })[];
  readonly models: readonly (Omit<
    NormalizedCatalogModel,
    | "upstreamProvenance"
    | "localOverrideApplied"
    | "requestShapeHints"
    | "experimentalModes"
    | "reasoningEffortLevels"
    | "reasoningOptionKinds"
    | "extendsProvenance"
    | "localNotes"
  > & {
    readonly upstreamProvenance?: CatalogSnapshotSource;
    readonly localOverrideApplied?: true;
    readonly requestShapeHints?: RequestShapeHints;
    readonly experimentalModes?: readonly ExperimentalMode[];
    readonly reasoningEffortLevels?: readonly string[];
    readonly reasoningOptionKinds?: readonly ReasoningOptionKind[];
    readonly extendsProvenance?: ExtendsProvenance;
    readonly localNotes?: readonly string[];
  })[];
}

export interface ExportCatalogArtifactsOptions {
  readonly snapshotPath: string;
  readonly overridesPath: string;
  readonly outputDir: string;
}

export interface ExportCatalogArtifactsResult {
  readonly normalizedCatalogPath: string;
  readonly vendorLedgerPath: string;
}

interface ResolvedModelDefinition {
  readonly model: CatalogSnapshotModel;
  readonly chain: readonly string[];
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])];
}

function deriveReasoningEffortLevels(options: readonly ReasoningOption[] | undefined): string[] {
  const levels: string[] = [];
  for (const option of options ?? []) {
    if (option.type !== "effort") {
      continue;
    }
    for (const value of option.values ?? []) {
      if (typeof value === "string" && value.length > 0 && !levels.includes(value)) {
        levels.push(value);
      }
    }
  }
  return levels;
}

function deriveReasoningOptionKinds(
  options: readonly ReasoningOption[] | undefined,
): ReasoningOptionKind[] {
  return unique((options ?? []).map((option) => option.type)) as ReasoningOptionKind[];
}

function normalizePricing(pricing: PricingHints | undefined): PricingHints | undefined {
  if (!pricing) {
    return undefined;
  }

  const dimensions = pricing.costDimensionsPer1M
    ? Object.fromEntries(
        Object.entries(pricing.costDimensionsPer1M).map(([key, value]) => {
          ensure(Number.isFinite(value) && value >= 0, `Invalid pricing dimension ${key}`);
          return [key, value];
        }),
      )
    : undefined;

  for (const [key, value] of [
    ["inputPer1M", pricing.inputPer1M],
    ["outputPer1M", pricing.outputPer1M],
  ] as const) {
    ensure(Number.isFinite(value) && value >= 0, `Invalid pricing value ${key}`);
  }

  return {
    inputPer1M: pricing.inputPer1M,
    outputPer1M: pricing.outputPer1M,
    currency: pricing.currency,
    ...(dimensions ? { costDimensionsPer1M: dimensions } : {}),
    ...(pricing.costMetadata ? { costMetadata: pricing.costMetadata } : {}),
    ...(pricing.costUnit ? { costUnit: pricing.costUnit } : {}),
    ...(pricing.provenance ? { provenance: pricing.provenance } : {}),
  };
}

function hasSameSource(left: CatalogSnapshotSource, right: CatalogSnapshotSource): boolean {
  return (
    left.vendor === right.vendor &&
    left.commit === right.commit &&
    left.capturedAt === right.capturedAt &&
    left.schemaVersion === right.schemaVersion
  );
}

export function serializeNormalizedCatalog(
  catalog: NormalizedCatalog,
): SerializedNormalizedCatalogV2 {
  return {
    catalogVersion: "2",
    source: catalog.source,
    providers: catalog.providers.map((provider) => {
      const {
        upstreamProvenance,
        localOverrideApplied,
        supportedAuthModes,
        controlPlaneRequirements,
        ...required
      } = provider;
      return {
        ...required,
        ...(!hasSameSource(upstreamProvenance, catalog.source) ? { upstreamProvenance } : {}),
        ...(localOverrideApplied ? { localOverrideApplied: true as const } : {}),
        ...(supportedAuthModes.length > 0 ? { supportedAuthModes } : {}),
        ...(controlPlaneRequirements.length > 0 ? { controlPlaneRequirements } : {}),
      };
    }),
    models: catalog.models.map((model) => {
      const {
        upstreamProvenance,
        localOverrideApplied,
        requestShapeHints,
        experimentalModes,
        reasoningEffortLevels,
        reasoningOptionKinds,
        extendsProvenance,
        localNotes,
        ...required
      } = model;
      return {
        ...required,
        ...(!hasSameSource(upstreamProvenance, catalog.source) ? { upstreamProvenance } : {}),
        ...(localOverrideApplied ? { localOverrideApplied: true as const } : {}),
        ...(requestShapeHints ? { requestShapeHints } : {}),
        ...(experimentalModes?.length > 0 ? { experimentalModes } : {}),
        ...(reasoningEffortLevels?.length ? { reasoningEffortLevels } : {}),
        ...(reasoningOptionKinds?.length ? { reasoningOptionKinds } : {}),
        ...(extendsProvenance.baseModelId !== null || extendsProvenance.chain.length > 0
          ? { extendsProvenance }
          : {}),
        ...(localNotes.length > 0 ? { localNotes } : {}),
      };
    }),
  };
}

export function hydrateNormalizedCatalog(value: unknown): NormalizedCatalog {
  ensure(typeof value === "object" && value !== null, "Normalized catalog must be an object");
  const wire = value as {
    readonly catalogVersion?: unknown;
    readonly source?: CatalogSnapshotSource;
    readonly providers?: readonly Record<string, unknown>[];
    readonly models?: readonly Record<string, unknown>[];
  };
  if (wire.catalogVersion === "1") {
    ensure(wire.source, "Normalized catalog source is required");
    ensure(Array.isArray(wire.providers), "Normalized catalog providers are required");
    ensure(Array.isArray(wire.models), "Normalized catalog models are required");
    const source = wire.source;
    return {
      catalogVersion: "1",
      source,
      providers: wire.providers.map((provider) => ({
        ...provider,
        supportedAuthModes: provider.supportedAuthModes ?? [],
        controlPlaneRequirements: provider.controlPlaneRequirements ?? [],
        localOverrideApplied: provider.localOverrideApplied ?? false,
        upstreamProvenance: provider.upstreamProvenance ?? source,
      })) as unknown as readonly NormalizedCatalogProvider[],
      models: wire.models.map((model) => ({
        ...model,
        pricing: normalizePricing(model.pricing as PricingHints | undefined) ?? null,
        requestShapeHints: model.requestShapeHints ?? null,
        experimentalModes: model.experimentalModes ?? [],
        reasoningEffortLevels: model.reasoningEffortLevels ?? [],
        reasoningOptionKinds: model.reasoningOptionKinds ?? [],
        extendsProvenance: model.extendsProvenance ?? { baseModelId: null, chain: [] },
        localOverrideApplied: model.localOverrideApplied ?? false,
        localNotes: model.localNotes ?? [],
        upstreamProvenance: model.upstreamProvenance ?? source,
      })) as unknown as readonly NormalizedCatalogModel[],
    };
  }
  ensure(wire.catalogVersion === "2", "Unsupported normalized catalog version");
  ensure(wire.source, "Normalized catalog source is required");
  ensure(Array.isArray(wire.providers), "Normalized catalog providers are required");
  ensure(Array.isArray(wire.models), "Normalized catalog models are required");
  const source = wire.source;
  return {
    catalogVersion: "1",
    source,
    providers: wire.providers.map((provider) => ({
      ...provider,
      supportedAuthModes: provider.supportedAuthModes ?? [],
      controlPlaneRequirements: provider.controlPlaneRequirements ?? [],
      localOverrideApplied: provider.localOverrideApplied ?? false,
      upstreamProvenance: provider.upstreamProvenance ?? source,
    })) as unknown as readonly NormalizedCatalogProvider[],
    models: wire.models.map((model) => ({
      ...model,
      pricing: normalizePricing(model.pricing as PricingHints | undefined) ?? null,
      requestShapeHints: model.requestShapeHints ?? null,
      experimentalModes: model.experimentalModes ?? [],
      reasoningEffortLevels: model.reasoningEffortLevels ?? [],
      reasoningOptionKinds: model.reasoningOptionKinds ?? [],
      extendsProvenance: model.extendsProvenance ?? { baseModelId: null, chain: [] },
      localOverrideApplied: model.localOverrideApplied ?? false,
      localNotes: model.localNotes ?? [],
      upstreamProvenance: model.upstreamProvenance ?? source,
    })) as unknown as readonly NormalizedCatalogModel[],
  };
}

function inferAuthFamily(provider: CatalogSnapshotProvider): string {
  return provider.envVars.some((envVar) => envVar.endsWith("_API_KEY"))
    ? "api-key"
    : "runtime-defined";
}

function validateSnapshot(snapshot: CatalogSnapshot): void {
  ensure(snapshot.source.vendor.trim().length > 0, "Catalog snapshot source vendor is required");
  ensure(snapshot.source.commit.trim().length > 0, "Catalog snapshot source commit is required");
  ensure(snapshot.providers.length > 0, "Catalog snapshot must contain at least one provider");
  ensure(snapshot.models.length > 0, "Catalog snapshot must contain at least one model");
  for (const provider of snapshot.providers) {
    ensure(provider.providerId.trim().length > 0, "Catalog snapshot providerId is required");
    ensure(
      provider.displayName.trim().length > 0,
      "Catalog snapshot provider displayName is required",
    );
  }
  for (const model of snapshot.models) {
    ensure(model.modelId.trim().length > 0, "Catalog snapshot modelId is required");
    ensure(model.providerId.trim().length > 0, "Catalog snapshot model providerId is required");
  }
}

function validateOverrides(overrides: LocalCatalogOverrides): void {
  if (!overrides.providers && !overrides.models) {
    return;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function readNormalizedCatalogFile(filePath: string): Promise<NormalizedCatalog> {
  return hydrateNormalizedCatalog(await readJsonFile<unknown>(filePath));
}

function resolveModelDefinition(
  modelsById: ReadonlyMap<string, CatalogSnapshotModel>,
  model: CatalogSnapshotModel,
  seen: readonly string[] = [],
): ResolvedModelDefinition {
  if (!model.extends) {
    return {
      model,
      chain: [],
    };
  }

  ensure(
    !seen.includes(model.modelId),
    `Catalog model inheritance cycle detected for ${model.modelId}`,
  );
  const baseModel = modelsById.get(model.extends);
  ensure(baseModel, `Catalog model ${model.modelId} extends missing base model ${model.extends}`);

  const resolvedBase = resolveModelDefinition(modelsById, baseModel, [...seen, model.modelId]);

  return {
    model: {
      ...resolvedBase.model,
      ...model,
      capabilities: unique([
        ...(resolvedBase.model.capabilities ?? []),
        ...(model.capabilities ?? []),
      ]),
      modalities: unique(model.modalities ?? resolvedBase.model.modalities),
      experimentalModes: model.experimentalModes ?? resolvedBase.model.experimentalModes,
      reasoningOptions: model.reasoningOptions ?? resolvedBase.model.reasoningOptions,
      requestShapeHints: model.requestShapeHints ?? resolvedBase.model.requestShapeHints,
      pricing: model.pricing ?? resolvedBase.model.pricing,
    },
    chain: [...resolvedBase.chain, model.extends],
  };
}

export function deriveVendorVersionLedger(snapshot: CatalogSnapshot): VendorVersionLedger {
  validateSnapshot(snapshot);

  return {
    ledgerVersion: "1",
    vendors: [
      {
        vendor: snapshot.source.vendor,
        role: "catalog-source",
        commit: snapshot.source.commit,
        capturedAt: snapshot.source.capturedAt,
        schemaVersion: snapshot.source.schemaVersion,
      },
    ],
  };
}

export function normalizeCatalogSnapshot(
  snapshot: CatalogSnapshot,
  overrides: LocalCatalogOverrides = {},
): NormalizedCatalog {
  validateSnapshot(snapshot);

  const providersById = new Map(
    snapshot.providers.map((provider) => [provider.providerId, provider]),
  );
  const modelsById = new Map(snapshot.models.map((model) => [model.modelId, model]));

  const providers = snapshot.providers
    .map<NormalizedCatalogProvider>((provider) => {
      const override = overrides.providers?.[provider.providerId];

      return {
        providerId: provider.providerId,
        displayName: provider.displayName,
        npmPackage: provider.npmPackage,
        providerKind: override?.providerKind ?? `provider-${provider.providerId}`,
        authFamily: override?.authFamily ?? inferAuthFamily(provider),
        adapterFamily: override?.adapterFamily ?? provider.adapterFamilyHint,
        apiBase: provider.apiBase,
        docsUrl: provider.docsUrl ?? null,
        envVars: provider.envVars,
        supportedAuthModes: override?.supportedAuthModes ?? [],
        controlPlaneRequirements: override?.controlPlaneRequirements ?? [],
        localOverrideApplied: Boolean(override),
        upstreamProvenance: snapshot.source,
      };
    })
    .sort((left, right) => left.providerId.localeCompare(right.providerId));

  const models = snapshot.models
    .map<NormalizedCatalogModel>((model) => {
      const resolved = resolveModelDefinition(modelsById, model);
      const provider = providersById.get(resolved.model.providerId);
      ensure(
        provider,
        `Catalog model ${resolved.model.modelId} references missing provider ${resolved.model.providerId}`,
      );

      const providerOverride = overrides.providers?.[provider.providerId];
      const modelOverride = overrides.models?.[resolved.model.modelId];

      return {
        modelId: resolved.model.modelId,
        providerId: resolved.model.providerId,
        providerKind: providerOverride?.providerKind ?? `provider-${resolved.model.providerId}`,
        authFamily: providerOverride?.authFamily ?? inferAuthFamily(provider),
        displayName: resolved.model.displayName,
        version: resolved.model.version ?? "unversioned",
        capabilities: unique([
          ...(resolved.model.capabilities ?? []),
          ...(modelOverride?.capabilities ?? []),
        ]),
        modalities: unique(resolved.model.modalities),
        contextWindow: resolved.model.contextWindow ?? 0,
        maxOutputTokens: resolved.model.maxOutputTokens ?? 0,
        pricing: normalizePricing(resolved.model.pricing) ?? null,
        requestShapeHints: resolved.model.requestShapeHints ?? null,
        experimentalModes: resolved.model.experimentalModes ?? [],
        reasoningEffortLevels: deriveReasoningEffortLevels(resolved.model.reasoningOptions),
        reasoningOptionKinds: deriveReasoningOptionKinds(resolved.model.reasoningOptions),
        extendsProvenance: {
          baseModelId: resolved.chain.at(-1) ?? null,
          chain: resolved.chain,
        },
        localOverrideApplied: Boolean(modelOverride ?? providerOverride),
        localNotes: modelOverride?.localNotes ?? [],
        upstreamProvenance: snapshot.source,
      };
    })
    .sort((left, right) => left.modelId.localeCompare(right.modelId));

  return {
    catalogVersion: "1",
    source: snapshot.source,
    providers,
    // Copy models.dev pricing onto operator aliases (moonshot/kimi-* ← moonshotai/*).
    models: applyAliasedCatalogPricing(models),
  };
}

export async function exportCatalogArtifacts(
  options: ExportCatalogArtifactsOptions,
): Promise<ExportCatalogArtifactsResult> {
  const snapshot = await readJsonFile<CatalogSnapshot>(options.snapshotPath);
  const overrides = await readJsonFile<LocalCatalogOverrides>(options.overridesPath);

  validateSnapshot(snapshot);
  validateOverrides(overrides);

  const normalizedCatalog = normalizeCatalogSnapshot(snapshot, overrides);
  const vendorLedger = deriveVendorVersionLedger(snapshot);

  await mkdir(options.outputDir, { recursive: true });

  const normalizedCatalogPath = path.join(options.outputDir, "normalized-catalog.json");
  const vendorLedgerPath = path.join(options.outputDir, "vendor-version-ledger.json");

  await writeFile(
    normalizedCatalogPath,
    `${JSON.stringify(serializeNormalizedCatalog(normalizedCatalog))}\n`,
    "utf8",
  );
  await writeFile(vendorLedgerPath, `${JSON.stringify(vendorLedger, null, 2)}\n`, "utf8");

  return {
    normalizedCatalogPath,
    vendorLedgerPath,
  };
}
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { applyAliasedCatalogPricing } from "./token-economics.js";

export {
  resolveReasoningEffortLevels,
  type ReasoningEffortAdapterCapability,
  type ReasoningEffortFallback,
  type ReasoningEffortResolutionInput,
} from "./reasoning.js";

export {
  deriveLiteLLMProviders,
  extractLiteLLMModelIds,
  extractLiteLLMProviderIds,
  loadLiteLLMModelPrices,
  type LiteLLMProviderInfo,
} from "./litellm-catalog.js";
export {
  CANONICAL_MODEL_ID_ALIASES,
  OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS,
  applyAliasedCatalogPricing,
  collectPricingLookupIds,
  estimateCostPer1kTokens,
  estimateRequestCostUsd,
  resolveCanonicalModelId,
  resolveCatalogPricingHints,
  resolveRoutingCostEstimate,
  resolveTokenEconomics,
  type TokenEconomics,
  type TokenEconomicsSource,
} from "./token-economics.js";
