import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { fixtureValidationManifest, getFixtureValidationCounts, validateFixtures } from "@role-model/schema-tools";
import { describe, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const execFileAsync = promisify(execFile);

describe("run01 protocol fixture conformance", () => {
  test("schema-tools validate the expanded valid and invalid fixture manifest", async () => {
    const counts = getFixtureValidationCounts();
    const requiredFamilies = ["router", "profile", "trace", "usage", "role-task"] as const;
    const requiredCategories = ["basic", "minimal", "edge", "invalid"] as const;

    for (const family of requiredFamilies) {
      for (const category of requiredCategories) {
        const matchingFixtures = fixtureValidationManifest.filter(
          (fixture) => fixture.family === family && fixture.category === category,
        );
        if (matchingFixtures.length === 0) {
          throw new Error(`Fixture manifest is missing ${family}/${category} coverage.`);
        }
      }
    }

    if (counts.invalidCount === 0) {
      throw new Error("Fixture manifest must include invalid fixtures.");
    }

    const validatedCount = await validateFixtures();
    if (validatedCount !== counts.totalCount) {
      throw new Error(
        `validateFixtures returned ${validatedCount}, expected ${counts.totalCount}.`,
      );
    }
  });

  test("schemas:validate reports fixture validation as part of the canonical schema-tool path", async () => {
    const command =
      process.platform === "win32"
        ? {
            file: "cmd.exe",
            args: ["/c", "corepack pnpm run schemas:validate"],
          }
        : {
            file: "sh",
            args: ["-lc", "corepack pnpm run schemas:validate"],
          };

    const result = await execFileAsync(command.file, command.args, {
      cwd: repoRoot,
      windowsHide: true,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    const counts = getFixtureValidationCounts();

    if (!new RegExp(`Validated ${counts.totalCount} fixture file\\(s\\)\\.`,"u").test(output)) {
      throw new Error(output);
    }
  }, 60_000);
});
