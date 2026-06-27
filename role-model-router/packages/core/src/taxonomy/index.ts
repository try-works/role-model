import { readFileSync } from "node:fs";
import path from "node:path";

export type TaxonomyAuthorityScope = "core" | "provider" | "client" | "org" | "team" | "user";
export type TaxonomyStability = "stable" | "experimental" | "deprecated";

export interface TaxonomyAuthority {
  readonly scope: TaxonomyAuthorityScope;
  readonly owner: string;
}

export interface TaxonomyUiMetadata {
  readonly sortOrder: number;
  readonly recommendedIcon?: string;
  readonly recommendedAccent?: string;
}

export interface TaxonomyManifest {
  readonly schemaVersion: string;
  readonly taxonomyVersion: string;
  readonly databaseVersion: number;
  readonly contentRevision: string;
  readonly classificationContractVersion: string;
  readonly generatedAt: string;
  readonly entryCounts: {
    readonly groups: number;
    readonly roles: number;
    readonly taskTypes: number;
    readonly capabilities: number;
    readonly modalities: number;
    readonly toolClasses: number;
    readonly intentPresets: number;
  };
  readonly entryFiles: {
    readonly groups: string;
    readonly roles: string;
    readonly taskTypes: string;
    readonly capabilities: string;
    readonly modalities: string;
    readonly toolClasses: string;
    readonly intentPresets: string;
  };
  readonly contentHashes: {
    readonly groups: string;
    readonly roles: string;
    readonly taskTypes: string;
    readonly capabilities: string;
    readonly modalities: string;
    readonly toolClasses: string;
    readonly intentPresets: string;
  };
}

export interface TaxonomyGroup {
  readonly id: string;
  readonly kind: "group";
  readonly label: string;
  readonly description: string;
  readonly primaryRoleIds: readonly string[];
  readonly secondaryRoleIds: readonly string[];
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
  readonly ui: TaxonomyUiMetadata;
}

export interface TaxonomyRole {
  readonly id: string;
  readonly kind: "role";
  readonly label: string;
  readonly description: string;
  readonly primaryGroupId: string;
  readonly secondaryGroupIds: readonly string[];
  readonly typicalTaskIds: readonly string[];
  readonly taskIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly preferredCapabilities: readonly string[];
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
  readonly classification?: {
    readonly summary: string;
    readonly positiveSignals: readonly string[];
    readonly negativeSignals: readonly string[];
  };
  readonly ui: TaxonomyUiMetadata;
}

export interface TaxonomyTask {
  readonly id: string;
  readonly kind: "task_type";
  readonly label: string;
  readonly description: string;
  readonly primaryRole: string;
  readonly compatibleRoles: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly preferredCapabilities: readonly string[];
  readonly requiredModalities: readonly string[];
  readonly toolClasses: readonly string[];
  readonly classifier: {
    readonly useWhen: string;
    readonly doNotUseWhen: string;
  };
  readonly variants: readonly string[];
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
}

export interface TaxonomyCapability {
  readonly id: string;
  readonly kind: "capability";
  readonly label: string;
  readonly category: string;
  readonly description: string;
  readonly classificationGuidance: string;
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
}

export interface TaxonomyModality {
  readonly id: string;
  readonly kind: "modality";
  readonly label: string;
  readonly description: string;
  readonly classificationGuidance: string;
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
}

export interface TaxonomyToolClass {
  readonly id: string;
  readonly kind: "tool_class";
  readonly label: string;
  readonly description: string;
  readonly typicalTasks: readonly string[];
  readonly classificationGuidance: string;
  readonly authority: TaxonomyAuthority;
  readonly stability: TaxonomyStability;
}

export interface CanonicalTaxonomy {
  readonly manifest: TaxonomyManifest;
  readonly groups: readonly TaxonomyGroup[];
  readonly roles: readonly TaxonomyRole[];
  readonly tasks: readonly TaxonomyTask[];
  readonly capabilities: readonly TaxonomyCapability[];
  readonly modalities: readonly TaxonomyModality[];
  readonly toolClasses: readonly TaxonomyToolClass[];
  readonly intentPresets: readonly [];
}

function readArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const taxonomyDataRootCandidates = (): string[] => {
  const explicitRoot = process.env.ROLE_MODEL_TAXONOMY_DATA_ROOT;
  const repoRoot = readArgValue("--repo-root") ?? process.env.ROLE_MODEL_REPO_ROOT;
  return [
    ...(explicitRoot ? [explicitRoot] : []),
    ...(repoRoot
      ? [path.join(repoRoot, "role-model-router", "packages", "core", "data", "taxonomy")]
      : []),
    path.resolve(process.cwd(), "data", "taxonomy"),
    path.resolve(process.cwd(), "..", "..", "packages", "core", "data", "taxonomy"),
    path.resolve(process.cwd(), "role-model-router", "packages", "core", "data", "taxonomy"),
  ];
};

