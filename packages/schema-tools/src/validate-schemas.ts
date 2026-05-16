import { spawn } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";
import { type JSONSchema, compile } from "json-schema-to-typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");
const fixtureRoot = path.join(repoRoot, "protocol", "fixtures");
const protocolTypesOutput = path.join(
  repoRoot,
  "packages",
  "protocol-types",
  "src",
  "generated.ts",
);
const biomeExecutable = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "biome.CMD" : "biome",
);

type JsonSchema = Exclude<JSONSchema, boolean>;
type CanonicalJsonSchema = JsonSchema & { $id: string };

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JsonSchema {
  return isJsonObject(value);
}

function getSchemaTitle(schema: unknown): string | null {
  return isJsonObject(schema) && typeof schema.title === "string" && schema.title.trim().length > 0
    ? schema.title
    : null;
}
export type FixtureFamily = "top-level" | "router" | "profile" | "trace" | "usage" | "role-task";
export type FixtureCategory = "example" | "basic" | "minimal" | "edge" | "invalid";
export type FixtureExpectation = "valid" | "invalid";
export type FixtureEntry = {
  filePath: string;
  schemaFile: string;
  family: FixtureFamily;
  category: FixtureCategory;
  expectation: FixtureExpectation;
};
export const fixtureValidationManifest = [
  {
    filePath: path.join(fixtureRoot, "example-endpoint-identity.json"),
    schemaFile: "endpoint-identity.schema.json",
    family: "top-level",
    category: "example",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "example-router-decision.json"),
    schemaFile: "router-decision.schema.json",
    family: "top-level",
    category: "example",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "example-usage-event.json"),
    schemaFile: "usage-event.schema.json",
    family: "top-level",
    category: "example",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "router-golden", "router-decision-basic.json"),
    schemaFile: "router-decision.schema.json",
    family: "router",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "router-golden", "router-decision-minimal.json"),
    schemaFile: "router-decision.schema.json",
    family: "router",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "router-golden", "router-decision-edge-empty-selection.json"),
    schemaFile: "router-decision.schema.json",
    family: "router",
    category: "edge",
    expectation: "valid",
  },
  {
    filePath: path.join(
      fixtureRoot,
      "router-golden",
      "router-decision-invalid-missing-app-id.json",
    ),
    schemaFile: "router-decision.schema.json",
    family: "router",
    category: "invalid",
    expectation: "invalid",
  },
  {
    filePath: path.join(fixtureRoot, "profile-golden", "observed-performance-basic.json"),
    schemaFile: "observed-performance-profile.schema.json",
    family: "profile",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "profile-golden", "observed-performance-minimal.json"),
    schemaFile: "observed-performance-profile.schema.json",
    family: "profile",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(
      fixtureRoot,
      "profile-golden",
      "observed-performance-edge-error-rates.json",
    ),
    schemaFile: "observed-performance-profile.schema.json",
    family: "profile",
    category: "edge",
    expectation: "valid",
  },
  {
    filePath: path.join(
      fixtureRoot,
      "profile-golden",
      "observed-performance-invalid-missing-endpoint-version.json",
    ),
    schemaFile: "observed-performance-profile.schema.json",
    family: "profile",
    category: "invalid",
    expectation: "invalid",
  },
  {
    filePath: path.join(fixtureRoot, "trace-golden", "trace-span-basic.json"),
    schemaFile: "trace-span.schema.json",
    family: "trace",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "trace-golden", "trace-event-basic.json"),
    schemaFile: "trace-event.schema.json",
    family: "trace",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "trace-golden", "trace-span-minimal.json"),
    schemaFile: "trace-span.schema.json",
    family: "trace",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "trace-golden", "trace-event-edge-no-span.json"),
    schemaFile: "trace-event.schema.json",
    family: "trace",
    category: "edge",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "trace-golden", "trace-event-invalid-missing-request-id.json"),
    schemaFile: "trace-event.schema.json",
    family: "trace",
    category: "invalid",
    expectation: "invalid",
  },
  {
    filePath: path.join(fixtureRoot, "usage-golden", "usage-event-basic.json"),
    schemaFile: "usage-event.schema.json",
    family: "usage",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "usage-golden", "usage-event-minimal.json"),
    schemaFile: "usage-event.schema.json",
    family: "usage",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "usage-golden", "usage-event-edge-benchmark.json"),
    schemaFile: "usage-event.schema.json",
    family: "usage",
    category: "edge",
    expectation: "valid",
  },
  {
    filePath: path.join(
      fixtureRoot,
      "usage-golden",
      "usage-event-invalid-missing-routing-decision.json",
    ),
    schemaFile: "usage-event.schema.json",
    family: "usage",
    category: "invalid",
    expectation: "invalid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "role-definition-basic.json"),
    schemaFile: "role-definition.schema.json",
    family: "role-task",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "task-definition-basic.json"),
    schemaFile: "task-definition.schema.json",
    family: "role-task",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "task-execution-profile-basic.json"),
    schemaFile: "task-execution-profile.schema.json",
    family: "role-task",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "role-binding-basic.json"),
    schemaFile: "role-binding.schema.json",
    family: "role-task",
    category: "basic",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "role-definition-minimal.json"),
    schemaFile: "role-definition.schema.json",
    family: "role-task",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "role-binding-minimal.json"),
    schemaFile: "role-binding.schema.json",
    family: "role-task",
    category: "minimal",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "task-definition-edge.json"),
    schemaFile: "task-definition.schema.json",
    family: "role-task",
    category: "edge",
    expectation: "valid",
  },
  {
    filePath: path.join(fixtureRoot, "role-task-golden", "role-binding-invalid-status.json"),
    schemaFile: "role-binding.schema.json",
    family: "role-task",
    category: "invalid",
    expectation: "invalid",
  },
] as const satisfies readonly FixtureEntry[];

