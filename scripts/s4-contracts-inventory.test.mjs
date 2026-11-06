/**
 * Run 115 S4a (R19): the CI-checkable contracts/callers inventory.
 *
 * The inventory is a machine-checked enumeration: every cited definition and caller must exist at a
 * real line in the repository, every disposition must be one of the four allowed values, ids must be
 * unique, and the only accepted kinds are operation/resource/caller. "planned" is not a disposition,
 * so a planned conversion cannot masquerade as implemented.
 *
 * Run: node --test scripts/s4-contracts-inventory.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUN_DIR = join(REPO_ROOT, ".recursive/run/115-effect-foldkit-runtime-migration");
const INVENTORY_PATH = join(RUN_DIR, "evidence/other/s4-contracts-inventory.json");
const KINDS = new Set(["caller", "operation", "resource"]);
const DISPOSITIONS = new Set(["adapter", "convert", "existing-effect", "pure", "retained"]);
const DEFINITION_ROOTS = [
  "role-model-router/apps/runtime-host-bridge/src/",
  "role-model-router/packages/",
];

const linesOf = (file) => readFileSync(join(REPO_ROOT, file), "utf8").split(/\r?\n/);

const lineTextAt = (file, line) => linesOf(file)[line - 1] ?? "";

/** Blank strings, template literals and comments so a mention cannot satisfy a caller citation. */
function maskNonCode(source) {
  const chars = source.split("");
  let i = 0;
  const blank = (index) => { if (chars[index] !== "\n") chars[index] = " "; };
  const skipString = (quote) => {
    i += 1;
    while (i < source.length) {
      if (source[i] === "\\") { blank(i); i += 1; if (i < source.length) blank(i); i += 1; continue; }
      if (source[i] === quote) { i += 1; return; }
      blank(i); i += 1;
    }
  };
  const skipTemplate = () => {
    i += 1;
    while (i < source.length) {
      if (source[i] === "\\") { blank(i); i += 1; if (i < source.length) blank(i); i += 1; continue; }
      if (source[i] === "`") { i += 1; return; }
      blank(i); i += 1;
    }
  };
  while (i < source.length) {
    if (source[i] === "/" && source[i + 1] === "/") { while (i < source.length && source[i] !== "\n") { blank(i); i += 1; } continue; }
    if (source[i] === "/" && source[i + 1] === "*") {
      blank(i); blank(i + 1); i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) { blank(i); i += 1; }
      if (i < source.length) { blank(i); blank(i + 1); i += 2; } continue;
    }
    if (source[i] === '"' || source[i] === "'") { skipString(source[i]); continue; }
    if (source[i] === "`") { skipTemplate(); continue; }
    i += 1;
  }
  return chars.join("");
}

const checkCitation = (issues, id, label, citation, symbol) => {
  if (citation === null || typeof citation !== "object") {
    issues.push(`${id}: ${label} is not an object`);
    return;
  }
  const file = citation.file;
  const line = citation.line;
  if (typeof file !== "string" || file.length === 0) {
    issues.push(`${id}: ${label}.file is missing`);
    return;
  }
  if (!Number.isInteger(line) || line < 1) {
    issues.push(`${id}: ${label}.line is not a positive integer`);
    return;
  }
  if (!existsSync(join(REPO_ROOT, file))) {
    issues.push(`${id}: ${label} cites a missing file: ${file}`);
    return;
  }
  const lines = linesOf(file);
  if (line > lines.length) {
    issues.push(`${id}: ${label} line ${line} is out of range for ${file} (${lines.length} lines)`);
    return;
  }
  const text = lines[line - 1] ?? "";
  if (text.trim().length === 0) {
    issues.push(`${id}: ${label} cites a blank line: ${file}:${line}`);
    return;
  }
  if (symbol !== undefined) {
    const code = maskNonCode(text);
    if (!new RegExp(`\\b${symbol}\\b`).test(code)) {
      issues.push(
        `${id}: ${label} does not reference ${symbol} at ${file}:${line} (caller citations must contain a code token, not a comment/string)`,
      );
    }
  }
};

