import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiscoveryResult } from "./types.js";
import {
  buildNativeAliasAssignments,
  buildPickerExternalModels,
  loadDefaultNativeListSlots,
  type NativeListSlot,
} from "./native-alias.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export type CatalogIntegrationMode = "signed-in" | "login-free";

export function loadGoldenModelsResponse(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(packageRoot, "fixtures", "models-response.golden.json"), "utf8"),
  ) as Record<string, unknown>;
}

export function loadNativeCatalogModels(): NativeListSlot[] {
  const raw = JSON.parse(
    readFileSync(join(packageRoot, "fixtures", "native-catalog.golden.json"), "utf8"),
  ) as { models?: unknown };
  if (!Array.isArray(raw.models)) return loadDefaultNativeListSlots();
  return raw.models.filter((entry): entry is NativeListSlot => {
    return typeof entry === "object" && entry !== null && typeof (entry as { slug?: unknown }).slug === "string";
  });
}

export interface BuildModelsCatalogOptions {
  readonly selectedModelId?: string | null;
  readonly nativeListSlots?: readonly NativeListSlot[];
  readonly nativeCatalogModels?: readonly NativeListSlot[];
  readonly integrationMode?: CatalogIntegrationMode;
}

export interface BuiltModelsCatalog {
  readonly catalog: Record<string, unknown>;
  readonly aliases: Record<string, string>;
  readonly listedExternalIds: string[];
  readonly configModelId: string;
}

/** DeepSeek / current Codex catalog schema requires truncation_policy.mode (not type). */
export function normalizeTruncationPolicy(value: unknown): { mode: string; limit: number } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const mode =
      typeof record.mode === "string"
        ? record.mode
        : typeof record.type === "string"
          ? record.type
          : "tokens";
    const limit = typeof record.limit === "number" ? record.limit : 10000;
    return { mode, limit };
  }
  return { mode: "tokens", limit: 10000 };
}

export function normalizeSupportedReasoningLevels(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      { effort: "low", description: "Fast responses with lighter reasoning" },
      { effort: "high", description: "Extra high reasoning depth for complex problems" },
      { effort: "max", description: "Maximum reasoning depth for the hardest problems" },
    ];
  }
  return value.map((entry) => {
    if (typeof entry === "string") {
      return { effort: entry, description: entry };
    }
    return entry;
  });
}

function baseTemplate(nativeSlots: readonly NativeListSlot[]): Record<string, unknown> {
  const golden = loadGoldenModelsResponse();
  const templateModels = Array.isArray(golden.models) ? (golden.models as Record<string, unknown>[]) : [];
  const goldenTemplate = templateModels[0];
  const nativeTemplate = nativeSlots[0] as Record<string, unknown> | undefined;
  return {
    ...(goldenTemplate ?? {}),
    ...(nativeTemplate ?? {}),
    prefer_websockets: false,
    shell_type: "shell_command",
    truncation_policy: { mode: "tokens", limit: 10000 },
  };
}

function catalogEntryFromTemplate(
  template: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...template,
    ...overrides,
    prefer_websockets: false,
    shell_type: overrides.shell_type ?? template.shell_type ?? "shell_command",
  };
  merged.truncation_policy = normalizeTruncationPolicy(
    overrides.truncation_policy ?? template.truncation_policy,
  );
  merged.supported_reasoning_levels = normalizeSupportedReasoningLevels(
    overrides.supported_reasoning_levels ?? template.supported_reasoning_levels,
  );
  if (merged.minimal_client_version === undefined) {
    merged.minimal_client_version = "0.144.0";
  }
  return merged;
}

/** Codex metadata for role-model / custom remotes (aligned with DeepSeek Codex catalog). */
function roleModelCatalogOverrides(
  template: Record<string, unknown>,
  model: { id: string; piMapping?: { contextWindow?: number | null } | null },
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    slug: model.id,
    display_name: model.id,
    description: model.id,
    context_window: model.piMapping?.contextWindow ?? template.context_window,
    max_context_window:
      model.piMapping?.contextWindow ?? template.max_context_window ?? template.context_window,
    prefer_websockets: false,
    supported_in_api: true,
    tool_mode: null,
    use_responses_lite: false,
    web_search_tool_type: "text",
    supports_image_detail_original: false,
    input_modalities: ["text"],
    ...extra,
  };
}

