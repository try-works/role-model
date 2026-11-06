import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  FOLDKIT_ROUTE_TAGS,
  INFRASTRUCTURE_REACT_ROUTES,
  REACT_ROUTE_FILES,
  ROUTE_FAMILY_MAP,
  SURFACE_DISPOSITIONS,
  UNPORTED_REACT_ROUTES,
} from "../src/route-family-map";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const nextRoot = path.join(repoRoot, "role-model-router/apps/runtime-ui-next");
const reactRoutes = path.join(repoRoot, "role-model-router/apps/runtime-ui/app/routes");
const inventory = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      ".recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s26a-route-inventory.json",
    ),
    "utf8",
  ),
) as { routes: ReadonlyArray<{ source: string; routePaths?: readonly string[] }> };

const routeTags = (): string[] => {
  const source = readFileSync(path.join(nextRoot, "src/route.ts"), "utf8");
  return [...source.matchAll(/^  ([A-Z][A-Za-z]+): \{/gm)].map((match) => match[1] ?? "");
};
const files = readdirSync(reactRoutes)
  .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
  .sort();

describe("R11 47-vs-68 route-family mapping", () => {
  it("covers every Foldkit route tag exactly once", () => {
    expect([...routeTags()].sort()).toEqual([...FOLDKIT_ROUTE_TAGS].sort());
    expect(Object.keys(ROUTE_FAMILY_MAP).sort()).toEqual([...FOLDKIT_ROUTE_TAGS].sort());
  });

  it("maps every React route file or records an explicit unported disposition", () => {
    const mapped = new Set<string>(Object.values(ROUTE_FAMILY_MAP).flatMap((row) => row.reactFiles));
    const unported = new Set<string>(UNPORTED_REACT_ROUTES.map((row) => row.file));
    const infra = new Set(["app-layout.tsx", "legacy-redirect.tsx"]);
    for (const file of files) {
      expect(
        mapped.has(file) || unported.has(file) || infra.has(file),
        `unmapped React route: ${file}`,
      ).toBe(true);
    }
    for (const file of mapped) expect(files, `mapped file missing: ${file}`).toContain(file);
    for (const row of UNPORTED_REACT_ROUTES) {
      expect(files, `unported file missing: ${row.file}`).toContain(row.file);
      expect(row.disposition.length).toBeGreaterThan(0);
    }
    expect(REACT_ROUTE_FILES).toEqual(files);
  });

  it("stays in sync with the s26a inventory and declares the missing surfaces", () => {
    const inventorySources = new Set(inventory.routes.map((route) => route.source));
    const mapped = new Set<string>(Object.values(ROUTE_FAMILY_MAP).flatMap((row) => row.reactFiles));
    for (const source of inventorySources) {
      const file = source.split("/").pop();
      if (file === undefined || !file.endsWith(".tsx")) continue;
      expect(
        mapped.has(file) ||
          INFRASTRUCTURE_REACT_ROUTES.includes(file as (typeof INFRASTRUCTURE_REACT_ROUTES)[number]) ||
          UNPORTED_REACT_ROUTES.some((row) => row.file === file),
        `inventory route not mapped: ${source}`,
      ).toBe(true);
    }
    expect(Object.keys(SURFACE_DISPOSITIONS).sort()).toEqual([
      "commandPalette",
      "deviceAuthUi",
      "mediaCapture",
      "previewEditors",
    ]);
    expect(SURFACE_DISPOSITIONS.commandPalette.status).toBe("owner-disposition");
    expect(SURFACE_DISPOSITIONS.mediaCapture.status).toBe("owner-disposition");
    expect(SURFACE_DISPOSITIONS.deviceAuthUi.status).toBe("ported");
    expect(SURFACE_DISPOSITIONS.previewEditors.status).toBe("de-previewed");
  });
});
