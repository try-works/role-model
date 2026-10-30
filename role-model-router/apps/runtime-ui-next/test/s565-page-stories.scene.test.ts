import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { PAGE_STORIES, STUDIO_TAB_STORIES } from "./support/page-stories";
import { shellModel } from "./support/runtime-shell";
import type { Model } from "../src/model";
import { view } from "../src/view";

/**
 * S565: the page story contract. Each route declares, in test/support/page-stories.ts, the
 * ordered section headings the shipped 0.0.20 build displays (captured from :3456). The scene
 * test renders the route and requires those headings to appear in order - so a page that loses a
 * reference section, renames one, or renders an invented layout fails here.
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

const sectionHeadings = (container: HTMLElement): ReadonlyArray<string> =>
  [...container.querySelectorAll("h2, h3, h4")]
    .map((element) => normalise(element.textContent))
    .filter((heading) => heading.length > 0);

const inOrder = (expected: ReadonlyArray<string>, actual: ReadonlyArray<string>): boolean => {
  let cursor = 0;
  for (const heading of actual) {
    if (cursor < expected.length && heading === expected[cursor]) {
      cursor += 1;
    }
  }
  return cursor === expected.length;
};

const renderRoute = async (route: Model["route"]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model: shellModel({ route }), commands: [] }),
        view,
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S565 page stories — scene", () => {
  for (const [tag, story] of Object.entries(PAGE_STORIES)) {
    it(`${tag} shows its reference sections in order`, async () => {
      const container = await renderRoute(routeFor(tag));
      const headings = sectionHeadings(container);
      // The page title itself is the shell h1 (S560); sections start below it. Drop the title
      // occurrence so the story checks section order, not the shell header.
      const pageTitle = normalise(container.querySelector("h1")?.textContent);
      const expected = story.headings.filter((heading, index) => !(index === 0 && heading === pageTitle));
      expect(
        inOrder(expected, headings),
        `${tag}: expected [${expected.join(" | ")}] in order, rendered [${headings.join(" | ")}]`,
      ).toBe(true);
      // The invented shell generation must never come back.
      expect(normalise(container.textContent)).not.toContain("Runtime UI");
      expect(container.querySelector("[data-shell-rail]")).toBeNull();
    });
  }
});

describe("S565 studio tab stories — scene", () => {
  it("every studio tab story is declared", () => {
    expect(Object.keys(STUDIO_TAB_STORIES).sort()).toEqual(["advanced", "audio", "chat", "images", "rerank"]);
  });
  it("the studio chat story matches the shipped capture", () => {
    expect(STUDIO_TAB_STORIES.chat.headings).toContain("Chat workspace");
  });
});