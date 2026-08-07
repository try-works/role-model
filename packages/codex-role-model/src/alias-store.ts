import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveCodexHome } from "./codex-config.js";

export interface AliasState {
  selectedAlias?: string;
}

export function aliasStatePath(
  env: Partial<Record<string, string | undefined>> = process.env,
): string {
  return join(resolveCodexHome(env), "role-model", "state.json");
}

export function readAliasState(path = aliasStatePath()): AliasState {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as AliasState;
  } catch {
    return {};
  }
}

export function writeAliasState(state: AliasState, path = aliasStatePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), "utf8");
}
