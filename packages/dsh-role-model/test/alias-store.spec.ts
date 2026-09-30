/**
 * L1: selected-alias persistence.
 *
 * The selected alias is plugin configuration state, so it lives in a
 * config-owned file rather than in another agent's home directory. Nothing here
 * may throw at the caller: a missing or corrupt store means "no alias selected".
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  createAliasStore,
  createFileAliasStore,
  defaultAliasStorePath,
} from "../src/alias-store.js";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "dsh-role-model-alias-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("defaultAliasStorePath", () => {
  test("is config-owned, not another agent's home", () => {
    const path = defaultAliasStorePath({ DSH_HOME: "C:\\dsh-home" });
    expect(path).toContain("dsh-home");
    expect(path).toContain("role-model");
    expect(path).not.toContain(".pi");
  });

  test("never uses a capitalised product name", () => {
    expect(defaultAliasStorePath({ DSH_HOME: "/tmp/x" })).not.toMatch(/Role[ -]Model/u);
  });
});

describe("createAliasStore (in-memory port)", () => {
  test("starts with no selection", () => {
    expect(createAliasStore().readSelectedAlias()).toBeNull();
  });

  test("round-trips a selection", () => {
    const store = createAliasStore();
    store.writeSelectedAlias("baseline.remote-only");
    expect(store.readSelectedAlias()).toBe("baseline.remote-only");
  });

  test("clears on a blank write", () => {
    const store = createAliasStore();
    store.writeSelectedAlias("a");
    store.writeSelectedAlias("   ");
    expect(store.readSelectedAlias()).toBeNull();
  });
});

describe("createFileAliasStore", () => {
  test("reads null when the file does not exist", () => {
    const store = createFileAliasStore(join(temporaryDirectory(), "nested", "role-model.json"));
    expect(store.readSelectedAlias()).toBeNull();
  });

  test("creates parent directories and round-trips a selection", () => {
    const path = join(temporaryDirectory(), "nested", "deeper", "role-model.json");
    const store = createFileAliasStore(path);
    store.writeSelectedAlias("baseline.hybrid");
    expect(store.readSelectedAlias()).toBe("baseline.hybrid");
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ selectedAlias: "baseline.hybrid" });
  });

  test("writes a trailing newline so the file is patch-editor friendly", () => {
    const path = join(temporaryDirectory(), "role-model.json");
    createFileAliasStore(path).writeSelectedAlias("a");
    expect(readFileSync(path, "utf8").endsWith("\n")).toBe(true);
  });

  test("reads null from malformed JSON rather than throwing", () => {
    const path = join(temporaryDirectory(), "role-model.json");
    writeFileSync(path, "{ not json");
    expect(createFileAliasStore(path).readSelectedAlias()).toBeNull();
  });

  test("reads null when the alias field is missing or the wrong type", () => {
    const path = join(temporaryDirectory(), "role-model.json");
    writeFileSync(path, JSON.stringify({ other: 1 }));
    expect(createFileAliasStore(path).readSelectedAlias()).toBeNull();
    writeFileSync(path, JSON.stringify({ selectedAlias: 42 }));
    expect(createFileAliasStore(path).readSelectedAlias()).toBeNull();
    writeFileSync(path, JSON.stringify({ selectedAlias: "   " }));
    expect(createFileAliasStore(path).readSelectedAlias()).toBeNull();
  });

  test("clearing removes the recorded alias", () => {
    const path = join(temporaryDirectory(), "role-model.json");
    const store = createFileAliasStore(path);
    store.writeSelectedAlias("a");
    store.writeSelectedAlias("");
    expect(store.readSelectedAlias()).toBeNull();
  });

  test("reads a file written by an explicit write over a corrupt one", () => {
    const path = join(temporaryDirectory(), "role-model.json");
    writeFileSync(path, "garbage");
    const store = createFileAliasStore(path);
    store.writeSelectedAlias("a");
    expect(store.readSelectedAlias()).toBe("a");
  });
});
