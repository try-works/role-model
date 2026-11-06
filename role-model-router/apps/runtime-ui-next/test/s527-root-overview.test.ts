import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

const TITLES = [
  "Model pool",
  "Token usage over time",
  "Cache efficiency trend",
  "Effective cost over time",
  "Cost avoided over time",
  "Latency trend",
  "Success vs failure volume",
] as const;

describe("S527 root Runtime overview structural parity", () => {
  it("renders all seven reference sections and the candidate-space SVG axes", async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: shellModel({ route: { _tag: "Index" } }), commands: [] }),
          view,
        },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    const text = container.textContent ?? "";
    for (const title of TITLES) {
      expect(text).toContain(title);
    }
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(7);
    expect(container.querySelector("[data-candidate-space]")).not.toBeNull();
    expect(text).toContain("← Cost");
    expect(text).toContain("↑ Quality");
    expect(text).toContain("Speed →");
    expect(text).toContain("Candidates · route score (0–1)");
    expect(text).toContain("Time range");
    expect(text).toContain("Breakdown");
    expect(text).toContain("Source filter");
    expect(text).toContain("Status");
    expect(text).toContain("Difficulty");
  });
});
