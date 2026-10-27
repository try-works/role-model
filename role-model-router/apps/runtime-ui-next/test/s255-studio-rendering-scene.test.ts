import { describe, test } from "vitest";

import { expect, given, keydown, label, role, scene, text } from "@role-model-router/foldkit/scene";

import { studioIdle, type StudioTab } from "../src/studio";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S255: the rendering half of the s46a Studio test, driven through the real view.
 *
 * s46a used five tab clicks and one Run click per tab to prove which fields and which idle response text
 * each tab paints. The rendering is a function of the Studio state, so it is asserted here with no DOM click
 * and no client (S249: scene may replace rendering assertions). s46a keeps the wiring assertions that need a
 * real client. The S254 request-shape test owns the click-to-request mapping.
 *
 * S260: `update`, `view`, and the `StudioTab`-keyed model are inferred from src types. The ArrowRight
 * step also runs the real `StudioTabKey` reducer instead of a stubbed update.
 */
const model = (tab: StudioTab) =>
  shellModel({
    route: { _tag: "Studio" },
    studio: studioIdle(tab),
  });

const tabPanels: ReadonlyArray<{ readonly field: string; readonly name: string; readonly tab: StudioTab }> = [
  { field: "Prompt", name: "Chat", tab: "chat" },
  { field: "Size", name: "Images", tab: "images" },
  { field: "Prompt", name: "Audio", tab: "audio" },
  { field: "Query", name: "Rerank", tab: "rerank" },
  { field: "JSON body", name: "Advanced APIs", tab: "advanced" },
];

describe("S255 studio tab rendering", () => {
  test("renders five tabs with the chat tab selected and the idle raw response", () => {
    scene(
      { update: shellUpdate, view },
      given(model("chat")),
      expect(role("tab", { name: "Chat", selected: true })).toExist(),
      expect(role("tab", { name: "Images" })).toExist(),
      expect(role("tab", { name: "Audio" })).toExist(),
      expect(role("tab", { name: "Rerank" })).toExist(),
      expect(role("tab", { name: "Advanced APIs" })).toExist(),
      expect(role("tablist", { name: "Studio tabs" })).toExist(),
      expect(role("tabpanel", { name: "chat" })).toExist(),
      expect(text("RAW RESPONSE")).toExist(),
      expect(text("Run a Studio request to see the raw response.")).toExist(),
    );
  });

  for (const { field, name, tab } of tabPanels) {
    test(`renders the ${tab} field set and panel`, () => {
      scene(
        { update: shellUpdate, view },
        given(model(tab)),
        expect(role("tab", { name, selected: true })).toExist(),
        expect(role("tabpanel", { name: tab })).toExist(),
        expect(label(field)).toExist(),
      );
    });
  }

  test("ArrowRight moves the selection to the next tab and paints its fields", () => {
    scene(
      { update: shellUpdate, view },
      given(model("chat")),
      keydown(role("tab", { name: "Chat" }), "ArrowRight"),
      expect(role("tab", { name: "Images", selected: true })).toExist(),
      expect(role("tabpanel", { name: "images" })).toExist(),
      expect(label("Size")).toExist(),
    );
  });
});
