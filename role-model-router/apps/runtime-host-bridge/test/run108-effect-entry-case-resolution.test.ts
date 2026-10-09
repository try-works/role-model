import path from "node:path";
/**
 * Run 108 follow-up - the vendored Effect wrapper's build must resolve its entry
 * points identically on case-sensitive and case-insensitive filesystems.
 *
 * CI run 37988479615 (Linux) failed the `effect@4.0.1` build with
 * `Two output files share the same path but have different contents: dist/Schema.js`;
 * the same build passed on Windows. The cause was resolution, not bundling:
 * `resolveEntry` tested candidate files with `readFile`, which on Windows opens
 * `src/schema.ts` for a candidate spelled `src/Schema.ts`. So `schema` was
 * silently aliased onto the same file as `Schema` on Windows, while on Linux it
 * fell through to the genuinely different barrel `src/schema/index.ts` - two
 * entries (`dist/schema.js` and `dist/Schema.js`) that esbuild refuses to write
 * because its output-conflict check is case-insensitive on every platform.
 *
 * RED at the frozen baseline: `schema` resolved to `src/Schema.ts` on Windows
 * (matching Linux only by accident), `match` resolved to `src/Match.ts` even
 * though no such subpath exists, and the entry map carried both halves of both
 * pairs.
 *
 * GREEN once resolution is case-sensitive, the barrel is keyed by its
 * vendored-relative name, and the case-insensitive guard is in place.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  assembleEntries,
  discoverEffectSubpaths,
  resolveEntry,
  vendored,
} from "../../../packages/effect/entries.mjs";

type Rekeyed = { subpath: string; key: string; shadows: string };

let entries: Record<string, string>;
let rekeyed: Rekeyed[];

beforeAll(async () => {
  ({ entries, rekeyed } = (await assembleEntries(await discoverEffectSubpaths())) as {
    entries: Record<string, string>;
    rekeyed: Rekeyed[];
  });
}, 120_000);

describe("@recursive:108-effect-entry-case-resolution @sp1 case-sensitive entry resolution", () => {
  it("resolves case-differing subpaths to their exact case-sensitive files", async () => {
    // `src/schema/index.ts` is the barrel the vendored package publishes as
    // `effect/schema` (`"./schema": "./src/schema/index.ts"`); `src/Schema.ts` is the
    // main Schema module, reachable only through the vendor's `"./*"` wildcard.
    await expect(resolveEntry("schema")).resolves.toBe(path.join(vendored, "schema", "index.ts"));
    await expect(resolveEntry("Schema")).resolves.toBe(path.join(vendored, "Schema.ts"));
    // No `src/match.ts` and no `src/match/index.ts` exist, so `effect/match` is not a
    // published subpath - on Windows the old resolver published it anyway, pointing at
    // `Match.ts`.
    await expect(resolveEntry("Match")).resolves.toBe(path.join(vendored, "Match.ts"));
    await expect(resolveEntry("match")).resolves.toBeUndefined();
  });

  it("keeps one entry per case-differing pair and never two names that differ only by case", () => {
    const seen = new Map<string, string>();
    for (const key of Object.keys(entries)) {
      const clash = seen.get(key.toLowerCase());
      expect(clash, `entries "${clash}" and "${key}" differ only by case`).toBeUndefined();
      seen.set(key.toLowerCase(), key);
    }

    // The published subpath `effect/schema` is served by its vendored-relative output
    // name `dist/schema/index.js` - the same layout upstream publishes - while
    // `effect/Schema` keeps the flat `dist/Schema.js`. Nothing is dropped: both
    // specifiers still resolve (see the package's `exports` map).
    expect(entries.Schema).toBe(path.join(vendored, "Schema.ts"));
    expect(entries.schema).toBeUndefined();
    expect(entries["schema/index"]).toBe(path.join(vendored, "schema", "index.ts"));
    expect(rekeyed).toEqual([{ subpath: "schema", key: "schema/index", shadows: "Schema" }]);

    // The Windows-only phantom `match` entry is gone; `Match` is unchanged.
    expect(entries.Match).toBe(path.join(vendored, "Match.ts"));
    expect(entries.match).toBeUndefined();
  });

  it("fails the build when two entry points still differ only by case", async () => {
    // Guard coverage: this collision is invisible on Windows (the two names are one
    // file there), so a regression has to fail loudly instead of resurfacing in CI.
    await expect(
      assembleEntries(["Foo", "foo"], {
        resolve: async (subpath: string) => path.join(vendored, `${subpath}.ts`),
      }),
    ).rejects.toThrow(/"Foo" and "foo" differ only by case/);
  });
});
