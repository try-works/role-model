import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { Message } from "../src/message";
import {
  type Inventory,
  type InventoryEntry,
  type InventoryRoute,
  compareDeadKeys,
  deadKey,
  interactiveElements,
  recordingHtmlBuilder,
  renderInventory,
  scanAllRoutes,
  unwiredControls,
} from "./support/handler-presence";

/**
 * S617: handler presence — a reusable test helper that makes a dead control a CI failure.
 *
 * Every routed view receives no real runtime in a unit test, so the helper supplies a recording
 * HtmlBuilder: tag calls and attribute calls are recorded structurally, which lets the walker see
 * OnClick/OnInput/OnChange/OnSubmit/Href wiring that never reaches the DOM. The route scan then
 * reports interactive elements with no wiring, and the committed baseline pins today's inventory so
 * a NEW dead control fails the suite while the known backlog stays visible in the baseline file.
 */

const sentinel = (() => undefined) as never;

const deadEntry = (label: string, path = "div[1]>button[1]"): InventoryEntry => ({
  label,
  path,
  role: null,
  tag: "button",
});
const inventoryRoute = (route: string, unwired: ReadonlyArray<InventoryEntry>): InventoryRoute => ({
  disabledCount: 0,
  elementCount: unwired.length + 1,
  route,
  unwired,
  wiredCount: 1,
});
const inventoryOf = (routes: ReadonlyArray<InventoryRoute>): Inventory => ({
  routes,
  totals: {
    deadControls: routes.reduce((sum, route) => sum + route.unwired.length, 0),
    disabledControls: 0,
    elements: routes.reduce((sum, route) => sum + route.elementCount, 0),
    routes: routes.length,
  },
});

const tree = (build: (h: ReturnType<typeof recordingHtmlBuilder>) => unknown) =>
  interactiveElements(build(recordingHtmlBuilder<unknown>()));

describe("S617 handler-presence: structural walker", () => {
  it("accepts a button wired with OnClick and flags one without any handler", () => {
    const elements = tree((h) =>
      h.div(
        [],
        [
          h.button([h.Type("button"), h.OnClick(sentinel as never)], ["Run benchmark"]),
          h.button([h.Type("button"), h.Class("ghost")], ["Clear all data"]),
        ],
      ),
    );
    const wired = elements.find((entry) => entry.label === "Run benchmark");
    const dead = elements.find((entry) => entry.label === "Clear all data");
    expect(wired?.wired).toBe(true);
    expect(wired?.handlers).toContain("click");
    expect(dead?.wired).toBe(false);
    expect(dead?.tag).toBe("button");
    expect(dead?.disabled).toBe(false);
    expect(dead?.path).toMatch(/button\[2\]/);
  });

  it("flags inputs, selects and textareas without OnInput/OnChange, and accepts wired ones", () => {
    const elements = tree((h) =>
      h.div(
        [],
        [
          h.input([h.Type("password"), h.AriaLabel("Operator token")]),
          h.input([h.Type("text"), h.OnInput(sentinel as never)]),
          h.select([h.AriaLabel("Breakdown")], [h.option([h.Value("total")], ["Total"])]),
          h.textarea([h.AriaLabel("Notes")]),
        ],
      ),
    );
    const token = elements.find((entry) => entry.label === "Operator token");
    const wiredInput = elements.find((entry) => entry.handlers.includes("input"));
    const select = elements.find((entry) => entry.tag === "select");
    const textarea = elements.find((entry) => entry.tag === "textarea");
    expect(token?.wired).toBe(false);
    expect(wiredInput?.wired).toBe(true);
    expect(select?.wired).toBe(false);
    expect(textarea?.wired).toBe(false);
    // A native <option> is owned by its select and is NOT independently wirable, so it is not a dead control
    // of its own (the select is). A role=option on a non-option element (custom listbox row) still counts.
    expect(elements.some((entry) => entry.tag === "option")).toBe(false);
    const customRow = tree((h) => h.div([h.Role("option")], ["All"]));
    expect(customRow.some((entry) => entry.role === "option" && entry.tag === "div")).toBe(true);
  });

  it("treats an anchor as wired only when it has a real href or a click handler", () => {
    const elements = tree((h) =>
      h.div(
        [],
        [
          h.a([h.Href("/models")], ["Models"]),
          h.a([h.Class("underline"), h.OnClick(sentinel as never)], ["Open"]),
          h.a([h.Class("plain")], ["Dead link"]),
        ],
      ),
    );
    const byLabel = (label: string) => elements.find((entry) => entry.label === label);
    expect(byLabel("Models")?.wired).toBe(true);
    expect(byLabel("Models")?.href).toBe("/models");
    expect(byLabel("Open")?.wired).toBe(true);
    expect(byLabel("Dead link")?.wired).toBe(false);
  });

  it("recognises role=button/tab/option controls, and disabled controls are reported but not dead", () => {
    const elements = tree((h) =>
      h.div(
        [],
        [
          h.div([h.Role("tab")], ["Decisions"]),
          h.div([h.Role("tab"), h.OnClick(sentinel as never)], ["Evidence"]),
          h.button([h.Disabled(true)], ["Release kill switch"]),
          h.div([h.Role("button"), h.Attribute("aria-disabled", "true")], ["Roll back"]),
        ],
      ),
    );
    expect(elements.find((entry) => entry.label === "Decisions")?.wired).toBe(false);
    expect(elements.find((entry) => entry.label === "Evidence")?.wired).toBe(true);
    const disabled = elements.find((entry) => entry.label === "Release kill switch");
    expect(disabled?.disabled).toBe(true);
    expect(disabled?.dead).toBe(false);
    expect(elements.find((entry) => entry.label === "Roll back")?.disabled).toBe(true);
    const h = recordingHtmlBuilder<Message>();
    const dead = unwiredControls(
      h.div([], [h.button([], ["Dead one"]), h.button([h.Disabled(true)], ["Off"])]),
    );
    expect(dead.map((entry) => entry.label)).toEqual(["Dead one"]);
  });
});

