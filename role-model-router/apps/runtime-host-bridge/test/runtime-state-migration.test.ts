import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { migrateLegacyProductionState } from "../src/runtime-state-migration.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function put(root: string, relativePath: string, content: string): Promise<void> {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("legacy production state migration", () => {
  test("merges Windows and raw-SEA layouts with deterministic precedence", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "role-model-state-migration-"));
    roots.push(base);
    const legacy = path.join(base, "Role Model Runtime");
    const destination = path.join(base, "role-model-runtime");

    await put(legacy, "standalone-runtime/credentials/shared.json", "windows");
    await put(legacy, "state/runtime-host-bridge/credentials/shared.json", "unix");
    await put(legacy, "runtime-config.yaml", "windows-config");
    await put(legacy, "state/runtime-config.yaml", "raw-sea-config");
    await put(legacy, "state/runtime-host-bridge/operator-intent.json", "intent");
    await put(legacy, "state/runtime-host-bridge/memory/memory.sqlite-wal", "wal");
    await put(legacy, "logs/runtime-http.log", "do-not-copy");
    await put(destination, "standalone-runtime/credentials/existing.json", "destination");

    const receipt = await migrateLegacyProductionState({
      legacyRoot: legacy,
      destinationRoot: destination,
    });

    await expect(
      readFile(path.join(destination, "standalone-runtime/credentials/shared.json"), "utf8"),
    ).resolves.toBe("windows");
    await expect(
      readFile(path.join(destination, "state/runtime-config.yaml"), "utf8"),
    ).resolves.toBe("windows-config");
    await expect(
      readFile(path.join(destination, "standalone-runtime/operator-intent.json"), "utf8"),
    ).resolves.toBe("intent");
    await expect(
      readFile(path.join(destination, "standalone-runtime/memory/memory.sqlite-wal"), "utf8"),
    ).resolves.toBe("wal");
    await expect(
      readFile(path.join(destination, "logs/runtime-http.log"), "utf8"),
    ).rejects.toThrow();
    expect(receipt.conflicts).toContain("standalone-runtime/credentials/shared.json");
  });

  test("never overwrites canonical destination state and is repeatable", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "role-model-state-idempotent-"));
    roots.push(base);
    const legacy = path.join(base, "Role Model Runtime");
    const destination = path.join(base, "role-model-runtime");
    await put(legacy, "standalone-runtime/credentials/token.json", "legacy");
    await put(destination, "standalone-runtime/credentials/token.json", "canonical");

    await migrateLegacyProductionState({ legacyRoot: legacy, destinationRoot: destination });
    await migrateLegacyProductionState({ legacyRoot: legacy, destinationRoot: destination });

    await expect(
      readFile(path.join(destination, "standalone-runtime/credentials/token.json"), "utf8"),
    ).resolves.toBe("canonical");
  });
});
