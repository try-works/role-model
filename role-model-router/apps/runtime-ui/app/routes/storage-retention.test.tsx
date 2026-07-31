import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { StorageRetentionRouteView } from "./storage-retention";

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
      "StatusPill",
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
    ])
      expect(source).toContain(token);
    expect(source).not.toContain("FactCard");
  });
  test("renders the existing design-system loading and manual pruning controls", () => {
    const html = renderToStaticMarkup(<StorageRetentionRouteView />);
    expect(html).toContain("Tracked");
    expect(html).toContain("Loading storage inventory");
    expect(html).toContain("Retention policy");
    expect(html).toContain("Manual pruning");
    expect(html).toContain(">Dry-run<");
    expect(html).toContain(">Execute plan<");
    expect(html).toContain("No legal holds or Managed policy conflicts.");
  });
});