export function getFixtureValidationCounts(): {
  totalCount: number;
  validCount: number;
  invalidCount: number;
} {
  const validCount = fixtureValidationManifest.filter(
    (fixture) => fixture.expectation === "valid",
  ).length;
  return {
    totalCount: fixtureValidationManifest.length,
    validCount,
    invalidCount: fixtureValidationManifest.length - validCount,
  };
}

function assertCanonicalSchemaId(fileName: string, schema: JsonSchema): CanonicalJsonSchema {
  const schemaId = schema.$id;

  if (typeof schemaId !== "string" || !schemaId) {
    throw new Error(`Schema ${fileName} is missing a top-level string $id.`);
  }

  if (schemaId !== fileName) {
    throw new Error(`Schema ${fileName} must declare $id "${fileName}", received "${schemaId}".`);
  }

  return schema as CanonicalJsonSchema;
}

export async function loadSchemas(): Promise<
  Array<{ fileName: string; schema: CanonicalJsonSchema }>
> {
  const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
  return Promise.all(
    names.map(async (fileName) => {
      const schema = JSON.parse(
        await readFile(path.join(schemaDir, fileName), "utf8"),
      ) as JsonSchema;

      return {
        fileName,
        schema: assertCanonicalSchemaId(fileName, schema),
      };
    }),
  );
}

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

  const schemas = await loadSchemas();
  for (const { schema } of schemas) {
    ajv.addSchema(schema, schema.$id);
  }

  return { ajv, schemas };
}

function assertFixtureValid(
  validate: ((data: unknown) => boolean) & { errors?: unknown },
  payload: unknown,
  filePath: string,
): void {
  if (!validate(payload)) {
    throw new Error(
      `Fixture ${filePath} failed validation:\n${JSON.stringify(validate.errors, null, 2)}`,
    );
  }
}

function assertFixtureInvalid(
  validate: ((data: unknown) => boolean) & { errors?: unknown },
  payload: unknown,
  filePath: string,
): void {
  if (validate(payload)) {
    throw new Error(`Fixture ${filePath} unexpectedly passed validation.`);
  }
}