// biome-ignore lint/suspicious/noExportsInTest: shared helper imported by sibling contract tests.
export const validateInventory = (inventory) => {
  const issues = [];
  if (inventory === null || typeof inventory !== "object") {
    return ["inventory is not an object"];
  }
  if (typeof inventory.schemaVersion !== "string" || inventory.schemaVersion.length === 0) {
    issues.push("schemaVersion is missing");
  }
  const excluded = inventory.scope?.excluded;
  if (!Array.isArray(excluded) || excluded.length === 0) {
    issues.push("scope.excluded must list what was NOT inventoried");
  } else {
    excluded.forEach((entry, index) => {
      if (typeof entry?.area !== "string" || entry.area.length === 0) {
        issues.push(`scope.excluded[${index}].area is missing`);
      }
      if (typeof entry?.reason !== "string" || entry.reason.length === 0) {
        issues.push(`scope.excluded[${index}].reason is missing`);
      }
    });
  }
  const entries = inventory.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return [...issues, "entries must be a non-empty array"];
  }
  const seen = new Set();
  for (const entry of entries) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    if (id.length === 0) {
      issues.push("an entry has no id");
      continue;
    }
    if (seen.has(id)) {
      issues.push(`duplicate id: ${id}`);
    }
    seen.add(id);
    if (!KINDS.has(entry.kind)) {
      issues.push(`${id}: kind ${String(entry.kind)} is not one of operation/resource/caller`);
    }
    if (!DISPOSITIONS.has(entry.disposition)) {
      issues.push(
        `${id}: disposition ${String(entry.disposition)} is not one of pure/existing-effect/adapter/convert`,
      );
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length === 0) {
      issues.push(`${id}: reason is missing`);
    }
    checkCitation(issues, id, "definition", entry.definition);
    if (typeof entry.definition?.file === "string") {
      if (!DEFINITION_ROOTS.some((root) => entry.definition.file.startsWith(root))) {
        issues.push(`${id}: definition is outside the inventoried roots: ${entry.definition.file}`);
      }
    }
    if (!Array.isArray(entry.callers) || entry.callers.length === 0) {
      if (typeof entry.callerlessReason !== "string" || entry.callerlessReason.trim().length === 0) {
        issues.push(`${id}: callers must cite at least one file:line, or callerlessReason must explain a public root`);
      }
    } else {
      entry.callers.forEach((caller, index) => {
        if (caller.file === entry.definition.file && caller.line === entry.definition.line) {
          issues.push(`${id}: callers[${index}] cites its own definition line: ${caller.file}:${caller.line}`);
          return;
        }
        checkCitation(issues, id, `callers[${index}]`, caller, entry.symbol);
      });
    }
  }
  return issues;
};

const assertValid = (inventory) => {
  const issues = validateInventory(inventory);
  assert.deepEqual(issues, [], issues.join("\n"));
};

const loadInventory = (path = INVENTORY_PATH) => JSON.parse(readFileSync(path, "utf8"));

/** A tiny hand-written sample: the test is meaningful before the real inventory exists. */
const SAMPLE_INVENTORY = {
  schemaVersion: "role-model.s4-contracts-inventory.v1",
  scope: {
    excluded: [{ area: "private repository", reason: "public artifact only" }],
  },
  entries: [
    {
      id: "sample-pure",
      kind: "operation",
      disposition: "pure",
      definition: {
        file: "role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts",
        line: 198,
      },
      callers: [
        {
          file: "role-model-router/apps/runtime-host-bridge/src/index.ts",
          line: 17163,
        },
      ],
      reason: "sample entry: pure query, no Effect import",
    },
    {
      id: "sample-effect",
      kind: "operation",
      disposition: "existing-effect",
      definition: {
        file: "role-model-router/apps/runtime-host-bridge/src/module-health-writer.ts",
        line: 94,
      },
      callers: [
        {
          file: "role-model-router/apps/runtime-host-bridge/src/index.ts",
          line: 20522,
        },
      ],
      reason: "sample entry: imports Cause/Effect/Exit from the vendored Effect",
    },
  ],
};

