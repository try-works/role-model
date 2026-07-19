import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const docsRoot = path.resolve("content", "docs");
const repoRoot = path.resolve(process.cwd(), "..", "..");
const canonicalRoot = path.join(
  repoRoot,
  "role-model-router",
  "packages",
  "core",
  "data",
  "taxonomy",
);
const compactRoot = path.join(repoRoot, "packages", "pi-role-model", "data", "taxonomy");
const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));
const hashFile = (filePath) =>
  `sha256:${createHash("sha256").update(readFileSync(filePath)).digest("hex")}`;
const canonical = {
  manifest: readJson(path.join(canonicalRoot, "manifest.json")),
  groups: readJson(path.join(canonicalRoot, "groups.json")),
  roles: readJson(path.join(canonicalRoot, "roles.json")),
  tasks: readJson(path.join(canonicalRoot, "task-types.json")),
  capabilities: readJson(path.join(canonicalRoot, "capabilities.json")),
  modalities: readJson(path.join(canonicalRoot, "modalities.json")),
  toolClasses: readJson(path.join(canonicalRoot, "tool-classes.json")),
};
const compactManifest = readJson(path.join(compactRoot, "compact-manifest.json"));

async function listMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMdxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const staleTokens = ["`general.chat`", "`coder.patch`", "`tool.agent`", "`code.edit`"];

const requiredTokens = [
  "taxonomy V1",
  "`engineering`",
  "`product_design`",
  "`governance_safety`",
  "`coder.edit`",
  "`security.audit`",
  "`product.requirements`",
  "`role_model.intent`",
  "`@try-works/pi-role-model`",
  "default to all roles",
  "all/include/exclude",
  "`entryCounts`",
  "TAXONOMY_V1_CATALOG:START",
];

const files = await listMdxFiles(docsRoot);
const contentsByPath = new Map();
for (const file of files) {
  contentsByPath.set(file, await readFile(file, "utf8"));
}

const failures = [];
for (const [file, contents] of contentsByPath) {
  for (const token of staleTokens) {
    if (contents.includes(token)) {
      failures.push(`${path.relative(process.cwd(), file)} contains stale taxonomy token ${token}`);
    }
  }
}

const combined = [...contentsByPath.values()].join("\n");
for (const token of requiredTokens) {
  if (!combined.includes(token)) {
    failures.push(`docs-site taxonomy V1 content is missing required token ${token}`);
  }
}

const expectedCounts = {
  groups: canonical.groups.length,
  roles: canonical.roles.length,
  taskTypes: canonical.tasks.length,
  capabilities: canonical.capabilities.length,
  modalities: canonical.modalities.length,
  toolClasses: canonical.toolClasses.length,
};
for (const [key, value] of Object.entries(expectedCounts)) {
  if (canonical.manifest.entryCounts[key] !== value) {
    failures.push(
      `canonical manifest entryCounts.${key} is ${canonical.manifest.entryCounts[key]}, expected ${value}`,
    );
  }
  if (!combined.includes(`${key}: ${value}`) && !combined.includes(`"${key}": ${value}`)) {
    failures.push(`docs-site taxonomy V1 content is missing canonical count ${key}: ${value}`);
  }
}

for (const [key, fileName] of Object.entries(canonical.manifest.entryFiles)) {
  const actualHash = hashFile(path.join(canonicalRoot, fileName));
  if (canonical.manifest.contentHashes[key] !== actualHash) {
    failures.push(
      `canonical manifest contentHashes.${key} is ${canonical.manifest.contentHashes[key]}, expected ${actualHash}`,
    );
  }
}
if (compactManifest.taxonomyVersion !== canonical.manifest.taxonomyVersion) {
  failures.push("Pi compact manifest taxonomyVersion does not match canonical runtime manifest");
}
if (compactManifest.contentRevision !== canonical.manifest.contentRevision) {
  failures.push("Pi compact manifest contentRevision does not match canonical runtime manifest");
}
if (
  compactManifest.classificationContractVersion !== canonical.manifest.classificationContractVersion
) {
  failures.push(
    "Pi compact manifest classificationContractVersion does not match canonical runtime manifest",
  );
}
for (const [key, value] of Object.entries(canonical.manifest.contentHashes)) {
  if (compactManifest.runtimeContentHashes?.[key] !== value) {
    failures.push(
      `Pi compact manifest runtimeContentHashes.${key} does not match canonical manifest`,
    );
  }
}
for (const [key, fileName] of Object.entries(compactManifest.entryFiles)) {
  const actualHash = hashFile(path.join(compactRoot, fileName));
  if (compactManifest.contentHashes[key] !== actualHash) {
    failures.push(
      `Pi compact manifest contentHashes.${key} is ${compactManifest.contentHashes[key]}, expected ${actualHash}`,
    );
  }
}
for (const [roleId, fileName] of Object.entries(compactManifest.roleTaskChunkFiles ?? {})) {
  const actualHash = hashFile(path.join(compactRoot, fileName));
  if (compactManifest.roleTaskChunkHashes?.[roleId] !== actualHash) {
    failures.push(
      `Pi compact manifest roleTaskChunkHashes.${roleId} is ${compactManifest.roleTaskChunkHashes?.[roleId]}, expected ${actualHash}`,
    );
  }
}

const requiredIds = [
  ...canonical.groups.map((entry) => entry.id),
  ...canonical.roles.map((entry) => entry.id),
  ...canonical.tasks.map((entry) => entry.id),
  ...canonical.capabilities.map((entry) => entry.id),
  ...canonical.modalities.map((entry) => entry.id),
  ...canonical.toolClasses.map((entry) => entry.id),
];
for (const id of requiredIds) {
  if (!combined.includes(`\`${id}\``)) {
    failures.push(`docs-site taxonomy V1 content is missing canonical identifier \`${id}\``);
  }
}

const requiredGuidanceTaskIds = [
  "coder.edit",
  "security.audit",
  "researcher.web_research.current",
  "support.ticket.reply",
  "architect.migration.strategy",
  "product.requirements",
];
for (const taskId of requiredGuidanceTaskIds) {
  const task = canonical.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    failures.push(`canonical task ${taskId} is missing`);
    continue;
  }
  for (const [field, value] of [
    ["description", task.description],
    ["classifier.useWhen", task.classifier?.useWhen],
    ["classifier.doNotUseWhen", task.classifier?.doNotUseWhen],
  ]) {
    if (typeof value !== "string" || !combined.includes(value)) {
      failures.push(`docs-site taxonomy V1 content is missing ${field} for ${taskId}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `taxonomy V1 docs/hash parity check passed for ${files.length} MDX files and ${requiredIds.length} canonical identifiers`,
);
