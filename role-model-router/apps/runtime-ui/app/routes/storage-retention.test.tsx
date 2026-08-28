import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  BYTES_PER_GB,
  DEFAULT_MAX_GB,
  StorageRetentionRouteView,
  bytesToGbInput,
  gbInputToBytes,
} from "./storage-retention";

describe("StorageRetentionRoute", () => {
  test("uses existing page primitives for dry-run, conflicts, receipts, and rollback", () => {
    const source = readFileSync(new URL("./storage-retention.tsx", import.meta.url), "utf8");
    const routeConfig = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    expect(routeConfig).toContain(
      'route("system/storage-retention", "routes/storage-retention.tsx")',
    );
    for (const token of [
      "SectionCard",
      "MetricStrip",
      "Badge",
      "fetchStorageRetention",
      "updateRetentionPolicy",
      "executeRetentionPlan",
      "cancelRetentionJob",
      "rollbackRetentionReceipt",
      "Dry-run",
      "Managed policy",
      "Rollback-safe",
      "Conflicts and receipts",
      "fieldClassName",
      "Maximum size (GB)",
      "gbInputToBytes",
      "Physical resources",
      "Logical classes",
      "row.physicalBytes",
      "row.heldItems",
      "row.retentionState",
      "Unattributed physical bytes",
      "Unobserved stores",
      "Unavailable stores",
      "Unavailable physical resources",
      "unobservedResourceCount",
      "unavailableResourceCount",
      "not service health",
      "unattributedPhysicalBytes",
      "Global policy state",
      "Physical resource mapping",
      "Observation state",
      "Measurement source",
      "Fresh through",
      "row.freshUntil",
      "row.owners",
      "row.physicalResourceId",
      "row.observationState",
      "row.measurementSource",
      'row.health === "healthy" || row.health === "ready"',
    ])
      expect(source).toContain(token);
    expect(source).not.toContain(
      "summary.policyState ? summary.policyState.state : row.retentionState",
    );
    expect(source).not.toContain("Maximum bytes");
    expect(source).not.toContain("StatusPill");
    expect(source).not.toContain("FactCard");
  });

  test("converts GB form values to backend maxBytes", () => {
    expect(DEFAULT_MAX_GB).toBe("1");
    expect(gbInputToBytes("1")).toBe(BYTES_PER_GB);
    expect(gbInputToBytes("2")).toBe(2 * BYTES_PER_GB);
    expect(gbInputToBytes("0.1")).toBe(100_000_000);
    expect(bytesToGbInput(BYTES_PER_GB)).toBe("1");
    expect(bytesToGbInput(100_000_000)).toBe("0.1");
    expect(gbInputToBytes("-1")).toBeNull();
  });

  test("renders the existing design-system loading and manual pruning controls", () => {
    const html = renderToStaticMarkup(<StorageRetentionRouteView />);
    expect(html).toContain("Physical resources");
    expect(html).toContain("Logical classes");
    expect(html).toContain("Legal holds");
    expect(html).toContain("Loading storage inventory");
    expect(html).toContain("Retention policy");
    expect(html).toContain("Maximum size (GB)");
    expect(html).toContain(`value="${DEFAULT_MAX_GB}"`);
    expect(html).toContain("Manual pruning");
    expect(html).toContain(">Dry-run<");
    expect(html).toContain(">Execute plan<");
    expect(html).toContain("No legal holds or Managed policy conflicts.");
  });
});
