/**
 * Pure structural comparator for the parity harness. The adapter owns the DOM/
 * text/control walk and computed-style list; this module does no I/O, hashing,
 * browser, pixel, React self-check, or full-parity work.
 *
 * Identity is exact text, or exact accessible role+name. Repeated identities pair
 * exact geometry/style occurrences first, then remaining occurrences in canonical
 * placement order; input array order is not semantic. Styles are canonicalized by
 * property name, and repeated keys invalidate the capture. Geometry tolerance
 * defaults to zero. Findings are grouped by code/detail and carry only counts and
 * expected/actual indexes, never captured text, names, or style values.
 */

export interface StructureRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number; }
export interface StructureStyle { readonly property: string; readonly value: string; }
export interface StructureNodeBase { readonly rect: StructureRect; readonly styles: readonly StructureStyle[]; }
export interface StructureTextNode extends StructureNodeBase { readonly kind: "text"; readonly text: string; }
export interface StructureControlNode extends StructureNodeBase { readonly kind: "control"; readonly role: string; readonly name: string; }
export type StructureNode = StructureTextNode | StructureControlNode;
export type StructureDifferenceCode = "missing_node" | "extra_node" | "kind_changed" | "text_changed" | "role_changed" | "name_changed" | "geometry_changed" | "style_changed" | "invalid_capture";
export interface StructureDifference { readonly code: StructureDifferenceCode; readonly detail: string | null; readonly count: number; readonly expectedIndexes: readonly number[]; readonly actualIndexes: readonly number[]; }
export interface StructureCompareOptions { readonly tolerance?: number; }

const DIMENSIONS = ["x", "y", "width", "height"] as const;
interface PreparedNode { readonly node: StructureNode; readonly styles: readonly StructureStyle[]; }
interface PreparedCapture { readonly nodes: readonly PreparedNode[]; readonly invalid: readonly number[]; }
interface DifferenceDraft { readonly code: StructureDifferenceCode; readonly detail: string | null; readonly expectedIndex: number | null; readonly actualIndex: number | null; }
interface DifferenceGroup { readonly code: StructureDifferenceCode; readonly detail: string | null; count: number; expected: number[]; actual: number[]; }

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

function identityOf(node: StructureNode): string {
  return node.kind === "text" ? JSON.stringify(["text", node.text]) : JSON.stringify(["control", node.role, node.name]);
}

function placementOf(node: StructureNode, styles: readonly StructureStyle[]): string {
  return JSON.stringify([node.rect.x, node.rect.y, node.rect.width, node.rect.height, styles.map((style) => [style.property, style.value])]);
}

function prepare(nodes: readonly StructureNode[]): PreparedCapture {
  const invalid: number[] = [];
  const prepared = nodes.map((node, index) => {
    const styles = [...node.styles].sort((left, right) => compareText(left.property, right.property));
    if (styles.some((style, position) => position > 0 && styles[position - 1].property === style.property)) invalid.push(index);
    return { node, styles };
  });
  return { nodes: prepared, invalid };
}

function groupIndexes(indexes: readonly number[], keyOf: (index: number) => string): Map<string, readonly number[]> {
  const grouped = new Map<string, number[]>();
  for (const index of indexes) {
    const key = keyOf(index);
    const bucket = grouped.get(key);
    if (bucket === undefined) grouped.set(key, [index]);
    else bucket.push(index);
  }
  return grouped;
}

function sortUnused(nodes: readonly PreparedNode[], indexes: readonly number[], used: ReadonlySet<number>): number[] {
  return indexes.filter((index) => !used.has(index)).sort((left, right) =>
    compareText(placementOf(nodes[left].node, nodes[left].styles), placementOf(nodes[right].node, nodes[right].styles)) || left - right);
}

function addPairDiffs(expected: PreparedNode, actual: PreparedNode, expectedIndex: number, actualIndex: number, tolerance: number, drafts: DifferenceDraft[]): void {
  for (const dimension of DIMENSIONS) {
    if (Math.abs(expected.node.rect[dimension] - actual.node.rect[dimension]) > tolerance) drafts.push({ code: "geometry_changed", detail: dimension, expectedIndex, actualIndex });
  }
  const expectedStyles = new Map(expected.styles.map((style) => [style.property, style.value]));
  const actualStyles = new Map(actual.styles.map((style) => [style.property, style.value]));
  for (const property of Array.from(new Set([...expectedStyles.keys(), ...actualStyles.keys()])).sort(compareText)) {
    if (expectedStyles.get(property) !== actualStyles.get(property)) drafts.push({ code: "style_changed", detail: property, expectedIndex, actualIndex });
  }
}

function addIdentityDiffs(expected: StructureNode, actual: StructureNode, expectedIndex: number, actualIndex: number, drafts: DifferenceDraft[]): void {
  if (expected.kind === "text" && actual.kind === "text") {
    if (expected.text !== actual.text) drafts.push({ code: "text_changed", detail: null, expectedIndex, actualIndex });
  } else if (expected.kind === "control" && actual.kind === "control") {
    if (expected.role !== actual.role) drafts.push({ code: "role_changed", detail: null, expectedIndex, actualIndex });
    if (expected.name !== actual.name) drafts.push({ code: "name_changed", detail: null, expectedIndex, actualIndex });
  } else {
    drafts.push({ code: "kind_changed", detail: null, expectedIndex, actualIndex });
  }
}

