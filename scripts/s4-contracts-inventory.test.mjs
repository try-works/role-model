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
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUN_DIR = join(REPO_ROOT, ".recursive/run/115-effect-foldkit-runtime-migration");
const INVENTORY_PATH = join(RUN_DIR, "evidence/other/s4-contracts-inventory.json");
const KINDS = new Set(["caller", "operation", "resource"]);
const DISPOSITIONS = new Set(["adapter", "convert", "existing-effect", "pure"]);
const DEFINITION_ROOTS = [
  "role-model-router/apps/runtime-host-bridge/src/",
  "role-model-router/packages/",
];

const linesOf = (file) => readFileSync(join(REPO_ROOT, file), "utf8").split(/\r?\n/);

const lineTextAt = (file, line) => linesOf(file)[line - 1] ?? "";

const checkCitation = (issues, id, label, citation) => {
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
  if ((lines[line - 1] ?? "").trim().length === 0) {
    issues.push(`${id}: ${label} cites a blank line: ${file}:${line}`);
  }
};

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
      issues.push(`${id}: callers must cite at least one file:line`);
    } else {
      entry.callers.forEach((caller, index) =>
        checkCitation(issues, id, `callers[${index}]`, caller),
      );
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

test("the inventory covers every kind and every disposition", () => {
  const inventory = loadInventory();
  const kinds = new Set(inventory.entries.map((entry) => entry.kind));
  const dispositions = new Set(inventory.entries.map((entry) => entry.disposition));
  assert.deepEqual([...kinds].sort(), ["caller", "operation", "resource"]);
  assert.deepEqual([...dispositions].sort(), ["adapter", "convert", "existing-effect", "pure"]);
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
  missingFile.entries[0].callers[0].file = "role-model-router/apps/runtime-host-bridge/src/does-not-exist.ts";
  assert.ok(
    validateInventory(missingFile).some((issue) => issue.includes("missing file")),
    "a missing caller file must fail",
  );
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
