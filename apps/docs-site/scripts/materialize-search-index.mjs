import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const buildClientDir = resolve(scriptDir, "..", "build", "client");
const sourcePath = resolve(buildClientDir, "api", "search");
const outputPath = resolve(buildClientDir, "api", "search.json");

const raw = await readFile(sourcePath, "utf8");
JSON.parse(raw);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, raw);

console.log(`Materialized search index at ${outputPath}`);
