import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { PAGE_STORIES } from "./support/page-stories";
import { shellModel } from "./support/runtime-shell";
import type { Model } from "../src/model";
import { view } from "../src/view";

/**
 * S565: the per-route scene contract, captured from the shipped 0.0.20 build on :3456
 * (test/support/page-stories.ts). Each route is rendered and must show, in order, the reference
 * section headings, every reference table's column set, and every named filter control.
 */

const routeFor = (tag: string): Model["route"] => {
  switch (tag) {
    case "Diagnostics":
      return { _tag: "Diagnostics", id: "42" };
    case "RequestDetail":
      return { _tag: "RequestDetail", requestId: "req-1" };
    case "RouterDecisionDetail":
      return { _tag: "RouterDecisionDetail", requestId: "req-1" };
    case "NotFound":
      return { _tag: "NotFound", path: "/missing" };
    default:
      return { _tag: tag } as Model["route"];
  }
};

const normalise = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const inOrder = (expected: ReadonlyArray<string>, actual: ReadonlyArray<string>): boolean => {
  let cursor = 0;
  for (const heading of actual) {
    if (cursor < expected.length && heading === expected[cursor]) {
      cursor += 1;
    }
  }
  return cursor === expected.length;
};

const renderRoute = async (route: Model["route"], studioTab?: string): Promise<HTMLElement> => {
  const base = shellModel({ route });
  const model: Model =
    studioTab === undefined
      ? base
      : { ...base, studio: { tab: studioTab } as unknown as Model["studio"] };
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const sceneFailures = (container: HTMLElement, story: { headings: ReadonlyArray<{ text: string }>; tables: ReadonlyArray<{ headers: ReadonlyArray<string> }>; combos: ReadonlyArray<{ readonly label: string; readonly text: string }> }): string[] => {
  const failures: string[] = [];
  const pageTitle = normalise(container.querySelector("h1")?.textContent);
  const headings = [
    ...container.querySelectorAll("main h2, main h3, main h4"),
  ].map((element) => normalise(element.textContent));
  const expectedHeadings = story.headings
    .map((heading) => normalise(heading.text))
    .filter((heading, index) => !(index === 0 && heading === pageTitle));
  if (!inOrder(expectedHeadings, headings)) {
    failures.push("sections: expected [" + expectedHeadings.join(" | ") + "] rendered [" + headings.join(" | ") + "]");
  }
  const renderedTables = [...container.querySelectorAll("table, [role='table']")].map((table) =>
    [...table.querySelectorAll("thead th, [role='columnheader']")].map((cell) => normalise(cell.textContent)),
  );
  for (const table of story.tables) {
    const headers = table.headers.map(normalise);
    const found = renderedTables.some((rendered) => inOrder(headers, rendered));
    if (!found) {
      failures.push("table: missing columns [" + headers.join(", ") + "]");
    }
  }
  const named = [...container.querySelectorAll("main select, main [role='combobox'], main button[aria-haspopup='listbox']")].map((control) =>
    normalise(control.getAttribute("aria-label") ?? control.closest("label")?.textContent ?? ""),
  );
  for (const combo of story.combos) {
    const matched = named.some((name) => (combo.label.length > 0 && name.includes(combo.label)) || (combo.text.length > 0 && name.includes(combo.text)));
    if (!matched) {
      failures.push("control: missing [" + (combo.label || combo.text) + "]");
    }
  }
  return failures;
};

describe("S565 page stories — scene (captured from :3456)", () => {
  for (const [tag, story] of Object.entries(PAGE_STORIES)) {
    it(tag + " matches its :3456 story", async () => {
      const container = await renderRoute(routeFor(tag));
      const failures = sceneFailures(container, story);
      expect(failures, tag + "\n" + failures.join("\n")).toEqual([]);
      expect(normalise(container.textContent)).not.toContain("Runtime UI");
    });
  }
});