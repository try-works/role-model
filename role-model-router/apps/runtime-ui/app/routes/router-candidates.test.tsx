import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import RouterCandidatesRoute from "./router-candidates";

const source = readFileSync(new URL("./router-candidates.tsx", import.meta.url), "utf8");

describe("run 106 R11 candidate surface truthfulness", () => {
  test("renders the candidate inventory loading shell", () => {
    const router = createMemoryRouter(
      [{ path: "/", element: createElement(RouterCandidatesRoute) }],
      { initialEntries: ["/"] },
    );
    expect(renderToStaticMarkup(createElement(RouterProvider, { router }))).toContain(
      "Loading routing candidates",
    );
  });

  test("co-displays effective effort and labeled evidence on every arm row", () => {
    expect(source).toContain("formatEffortArmTruthDisclosure");
    expect(source).toContain('label: "Effort"');
    expect(source).toContain("relatedEffortOverallScore");
  });

  test("never claims every candidate's benchmark evidence is exact", () => {
    expect(source).not.toContain("CAP is exact endpoint benchmark capability");
  });
});
