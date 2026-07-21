import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { StorageRetentionRouteView } from "./storage-retention";

describe("StorageRetentionRoute", () => {
  test("uses existing page primitives for dry-run, conflicts, receipts, and rollback", () => {
    const source = readFileSync(new URL("./storage-retention.tsx", import.meta.url), "utf8");
    const routeConfig = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    expect(routeConfig).toContain('route("system/storage-retention", "routes/storage-retention.tsx")');
    for (const token of ["SectionCard", "FactCard", "StatusPill", "fetchStorageRetention", "Dry-run", "Managed policy", "Rollback-safe", "Receipts"]) expect(source).toContain(token);
  });
  test("renders the existing design-system loading and dry-run controls",()=>{const html=renderToStaticMarkup(<StorageRetentionRouteView/>);expect(html).toContain("Tracked usage");expect(html).toContain("Loading storage inventory");expect(html).toContain("Dry-run pruning");expect(html).toContain(">Dry-run<")});
});
