import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createFileAliasStore } from "../src/alias-store.js";

describe("file-backed alias store", () => {
  test("persists the selected alias for later Pi command invocations", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pi-role-model-"));
    const statePath = join(dir, "role-model.json");
    const store = createFileAliasStore(statePath);

    await expect(store.readSelectedAlias()).resolves.toBeNull();
    await store.writeSelectedAlias("default.decision-only");

    await expect(store.readSelectedAlias()).resolves.toBe("default.decision-only");
    await expect(readFile(statePath, "utf8")).resolves.toContain("default.decision-only");
  });
});
