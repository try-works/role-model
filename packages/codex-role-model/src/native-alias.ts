import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from "./types.js";

export interface NativeListSlot {
  readonly slug: string;
  readonly priority?: number;
  readonly visibility?: string;
  readonly display_name?: string;
  readonly [key: string]: unknown;
}

export interface NativeAliasAssignment {
  readonly nativeModel: NativeListSlot;
  readonly externalId: string;
  readonly external: DownstreamOpenAIModelRecord;
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadDefaultNativeListSlots(): NativeListSlot[] {
  const raw = JSON.parse(
    readFileSync(join(packageRoot, "fixtures", "native-list-slots.golden.json"), "utf8"),
  ) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is NativeListSlot => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { slug?: unknown }).slug === "string"
      );
    })
    .filter((entry) => entry.visibility === "list" || entry.visibility === undefined)
    .sort((left, right) => {
      const priority = Number(left.priority ?? 999) - Number(right.priority ?? 999);
      return priority || String(left.slug).localeCompare(String(right.slug));
    });
}

export function buildPickerExternalModels(
  discovery: DownstreamOpenAIDiscovery,
  selectedModelId?: string | null,
): DownstreamOpenAIModelRecord[] {
  const selected =
    (selectedModelId
      ? discovery.models.find((model) => model.id === selectedModelId)
      : undefined) ??
    (discovery.setup.recommendedModel
      ? discovery.models.find((model) => model.id === discovery.setup.recommendedModel)
      : undefined);

  const out: DownstreamOpenAIModelRecord[] = [];
  const seen = new Set<string>();
  const push = (model: DownstreamOpenAIModelRecord | undefined) => {
    if (!model || seen.has(model.id)) return;
    seen.add(model.id);
    out.push(model);
  };

  push(selected);
  for (const model of discovery.models) {
    if (model.type === "model") push(model);
  }
  return out;
}

export function buildNativeAliasAssignments(
  nativeSlots: readonly NativeListSlot[],
  externalModels: readonly DownstreamOpenAIModelRecord[],
): NativeAliasAssignment[] {
  const slots = [...nativeSlots]
    .filter((slot) => typeof slot.slug === "string" && slot.slug.length > 0)
    .sort((left, right) => {
      const priority = Number(left.priority ?? 999) - Number(right.priority ?? 999);
      return priority || String(left.slug).localeCompare(String(right.slug));
    });

  return externalModels.slice(0, slots.length).map((external, index) => {
    const nativeModel = slots[index];
    if (!nativeModel) {
      throw new Error(`Missing native model slot for external model at index ${index}.`);
    }
    return {
      nativeModel,
      externalId: external.id,
      external,
    };
  });
}

export function nativeAliasesPath(codexHome: string): string {
  return join(codexHome, "role-model", "native-aliases.json");
}

export function writeNativeAliases(path: string, aliases: Record<string, string>): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  const payload = { version: 1, aliases };
  writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temp, path);
}

export function readNativeAliases(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      version?: unknown;
      aliases?: unknown;
    };
    if (
      parsed.version !== 1 ||
      !parsed.aliases ||
      typeof parsed.aliases !== "object" ||
      Array.isArray(parsed.aliases)
    ) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed.aliases).filter(
        ([nativeSlug, target]) => typeof nativeSlug === "string" && typeof target === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function resolveNativeAliasedModelId(
  model: string,
  nativeAliasesPathOrMap: string | Readonly<Record<string, string>>,
): string {
  const aliases =
    typeof nativeAliasesPathOrMap === "string"
      ? readNativeAliases(nativeAliasesPathOrMap)
      : nativeAliasesPathOrMap;
  return aliases[model] ?? model;
}

export function nativeSlugForExternal(
  externalId: string,
  aliases: Readonly<Record<string, string>>,
): string | undefined {
  return Object.keys(aliases).find((nativeSlug) => aliases[nativeSlug] === externalId);
}
