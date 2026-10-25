import { describe, expect, it } from "vitest";

import {
  compareStructureSnapshots,
  type StructureControlNode,
  type StructureDifference,
  type StructureNode,
  type StructureRect,
  type StructureStyle,
  type StructureTextNode,
} from "../src/structure.js";

function rect(x = 0, y = 0, width = 100, height = 20): StructureRect {
  return { x, y, width, height };
}

function styles(values: Readonly<Record<string, string>> = {}): readonly StructureStyle[] {
  return Object.keys(values)
    .sort()
    .map((property) => ({ property, value: values[property] }));
}

interface NodeOptions {
  readonly rect?: StructureRect;
  readonly styles?: readonly StructureStyle[];
}

function text(value: string, options: NodeOptions = {}): StructureTextNode {
  return {
    kind: "text",
    text: value,
    rect: options.rect ?? rect(),
    styles: options.styles ?? styles(),
  };
}

function control(role: string, name: string, options: NodeOptions = {}): StructureControlNode {
  return {
    kind: "control",
    role,
    name,
    rect: options.rect ?? rect(),
    styles: options.styles ?? styles(),
  };
}

function groups(differences: readonly StructureDifference[]): readonly string[] {
  return differences.map(
    (difference) =>
      `${difference.code}|${difference.detail ?? ""}|${difference.count}|${difference.expectedIndexes.join(",")}|${difference.actualIndexes.join(",")}`,
  );
}

function codes(differences: readonly StructureDifference[]): readonly string[] {
  return differences.map((difference) => difference.code);
}

