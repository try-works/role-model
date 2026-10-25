import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Run 115 S26a (R13): machine-checkable route/component inventory drift test.
 *
 * The inventory is evidence data. This test proves every legacy route/component file has a row,
 * every row's source exists, categories/statuses come from the fixed vocabulary, and a fake route
 * file is detected as missing coverage (the RED case).
 */

interface InventoryEntry {
  readonly id: string;
  readonly kind: "route" | "component";
  readonly source: string;
  readonly category: string;
  readonly status: string;
  readonly routePaths?: readonly string[];
  readonly proofTest?: string;
  readonly proofTestName?: string;
  readonly hostEndpoints?: readonly string[];
  readonly requiresHostEndpoint?: boolean;
}

interface Inventory {
  readonly vocabulary: {
    readonly categories: readonly string[];
    readonly statuses: readonly string[];
  };
  readonly scan: {
    readonly appDir: string;
  };
  readonly routes: readonly InventoryEntry[];
  readonly components: readonly InventoryEntry[];
  readonly newOnly: readonly InventoryEntry[];
  readonly waves: readonly { readonly routeIds: readonly string[] }[];
}

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const inventoryPath = path.join(
  repoRoot,
  ".recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s26a-route-inventory.json",
);

const listTsx = (relativeDir: string): readonly string[] => {
  const absolute = path.join(repoRoot, relativeDir);
  const walk = (dir: string, rel: string): readonly string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const nextRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) return walk(path.join(dir, entry.name), nextRel);
      return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx") ? [nextRel] : [];
    });
  return [...walk(absolute, relativeDir)].sort();
};

const findUncovered = (inventory: Inventory, files: readonly string[]): readonly string[] => {
  const covered = new Set(
    [...inventory.routes, ...inventory.components].map((entry) => entry.source),
  );
  return files.filter((file) => !covered.has(file));
};

const registeredRoutePaths = (): readonly string[] => {
  const source = readFileSync(
    path.join(repoRoot, "role-model-router/apps/runtime-ui/app/routes.ts"),
    "utf8",
  );
  const paths = new Set(["/", "*"]);
  for (const match of source.matchAll(/\broute\("([^"]+)"/g)) {
    paths.add(match[1] === "app" ? "/app" : match[1] === "*" ? "*" : `/app/${match[1]}`);
  }
  for (const match of source.matchAll(/\bindex\("routes\/([^"]+)"/g)) {
    paths.add(match[1] === "index.tsx" ? "/" : "/app");
  }
  return [...paths].sort();
};