describe("S617 handler-presence: routed inventory", () => {
  it("scans every routed tag with no recorder gaps", () => {
    const scans = scanAllRoutes();
    expect(scans.length).toBeGreaterThanOrEqual(47);
    // task-108 closed the last recorder gap: the Requests ranking selectors are real wired <select> controls,
    // so no route reports a scanner error anymore.
    const failed = scans.filter((scan) => scan.error !== undefined).map((scan) => scan.route);
    expect(failed).toEqual([]);
    const scanned = scans.filter((scan) => scan.error === undefined);
    expect(scanned.length).toBeGreaterThanOrEqual(47);
    expect(scanned.every((scan) => scan.elements.length > 0)).toBe(true);
    const requests = scans.find((scan) => scan.route === "Requests");
    expect(requests?.unwired).toEqual([]);
  });

  it("finds today's known dead controls from evidence/logs/ui-dead-controls-inventory.md", () => {
    const scans = scanAllRoutes();
    const learning = scans.find((scan) => scan.route === "Learning");
    // S619 wired the Learning family from the inventory; these must no longer be dead.
    expect(learning?.unwired.some((entry) => entry.label.includes("Operator token"))).toBe(false);
    const packs = scans.find((scan) => scan.route === "LearningPacks");
    expect(packs?.unwired.some((entry) => entry.label.includes("Engage kill switch"))).toBe(false);
    // task-102 wired the LocalPeers inputs/actions and the SystemExtensions/SystemOperator controls;
    // none of them may remain dead in the inventory.
    const peers = scans.find((scan) => scan.route === "LocalPeers");
    expect(peers?.unwired.some((entry) => entry.label.includes("http://127.0.0.1:1234"))).toBe(
      false,
    );
    const extensions = scans.find((scan) => scan.route === "SystemExtensions");
    expect(extensions?.unwired.some((entry) => entry.label === "Pause")).toBe(false);
    const operator = scans.find((scan) => scan.route === "SystemOperator");
    expect(operator?.unwired.some((entry) => entry.label === "Create Replay")).toBe(false);
  });

  it("the comparison FAILS on a synthetic newly dead control and names it", () => {
    const baseline = inventoryOf([inventoryRoute("Models", [deadEntry("Save")])]);
    const actual = inventoryOf([
      inventoryRoute("Models", [deadEntry("Save"), deadEntry("Delete", "div[1]>button[2]")]),
    ]);
    const comparison = compareDeadKeys(actual, baseline);
    expect(comparison.added).toEqual([deadKey("Models", deadEntry("Delete", "div[1]>button[2]"))]);
    expect(comparison.added.length).toBe(1);
    expect(comparison.removed).toEqual([]);
  });

  it("the comparison PASSES when a baseline control becomes wired or disappears", () => {
    const baseline = inventoryOf([
      inventoryRoute("Models", [deadEntry("Save"), deadEntry("Delete", "div[1]>button[2]")]),
    ]);
    const actual = inventoryOf([inventoryRoute("Models", [deadEntry("Save")])]);
    const comparison = compareDeadKeys(actual, baseline);
    expect(comparison.added).toEqual([]);
    expect(comparison.removed).toEqual([
      deadKey("Models", deadEntry("Delete", "div[1]>button[2]")),
    ]);
  });

  it("matches the committed baseline, so a new dead control fails the suite", () => {
    const scans = scanAllRoutes();
    const actual = renderInventory(scans);
    const baselinePath = fileURLToPath(
      new URL("test/support/handler-presence-baseline.json", `file://${process.cwd()}/`),
    );
    if (process.env.UPDATE_HANDLER_PRESENCE_BASELINE === "1") {
      writeFileSync(baselinePath, `${JSON.stringify(actual, null, 2)}\n`);
    }
    const baseline: Inventory = JSON.parse(readFileSync(baselinePath, "utf8"));
    const comparison = compareDeadKeys(actual, baseline);
    expect(
      comparison.added,
      `new dead controls: ${comparison.added.join(", ")}${
        comparison.removed.length === 0
          ? ""
          : ` (wired up since the baseline: ${comparison.removed.join(", ")})`
      }`,
    ).toEqual([]);
  });
});