describe("compareStructureSnapshots", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("rejects invalid explicit tolerance %s", (tolerance) => {
    expect(() => compareStructureSnapshots([], [], { tolerance })).toThrow(RangeError);
  });
  it("detects removal of every captured style property", () => {
    const expected = text("A", { styles: styles({ color: "red", display: "block" }) });
    expect(groups(compareStructureSnapshots([expected], [text("A")]))).toEqual([
      "style_changed|color|1|0|0", "style_changed|display|1|0|0",
    ]);
  });
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rejects non-finite captured geometry %s", (x) => {
    const invalid = text("A", { rect: rect(x, 0) });
    expect(compareStructureSnapshots([invalid], [invalid]).some((difference) => difference.code === "invalid_capture")).toBe(true);
  });
  it("rejects a negative rectangle size", () => {
    const invalid = text("A", { rect: rect(0, 0, -1, 20) });
    expect(compareStructureSnapshots([invalid], [invalid]).some((difference) => difference.code === "invalid_capture")).toBe(true);
  });
  it("returns no findings for identical text and control captures", () => {
    const capture: readonly StructureNode[] = [
      text("Total", {
        rect: rect(8, 8, 40, 18),
        styles: styles({ color: "rgb(1, 2, 3)", display: "block" }),
      }),
      control("button", "Save", {
        rect: rect(8, 40, 80, 32),
        styles: styles({ "font-weight": "600", color: "rgb(1, 2, 3)" }),
      }),
    ];
    expect(compareStructureSnapshots(capture, capture)).toEqual([]);
  });

  it("returns no findings for two empty snapshots", () => {
    expect(compareStructureSnapshots([], [])).toEqual([]);
  });

  it("reports an extra node against an empty expected snapshot", () => {
    expect(groups(compareStructureSnapshots([], [text("Only")]))).toEqual([
      "extra_node|text|1||0",
    ]);
  });

  it("reports a missing node against an empty actual snapshot", () => {
    expect(groups(compareStructureSnapshots([text("Only")], []))).toEqual([
      "missing_node|text|1|0|",
    ]);
  });

  it("ignores node array order when identity and geometry agree", () => {
    const first = text("Alpha", { rect: rect(0, 0, 10, 10) });
    const second = control("button", "Save", { rect: rect(0, 20, 10, 10) });
    expect(compareStructureSnapshots([first, second], [second, first])).toEqual([]);
  });

  it("matches repeated text occurrences independently of order", () => {
    const first = text("Row", { rect: rect(0, 0, 10, 10) });
    const second = text("Row", { rect: rect(0, 10, 10, 10) });
    expect(compareStructureSnapshots([first, second], [second, first])).toEqual([]);
  });

  it("matches repeated control occurrences independently of order", () => {
    const first = control("button", "Delete", { rect: rect(0, 0, 10, 10) });
    const second = control("button", "Delete", { rect: rect(0, 10, 10, 10) });
    expect(compareStructureSnapshots([first, second], [second, first])).toEqual([]);
  });

  it("pairs repeated identities by geometry and reports one geometry change", () => {
    const expected = [
      text("Row", { rect: rect(0, 0, 10, 10) }),
      text("Row", { rect: rect(0, 10, 10, 10) }),
    ];
    const actual = [
      text("Row", { rect: rect(0, 10, 10, 10) }),
      text("Row", { rect: rect(0, 20, 10, 10) }),
    ];
    expect(groups(compareStructureSnapshots(expected, actual))).toEqual([
      "geometry_changed|y|1|0|1",
    ]);
  });

  it("reports a missing repeated occurrence instead of a silent drop", () => {
    const row = text("Row", { rect: rect(0, 0, 10, 10) });
    expect(groups(compareStructureSnapshots([row, row], [row]))).toEqual([
      "missing_node|text|1|1|",
    ]);
  });

  it("reports an extra repeated occurrence", () => {
    const row = text("Row", { rect: rect(0, 0, 10, 10) });
    expect(groups(compareStructureSnapshots([row], [row, row]))).toEqual([
      "extra_node|text|1||1",
    ]);
  });

  it("reports a changed text identity", () => {
    expect(groups(compareStructureSnapshots([text("Total")], [text("Subtotal")]))).toEqual([
      "text_changed||1|0|0",
    ]);
  });

  it("reports a changed control accessible name", () => {
    expect(
      groups(
        compareStructureSnapshots(
          [control("button", "Save")],
          [control("button", "Save changes")],
        ),
      ),
    ).toEqual(["name_changed||1|0|0"]);
  });

  it("reports a changed control role", () => {
    expect(
      groups(
        compareStructureSnapshots([control("button", "Save")], [control("link", "Save")]),
      ),
    ).toEqual(["role_changed||1|0|0"]);
  });

  it("reports a text/control kind change at the same position", () => {
    expect(
      groups(compareStructureSnapshots([text("Save")], [control("button", "Save")])),
    ).toEqual(["kind_changed||1|0|0"]);
  });

  it("reports a geometry change without missing or extra findings", () => {
    const differences = compareStructureSnapshots(
      [text("Total", { rect: rect(0, 0) })],
      [text("Total", { rect: rect(6, 0) })],
    );
    expect(groups(differences)).toEqual(["geometry_changed|x|1|0|0"]);
    expect(codes(differences)).not.toContain("missing_node");
    expect(codes(differences)).not.toContain("extra_node");
  });

  it("reports a lost computed style property", () => {
    const expected = [
      text("Total", { styles: styles({ color: "red", display: "block" }) }),
    ];
    const actual = [text("Total", { styles: styles({ display: "block" }) })];
    expect(groups(compareStructureSnapshots(expected, actual))).toEqual([
      "style_changed|color|1|0|0",
    ]);
  });

  it("separates different changed style properties into groups", () => {
    const expected = [
      text("Total", { styles: styles({ color: "red", display: "block" }) }),
    ];
    const actual = [
      text("Total", { styles: styles({ color: "blue", display: "none" }) }),
    ];
    expect(groups(compareStructureSnapshots(expected, actual))).toEqual([
      "style_changed|color|1|0|0",
      "style_changed|display|1|0|0",
    ]);
  });

  it("groups identical repeated style differences once with count and indices", () => {
    const make = (color: string, y: number) =>
      text("Row", {
        rect: rect(0, y, 10, 10),
        styles: styles({ color, display: "block" }),
      });
    const expected = [make("red", 0), make("red", 10), make("red", 20)];
    const actual = [make("blue", 20), make("blue", 0), make("blue", 10)];

    const differences = compareStructureSnapshots(expected, actual);
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatchObject({
      code: "style_changed",
      detail: "color",
      count: 3,
      expectedIndexes: [0, 1, 2],
      actualIndexes: [0, 1, 2],
    });
  });

  it("rejects sub-pixel and 5px geometry changes at the default zero tolerance", () => {
    const expected = [text("A", { rect: rect(0, 0) })];
    expect(
      groups(compareStructureSnapshots(expected, [text("A", { rect: rect(0.01, 0) })])),
    ).toEqual(["geometry_changed|x|1|0|0"]);
    expect(
      groups(compareStructureSnapshots(expected, [text("A", { rect: rect(5, 0) })])),
    ).toEqual(["geometry_changed|x|1|0|0"]);
  });

  it("applies only the explicit geometry tolerance", () => {
    const expected = [text("A", { rect: rect(0, 0) })];
    const within = [text("A", { rect: rect(0.5, 0) })];
    const outside = [text("A", { rect: rect(0.51, 0) })];
    expect(compareStructureSnapshots(expected, within, { tolerance: 0.5 })).toEqual([]);
    expect(
      groups(compareStructureSnapshots(expected, outside, { tolerance: 0.5 })),
    ).toEqual(["geometry_changed|x|1|0|0"]);
  });

  it("canonicalizes style key order without reporting a difference", () => {
    const canonical = styles({ color: "red", display: "block" });
    const reversed = [...canonical].reverse();
    expect(
      compareStructureSnapshots(
        [text("A", { styles: canonical })],
        [text("A", { styles: reversed })],
      ),
    ).toEqual([]);
  });

  it("rejects repeated style keys as an invalid capture", () => {
    const repeated = [
      { property: "color", value: "red" },
      { property: "color", value: "blue" },
    ];
    expect(
      groups(compareStructureSnapshots([text("A", { styles: repeated })], [text("A")])),
    ).toEqual(["invalid_capture|expected.styles|1|0|"]);
  });

  it("does not copy text or style values into findings", () => {
    const expected = [
      text("secret text", { styles: styles({ color: "#123456" }) }),
    ];
    const actual = [text("secret text", { styles: styles({ color: "#abcdef" }) })];
    const summary = JSON.stringify(compareStructureSnapshots(expected, actual));
    expect(summary).toContain("color");
    expect(summary).not.toContain("secret text");
    expect(summary).not.toContain("#123456");
    expect(summary).not.toContain("#abcdef");
  });

  it("produces the same grouped result when input arrays are reversed", () => {
    const make = (color: string, y: number) =>
      text("Row", {
        rect: rect(0, y, 10, 10),
        styles: styles({ color, display: "block" }),
      });
    const expected = [make("red", 0), make("red", 10)];
    const actual = [make("blue", 0), make("blue", 10)];

    const forward = compareStructureSnapshots(expected, actual);
    const reversed = compareStructureSnapshots(
      [...expected].reverse(),
      [...actual].reverse(),
    );
    expect(groups(forward)).toEqual(["style_changed|color|2|0,1|0,1"]);
    expect(groups(reversed)).toEqual(groups(forward));
  });

  it("does not mutate either capture", () => {
    const expected = [text("A", { styles: styles({ color: "red" }) })];
    const actual = [control("button", "B", { styles: styles({ color: "blue" }) })];
    const before = JSON.stringify([expected, actual]);
    compareStructureSnapshots(expected, actual);
    expect(JSON.stringify([expected, actual])).toBe(before);
  });
});
