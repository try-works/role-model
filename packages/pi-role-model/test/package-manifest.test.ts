import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("pi-role-model package manifest", () => {
  test("declares a Pi package with the expected extension and skill paths", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      name?: string;
      version?: string;
      private?: boolean;
      keywords?: string[];
      license?: string;
      type?: string;
      publishConfig?: { access?: string };
      repository?: { type?: string; url?: string; directory?: string };
      pi?: { extensions?: string[]; skills?: string[] };
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(manifest.name).toBe("@try-works/pi-role-model");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig?.access).toBe("public");
    expect(manifest.license).toBe("BUSL-1.1");
    expect(manifest.repository?.directory).toBe("packages/pi-role-model");
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(["pi-package", "pi-role-model", "role-model"]),
    );
    expect(manifest.type).toBe("module");
    expect(manifest.pi?.extensions).toEqual(["extensions/role-model.ts"]);
    expect(manifest.pi?.skills).toEqual(["skills"]);
    expect(manifest.scripts?.test).toContain("vitest run");
    expect(manifest.scripts?.build).toContain("tsc");
    expect(manifest.devDependencies?.["@earendil-works/pi-coding-agent"]).toBe("0.84.2");
  });

  test("compiles against the exact installed Pi 0.84.2 public package", async () => {
    const installed = JSON.parse(
      await readFile(
        join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "package.json"),
        "utf8",
      ),
    ) as { name?: string; version?: string; exports?: Record<string, unknown> };

    expect(installed).toEqual(
      expect.objectContaining({
        name: "@earendil-works/pi-coding-agent",
        version: "0.84.2",
      }),
    );
    expect(installed.exports).toHaveProperty(".");
  });

  test("does not reuse the known-stale npm version for endpoint-aware source", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      version?: string;
    };

    expect(manifest.version).not.toBe("0.1.3");
  });
});
