import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative: string) => readFileSync(path.join(repoRoot, relative), "utf8");
const hash = (relative: string) =>
  createHash("sha256").update(readFileSync(path.join(repoRoot, relative))).digest("hex");
const GAP = "role-model-router/packages/ui/FOLDCN-GAP.md";
const FOLDCN = ["Fold", "cn"].join("");

const scanForbidden = (root: string, allowed: string): string[] => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "build", ".turbo", ".git"].includes(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (rel === allowed) continue;
      if (new RegExp(FOLDCN).test(entry.name)) hits.push(rel);
      const text = readFileSync(full);
      if (text.includes(0)) continue;
      if (new RegExp(FOLDCN).test(text.toString("utf8"))) hits.push(rel);
    }
  };
  walk(path.join(repoRoot, root));
  return hits;
};

const componentSources = (): string[] => {
  const dir = path.join(repoRoot, "role-model-router/packages/ui/src");
  return readdirSync(dir)
    .filter(
      (name) =>
        /.(ts|tsx)$/.test(name) &&
        !name.endsWith(".test.ts") &&
        !name.endsWith(".test.tsx") &&
        name !== "index.ts",
    )
    .sort();
};

const ledgerRows = (): Map<string, string[]> => {
  const text = read("role-model-router/packages/ui/RM3-ADAPTED-SOURCES.md");
  const rows = new Map<string, string[]>();
  for (const line of text.split(String.fromCharCode(10))) {
    if (!line.startsWith("| `")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const source = cells[0].replaceAll("`", "");
    rows.set(source, cells);
  }
  return rows;
};

describe("R7 RM3 provenance ledgers", () => {
  it(`proves ${FOLDCN} is absent from vendor and role-model-router, not just the prose`, () => {
    const hits = [...scanForbidden("vendor", GAP), ...scanForbidden("role-model-router", GAP)];
    expect(hits, `${FOLDCN} references outside ${GAP}: ${hits.join(", ")}`).toEqual([]);
  }, 60_000);

  it("gives every first-party RM3 component exactly one row with a verified upstream hash or first-party marker", () => {
    const rows = ledgerRows();
    const sources = componentSources();
    expect(Object.fromEntries([...rows.keys()].map((key) => [key, key]))).toBeDefined();
    for (const source of sources) {
      const row = rows.get(source);
      expect(row, `missing ledger row: ${source}`).toBeDefined();
      const [, upstream, pin, digest, licence, owner] = row ?? [];
      expect(owner?.length).toBeGreaterThan(0);
      expect(licence?.length).toBeGreaterThan(0);
      if (upstream === "first-party-only") {
        expect(digest).toBe("first-party-only");
        expect(pin).toBe("n/a");
      } else {
        const upstreamPath = upstream.replaceAll("`", "");
        expect(hash(upstreamPath), upstreamPath).toBe(digest?.replaceAll("`", ""));
        expect(pin).toMatch(/[0-9a-f]{40}/);
        const digestValue = digest?.replaceAll("`", "") ?? "";
        expect(digestValue).toMatch(/^[0-9a-f]{64}$/);
      }
    }
    // Duplicate source rows are a ledger defect, not harmless formatting.
    const text = read("role-model-router/packages/ui/RM3-ADAPTED-SOURCES.md");
    const seen = new Set<string>();
    for (const line of text.split(String.fromCharCode(10))) {
      if (!line.startsWith("| `")) continue;
      const source = line.split("|")[1]?.trim().replaceAll("`", "");
      if (source === undefined) continue;
      expect(seen.has(source), `duplicate ledger row: ${source}`).toBe(false);
      seen.add(source);
    }
  });
});
