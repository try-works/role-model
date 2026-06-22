import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { join } from "node:path";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("pi-role-model package manifest", () => {
  test("declares a Pi package with the expected extension and skill paths", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      name?: string;
      type?: string;
      pi?: { extensions?: string[]; skills?: string[] };
      scripts?: Record<string, string>;
    };

    expect(manifest.name).toBe("pi-role-model");
    expect(manifest.type).toBe("module");
    expect(manifest.pi?.extensions).toEqual(["extensions/role-model.ts"]);
    expect(manifest.pi?.skills).toEqual(["skills"]);
    expect(manifest.scripts?.test).toContain("vitest run");
    expect(manifest.scripts?.build).toContain("tsc");
  });
});