test("the hand-written sample inventory validates", () => {
  assertValid(SAMPLE_INVENTORY);
});

test("the real inventory validates against the code", () => {
  assertValid(loadInventory());
});

const HOST_SRC = "role-model-router/apps/runtime-host-bridge/src";
const PACKAGES_SRC = "role-model-router/packages";

/** Root source files: the host entrypoints plus every package public index. */
function rootOperationFiles() {
  const files = [`${HOST_SRC}/index.ts`, `${HOST_SRC}/cli.ts`];
  for (const packageName of readdirSync(PACKAGES_SRC, { withFileTypes: true })) {
    if (!packageName.isDirectory()) continue;
    const candidate = `${PACKAGES_SRC}/${packageName.name}/src/index.ts`;
    if (existsSync(join(REPO_ROOT, candidate))) files.push(candidate);
  }
  return files;
}

/** Every top-level exported operation/resource in the root files. */
export function enumerateRootOperations() {
  const operations = [];
  for (const file of rootOperationFiles()) {
    const lines = readFileSync(join(REPO_ROOT, file), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^export (?:async )?(?:function|const|class) ([A-Za-z0-9_]+)/);
      if (match) operations.push({ file, line: index + 1, name: match[1] });
    });
  }
  return operations;
}

test("every declaration-form runtime root operation is listed in the ledger", () => {
  const inventory = loadInventory();
  const covered = new Set(
    inventory.entries.map((entry) => `${entry.definition.file}:${entry.definition.line}`),
  );
  const operations = enumerateRootOperations();
  assert.ok(operations.length > 250, `root surface unexpectedly small: ${operations.length}`);
  const missing = operations.filter((op) => !covered.has(`${op.file}:${op.line}`));
  assert.deepEqual(
    missing.map((op) => `${op.file}:${op.line} ${op.name}`),
    [],
    `root operations missing from the inventory: ${missing.length}`,
  );
});

