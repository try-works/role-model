import { normalizeEndpoint } from "../config.js";
import type { CompactRoleTask, CompactTaxonomy } from "./compact-data.js";
import { loadCompactTaxonomy } from "./load-compact-taxonomy.js";
import { createStagedCompactTaxonomyReader } from "./staged-compact-taxonomy.js";

export interface ResolveEffectiveTaxonomyInput {
  readonly endpoint?: string;
  readonly fetch?: typeof fetch;
  readonly requestTimeoutMs?: number;
  readonly roleIds?: readonly string[];
}

export interface EffectiveTaxonomyResolution {
  readonly source: "runtime" | "package";
  readonly taxonomy: CompactTaxonomy;
  readonly fallbackReason?: string;
}

export interface FetchRuntimeRoleTaskChunkInput {
  readonly endpoint?: string;
  readonly roleId: string;
  readonly fetch?: typeof fetch;
  readonly requestTimeoutMs?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchJson(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      keepalive: false,
      headers: { connection: "close" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function assertCompatibleManifest(
  runtimeManifest: CompactTaxonomy["manifest"],
  packageManifest: CompactTaxonomy["manifest"],
): void {
  if (
    runtimeManifest.taxonomyVersion !== packageManifest.taxonomyVersion ||
    runtimeManifest.classificationContractVersion !== packageManifest.classificationContractVersion
  ) {
    throw new Error(
      `incompatible taxonomy ${runtimeManifest.taxonomyVersion}/${runtimeManifest.classificationContractVersion}`,
    );
  }
}

function parseManifest(value: unknown): CompactTaxonomy["manifest"] {
  if (!isObject(value)) {
    throw new Error("runtime taxonomy manifest is malformed");
  }
  const entryCounts = isObject(value.entryCounts) ? value.entryCounts : {};
  if (
    typeof value.taxonomyVersion !== "string" ||
    typeof value.contentRevision !== "string" ||
    typeof value.classificationContractVersion !== "string" ||
    typeof entryCounts.groups !== "number" ||
    typeof entryCounts.roles !== "number" ||
    typeof entryCounts.taskTypes !== "number"
  ) {
    throw new Error("runtime taxonomy manifest is malformed");
  }
  const runtimeContentHashes = isObject(value.contentHashes)
    ? Object.fromEntries(
        Object.entries(value.contentHashes).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
  return {
    taxonomyVersion: value.taxonomyVersion,
    contentRevision: value.contentRevision,
    classificationContractVersion: value.classificationContractVersion,
    entryCounts: {
      groups: entryCounts.groups,
      roles: entryCounts.roles,
      taskTypes: entryCounts.taskTypes,
    },
    entryFiles: {
      groups: "compact-groups.json",
      roleSummaries: "compact-role-summaries.json",
      roleTaskIndex: "compact-role-task-index.json",
      classificationGuide: "compact-classification-guide.json",
    },
    contentHashes: {},
    runtimeContentHashes,
  };
}

function parseGroups(value: unknown): CompactTaxonomy["groups"] {
  const groupPayload = isObject(value) && Array.isArray(value.groups) ? value.groups : value;
  if (!Array.isArray(groupPayload)) {
    throw new Error("runtime compact groups are malformed");
  }
  return groupPayload.map((entry) => {
    if (
      !isObject(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.label !== "string" ||
      !Array.isArray(entry.primaryRoleIds) ||
      !Array.isArray(entry.secondaryRoleIds)
    ) {
      throw new Error("runtime compact groups are malformed");
    }
    return {
      id: entry.id,
      label: entry.label,
      primaryRoleIds: entry.primaryRoleIds.filter(
        (item): item is string => typeof item === "string",
      ),
      secondaryRoleIds: entry.secondaryRoleIds.filter(
        (item): item is string => typeof item === "string",
      ),
    };
  });
}

function parseRoleSummaries(value: unknown): CompactTaxonomy["roleSummaries"] {
  const rolePayload = isObject(value) && Array.isArray(value.roles) ? value.roles : value;
  if (!Array.isArray(rolePayload)) {
    throw new Error("runtime compact roles are malformed");
  }
  return rolePayload.map((entry) => {
    if (
      !isObject(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.label !== "string" ||
      typeof entry.primaryGroupId !== "string" ||
      !Array.isArray(entry.secondaryGroupIds)
    ) {
      throw new Error("runtime compact roles are malformed");
    }
    return {
      id: entry.id,
      label: entry.label,
      primaryGroupId: entry.primaryGroupId,
      secondaryGroupIds: entry.secondaryGroupIds.filter(
        (item): item is string => typeof item === "string",
      ),
    };
  });
}

function parseRoleTasks(value: unknown): CompactTaxonomy["roleTaskChunks"][string] {
  const taskPayload = isObject(value) && Array.isArray(value.tasks) ? value.tasks : value;
  if (!Array.isArray(taskPayload)) {
    throw new Error("runtime compact role tasks are malformed");
  }
  return taskPayload.map((entry) => {
    if (!isObject(entry) || typeof entry.id !== "string" || typeof entry.label !== "string") {
      throw new Error("runtime compact role tasks are malformed");
    }
    const primaryRole =
      typeof entry.primaryRole === "string" ? entry.primaryRole : entry.id.split(".")[0];
    if (!primaryRole) {
      throw new Error("runtime compact role tasks are malformed");
    }
    return {
      id: entry.id,
      label: entry.label,
      primaryRole,
      compatibleRoles: Array.isArray(entry.compatibleRoles)
        ? entry.compatibleRoles.filter((item): item is string => typeof item === "string")
        : [primaryRole],
      requiredCapabilities: Array.isArray(entry.requiredCapabilities)
        ? entry.requiredCapabilities.filter((item): item is string => typeof item === "string")
        : [],
      preferredCapabilities: Array.isArray(entry.preferredCapabilities)
        ? entry.preferredCapabilities.filter((item): item is string => typeof item === "string")
        : [],
      requiredModalities: Array.isArray(entry.requiredModalities)
        ? entry.requiredModalities.filter((item): item is string => typeof item === "string")
        : ["text"],
      toolClasses: Array.isArray(entry.toolClasses)
        ? entry.toolClasses.filter((item): item is string => typeof item === "string")
        : [],
      variants: Array.isArray(entry.variants)
        ? entry.variants.filter((item): item is string => typeof item === "string")
        : [],
    };
  });
}

export async function fetchRuntimeRoleTaskChunk(
  input: FetchRuntimeRoleTaskChunkInput,
): Promise<readonly CompactRoleTask[]> {
  const fetchImpl = input.fetch ?? fetch;
  const endpoint = normalizeEndpoint(input.endpoint ?? "http://127.0.0.1:3456");
  const timeoutMs = input.requestTimeoutMs ?? 2500;
  return parseRoleTasks(
    await fetchJson(
      `${endpoint}/api/role-model/taxonomy/roles/${encodeURIComponent(input.roleId)}/tasks.compact`,
      timeoutMs,
      fetchImpl,
    ),
  );
}

export async function resolveEffectiveTaxonomy(
  input: ResolveEffectiveTaxonomyInput = {},
): Promise<EffectiveTaxonomyResolution> {
  const packageReader = createStagedCompactTaxonomyReader();
  const packageManifest = packageReader.loadManifest();
  const fetchImpl = input.fetch ?? fetch;
  const endpoint = normalizeEndpoint(input.endpoint ?? "http://127.0.0.1:3456");
  const timeoutMs = input.requestTimeoutMs ?? 2500;
  const roleIds = input.roleIds?.length ? [...new Set(input.roleIds)] : [];

  try {
    const manifest = parseManifest(
      await fetchJson(`${endpoint}/api/role-model/taxonomy/manifest`, timeoutMs, fetchImpl),
    );
    assertCompatibleManifest(manifest, packageManifest);
    const groups = parseGroups(
      await fetchJson(`${endpoint}/api/role-model/taxonomy/compact/groups`, timeoutMs, fetchImpl),
    );
    const roleSummaries = parseRoleSummaries(
      await fetchJson(`${endpoint}/api/role-model/taxonomy/compact/roles`, timeoutMs, fetchImpl),
    );
    const roleTaskEntries = await Promise.all(
      roleIds.map(
        async (roleId) =>
          [
            roleId,
            await fetchRuntimeRoleTaskChunk({
              endpoint,
              roleId,
              fetch: fetchImpl,
              requestTimeoutMs: timeoutMs,
            }),
          ] as const,
      ),
    );

    return {
      source: "runtime",
      taxonomy: {
        manifest,
        groups,
        roleSummaries,
        roleTaskIndex: packageReader.loadRoleTaskIndex(),
        roleTaskChunks: Object.fromEntries(roleTaskEntries),
      },
    };
  } catch (error) {
    return {
      source: "package",
      taxonomy: loadCompactTaxonomy(),
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  }
}
