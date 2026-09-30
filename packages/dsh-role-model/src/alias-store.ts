/**
 * Selected-alias persistence.
 *
 * The selected alias is plugin configuration state (per the settled decision), so
 * it is stored in a config-owned file under `$DSH_HOME` — never in another
 * agent's home directory, and never mixed with credentials.
 *
 * Every read is total: a missing, unreadable, or corrupt store means "no alias
 * selected" rather than an exception, because this is consulted on paths that must
 * not fail (activation, command rendering).
 *
 * @module @try-works/dsh-role-model/alias-store
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** A selected-alias store. */
export interface AliasStore {
  /** @returns the selected alias, or null when none is recorded. */
  readSelectedAlias(): string | null;
  /**
   * Record the selected alias; a blank value clears the selection.
   * @param alias - the alias id to persist.
   */
  writeSelectedAlias(alias: string): void;
}

/** The file name this plugin owns inside its config directory. */
export const ALIAS_STORE_FILE = "role-model.json";

/**
 * Resolve the config-owned alias store path.
 * @param env - environment consulted for `DSH_HOME`.
 * @returns the absolute path.
 */
export function defaultAliasStorePath(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const home = env.DSH_HOME?.trim();
  const base = home !== undefined && home.length > 0 ? home : join(homedir(), ".dsh");
  return join(base, "dsh-role-model", ALIAS_STORE_FILE);
}

/** Normalize a candidate alias to a stored value or null. */
function normalizeAlias(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Create an in-memory alias store. Useful for tests and for contexts where no
 * durable config path is available.
 * @returns the store.
 */
export function createAliasStore(): AliasStore {
  let selected: string | null = null;
  return {
    readSelectedAlias: () => selected,
    writeSelectedAlias: (alias: string) => {
      selected = normalizeAlias(alias);
    },
  };
}

/**
 * Create a file-backed alias store.
 * @param path - absolute path to the store file.
 * @returns the store; every failure degrades to "no alias selected".
 */
export function createFileAliasStore(path: string): AliasStore {
  return {
    readSelectedAlias: (): string | null => {
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
        if (typeof parsed !== "object" || parsed === null) return null;
        return normalizeAlias((parsed as { selectedAlias?: unknown }).selectedAlias);
      } catch {
        return null;
      }
    },
    writeSelectedAlias: (alias: string): void => {
      const normalized = normalizeAlias(alias);
      const payload = `${JSON.stringify({ selectedAlias: normalized }, null, 2)}\n`;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, payload, "utf8");
    },
  };
}

/**
 * Create the default store for a plugin configuration.
 * @param input - optional explicit path and environment.
 * @returns the store.
 */
export function createConfiguredAliasStore(
  input: {
    readonly path?: string | undefined;
    readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  } = {},
): AliasStore {
  const path = input.path?.trim();
  return createFileAliasStore(
    path !== undefined && path.length > 0 ? path : defaultAliasStorePath(input.env ?? process.env),
  );
}
