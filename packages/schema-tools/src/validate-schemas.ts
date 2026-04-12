import { spawn } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";
import { compile } from "json-schema-to-typescript";

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

type JsonSchema = Record<string, unknown>;
type FixtureEntry = {
  filePath: string;
  schemaFile: string;
};

const topLevelFixtures = [
  {
    filePath: path.join(fixtureRoot, "example-endpoint-identity.json"),
    schemaFile: "endpoint-identity.schema.json",
  },
  {
    filePath: path.join(fixtureRoot, "example-router-decision.json"),
    schemaFile: "router-decision.schema.json",
  },
  {
    filePath: path.join(fixtureRoot, "example-usage-event.json"),
    schemaFile: "usage-event.schema.json",
  },
] as const satisfies readonly FixtureEntry[];

const requiredFixtureGroups = [
  {
    directoryPath: path.join(fixtureRoot, "router-golden"),
    fixtures: [
      {
        filePath: path.join(fixtureRoot, "router-golden", "router-decision-basic.json"),
        schemaFile: "router-decision.schema.json",
      },
    ],
  },
  {
    directoryPath: path.join(fixtureRoot, "profile-golden"),
    fixtures: [
      {
        filePath: path.join(fixtureRoot, "profile-golden", "observed-performance-basic.json"),
        schemaFile: "observed-performance-profile.schema.json",
      },
    ],
  },
  {
    directoryPath: path.join(fixtureRoot, "trace-golden"),
    fixtures: [
      {
        filePath: path.join(fixtureRoot, "trace-golden", "trace-span-basic.json"),
        schemaFile: "trace-span.schema.json",
      },
      {
        filePath: path.join(fixtureRoot, "trace-golden", "trace-event-basic.json"),
        schemaFile: "trace-event.schema.json",
      },
    ],
  },
  {
    directoryPath: path.join(fixtureRoot, "usage-golden"),
    fixtures: [
      {
        filePath: path.join(fixtureRoot, "usage-golden", "usage-event-basic.json"),
        schemaFile: "usage-event.schema.json",
      },
    ],
  },
  {
    directoryPath: path.join(fixtureRoot, "role-task-golden"),
    fixtures: [
      {
        filePath: path.join(fixtureRoot, "role-task-golden", "role-definition-basic.json"),
        schemaFile: "role-definition.schema.json",
      },
      {
        filePath: path.join(fixtureRoot, "role-task-golden", "task-definition-basic.json"),
        schemaFile: "task-definition.schema.json",
      },
      {
        filePath: path.join(fixtureRoot, "role-task-golden", "task-execution-profile-basic.json"),
        schemaFile: "task-execution-profile.schema.json",
      },
      {
        filePath: path.join(fixtureRoot, "role-task-golden", "role-binding-basic.json"),
        schemaFile: "role-binding.schema.json",
      },
    ],
  },
] as const;

export async function loadSchemas(): Promise<Array<{ fileName: string; schema: JsonSchema }>> {
  const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(
    names.map(async (fileName) => ({
      fileName,
      schema: JSON.parse(await readFile(path.join(schemaDir, fileName), "utf8")) as JsonSchema,
    })),
  );

  return schemas.map(({ fileName, schema }) => ({
    fileName,
    schema: {
      $id: fileName,
      ...schema,
    },
  }));
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
    ajv.addSchema(schema, String(schema.$id));
  }

  return { ajv, schemas };
}

function assertFixtureValid(
  validate: ((data: unknown) => boolean) & { errors?: unknown },
  payload: unknown,
  filePath: string,
): void {
  if (!validate(payload)) {
    throw new Error(`Fixture ${filePath} failed validation:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
}

export async function validateFixtures(
  existing: Awaited<ReturnType<typeof createAjv>> | undefined = undefined,
): Promise<number> {
  const { ajv } = existing ?? (await createAjv());
  let validatedCount = 0;

  for (const fixture of topLevelFixtures) {
    const validate = ajv.getSchema(fixture.schemaFile);
    if (!validate) {
      throw new Error(`Schema ${fixture.schemaFile} is not available for fixture validation.`);
    }

    const payload = JSON.parse(await readFile(fixture.filePath, "utf8")) as unknown;
    assertFixtureValid(validate, payload, fixture.filePath);
    validatedCount += 1;
  }

  for (const group of requiredFixtureGroups) {
    const fileNames = await readdir(group.directoryPath);
    if (fileNames.length < group.fixtures.length) {
      throw new Error(
        `Fixture directory ${group.directoryPath} must contain at least ${group.fixtures.length} file(s).`,
      );
    }

    for (const fixture of group.fixtures) {
      const validate = ajv.getSchema(fixture.schemaFile);
      if (!validate) {
        throw new Error(`Schema ${fixture.schemaFile} is not available for fixture validation.`);
      }

      const payload = JSON.parse(await readFile(fixture.filePath, "utf8")) as unknown;
      assertFixtureValid(validate, payload, fixture.filePath);
      validatedCount += 1;
    }
  }

  return validatedCount;
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

export async function generateProtocolTypes(): Promise<void> {
  const schemas = await loadSchemas();
  const blocks: string[] = [
    "// Generated by packages/schema-tools/src/validate-schemas.ts generate-types",
    "// Do not edit by hand.",
    "",
  ];

  for (const { fileName, schema } of schemas) {
    blocks.push(
      await compile(schema, String(schema.title), {
        bannerComment: "",
        cwd: schemaDir,
        declareExternallyReferenced: false,
        style: { singleQuote: true },
      }),
    );
    blocks.push("");
    console.log(`Generated types for ${fileName}`);
  }

  await writeFile(protocolTypesOutput, `${blocks.join("\n").trim()}\n`, "utf8");
  await formatGeneratedTypes();
}

async function formatGeneratedTypes(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command =
      process.platform === "win32"
        ? {
            file: "cmd.exe",
            args: ["/c", biomeExecutable, "format", "--write", protocolTypesOutput],
          }
        : { file: biomeExecutable, args: ["format", "--write", protocolTypesOutput] };
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
