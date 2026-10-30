import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { given, message, model as modelStep, story } from "@role-model-router/foldkit/story";
import { describe, expect, it } from "vitest";

import { shellModel, shellUpdate } from "./support/runtime-shell";
import type { Model } from "../src/model";
import { Message } from "../src/message";
import { view } from "../src/view";

/**
 * S566: the per-route STORY contract. Where S565 (scene) asserts what a page displays, this file
 * asserts the update-level story each page tells: a message changes the model the page renders
 * from, and the rendered page remains the reference-shaped one.
 *
 * The Foldkit Story runner refuses to continue with unresolved Commands, so the story steps use
 * the messages whose page handlers are pure state transitions (studio tab/field, controller
 * selection). The filter and window handlers dispatch a read Command by design; their model
 * transitions are asserted directly against the same reducer.
 */

const at = (route: Model["route"]): Model => shellModel({ route });

const render = async (model: Model): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model, commands: [] }),
        view,
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S566 page stories — update", () => {
  it("the studio tab story: selecting a tab changes the model and the rendered workspace", async () => {
    let selected: Model | undefined;
    story(
      shellUpdate,
      given(at({ _tag: "Studio" })),
      message(Message.StudioTabSelected({ tab: "images" })),
      modelStep((m: Model) => {
        expect(m.studio?.tab).toBe("images");
        selected = m;
      }),
    );
    expect(selected).toBeDefined();
    const container = await render(selected as Model);
    const headings = [...container.querySelectorAll("h1, h2, h3")].map((element) => (element.textContent ?? "").trim());
    expect(headings.join(" | ")).toContain("Images workspace");
  });

  it("the studio field story: a field edit lands on the model the panel renders", () => {
    story(
      shellUpdate,
      given(at({ _tag: "Studio" })),
      message(Message.StudioFieldChanged({ field: "prompt", value: "hello" })),
      modelStep((m: Model) => {
        expect(m.studio?.prompt).toBe("hello");
      }),
      message(Message.StudioFieldChanged({ field: "model", value: "gpt-5.4" })),
      modelStep((m: Model) => {
        expect(m.studio?.model).toBe("gpt-5.4");
        expect(m.studio?.prompt).toBe("hello");
      }),
    );
  });

  it("the controller selection story: the models page selection is model state", () => {
    story(
      shellUpdate,
      given(at({ _tag: "Models" })),
      message(Message.ControllerEndpointSelected({ endpointId: "ep-1" })),
      modelStep((m: Model) => {
        expect(m.controls.controlController.selectedEndpointId).toBe("ep-1");
      }),
    );
  });

  it("the overview filter story: the reducer applies the filter the page renders from", () => {
    const next = shellUpdate(at({ _tag: "Index" }), Message.OverviewFilterChanged({ filter: "source", value: "local" }));
    expect(next.model.overviewFilters?.source).toBe("local");
    const after = shellUpdate(next.model, Message.OverviewFilterChanged({ filter: "status", value: "failure" }));
    expect(after.model.overviewFilters?.source).toBe("local");
    expect(after.model.overviewFilters?.status).toBe("failure");
  });

  it("the overview window story: the reducer applies the selected window", () => {
    const next = shellUpdate(at({ _tag: "Index" }), Message.SelectedOverviewWindow({ windowMs: 604800000 }));
    expect(next.model.overviewWindowMs).toBe(604800000);
  });
});
