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
  readonly envVars: readonly string[];
  readonly adapterFamilyHint: string;
}

export interface ExperimentalMode {
  readonly modeId: string;
  readonly label: string;
}

export interface PricingHints {
  readonly inputPer1M: number;
  readonly outputPer1M: number;
  readonly currency: string;
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
  readonly providerKind: string;
  readonly authFamily: string;
  readonly adapterFamily: string;
  readonly apiBase: string;
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

function inferAuthFamily(provider: CatalogSnapshotProvider): string {
  return provider.envVars.some((envVar) => envVar.endsWith("_API_KEY")) ? "api-key" : "runtime-defined";
}

function validateSnapshot(snapshot: CatalogSnapshot): void {
  ensure(snapshot.source.vendor.trim().length > 0, "Catalog snapshot source vendor is required");
  ensure(snapshot.source.commit.trim().length > 0, "Catalog snapshot source commit is required");
  ensure(snapshot.providers.length > 0, "Catalog snapshot must contain at least one provider");
  ensure(snapshot.models.length > 0, "Catalog snapshot must contain at least one model");
  for (const provider of snapshot.providers) {
    ensure(provider.providerId.trim().length > 0, "Catalog snapshot providerId is required");
    ensure(provider.displayName.trim().length > 0, "Catalog snapshot provider displayName is required");
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

  ensure(!seen.includes(model.modelId), `Catalog model inheritance cycle detected for ${model.modelId}`);
  const baseModel = modelsById.get(model.extends);
  ensure(baseModel, `Catalog model ${model.modelId} extends missing base model ${model.extends}`);

  const resolvedBase = resolveModelDefinition(modelsById, baseModel, [...seen, model.modelId]);

  return {
    model: {
      ...resolvedBase.model,
      ...model,
      capabilities: unique([...(resolvedBase.model.capabilities ?? []), ...(model.capabilities ?? [])]),
      modalities: unique(model.modalities ?? resolvedBase.model.modalities),
      experimentalModes: model.experimentalModes ?? resolvedBase.model.experimentalModes,
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

  const providersById = new Map(snapshot.providers.map((provider) => [provider.providerId, provider]));
  const modelsById = new Map(snapshot.models.map((model) => [model.modelId, model]));

  const providers = snapshot.providers
    .map<NormalizedCatalogProvider>((provider) => {
      const override = overrides.providers?.[provider.providerId];

      return {
        providerId: provider.providerId,
        displayName: provider.displayName,
        providerKind: override?.providerKind ?? `provider-${provider.providerId}`,
        authFamily: override?.authFamily ?? inferAuthFamily(provider),
        adapterFamily: override?.adapterFamily ?? provider.adapterFamilyHint,
        apiBase: provider.apiBase,
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
      ensure(provider, `Catalog model ${resolved.model.modelId} references missing provider ${resolved.model.providerId}`);

      const providerOverride = overrides.providers?.[provider.providerId];
      const modelOverride = overrides.models?.[resolved.model.modelId];

      return {
        modelId: resolved.model.modelId,
        providerId: resolved.model.providerId,
        providerKind: providerOverride?.providerKind ?? `provider-${resolved.model.providerId}`,
        authFamily: providerOverride?.authFamily ?? inferAuthFamily(provider),
        displayName: resolved.model.displayName,
        version: resolved.model.version ?? "unversioned",
        capabilities: unique([...(resolved.model.capabilities ?? []), ...(modelOverride?.capabilities ?? [])]),
        modalities: unique(resolved.model.modalities),
        contextWindow: resolved.model.contextWindow ?? 0,
        maxOutputTokens: resolved.model.maxOutputTokens ?? 0,
        pricing: resolved.model.pricing ?? null,
        requestShapeHints: resolved.model.requestShapeHints ?? null,
        experimentalModes: resolved.model.experimentalModes ?? [],
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
    models,
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

  await writeFile(normalizedCatalogPath, `${JSON.stringify(normalizedCatalog, null, 2)}\n`, "utf8");
  await writeFile(vendorLedgerPath, `${JSON.stringify(vendorLedger, null, 2)}\n`, "utf8");

  return {
    normalizedCatalogPath,
    vendorLedgerPath,
  };
}
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
