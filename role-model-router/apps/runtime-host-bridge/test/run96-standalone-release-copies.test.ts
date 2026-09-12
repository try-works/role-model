import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const packageSeaSource = readFileSync(
  path.resolve(import.meta.dirname, "..", "src", "package-sea.ts"),
  "utf8",
);

/**
 * The standalone SEA ships an explicit copy list. A module added to the host
 * (`transfer-artifact.mjs`, `retained-response-store.mjs`) is invisible to that
 * list until it is registered, and the released package then fails at runtime
 * with ERR_MODULE_NOT_FOUND. Keep the list closed over every relative import.
 */
test("standalone release copies cover every relative import of a copied module", () => {
  const copies = [...packageSeaSource.matchAll(/sourceRelativePath:\s*"([^"]+)"/g)].map((match) =>
    match[1].replaceAll("\\", "/"),
  );
  const copied = new Set(copies);
  const failures: string[] = [];
  for (const relativePath of copies) {
    if (!/\.(mjs|js)$/.test(relativePath)) continue;
    const absolutePath = path.join(repoRoot, relativePath);
    if (!existsSync(absolutePath)) continue;
    const source = readFileSync(absolutePath, "utf8");
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)) {
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(relativePath), match[1]),
      );
      if (!copied.has(resolved)) {
        failures.push(`${relativePath} imports ${match[1]} (missing ${resolved})`);
      }
    }
  }
  expect(failures).toEqual([]);
});
