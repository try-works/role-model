import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadSchemas } from "../src/validate-schemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.resolve(__dirname, "..", "..", "..", "protocol", "schemas");

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
});
