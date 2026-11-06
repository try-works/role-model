import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative: string) => readFileSync(path.join(repoRoot, relative), "utf8");
const hash = (relative: string) =>
  createHash("sha256").update(readFileSync(path.join(repoRoot, relative))).digest("hex");

describe("R7 RM3 provenance ledgers", () => {
  it("records the Foldcn gap against the Crease-first rule", () => {
    const gap = read("role-model-router/packages/ui/FOLDCN-GAP.md");
    expect(gap).toContain("Foldcn");
    expect(gap).toMatch(/not (vendored|used)/i);
    expect(gap).toContain("Crease-first");
    expect(gap).toContain("bb447e363e9c717bf11ebb10b2259f053bff6f71");
  });

  it("maps every adapted RM3 source to a pinned upstream file, hash, licence and owner", () => {
    const ledger = read("role-model-router/packages/ui/RM3-ADAPTED-SOURCES.md");
    const mappings = [
      [
        "foldkit-chart.ts",
        "vendor/crease/src/ui/chart.ts",
        "79c4cc40777001bcf0f7653eefe2a71939913ee0e4a6a0e63a79f5e84b65c2ee",
      ],
      [
        "foldkit-chart.ts",
        "vendor/crease/src/lib/echarts.ts",
        "65280a20f7d099a9a513639120f214af21909118f6b3240e9b277fac8a6c3949",
      ],
      [
        "foldkit-button.ts",
        "vendor/foldkit/packages/ui/src/button/index.ts",
        "a3bca3a3a82591271f7bf5c7c75902bdae8a9eeff6815f09e68e4d099fad66e5",
      ],
      [
        "foldkit-checkbox.ts",
        "vendor/foldkit/packages/ui/src/checkbox/index.ts",
        "2c1ef03f37c96c681c7a119d7b98d90342100e6d3a5587a63ff40864962e2478",
      ],
      [
        "foldkit-input.ts",
        "vendor/foldkit/packages/ui/src/input/index.ts",
        "b93fb06aa5d8844ae4dac92dcf5a673dfc7bd4990b53c2398e0b744d99032ea7",
      ],
    ];
    for (const [source, upstream, digest] of mappings) {
      expect(hash(upstream), upstream).toBe(digest);
      expect(ledger).toContain(source);
      expect(ledger).toContain(upstream);
      expect(ledger).toContain(digest);
    }
    expect(ledger).toMatch(/\| owner \|/i);
    expect(ledger).toMatch(/licence|license/i);
  });
});
