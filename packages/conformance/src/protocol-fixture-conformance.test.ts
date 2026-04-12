import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, test } from "vitest";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");
const fixtureRoot = path.join(repoRoot, "protocol", "fixtures");
const execFileAsync = promisify(execFile);

const topLevelFixtures = [
  {
    fileName: "example-endpoint-identity.json",
    schemaFile: "endpoint-identity.schema.json",
  },
  {
    fileName: "example-router-decision.json",
    schemaFile: "router-decision.schema.json",
  },
  {
    fileName: "example-usage-event.json",
    schemaFile: "usage-event.schema.json",
  },
] as const;

const requiredFixtureGroups = [
  {
    directory: "router-golden",
    fixtures: [{ fileName: "router-decision-basic.json", schemaFile: "router-decision.schema.json" }],
  },
  {
    directory: "profile-golden",
    fixtures: [
      {
        fileName: "observed-performance-basic.json",
        schemaFile: "observed-performance-profile.schema.json",
      },
    ],
  },
  {
    directory: "trace-golden",
    fixtures: [
      { fileName: "trace-span-basic.json", schemaFile: "trace-span.schema.json" },
      { fileName: "trace-event-basic.json", schemaFile: "trace-event.schema.json" },
    ],
  },
  {
    directory: "usage-golden",
    fixtures: [{ fileName: "usage-event-basic.json", schemaFile: "usage-event.schema.json" }],
  },
  {
    directory: "role-task-golden",
    fixtures: [
      { fileName: "role-definition-basic.json", schemaFile: "role-definition.schema.json" },
      { fileName: "task-definition-basic.json", schemaFile: "task-definition.schema.json" },
      {
        fileName: "task-execution-profile-basic.json",
        schemaFile: "task-execution-profile.schema.json",
      },
      { fileName: "role-binding-basic.json", schemaFile: "role-binding.schema.json" },
    ],
  },
] as const;

describe("run01 protocol fixture conformance", () => {
  test("top-level example fixtures and required fixture directories validate against canonical schemas", async () => {
    const ajv = await createAjv(schemaDir);

    for (const fixture of topLevelFixtures) {
      const validate = ajv.getSchema(fixture.schemaFile);
      if (!validate) {
        throw new Error(`${fixture.schemaFile} did not compile`);
      }

      const fixturePath = path.join(fixtureRoot, fixture.fileName);
      const payload = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
      assertValid(validate, payload, fixturePath);
    }

    for (const group of requiredFixtureGroups) {
      const directoryPath = path.join(fixtureRoot, group.directory);
      const fileNames = await readdir(directoryPath);
      if (fileNames.length < group.fixtures.length) {
        throw new Error(
          `${directoryPath} must contain at least ${group.fixtures.length} fixture file(s)`,
        );
      }

      for (const fixture of group.fixtures) {
        const validate = ajv.getSchema(fixture.schemaFile);
        if (!validate) {
          throw new Error(`${fixture.schemaFile} did not compile`);
        }

        const fixturePath = path.join(directoryPath, fixture.fileName);
        const payload = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
        assertValid(validate, payload, fixturePath);
      }
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

    if (!/Validated 12 fixture file\(s\)\./u.test(output)) {
      throw new Error(output);
    }
  }, 60_000);
});