function buildLoginFreeCatalog(
  discovery: DiscoveryResult,
  options: BuildModelsCatalogOptions,
): BuiltModelsCatalog {
  const golden = loadGoldenModelsResponse();
  const slots = options.nativeListSlots ?? loadDefaultNativeListSlots();
  const template = baseTemplate(slots);
  if (typeof template.base_instructions !== "string" || template.base_instructions.length === 0) {
    throw new Error(
      "Codex model catalog template is missing base_instructions; capture native list slots via fixtures/native-list-slots.golden.json.",
    );
  }
  const allModels = discovery.discovery.models.filter(
    (model) => model.type === "alias" || model.type === "model",
  );
  if (allModels.length === 0) {
    throw new Error("Cannot write empty Codex model catalog; discovery returned no aliases.");
  }

  const selectedModelId =
    options.selectedModelId ??
    discovery.discovery.setup.recommendedModel ??
    allModels.find((model) => model.type === "alias")?.id ??
    allModels[0]?.id ??
    null;

  const pickerModels = buildPickerExternalModels(discovery.discovery, selectedModelId);
  const assignments = buildNativeAliasAssignments(slots, pickerModels);
  const aliases = Object.fromEntries(
    assignments.map(({ nativeModel, externalId }) => [nativeModel.slug, externalId]),
  );
  const listedExternalIds = assignments.map((assignment) => assignment.externalId);

  const listedEntries = assignments.map(({ nativeModel, external }) =>
    catalogEntryFromTemplate(template, {
      ...nativeModel,
      ...roleModelCatalogOverrides(template, external, {
        slug: nativeModel.slug,
        display_name: external.id,
        description: external.id,
        visibility: "list",
        priority: nativeModel.priority,
      }),
    }),
  );

  const hiddenEntries = allModels.map((model) =>
    catalogEntryFromTemplate(
      template,
      roleModelCatalogOverrides(template, model, { visibility: "hide" }),
    ),
  );

  const configModelId =
    (selectedModelId &&
      Object.keys(aliases).find((nativeSlug) => aliases[nativeSlug] === selectedModelId)) ||
    selectedModelId ||
    listedEntries[0]?.slug ||
    allModels[0]!.id;

  return {
    catalog: { ...golden, models: [...listedEntries, ...hiddenEntries] },
    aliases,
    listedExternalIds,
    configModelId: String(configModelId),
  };
}

function buildSignedInMergedCatalog(
  discovery: DiscoveryResult,
  options: BuildModelsCatalogOptions,
): BuiltModelsCatalog {
  const golden = loadGoldenModelsResponse();
  const nativeModels = options.nativeCatalogModels ?? loadNativeCatalogModels();
  const template = baseTemplate(nativeModels.length > 0 ? nativeModels : loadDefaultNativeListSlots());
  if (typeof template.base_instructions !== "string" || template.base_instructions.length === 0) {
    throw new Error(
      "Codex model catalog template is missing base_instructions; capture native catalog via fixtures/native-catalog.golden.json.",
    );
  }

  const allModels = discovery.discovery.models.filter(
    (model) => model.type === "alias" || model.type === "model",
  );
  if (allModels.length === 0) {
    throw new Error("Cannot write empty Codex model catalog; discovery returned no aliases.");
  }

  const selectedModelId =
    options.selectedModelId ??
    discovery.discovery.setup.recommendedModel ??
    allModels.find((model) => model.type === "alias")?.id ??
    allModels[0]?.id ??
    null;

  const pickerModels = buildPickerExternalModels(discovery.discovery, selectedModelId);
  const listedExternalIds = pickerModels.map((model) => model.id);

  const nativeEntries = nativeModels.map((native) =>
    catalogEntryFromTemplate(template, {
      ...native,
      slug: native.slug,
      display_name: native.display_name ?? native.slug,
      visibility: native.visibility ?? "list",
      prefer_websockets: false,
      supported_in_api: true,
    }),
  );

  const roleModelEntries = pickerModels.map((model, index) =>
    catalogEntryFromTemplate(
      template,
      roleModelCatalogOverrides(template, model, {
        visibility: "list",
        priority: 1000 + index,
      }),
    ),
  );

  // Hidden canonical copies for any discovery ids not already listed (full alias set for CLI).
  const listedSlugs = new Set(roleModelEntries.map((entry) => String(entry.slug)));
  const hiddenEntries = allModels
    .filter((model) => !listedSlugs.has(model.id))
    .map((model) =>
      catalogEntryFromTemplate(
        template,
        roleModelCatalogOverrides(template, model, { visibility: "hide" }),
      ),
    );

  return {
    catalog: {
      ...golden,
      models: [...nativeEntries, ...roleModelEntries, ...hiddenEntries],
    },
    aliases: {},
    listedExternalIds,
    configModelId: selectedModelId ?? listedExternalIds[0] ?? allModels[0]!.id,
  };
}

export function buildModelsCatalog(
  discovery: DiscoveryResult,
  options: BuildModelsCatalogOptions = {},
): BuiltModelsCatalog {
  const mode = options.integrationMode ?? "signed-in";
  return mode === "login-free"
    ? buildLoginFreeCatalog(discovery, options)
    : buildSignedInMergedCatalog(discovery, options);
}
