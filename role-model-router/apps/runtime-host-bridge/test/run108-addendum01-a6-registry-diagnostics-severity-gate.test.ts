/**
 * Run 108 addendum-01 A6 (R8 diagnostics gate).
 *
 * Commit 2206872d shipped a boot fix without a RED test: warning-severity
 * endpoint-registry diagnostics were made non-fatal in the post-update
 * validation, so a DUPLICATE_ENDPOINT_SOURCE warning (the *desired* state of
 * R8's dedupe layer) no longer crashed the runtime. This suite pins that gate:
 * warning-severity diagnostics do NOT fail the post-update validation, and an
 * error-severity diagnostic DOES.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { fatalRegistryDiagnostics } from "../src/index.js";

describe("run108 addendum-01 A6 registry diagnostics severity gate", () => {
  test("warning-severity registry diagnostics do not fail the post-update validation", () => {
    const diagnostics = [
      {
        endpointId: "flash-high",
        severity: "warning" as const,
        code: "DUPLICATE_ENDPOINT_SOURCE",
        message: "duplicate endpoint source collapsed",
      },
      {
        endpointId: "flash-max",
        severity: "warning" as const,
        code: "DUPLICATE_ENDPOINT_SOURCE",
        message: "duplicate endpoint source collapsed",
      },
    ];
    expect(fatalRegistryDiagnostics(diagnostics)).toEqual([]);
  });

  test("an error-severity diagnostic does fail the post-update validation", () => {
    const diagnostics = [
      {
        endpointId: "flash-high",
        severity: "error" as const,
        code: "UNRESOLVED_PROVIDER_ACCOUNT",
        message: "provider account missing",
      },
    ];
    expect(fatalRegistryDiagnostics(diagnostics)).toEqual(diagnostics);
  });

  test("a mixed list keeps every non-warning diagnostic as fatal", () => {
    const warning = {
      endpointId: "flash-max",
      severity: "warning" as const,
      code: "DUPLICATE_ENDPOINT_SOURCE",
      message: "duplicate endpoint source collapsed",
    };
    const error = {
      endpointId: "flash-high",
      severity: "error" as const,
      code: "UNRESOLVED_PROVIDER_ACCOUNT",
      message: "provider account missing",
    };
    expect(fatalRegistryDiagnostics([warning, error])).toEqual([error]);
  });
});

/**
 * 03.5 review MN-1: the three tests above are unit tests of the HELPER. They stay green if the
 * production path stops routing through it - re-inline the old "currentRegistry.diagnostics.length > 0"
 * guard (the pre-2206872d behaviour that refused to boot on the R8 dedupe warning) and every test in
 * this file still passes while the runtime is broken again. This block pins the CALL SITE in
 * index.ts's rebuildCurrentState (the post-update validation), so that regression fails the suite.
 */
const indexSource = (): string => readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

const REBUILD_MARKER = "const rebuildCurrentState = (): void => {";

/** The body of rebuildCurrentState: from its declaration to the next 2-space-indented closing brace. */
function extractRebuildCurrentState(source: string): string {
  const start = source.indexOf(REBUILD_MARKER);
  if (start === -1) {
    return "";
  }
  const end = source.indexOf("\n  };", start);
  return end === -1 ? source.slice(start) : source.slice(start, end);
}

const FATAL_CALL =
  "const fatalDiagnostics = fatalRegistryDiagnostics(currentRegistry.diagnostics);";

/** The gate wiring this pin requires; returns one message per broken requirement. */
function gateViolations(block: string): readonly string[] {
  const problems: string[] = [];
  if (!block.includes(FATAL_CALL)) {
    problems.push(
      "the post-update validation no longer derives fatalDiagnostics from fatalRegistryDiagnostics(currentRegistry.diagnostics)",
    );
  }
  const fatalGuard = "if (fatalDiagnostics.length > 0) {";
  if (!block.includes(fatalGuard)) {
    problems.push("the fatal branch no longer keys off the filtered fatalDiagnostics list");
  } else {
    const branch = block.slice(
      block.indexOf(fatalGuard),
      block.indexOf("\n    }", block.indexOf(fatalGuard)),
    );
    if (!branch.includes("throw new Error(")) {
      problems.push(
        "the fatal branch no longer throws, so an error diagnostic would not fail the update",
      );
    }
    if (!branch.includes("fatalDiagnostics")) {
      problems.push("the fatal throw no longer reports the filtered diagnostics");
    }
  }
  const rawGuard = "if (currentRegistry.diagnostics.length > 0) {";
  const rawAt = block.indexOf(rawGuard);
  if (rawAt !== -1) {
    const rawBranchEnd = block.indexOf("\n    }", rawAt);
    const rawBranch = block.slice(rawAt, rawBranchEnd === -1 ? undefined : rawBranchEnd);
    if (rawBranch.includes("throw")) {
      problems.push(
        "a raw currentRegistry.diagnostics guard throws again (the pre-A6 fatal-everything gate is back)",
      );
    }
  }
  return problems;
}

describe("run108 addendum-01 A6 the post-update validation routes through the gate", () => {
  test("rebuildCurrentState derives its fatal diagnostics from fatalRegistryDiagnostics", () => {
    const block = extractRebuildCurrentState(indexSource());
    expect(block).toContain(REBUILD_MARKER);
    expect(gateViolations(block)).toEqual([]);
  });

  test("the pin fails when the call site stops routing through the helper", () => {
    const block = extractRebuildCurrentState(indexSource());
    const mutated = block.replace(
      FATAL_CALL,
      "const fatalDiagnostics = currentRegistry.diagnostics;",
    );
    expect(mutated).not.toBe(block);
    expect(gateViolations(mutated).length).toBeGreaterThan(0);
  });

  test("the pin fails when the post-update validation throws on raw diagnostics again", () => {
    const block = extractRebuildCurrentState(indexSource());
    const mutated = block.replace(
      "if (fatalDiagnostics.length > 0) {",
      "if (currentRegistry.diagnostics.length > 0) {",
    );
    expect(mutated).not.toBe(block);
    expect(gateViolations(mutated).length).toBeGreaterThan(0);
  });
});
