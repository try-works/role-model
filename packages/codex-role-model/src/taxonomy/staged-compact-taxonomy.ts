import { readFileSync } from "node:fs";

import type { CompactTaxonomy } from "./compact-data.js";

type RawRoleTaskIndex = Record<
  string,
  readonly (
    | readonly [id: string, label: string]
    | { readonly id: string; readonly label: string }
  )[]
>;

export type CompactTaxonomyFileReader = <T>(fileName: string) => T;

export interface StagedCompactTaxonomyReader {
  loadManifest(): CompactTaxonomy["manifest"];
  loadGroups(): CompactTaxonomy["groups"];
  loadRoleSummaries(): CompactTaxonomy["roleSummaries"];
  loadRoleTaskIndex(): CompactTaxonomy["roleTaskIndex"];
  loadRoleTaskChunk(roleId: string): CompactTaxonomy["roleTaskChunks"][string];
  loadRoleTaskChunks(roleIds: readonly string[]): CompactTaxonomy["roleTaskChunks"];
  loadFullTaxonomy(): CompactTaxonomy;
}

export interface CreateStagedCompactTaxonomyReaderOptions {
  readonly readJson?: CompactTaxonomyFileReader;
}

const readCompactJson: CompactTaxonomyFileReader = <T>(fileName: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../data/taxonomy/${fileName}`, import.meta.url), "utf8"),
  ) as T;

function isRoleTaskTuple(
  task: RawRoleTaskIndex[string][number],
): task is readonly [id: string, label: string] {
  return Array.isArray(task);
}

export const normalizeRoleTaskIndex = (index: RawRoleTaskIndex): CompactTaxonomy["roleTaskIndex"] =>
  Object.fromEntries(
    Object.entries(index).map(([roleId, tasks]) => [
      roleId,
      tasks.map((task) =>
        isRoleTaskTuple(task)
          ? { id: task[0], label: task[1] }
          : { id: task.id, label: task.label },
      ),
    ]),
  );

export function createStagedCompactTaxonomyReader(
  options: CreateStagedCompactTaxonomyReaderOptions = {},
): StagedCompactTaxonomyReader {
  const readJson = options.readJson ?? readCompactJson;
  let manifest: CompactTaxonomy["manifest"] | undefined;
  const loadManifest = (): CompactTaxonomy["manifest"] => {
    manifest ??= readJson<CompactTaxonomy["manifest"]>("compact-manifest.json");
    return manifest;
  };

  return {
    loadManifest,
    loadGroups: () => readJson<CompactTaxonomy["groups"]>("compact-groups.json"),
    loadRoleSummaries: () =>
      readJson<CompactTaxonomy["roleSummaries"]>("compact-role-summaries.json"),
    loadRoleTaskIndex: () =>
      normalizeRoleTaskIndex(readJson<RawRoleTaskIndex>("compact-role-task-index.json")),
    loadRoleTaskChunk: (roleId: string) =>
      readJson<CompactTaxonomy["roleTaskChunks"][string]>(
        loadManifest().roleTaskChunkFiles?.[roleId] ?? `roles/${roleId}/tasks.compact.json`,
      ),
    loadRoleTaskChunks: (roleIds: readonly string[]) =>
      Object.fromEntries(
        [...new Set(roleIds)].map((roleId) => [
          roleId,
          readJson<CompactTaxonomy["roleTaskChunks"][string]>(
            loadManifest().roleTaskChunkFiles?.[roleId] ?? `roles/${roleId}/tasks.compact.json`,
          ),
        ]),
      ),
    loadFullTaxonomy() {
      const roleSummaries = this.loadRoleSummaries();
      return {
        manifest: loadManifest(),
        groups: this.loadGroups(),
        roleSummaries,
        roleTaskIndex: this.loadRoleTaskIndex(),
        roleTaskChunks: this.loadRoleTaskChunks(roleSummaries.map((role) => role.id)),
      };
    },
  };
}
