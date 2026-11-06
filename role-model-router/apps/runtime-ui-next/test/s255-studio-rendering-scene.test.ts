import { describe, test } from "vitest";

import { expect, given, label, scene, text } from "@role-model-router/foldkit/scene";

import { type StudioTab, studioIdle } from "../src/studio";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S255: the rendering half of the s46a Studio test, driven through the real view.
 *
 * The reference Studio page renders one workspace at a time (the tab is selected by the route
 * query), so each assertion gives the model a tab and checks the workspace cards, fields and
 * result-stage heading that page now paints. No client and no DOM click are needed here; s46a
 * owns the real fetch and request-shape assertions.
 */
const model = (tab: StudioTab) =>
  shellModel({
    route: { _tag: "Studio" },
    studio: studioIdle(tab),
  });

const workspaces: ReadonlyArray<{
  readonly tab: StudioTab;
  readonly requestTitle: string;
  readonly resultTitle: string;
  readonly fields: readonly string[];
  readonly run: string;
}> = [
  {
    tab: "chat",
    requestTitle: "Request",
    resultTitle: "Result workspace",
    fields: ["Model", "Prompt"],
    run: "Run request",
  },
  {
    tab: "images",
    requestTitle: "Image request modes",
    resultTitle: "Image result stage",
    fields: ["Mode", "Model", "Prompt", "Size"],
    run: "Run image request",
  },
  {
    tab: "audio",
    requestTitle: "Audio mode and request",
    resultTitle: "Audio result stage",
    fields: ["Mode", "Model", "Voice", "Input"],
    run: "Run audio request",
  },
  {
    tab: "rerank",
    requestTitle: "Rerank request",
    resultTitle: "Ranked results",
    fields: ["Contract", "Model", "Query", "Candidate documents"],
    run: "Submit rerank request",
  },
  {
    tab: "advanced",
    requestTitle: "Endpoint family",
    resultTitle: "Response workspace",
    fields: ["Family", "Model", "JSON payload"],
    run: "Submit advanced request",
  },
];

describe("S255 studio workspace rendering", () => {
  for (const { tab, requestTitle, resultTitle, fields, run } of workspaces) {
    test(`renders the ${tab} workspace cards, fields and result stage`, () => {
      scene(
        { update: shellUpdate, view },
        given(model(tab)),
        expect(text(requestTitle)).toExist(),
        expect(text(resultTitle)).toExist(),
        expect(text(run)).toExist(),
        ...fields.map((field) => expect(label(field)).toExist()),
      );
    });
  }

  test("chat idle state shows the honest no-result text", () => {
    scene(
      { update: shellUpdate, view },
      given(model("chat")),
      expect(text("No result yet.")).toExist(),
    );
  });
});
