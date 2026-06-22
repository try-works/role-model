import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface AliasStore {
  readSelectedAlias(): Promise<string | null>;
  writeSelectedAlias(alias: string): Promise<void>;
}

interface AliasStoreFile {
  selectedAlias?: unknown;
}

export function getDefaultAliasStorePath(): string {
  return join(homedir(), ".pi", "agent", "role-model.json");
}

export function createFileAliasStore(statePath = getDefaultAliasStorePath()): AliasStore {
  return {
    async readSelectedAlias() {
      try {
        const raw = await readFile(statePath, "utf8");
        const data = JSON.parse(raw) as AliasStoreFile;
        return typeof data.selectedAlias === "string" && data.selectedAlias.length > 0 ? data.selectedAlias : null;
      } catch {
        return null;
      }
    },
    async writeSelectedAlias(alias: string) {
      await mkdir(dirname(statePath), { recursive: true });
      await writeFile(statePath, `${JSON.stringify({ selectedAlias: alias }, null, 2)}\n`, "utf8");
    },
  };
}
