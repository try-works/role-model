import { Schema } from "effect";
import { describe, test } from "vitest";

import { expect, given, keydown, label, role, scene, text } from "@role-model-router/foldkit/scene";

import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { Model } from "../src/model";
import { idleObservability } from "../src/observability";
import { emptyReadbacks } from "../src/readback";
import { initialRuntimeRefreshState } from "../src/refresh";
import { studioIdle, type StudioTab } from "../src/studio";
import { createUpdate } from "../src/update";
import { view } from "../src/view";

/**
 * S255: the rendering half of the s46a Studio test, driven through the real view.
 *
 * s46a used five tab clicks and one Run click per tab to prove which fields and which idle response text
 * each tab paints. The rendering is a function of the Studio state, so it is asserted here with no DOM click
 * and no client (S249: scene may replace rendering assertions). s46a keeps the wiring assertions that need a
 * real client. The S254 request-shape test owns the click-to-request mapping.
 */
const noop = undefined as never;
const update = createUpdate(noop, undefined, undefined, undefined, undefined, undefined, undefined, undefined) as unknown as (
  model: unknown,
  message: unknown,
) => { commands?: readonly unknown[]; model: unknown };

const model = (tab: StudioTab) =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: emptyControls(),
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Studio" },
    studio: studioIdle(tab),
    theme: "dark",
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
      { update, view } as never,
      given(model("chat") as never),
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
        { update, view } as never,
        given(model(tab) as never),
        expect(role("tab", { name, selected: true })).toExist(),
        expect(role("tabpanel", { name: tab })).toExist(),
        expect(label(field)).toExist(),
      );
    });
  }

  test("ArrowRight moves the selection to the next tab and paints its fields", () => {
    scene(
      { update, view } as never,
      given(model("chat") as never),
      keydown(role("tab", { name: "Chat" }), "ArrowRight"),
      expect(role("tab", { name: "Images", selected: true })).toExist(),
      expect(role("tabpanel", { name: "images" })).toExist(),
      expect(label("Size")).toExist(),
    );
  });
});