function toDifferences(drafts: readonly DifferenceDraft[]): readonly StructureDifference[] {
  const grouped = new Map<string, DifferenceGroup>();
  for (const draft of drafts) {
    const key = JSON.stringify([draft.code, draft.detail]);
    let group = grouped.get(key);
    if (group === undefined) { group = { code: draft.code, detail: draft.detail, count: 0, expected: [], actual: [] }; grouped.set(key, group); }
    group.count += 1;
    if (draft.expectedIndex !== null) group.expected.push(draft.expectedIndex);
    if (draft.actualIndex !== null) group.actual.push(draft.actualIndex);
  }
  return Array.from(grouped.values()).sort((left, right) => compareText(left.code, right.code) || compareText(left.detail ?? "", right.detail ?? ""))
    .map((group) => ({ code: group.code, detail: group.detail, count: group.count, expectedIndexes: [...group.expected].sort((left, right) => left - right), actualIndexes: [...group.actual].sort((left, right) => left - right) }));
}

function pairOccurrences(left: readonly PreparedNode[], right: readonly PreparedNode[], leftIndexes: readonly number[], rightIndexes: readonly number[], leftUsed: Set<number>, rightUsed: Set<number>, tolerance: number, drafts: DifferenceDraft[]): void {
  const exact = (nodes: readonly PreparedNode[], indexes: readonly number[]) => groupIndexes(indexes, (index) => placementOf(nodes[index].node, nodes[index].styles));
  const leftByExact = exact(left, leftIndexes);
  const rightByExact = exact(right, rightIndexes);
  for (const key of Array.from(new Set([...leftByExact.keys(), ...rightByExact.keys()])).sort(compareText)) {
    const leftMatches = leftByExact.get(key) ?? [];
    const rightMatches = rightByExact.get(key) ?? [];
    for (let position = 0; position < Math.min(leftMatches.length, rightMatches.length); position += 1) { leftUsed.add(leftMatches[position]); rightUsed.add(rightMatches[position]); }
  }
  const leftRemaining = sortUnused(left, leftIndexes, leftUsed);
  const rightRemaining = sortUnused(right, rightIndexes, rightUsed);
  for (let position = 0; position < Math.min(leftRemaining.length, rightRemaining.length); position += 1) {
    const expectedIndex = leftRemaining[position]; const actualIndex = rightRemaining[position];
    leftUsed.add(expectedIndex); rightUsed.add(actualIndex);
    addPairDiffs(left[expectedIndex], right[actualIndex], expectedIndex, actualIndex, tolerance, drafts);
  }
}

/**
 * Compare two structural captures and return deterministic grouped findings.
 * An empty result is not a browser, pixel, React self-check, or full-parity claim.
 */
export function compareStructureSnapshots(expected: readonly StructureNode[], actual: readonly StructureNode[], options: StructureCompareOptions = {}): readonly StructureDifference[] {
  const tolerance = options.tolerance ?? 0;
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new RangeError("Structure compare tolerance must be finite and non-negative");
  const invalidGeometry: DifferenceDraft[] = [];
  for (const [side, nodes] of [["expected", expected], ["actual", actual]] as const) {
    nodes.forEach((node, index) => {
      if (DIMENSIONS.some((dimension) => !Number.isFinite(node.rect[dimension])) || node.rect.width < 0 || node.rect.height < 0) {
        invalidGeometry.push({ code: "invalid_capture", detail: `${side}.rect`, expectedIndex: side === "expected" ? index : null, actualIndex: side === "actual" ? index : null });
      }
    });
  }
  if (invalidGeometry.length > 0) return toDifferences(invalidGeometry);
  const left = prepare(expected); const right = prepare(actual);
  if (left.invalid.length > 0 || right.invalid.length > 0) {
    return toDifferences([
      ...left.invalid.map((index): DifferenceDraft => ({ code: "invalid_capture", detail: "expected.styles", expectedIndex: index, actualIndex: null })),
      ...right.invalid.map((index): DifferenceDraft => ({ code: "invalid_capture", detail: "actual.styles", expectedIndex: null, actualIndex: index })),
    ]);
  }

  const drafts: DifferenceDraft[] = []; const leftUsed = new Set<number>(); const rightUsed = new Set<number>();
  const indexes = (nodes: readonly PreparedNode[]) => nodes.map((_, index) => index);
  const leftByIdentity = groupIndexes(indexes(left.nodes), (index) => identityOf(left.nodes[index].node));
  const rightByIdentity = groupIndexes(indexes(right.nodes), (index) => identityOf(right.nodes[index].node));
  for (const identity of Array.from(new Set([...leftByIdentity.keys(), ...rightByIdentity.keys()])).sort(compareText)) {
    pairOccurrences(left.nodes, right.nodes, leftByIdentity.get(identity) ?? [], rightByIdentity.get(identity) ?? [], leftUsed, rightUsed, tolerance, drafts);
  }

  const leftUnmatched = sortUnused(left.nodes, indexes(left.nodes), leftUsed);
  const rightUnmatched = indexes(right.nodes).filter((index) => !rightUsed.has(index));
  const rightByPlacement = groupIndexes(rightUnmatched, (index) => placementOf(right.nodes[index].node, right.nodes[index].styles));
  for (const expectedIndex of leftUnmatched) {
    const actualIndex = (rightByPlacement.get(placementOf(left.nodes[expectedIndex].node, left.nodes[expectedIndex].styles)) ?? []).find((index) => !rightUsed.has(index));
    if (actualIndex === undefined) continue;
    leftUsed.add(expectedIndex); rightUsed.add(actualIndex);
    addIdentityDiffs(left.nodes[expectedIndex].node, right.nodes[actualIndex].node, expectedIndex, actualIndex, drafts);
  }
  for (const index of leftUnmatched) if (!leftUsed.has(index)) drafts.push({ code: "missing_node", detail: left.nodes[index].node.kind, expectedIndex: index, actualIndex: null });
  for (const index of rightUnmatched) if (!rightUsed.has(index)) drafts.push({ code: "extra_node", detail: right.nodes[index].node.kind, expectedIndex: null, actualIndex: index });
  return toDifferences(drafts);
}
