import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  PRODUCT_DEFAULTS_RELATIVE_PATH,
  ROUTE_LEARNING_DOCUMENTED_DEFAULTS,
  readRouteLearningDefaults,
} from "../src/product-defaults-file.js";

/**
 * Run 105 R11: the routeLearning block lives in product-defaults.json and the READ PATH IS NET-NEW
 * wiring. The loader mirrors reading the activation policy: durable operator state first, then the
 * shipped guidance copy, then the documented constants - and it DEGRADES, never throws, so a
 * missing or damaged file can never take the routing path down.
 *
 * The four defaults are one product-defaults value each (minComparisons 5, minConfidence 0.7,
 * stalenessWindowDays 30, challengeBatchSize 1) and the 30 days is a SINGLE constant used for both
 * the request-count window and the idle.
 */
const workspace = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run105-defaults-"));
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

const writeDefaults = (root: string, document: unknown, relativePath = PRODUCT_DEFAULTS_RELATIVE_PATH) => {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof document === "string" ? document : JSON.stringify(document, null, 2), "utf8");
};

const shipped = {
  schema: "role-model.product-defaults.v2",
  routeLearning: { minComparisons: 5, minConfidence: 0.7, stalenessWindowDays: 30, challengeBatchSize: 1 },
};

describe("run105 R11 route learning defaults", () => {
  test("reads the routeLearning block from the shipped guidance copy", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, shipped);
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      expect(resolved.routeLearning).toEqual({
        minComparisons: 5,
        minConfidence: 0.7,
        stalenessWindowDays: 30,
        challengeBatchSize: 1,
      });
      expect(resolved.source).toBe(PRODUCT_DEFAULTS_RELATIVE_PATH);
      expect(resolved.degradation).toBeNull();
    } finally {
      space.cleanup();
    }
  });

  test("the durable operator state wins over the shipped copy (two-tier resolution)", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, shipped);
      writeDefaults(
        space.root,
        { routeLearning: { minComparisons: 9, minConfidence: 0.9, stalenessWindowDays: 7, challengeBatchSize: 4 } },
        path.join("learning", "product-defaults-state.json"),
      );
      const resolved = readRouteLearningDefaults({
        repoRoot: space.root,
        channel: "development",
        stateRoot: space.root,
      });
      expect(resolved.routeLearning).toMatchObject({ minComparisons: 9, minConfidence: 0.9, stalenessWindowDays: 7, challengeBatchSize: 4 });
      expect(resolved.source).toContain("product-defaults-state.json");
    } finally {
      space.cleanup();
    }
  });

  test("a missing file degrades to the documented constants with product_defaults_missing and never throws", () => {
    const space = workspace();
    try {
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      expect(resolved.routeLearning).toEqual(ROUTE_LEARNING_DOCUMENTED_DEFAULTS);
      expect(resolved.degradation).toMatchObject({ reason: "product_defaults_missing" });
    } finally {
      space.cleanup();
    }
  });

  test("a damaged document degrades instead of throwing", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, "{ not json");
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      expect(resolved.routeLearning).toEqual(ROUTE_LEARNING_DOCUMENTED_DEFAULTS);
      expect(resolved.degradation).not.toBeNull();
      expect(resolved.degradation?.reason).toMatch(/product_defaults_/);
    } finally {
      space.cleanup();
    }
  });

  test("a partial block is completed field-by-field from the documented constants", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, { routeLearning: { minComparisons: 8 } });
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      expect(resolved.routeLearning).toEqual({
        minComparisons: 8,
        minConfidence: 0.7,
        stalenessWindowDays: 30,
        challengeBatchSize: 1,
      });
    } finally {
      space.cleanup();
    }
  });

  test("an out-of-range value is refused to its documented default rather than trusted", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, {
        routeLearning: { minComparisons: 0, minConfidence: 2, stalenessWindowDays: -5, challengeBatchSize: 1.5 },
      });
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      expect(resolved.routeLearning).toEqual(ROUTE_LEARNING_DOCUMENTED_DEFAULTS);
    } finally {
      space.cleanup();
    }
  });

  test("C4 separation: the loader never reads or repurposes the learning-integrity 0.7 gate", () => {
    const space = workspace();
    try {
      writeDefaults(space.root, shipped);
      const resolved = readRouteLearningDefaults({ repoRoot: space.root, channel: "development", stateRoot: null });
      // The returned shape names ONLY the ladder constants: no integrity-gate field leaks in.
      expect(Object.keys(resolved.routeLearning).sort()).toEqual([
        "challengeBatchSize",
        "minComparisons",
        "minConfidence",
        "stalenessWindowDays",
      ]);
      expect(JSON.stringify(resolved)).not.toMatch(/learning-integrity|minSupport|DEFAULT_GATE_THRESHOLDS/);
    } finally {
      space.cleanup();
    }
  });
});
