import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  BYTES_PER_GB,
  DEFAULT_MAX_GB,
  StorageRetentionRouteView,
  bytesToGbInput,
  gbInputToBytes,
  selectEditableRetentionPolicy,
} from "./storage-retention";

describe("StorageRetentionRoute operator policy editing", () => {
  test("edits the operator policy instead of an arbitrary canonical tier policy", () => {
    const canonicalTierPolicy = {
      policyId: "cloud-staging-short.v1",
      scope: "global",
      maxBytes: 268_435_456,
      maxAgeDays: 3,
      source: "canonical_machine_readable",
    };
    const operatorPolicy = {
      policyId: "runtime-custom",
      scope: "global",
      maxBytes: 7_500_000_000,
      maxAgeDays: 45,
    };
    expect(selectEditableRetentionPolicy([canonicalTierPolicy, operatorPolicy])?.policyId).toBe(
      "runtime-custom",
    );
    // With only canonical tier policies there is no operator policy yet, so the
    // form must keep its own defaults rather than showing a tier's preset.
    expect(selectEditableRetentionPolicy([canonicalTierPolicy])).toBeNull();
    // A saved 268,435,456-byte budget must not render as 0.268435.
    expect(bytesToGbInput(268_435_456)).toBe("0.268");
  });
});

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
      "Policy state",
      "Physical resource mapping",
      "Observation state",
      "Measurement source",
      "Fresh through",
      "Last checked",
      "Reason",
      "Retention coverage",
      "row.freshUntil",
      "row.lastCheckedAt",
      "row.observationReason",
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
    expect(source).not.toContain(">Enforcement<");
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

  test("Run 96 R25/R31 renders complete byte attribution, capacity forecast, and actionable operator receipts", () => {
    const source = readFileSync(new URL("./storage-retention.tsx", import.meta.url), "utf8");
    for (const token of [
      "Physical bytes",
      "Logical bytes",
      "Reserved bytes",
      "Archived bytes",
      "Unattributed bytes",
      "Capacity forecast",
      "Projected bytes",
      "Days until high water",
      "Operator action receipts",
      "Expected impact",
      "Rollback strategy",
      "Proof of recovery",
      "summary?.storageInventory?.byteTotals",
      "summary?.storageInventory?.capacityForecast",
      "receipt.expectedImpact",
      "receipt.rollback?.strategy",
      "receipt.recoveryProof?.status",
    ]) {
      expect(source).toContain(token);
    }
  });
});