test("every top-level export form is classified as an operation or an explicit exclusion", () => {
  const inventory = loadInventory();
  const excluded = new Map(
    (inventory.scope.rootSurfaceExclusions ?? []).map((entry) => [entry.form, entry.reason]),
  );
  const unclassified = [];
  const excludedButNotDeclared = [];
  const classification = (line) => {
    const text = line.trimStart();
    if (!text.startsWith("export ")) return null;
    if (/^export\s+(?:async\s+)?function\*/.test(text)) return { kind: "excluded", form: "export function*" };
    if (/^export\s+(?:async\s+)?function\s/.test(text)) return { kind: "operation" };
    if (/^export\s+const\s/.test(text)) return { kind: "operation" };
    if (/^export\s+class\s/.test(text)) return { kind: "operation" };
    if (/^export\s+(?:type|interface|namespace|enum|declare|abstract\s+class|const\s+enum|import)\b/.test(text)) {
      const form = text.match(/^export\s+((?:async\s+)?(?:type|interface|namespace|enum|declare|abstract\s+class|const\s+enum|import))\b/)[0];
      return { kind: "excluded", form };
    }
    if (/^export\s+(?:let|var)\s/.test(text)) return { kind: "excluded", form: text.match(/^export\s+(?:let|var)/)[0] };
    if (/^export\s+default\b/.test(text)) return { kind: "excluded", form: "export default" };
    if (/^export\s*\{/.test(text)) return { kind: "excluded", form: "export {" };
    if (/^export\s*\*/.test(text)) return { kind: "excluded", form: "export *" };
    return { kind: "unclassified" };
  };
  for (const file of rootOperationFiles()) {
    for (const [index, line] of readFileSync(join(REPO_ROOT, file), "utf8").split(/\r?\n/).entries()) {
      const result = classification(line);
      if (result === null) continue;
      if (result.kind === "unclassified") {
        unclassified.push(`${file}:${index + 1}: ${line.trim()}`);
      } else if (result.kind === "excluded" && !excluded.has(result.form)) {
        excludedButNotDeclared.push(`${result.form} at ${file}:${index + 1}`);
      }
    }
  }
  assert.deepEqual(unclassified, [], `unclassified export forms: ${unclassified.join("; ")}`);
  assert.deepEqual(
    excludedButNotDeclared,
    [],
    `excluded forms missing from scope.rootSurfaceExclusions: ${excludedButNotDeclared.join("; ")}`,
  );
});

test("the inventory covers every kind and every disposition", () => {
  const inventory = loadInventory();
  const kinds = new Set(inventory.entries.map((entry) => entry.kind));
  const dispositions = new Set(inventory.entries.map((entry) => entry.disposition));
  assert.deepEqual([...kinds].sort(), ["caller", "operation", "resource"]);
  assert.deepEqual([...dispositions].sort(), [
    "adapter",
    "convert",
    "existing-effect",
    "pure",
    "retained",
  ]);
  assert.ok(inventory.entries.length >= 12, "inventory is smaller than the required surface set");
});

test("a deliberately wrong citation fails", () => {
  const inventory = loadInventory();
  const drifted = structuredClone(inventory);
  drifted.entries[0].definition.line = 9_999_995;
  const issues = validateInventory(drifted);
  assert.ok(
    issues.some((issue) => issue.includes("out of range")),
    `expected an out-of-range failure, got: ${issues.join("; ")}`,
  );

  const missingFile = structuredClone(inventory);
  missingFile.entries[0].callers[0].file =
    "role-model-router/apps/runtime-host-bridge/src/does-not-exist.ts";
  assert.ok(
    validateInventory(missingFile).some((issue) => issue.includes("missing file")),
    "a missing caller file must fail",
  );
});

const SQL_SERVICE_FILE = "role-model-router/packages/sql-sqlite-node/src/service.ts";
const SQL_PACKAGE_ROOT = "role-model-router/packages/sql-sqlite-node/";
const SQL_PRODUCT_CALLERS = [
  ["role-model-router/apps/runtime-host-bridge/src/cli.ts", 12],
  ["role-model-router/apps/runtime-host-bridge/src/index.ts", 19],
  ["role-model-router/apps/runtime-host-bridge/src/queue-runtime/admin.ts", 19],
  ["role-model-router/apps/runtime-host-bridge/src/queue-runtime/store.ts", 18],
  ["role-model-router/apps/runtime-host-bridge/src/route-challenge-evidence.ts", 2],
  ["role-model-router/apps/runtime-host-bridge/src/route-ladder-census.ts", 3],
  ["role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts", 30],
];

/**
 * R19/B0 structured guard (S300/S301): the SQL service must be INVENTORIED with a package-path citation under
 * packages/sql-sqlite-node/src/service.ts, carry every product caller, and must never be re-excluded under a
 * reworded "no product caller" claim (e.g. area "Effect SQLite service", reason "No product code calls it").
 * Returns issue codes; an empty array means the workspace-level truth holds.
 */
// biome-ignore lint/suspicious/noExportsInTest: shared helper imported by sibling contract tests.
export const validateSqlServiceCoverage = (inventory) => {
  const issues = [];
  const excluded = Array.isArray(inventory?.scope?.excluded) ? inventory.scope.excluded : [];
  for (const entry of excluded) {
    const area = String(entry?.area ?? "");
    if (/sqlite/i.test(area)) issues.push(`sql-service-excluded: ${area}`);
  }
  const entries = Array.isArray(inventory?.entries) ? inventory.entries : [];
  const sqlEntries = entries.filter((entry) =>
    String(entry?.definition?.file ?? "").startsWith(SQL_PACKAGE_ROOT),
  );
  const serviceEntries = sqlEntries.filter((entry) => entry.definition.file === SQL_SERVICE_FILE);
  if (serviceEntries.length < 7) {
    issues.push(
      `sql-service-not-inventoried: found ${String(serviceEntries.length)} service entries`,
    );
  }
  if (
    !sqlEntries.some(
      (entry) =>
        entry.definition.file === SQL_SERVICE_FILE &&
        Number.isInteger(entry.definition.line) &&
        entry.definition.line > 0,
    )
  ) {
    issues.push("sql-service-package-path: no positive service.ts line citation");
  }
  const cited = sqlEntries.flatMap((entry) =>
    (Array.isArray(entry.callers) ? entry.callers : []).map(
      (caller) => `${String(caller?.file)}:${String(caller?.line)}`,
    ),
  );
  for (const [file, line] of SQL_PRODUCT_CALLERS) {
    if (!cited.includes(`${file}:${line}`))
      issues.push(`sql-service-caller-missing: ${file}:${line}`);
  }
  for (const entry of sqlEntries) {
    if (!DISPOSITIONS.has(entry.disposition))
      issues.push(`sql-service-disposition: ${String(entry.id)}`);
    if (String(entry.reason ?? "").trim().length === 0)
      issues.push(`sql-service-reason: ${String(entry.id)}`);
  }
  if (JSON.stringify(excluded).includes("Effect SQLite service has no product caller")) {
    issues.push("sql-service-false-claim: the removed sentence is back");
  }
  return issues;
};

test("R19/B0: the SQL service is a live product surface, never excluded as callerless", () => {
  const issues = validateSqlServiceCoverage(loadInventory());
  assert.deepEqual(issues, [], issues.join("\n"));
});

test("S301 reworded false SQL exclusion is rejected by the structured guard", () => {
  const reworded = structuredClone(loadInventory());
  reworded.scope.excluded.push({
    area: "Effect SQLite service",
    reason: "No product code calls it; package tests only.",
  });
  const issues = validateSqlServiceCoverage(reworded);
  assert.ok(
    issues.some((issue) => issue.startsWith("sql-service-excluded")),
    `a reworded SQL exclusion must be rejected, got: ${issues.join("; ")}`,
  );
});

test("a caller citation that does not reference the operation is rejected", () => {
  const inventory = loadInventory();
  const entry = inventory.entries.find((candidate) => candidate.id === "module-health-writer");
  assert.ok(entry?.symbol, "the fixture entry must carry its operation symbol");
  entry.callers[0] = {
    file: "role-model-router/apps/runtime-host-bridge/src/index.ts",
    line: 20522,
  };
  const issues = validateInventory(inventory);
  assert.ok(
    issues.some((issue) => issue.includes("does not reference")),
    `expected a semantic caller failure, got: ${issues.join("; ")}`,
  );
});

test("a caller citing its own definition line is rejected", () => {
  const inventory = loadInventory();
  const entry = inventory.entries.find((candidate) => candidate.id === "module-health-writer");
  entry.callers[0] = { file: entry.definition.file, line: entry.definition.line };
  const issues = validateInventory(inventory);
  assert.ok(
    issues.some((issue) => issue.includes("cites its own definition line")),
    `expected an own-definition failure, got: ${issues.join("; ")}`,
  );
});

test("comments and string mentions cannot satisfy a caller token", () => {
  const symbol = "makeModuleHealthWriter";
  assert.equal(maskNonCode(`// ${symbol}`).includes(symbol), false);
  assert.equal(maskNonCode(`/* ${symbol} */`).includes(symbol), false);
  assert.equal(maskNonCode(`"${symbol}"`).includes(symbol), false);
  assert.equal(maskNonCode(`describe("${symbol}", () => {})`).includes(symbol), false);
  assert.equal(maskNonCode(`${symbol}({ capacity: 1 })`).includes(symbol), true);
});

test("duplicate ids, unknown dispositions and unknown kinds are rejected", () => {
  const base = loadInventory();
  const duplicate = structuredClone(base);
  duplicate.entries.push(structuredClone(duplicate.entries[0]));
  assert.ok(validateInventory(duplicate).some((issue) => issue.includes("duplicate id")));

  const badDisposition = structuredClone(base);
  badDisposition.entries[0].disposition = "planned";
  assert.ok(
    validateInventory(badDisposition).some((issue) => issue.includes("disposition")),
    "planned is not an allowed disposition",
  );

  const badKind = structuredClone(base);
  badKind.entries[0].kind = "module";
  assert.ok(validateInventory(badKind).some((issue) => issue.includes("kind")));
});
