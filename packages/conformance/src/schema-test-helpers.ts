import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

type JsonSchema = Record<string, unknown>;

function assertCanonicalSchemaId(fileName: string, schema: JsonSchema): asserts schema is JsonSchema & {
  $id: string;
} {
  const schemaId = schema.$id;

  if (typeof schemaId !== "string" || !schemaId) {
    throw new Error(`Schema ${fileName} is missing a top-level string $id.`);
  }

  if (schemaId !== fileName) {
    throw new Error(`Schema ${fileName} must declare $id "${fileName}", received "${schemaId}".`);
  }
}

export async function createAjv(schemaDir: string) {
  const ajvModule: typeof import("ajv/dist/2020.js") = require("ajv/dist/2020.js");
  const formatsModule: typeof import("ajv-formats") = require("ajv-formats");
  const Ajv2020 = ajvModule.default;
  const addFormats = formatsModule.default;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
  for (const fileName of names) {
    const schema = JSON.parse(await readFile(path.join(schemaDir, fileName), "utf8")) as JsonSchema;
    assertCanonicalSchemaId(fileName, schema);
    ajv.addSchema(schema, schema.$id);
  }

  return ajv;
}

export function assertValid(
  validate: ((data: unknown) => boolean) & { errors?: unknown },
  payload: unknown,
  label?: string,
): void {
  if (!validate(payload)) {
    const details = JSON.stringify(validate.errors, null, 2);
    throw new Error(label ? `${label}\n${details}` : details);
  }
}