export async function validateFixtures(
  existing: Awaited<ReturnType<typeof createAjv>> | undefined = undefined,
): Promise<number> {
  const { ajv } = existing ?? (await createAjv());
  for (const fixture of fixtureValidationManifest) {
    const validate = ajv.getSchema(fixture.schemaFile);
    if (!validate) {
      throw new Error(`Schema ${fixture.schemaFile} is not available for fixture validation.`);
    }

    const payload = JSON.parse(await readFile(fixture.filePath, "utf8")) as unknown;
    if (fixture.expectation === "valid") {
      assertFixtureValid(validate, payload, fixture.filePath);
      continue;
    }

    assertFixtureInvalid(validate, payload, fixture.filePath);
  }

  return fixtureValidationManifest.length;
}

export async function validateSchemas(): Promise<void> {
  const { ajv, schemas } = await createAjv();
  for (const { schema } of schemas) {
    ajv.compile(schema);
  }
  for (const { fileName, schema } of schemas) {
    if (typeof schema.title !== "string" || !schema.title) {
      throw new Error(`Schema ${fileName} is missing a string title.`);
    }
  }

  console.log(`Validated ${schemas.length} schema file(s).`);
  const fixtureCount = await validateFixtures({ ajv, schemas });
  console.log(`Validated ${fixtureCount} fixture file(s).`);
}

export async function generateProtocolTypes(outputPath = protocolTypesOutput): Promise<void> {
  const schemas = await loadSchemas();
  const blocks: string[] = [
    "// Generated by packages/schema-tools/src/validate-schemas.ts generate-types",
    "// Do not edit by hand.",
    "",
  ];
  const emittedTypeNames = new Set<string>();

  for (const { fileName, schema } of schemas) {
    if (isJsonObject(schema.$defs)) {
      for (const definition of Object.values(schema.$defs)) {
        if (!isJsonSchema(definition)) {
          continue;
        }
        const definitionTitle = getSchemaTitle(definition);
        if (!definitionTitle || emittedTypeNames.has(definitionTitle)) {
          continue;
        }
        blocks.push(
          await compile(definition, definitionTitle, {
            bannerComment: "",
            cwd: schemaDir,
            declareExternallyReferenced: false,
            unreachableDefinitions: true,
            style: { singleQuote: true },
          }),
        );
        blocks.push("");
        emittedTypeNames.add(definitionTitle);
      }
    }

    const schemaTitle = String(schema.title);
    blocks.push(
      await compile(schema, schemaTitle, {
        bannerComment: "",
        cwd: schemaDir,
        declareExternallyReferenced: false,
        unreachableDefinitions: true,
        style: { singleQuote: true },
      }),
    );
    blocks.push("");
    emittedTypeNames.add(schemaTitle);
    console.log(`Generated types for ${fileName}`);
  }

  await writeFile(outputPath, `${blocks.join("\n").trim()}\n`, "utf8");
  await formatGeneratedTypes(outputPath);
}

async function formatGeneratedTypes(outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command =
      process.platform === "win32"
        ? {
            file: "cmd.exe",
            args: ["/c", biomeExecutable, "format", "--write", outputPath],
          }
        : { file: biomeExecutable, args: ["format", "--write", outputPath] };
    const child = spawn(command.file, command.args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Biome formatting failed for generated protocol types with exit code ${code ?? "unknown"}.`,
        ),
      );
    });
  });
}

async function main(): Promise<void> {
  const program = new Command()
    .name("validate-schemas")
    .argument("<mode>", "validate | generate-types");

  program.parse(process.argv);
  const [mode] = program.args;

  if (mode === "validate") {
    await validateSchemas();
    return;
  }

  if (mode === "generate-types") {
    await generateProtocolTypes();
    return;
  }

  throw new Error(`Unsupported mode: ${mode}`);
}

if (process.argv[1] === __filename) {
  await main();
}