const readTaxonomyJson = <T>(fileName: string): T => {
  const errors: string[] = [];
  for (const root of taxonomyDataRootCandidates()) {
    try {
      return JSON.parse(readFileSync(path.join(root, fileName), "utf8")) as T;
    } catch (error) {
      errors.push(`${root}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to read taxonomy data file ${fileName}:\n${errors.join("\n")}`);
};

export function getCanonicalTaskAction(taskId: string): string {
  const [, ...parts] = taskId.split(".");
  return parts.join(".");
}

export const taxonomyManifest = readTaxonomyJson<TaxonomyManifest>("manifest.json");
export const canonicalGroups = readTaxonomyJson<readonly TaxonomyGroup[]>("groups.json");
export const canonicalRoles = readTaxonomyJson<readonly TaxonomyRole[]>("roles.json");
export const canonicalTasks = readTaxonomyJson<readonly TaxonomyTask[]>("task-types.json");
export const canonicalCapabilities =
  readTaxonomyJson<readonly TaxonomyCapability[]>("capabilities.json");
export const canonicalModalities = readTaxonomyJson<readonly TaxonomyModality[]>("modalities.json");
export const canonicalToolClasses =
  readTaxonomyJson<readonly TaxonomyToolClass[]>("tool-classes.json");

export const canonicalTaxonomy: CanonicalTaxonomy = {
  manifest: taxonomyManifest,
  groups: canonicalGroups,
  roles: canonicalRoles,
  tasks: canonicalTasks,
  capabilities: canonicalCapabilities,
  modalities: canonicalModalities,
  toolClasses: canonicalToolClasses,
  intentPresets: readTaxonomyJson<[]>("intent-presets.json"),
};

export const validateCanonicalTaxonomy = (taxonomy: CanonicalTaxonomy): readonly string[] => {
  const diagnostics: string[] = [];
  const groupIds = new Set(taxonomy.groups.map((group) => group.id));
  const roleIds = new Set(taxonomy.roles.map((role) => role.id));
  const capabilityIdsSet = new Set(taxonomy.capabilities.map((capability) => capability.id));
  const modalityIdsSet = new Set(taxonomy.modalities.map((modality) => modality.id));
  const toolClassIdsSet = new Set(taxonomy.toolClasses.map((toolClass) => toolClass.id));

  for (const role of taxonomy.roles) {
    if (!groupIds.has(role.primaryGroupId)) {
      diagnostics.push(`role ${role.id} references unknown primary group ${role.primaryGroupId}`);
    }
    for (const groupId of role.secondaryGroupIds) {
      if (!groupIds.has(groupId)) {
        diagnostics.push(`role ${role.id} references unknown secondary group ${groupId}`);
      }
    }
    const nativeTasks = taxonomy.tasks.filter((task) => task.primaryRole === role.id);
    if (nativeTasks.length < 10) {
      diagnostics.push(`role ${role.id} has fewer than 10 native task types`);
    }
  }

  for (const group of taxonomy.groups) {
    for (const roleId of [...group.primaryRoleIds, ...group.secondaryRoleIds]) {
      if (!roleIds.has(roleId)) {
        diagnostics.push(`group ${group.id} references unknown role ${roleId}`);
      }
    }
  }

  for (const task of taxonomy.tasks) {
    if (!task.id.startsWith(`${task.primaryRole}.`)) {
      diagnostics.push(`task ${task.id} does not start with primary role ${task.primaryRole}`);
    }
    if (!roleIds.has(task.primaryRole)) {
      diagnostics.push(`task ${task.id} references unknown primary role ${task.primaryRole}`);
    }
    for (const roleId of task.compatibleRoles) {
      if (!roleIds.has(roleId)) {
        diagnostics.push(`task ${task.id} references unknown compatible role ${roleId}`);
      }
    }
    for (const capabilityId of [...task.requiredCapabilities, ...task.preferredCapabilities]) {
      if (!capabilityIdsSet.has(capabilityId)) {
        diagnostics.push(`task ${task.id} references unknown capability ${capabilityId}`);
      }
    }
    for (const modalityId of task.requiredModalities) {
      if (!modalityIdsSet.has(modalityId)) {
        diagnostics.push(`task ${task.id} references unknown modality ${modalityId}`);
      }
    }
    for (const toolClassId of task.toolClasses) {
      if (!toolClassIdsSet.has(toolClassId)) {
        diagnostics.push(`task ${task.id} references unknown tool class ${toolClassId}`);
      }
    }
  }

  return diagnostics;
};

export * from "./benchmark-linkage.js";
export * from "./telemetry-linkage.js";