const hostRoutePaths = (): ReadonlySet<string> => {
  const sources = [
    "role-model-router/apps/runtime-host-bridge/src/index.ts",
    "role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts",
  ].map((file) => readFileSync(path.join(repoRoot, file), "utf8"));
  const paths = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(
      /["\`](\/api\/role-model\/[^"'\`$ ]+|\/v1\/[^"'\`$ ]+)["\`]/g,
    )) {
      paths.add(match[1]);
    }
  }
  return paths;
};

const hostHasPath = (endpoint: string, hostPaths: ReadonlySet<string>): boolean => {
  if (hostPaths.has(endpoint)) return true;
  for (const candidate of hostPaths) {
    if (candidate.endsWith("/") && endpoint.startsWith(candidate)) return true;
    if (candidate.endsWith("*") && endpoint.startsWith(candidate.slice(0, -1))) return true;
  }
  return false;
};

const missingDeclaredEndpoints = (
  inventory: Inventory,
  hostPaths: ReadonlySet<string>,
): readonly string[] => {
  const missing: string[] = [];
  for (const entry of [...inventory.routes, ...inventory.components, ...inventory.newOnly]) {
    for (const endpoint of entry.hostEndpoints ?? []) {
      if (entry.requiresHostEndpoint !== true && !hostHasPath(endpoint, hostPaths)) {
        missing.push(`${entry.id}:${endpoint}`);
      }
    }
  }
  return missing;
};

describe("S26a route inventory drift", () => {
  it("validates every row, scans app/** recursively and correlates host endpoints", () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as Inventory;
    const categories = new Set(inventory.vocabulary.categories);
    const statuses = new Set(inventory.vocabulary.statuses);
    const entries = [...inventory.routes, ...inventory.components, ...inventory.newOnly];

    expect(inventory.routes).toHaveLength(51);
    expect(inventory.components).toHaveLength(24);

    for (const entry of entries) {
      expect(categories.has(entry.category), `category: ${entry.id}`).toBe(true);
      expect(statuses.has(entry.status), `status: ${entry.id}`).toBe(true);
      expect(existsSync(path.join(repoRoot, entry.source)), `source: ${entry.id}`).toBe(true);
      if (entry.kind === "route") {
        expect(entry.routePaths?.length ?? 0, `routePaths: ${entry.id}`).toBeGreaterThan(0);
        expect(new Set(entry.routePaths).size, `unique routePaths: ${entry.id}`).toBe(
          entry.routePaths?.length,
        );
      }
      if (entry.status === "verified") {
        expect(entry.proofTest, `proofTest: ${entry.id}`).toBeDefined();
        expect(entry.proofTestName, `proofTestName: ${entry.id}`).toBeDefined();
        const proofPath = path.join(repoRoot, entry.proofTest ?? "");
        expect(existsSync(proofPath), `proof exists: ${entry.id}`).toBe(true);
        const proofSource = readFileSync(proofPath, "utf8");
        expect(
          proofSource.includes(`"${entry.proofTestName ?? ""}"`),
          `named test: ${entry.id}`,
        ).toBe(true);
      }
    }

    const files = listTsx(inventory.scan.appDir);
    expect(findUncovered(inventory, files)).toEqual([]);
    expect(files).toHaveLength(75);

    const registered = registeredRoutePaths();
    const inventoryPaths = new Set(inventory.routes.flatMap((entry) => entry.routePaths ?? []));
    expect(registered.filter((routePath) => !inventoryPaths.has(routePath))).toEqual([]);

    const routeIds = new Set(inventory.routes.map((entry) => entry.id));
    const componentIds = new Set(inventory.components.map((entry) => entry.id));
    expect(routeIds.size).toBe(inventory.routes.length);
    expect(componentIds.size).toBe(inventory.components.length);

    const hostPaths = hostRoutePaths();
    expect(missingDeclaredEndpoints(inventory, hostPaths)).toEqual([]);
    const readRoutes = inventory.routes.filter((entry) => entry.category === "read");
    expect(readRoutes.length).toBeGreaterThan(0);
    expect(
      readRoutes.filter((entry) => (entry.hostEndpoints?.length ?? 0) === 0).map((entry) => entry.id),
      "every read route declares its host endpoints",
    ).toEqual([]);

    const waveIds = inventory.waves.flatMap((wave) => wave.routeIds);
    expect(new Set(waveIds).size, "unique wave ids").toBe(waveIds.length);
    expect([...waveIds].sort(), "every inventory row in a wave").toEqual(
      [...inventory.routes, ...inventory.components].map((entry) => entry.id).sort(),
    );
  });

  it("detects a nested route file that has no inventory row", () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as Inventory;
    const fake = path.posix.join(inventory.scan.appDir, "lib/__s26a_fake_nested__.tsx");
    expect(findUncovered(inventory, [...listTsx(inventory.scan.appDir), fake])).toEqual([fake]);
  });

  it("detects a routes.ts-only path that has no inventory row", () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as Inventory;
    const inventoryPaths = new Set(inventory.routes.flatMap((entry) => entry.routePaths ?? []));
    expect(inventoryPaths.has("/app/__s26a_fake_routes_only__")).toBe(false);
    // The same predicate used for registered paths catches the fake path.
    const registeredWithFake = [...registeredRoutePaths(), "/app/__s26a_fake_routes_only__"];
    expect(registeredWithFake.filter((routePath) => !inventoryPaths.has(routePath))).toEqual([
      "/app/__s26a_fake_routes_only__",
    ]);
  });

  it("detects a declared endpoint that is absent from the host route table", () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as Inventory;
    const fakeInventory: Inventory = {
      ...inventory,
      newOnly: [
        ...inventory.newOnly,
        {
          category: "read",
          hostEndpoints: ["/api/role-model/__s26a_fake_endpoint__"],
          id: "fake:endpoint",
          kind: "route",
          requiresHostEndpoint: false,
          source: "role-model-router/apps/runtime-ui-next/src/view.ts",
          status: "wired",
        },
      ],
    };
    expect(missingDeclaredEndpoints(fakeInventory, hostRoutePaths())).toEqual([
      "fake:endpoint:/api/role-model/__s26a_fake_endpoint__",
    ]);
  });
});