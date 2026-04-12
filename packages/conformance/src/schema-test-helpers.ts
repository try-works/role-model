import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

type JsonSchema = Record<string, unknown>;

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
    ajv.addSchema({ $id: fileName, ...schema }, fileName);
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
