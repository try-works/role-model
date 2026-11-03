import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  compareMapping,
  planReconcile,
  validateMappingShape,
  type ReconcileMapping,
} from "./handler-presence-reconcile";

/**
 * S617 reconciliation guard tests.
 *
 * The generator must never silently rewrite committed evidence: before writing it loads the committed
 * mapping and compares row count, every id, bucket, walkerPath and the identity totals; a mismatch exits
 * non-zero with the diff and writes nothing, an unchanged rerun exits 0 without touching the files. These
 * tests exercise that comparison with synthetic tampering (mutated bucket, dropped row) and the
 * walkerPath/null convention the mapping must satisfy.
 */

const repoRoot = fileURLToPath(new URL("../../../", "file://" + process.cwd() + "/"));
const committedMappingPath = repoRoot + ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s617-handler-presence-mapping.json";
const humanMarkdownPath = repoRoot + ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/ui-dead-controls-inventory.md";
const baselineRoot = fileURLToPath(new URL("test/support/", "file://" + process.cwd() + "/"));

const loadCommitted = (): ReconcileMapping => JSON.parse(readFileSync(committedMappingPath, "utf8"));

const clone = (mapping: ReconcileMapping): ReconcileMapping => JSON.parse(JSON.stringify(mapping));

const withTempMapping = (mutate: (mapping: ReconcileMapping) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "s617-reconcile-"));
  const mappingPath = join(dir, "mapping.json");
  const mapping = clone(loadCommitted());
  mutate(mapping);
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + "\n");
  return { dir, mappingPath };
};

describe("S617 reconciliation guard", () => {
  it("passes an unchanged mapping comparison", () => {
    const mapping = loadCommitted();
    expect(compareMapping(mapping, clone(mapping))).toEqual([]);
  });

  it("detects a mutated bucket and names the row", () => {
    const mapping = loadCommitted();
    const tampered = clone(mapping);
    const target = tampered.items[0];
    target.bucket = "unmatched";
    const diff = compareMapping(tampered, mapping);
    expect(diff.length).toBeGreaterThan(0);
    expect(diff.join("\n")).toContain(target.id);
    expect(diff.join("\n")).toContain("unmatched");
  });

  it("detects a dropped row", () => {
    const mapping = loadCommitted();
    const tampered = clone(mapping);
    const dropped = tampered.items.pop();
    const diff = compareMapping(tampered, mapping);
    expect(diff.join("\n")).toContain("row count");
    expect(diff.join("\n")).toContain(dropped?.id ?? "?");
  });

  it("detects a wrong identity total", () => {
    const mapping = loadCommitted();
    const tampered = clone(mapping);
    (tampered.identities as { allItems: boolean }).allItems = false;
    expect(compareMapping(tampered, mapping).join("\n")).toContain("allItems");
  });

  it("enforces the walkerPath null convention", () => {
    const mapping = loadCommitted();
    expect(validateMappingShape(mapping)).toEqual([]);
    const missingPath = clone(mapping);
    const matched = missingPath.items.find((entry) => entry.bucket === "wired_after_inventory");
    if (matched !== undefined) {
      matched.bucket = "matched_walker";
      matched.walkerPath = null;
    }
    expect(validateMappingShape(missingPath).join("\n")).toContain("walkerPath");
    const strayPath = clone(mapping);
    const wired = strayPath.items.find((entry) => entry.bucket !== "matched_walker");
    if (wired !== undefined) wired.walkerPath = "div[1]>button[1]";
    expect(validateMappingShape(strayPath).join("\n")).toContain("walkerPath");
  });

  it("planReconcile reports unchanged without modifying the committed mapping", () => {
    const before = readFileSync(committedMappingPath, "utf8");
    const plan = planReconcile({ baselineDir: baselineRoot, humanMarkdownPath, mappingPath: committedMappingPath });
    expect(plan.status).toBe("unchanged");
    expect(plan.violations).toEqual([]);
    expect(readFileSync(committedMappingPath, "utf8")).toBe(before);
  });

  it("planReconcile detects a tampered committed mapping without rewriting it", () => {
    const { dir, mappingPath } = withTempMapping((mapping) => {
      // Keep the shape VALID so this exercises the stale/changed path (invalid shape is a separate exit 1).
      mapping.items[0].bucket = "unmatched";
      mapping.items[0].walkerPath = null;
      mapping.items.splice(5, 1);
    });
    const before = readFileSync(mappingPath, "utf8");
    const plan = planReconcile({ baselineDir: baselineRoot, humanMarkdownPath, mappingPath });
    expect(plan.status).toBe("changed");
    expect((plan.diff ?? []).join("\n")).toMatch(/row count|bucket/);
    expect(readFileSync(mappingPath, "utf8")).toBe(before);
    rmSync(dir, { force: true, recursive: true });
  });

  it("planReconcile reports invalid (not changed) for a committed convention violation", () => {
    const { dir, mappingPath } = withTempMapping((mapping) => {
      const matched = mapping.items.find((entry) => entry.bucket === "wired_after_inventory");
      if (matched !== undefined) {
        matched.bucket = "matched_walker";
        matched.walkerPath = null;
      }
    });
    const before = readFileSync(mappingPath, "utf8");
    const plan = planReconcile({ baselineDir: baselineRoot, humanMarkdownPath, mappingPath });
    expect(plan.status).toBe("invalid");
    expect(plan.violations.join("\n")).toContain("walkerPath");
    expect(readFileSync(mappingPath, "utf8")).toBe(before);
    rmSync(dir, { force: true, recursive: true });
  });

  it("planReconcile reports missing when no mapping is committed", () => {
    const dir = mkdtempSync(join(tmpdir(), "s617-reconcile-missing-"));
    const mappingPath = join(dir, "mapping.json");
    const plan = planReconcile({ baselineDir: baselineRoot, humanMarkdownPath, mappingPath });
    expect(plan.status).toBe("missing");
    expect(plan.violations).toEqual([]);
    rmSync(dir, { force: true, recursive: true });
  });
});
