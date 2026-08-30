import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));

describe("clean checkout runtime test contract", () => {
  it("builds profile-aggregator before runtime suites import its dist entrypoint", async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    for (const scriptName of ["test:critical", "test:router"]) {
      expect(packageJson.scripts[scriptName]).toContain(
        "pnpm --filter @role-model-router/profile-aggregator build",
      );
    }
  });
});
