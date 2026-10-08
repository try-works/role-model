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
