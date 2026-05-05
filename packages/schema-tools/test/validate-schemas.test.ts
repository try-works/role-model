import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  fixtureValidationManifest,
  getFixtureValidationCounts,
  loadSchemas,
  validateFixtures,
} from "../src/validate-schemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const schemaDir = path.resolve(__dirname, "..", "..", "..", "protocol", "schemas");

async function createAjv() {
  const ajvModule: typeof import("ajv/dist/2020.js") = require("ajv/dist/2020.js");
  const formatsModule: typeof import("ajv-formats") = require("ajv-formats");
  const Ajv2020 = ajvModule.default;
  const addFormats = formatsModule.default;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  for (const { schema } of await loadSchemas()) {
    ajv.addSchema(schema, schema.$id);
  }

  return ajv;
}

describe("loadSchemas", () => {
  it("requires canonical schema source files to declare stable $id values matching their filenames", async () => {
    const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
    const mismatches: Array<{ fileName: string; id: string | null }> = [];

    for (const fileName of names) {
      const schema = JSON.parse(await readFile(path.join(schemaDir, fileName), "utf8")) as {
        $id?: unknown;
      };

      if (schema.$id !== fileName) {
        mismatches.push({
          fileName,
          id: typeof schema.$id === "string" ? schema.$id : null,
        });
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("returns the same canonical $id values declared in source", async () => {
    const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
    const sourceIds = await Promise.all(
      names.map(async (fileName) => {
        const schema = JSON.parse(await readFile(path.join(schemaDir, fileName), "utf8")) as {
          $id?: unknown;
        };

        return [fileName, typeof schema.$id === "string" ? schema.$id : null] as const;
      }),
    );

    const loadedIds = (await loadSchemas()).map(({ fileName, schema }) => [
      fileName,
      typeof schema.$id === "string" ? schema.$id : null,
    ]);

    expect(loadedIds).toEqual(sourceIds);
  });

  it("declares manifest coverage for valid, invalid, minimal, and edge fixtures across in-scope families", () => {
    const requiredFamilies = ["router", "profile", "trace", "usage", "role-task"] as const;
    const requiredCategories = ["basic", "minimal", "edge", "invalid"] as const;

    for (const family of requiredFamilies) {
      for (const category of requiredCategories) {
        expect(
          fixtureValidationManifest.some(
            (fixture) => fixture.family === family && fixture.category === category,
          ),
        ).toBe(true);
      }
    }
  });

  it("treats manifest expectations as authoritative for valid and invalid fixtures", async () => {
    const ajv = await createAjv();

    for (const fixture of fixtureValidationManifest) {
      const validate = ajv.getSchema(fixture.schemaFile);
      expect(validate, `${fixture.schemaFile} must be compiled`).toBeTypeOf("function");

      const payload = JSON.parse(await readFile(fixture.filePath, "utf8")) as unknown;
      expect(validate?.(payload) ?? false).toBe(fixture.expectation === "valid");
    }
  });

  it("validates the full fixture manifest through the schema-tool entrypoint", async () => {
    const counts = getFixtureValidationCounts();

    expect(counts.validCount).toBeGreaterThan(0);
    expect(counts.invalidCount).toBeGreaterThan(0);
    await expect(validateFixtures()).resolves.toBe(counts.totalCount);
  });
});
