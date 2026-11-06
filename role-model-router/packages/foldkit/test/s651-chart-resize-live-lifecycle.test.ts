import { Schema } from "effect";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { inertHtml } from "../dist/html.js";
import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import {
  CHART_LIFECYCLE_DISPOSITIONS,
  CHART_RESIZE_POLICY,
  view as chartView,
} from "../../ui/src/foldkit-chart";

setup();

/** R9/R10: resize policy, in-place live update, and the pure-SVG lifecycle matrix. */

const Message = defineMessageUnion({ ReplaceSeries: {} });
type Message = typeof Message.Type;
interface Model {
  readonly replaced: boolean;
}
const update = (model: Model, _message: Message): UpdateReturn<Model, Message> => ({
  model: { replaced: true },
});

const oldSeries = [
  {
    id: "local",
    label: "Local",
    points: [
      { label: "09:00", value: 12 },
      { label: "09:10", value: 9 },
    ],
  },
];
const newSeries = [
  {
    id: "remote",
    label: "Remote",
    points: [
      { label: "10:00", value: 30 },
      { label: "10:10", value: 40 },
    ],
  },
];

const view =
  (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
      [],
      [
        h.button(
          [h.Type("button"), h.OnClick(Message.ReplaceSeries()), h.DataAttribute("replace", "")],
          ["Replace"],
        ),
        chartView<Message>(
          {
            ariaLabel: "Requests by source",
            series: model.replaced ? newSeries : oldSeries,
            title: "Requests",
            yUnit: "req",
          },
          h,
        ),
      ],
    );

const config = {
  ariaLabel: "Requests by source",
  series: oldSeries,
  title: "Requests",
  yUnit: "req",
} as const;

describe("S651 chart resize policy", () => {
  it("uses CSS scaling, not a resize observer, and preserves a finite zero-size viewBox", () => {
    expect(CHART_RESIZE_POLICY).toBe("css");
    Scene.scene(
      { update, view },
      Scene.given({ replaced: false }),
      Scene.expect(Scene.selector("svg")).toHaveAccessibleName("Requests by source"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("data-chart-resize-policy", "css"),
      Scene.expect(Scene.selector("svg")).toHaveAttr(
        "preserveAspectRatio",
        "xMidYMid meet",
      ),
      Scene.expect(Scene.selector("svg")).toHaveAttr("viewBox", "0 0 640 220"),
      Scene.expect(Scene.selector("svg")).toHaveClass("w-full"),
    );
    const source = readFileSync(
      path.join(import.meta.dirname, "../../ui/src/foldkit-chart.ts"),
      "utf8",
    );
    for (const forbidden of [
      "ResizeObserver",
      "requestAnimationFrame",
      "getBoundingClientRect",
      "offsetWidth",
      "devicePixelRatio",
      "document.fonts",
      "canvas",
      "new Date",
      "Intl.DateTimeFormat",
    ]) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("updates the SAME chart instance in place and drops the obsolete series", () => {
    Scene.scene(
      { update, view },
      Scene.given({ replaced: false }),
      Scene.expectAll(Scene.all.selector("path.rm3-chart-series")).toHaveCount(1),
      Scene.expect(Scene.selector("svg")).toContainText("09:00"),
      Scene.click(Scene.selector("button[data-replace]")),
      Scene.expectHandled(),
      Scene.expectAll(Scene.all.selector("path.rm3-chart-series")).toHaveCount(1),
      Scene.expect(Scene.selector("svg")).toContainText("10:00"),
      Scene.expect(Scene.selector("svg")).not.toContainText("09:10"),
      Scene.expect(Scene.selector("svg")).toHaveAttr("data-chart-resize-policy", "css"),
    );
  });
});

describe("S651 pure-SVG lifecycle matrix", () => {
  it("declares a reviewed disposition for every lifecycle item", () => {
    expect(Object.keys(CHART_LIFECYCLE_DISPOSITIONS).sort()).toEqual([
      "canvasAnimation",
      "devicePixelRatioAndTimezone",
      "fontReadiness",
      "hiddenZeroSize",
      "mountUnmount",
      "repeatedMountHeap",
    ]);
    for (const disposition of Object.values(CHART_LIFECYCLE_DISPOSITIONS))
      expect(disposition.length).toBeGreaterThan(0);
  });

  it("is deterministic under changed DPR/timezone and repeated mounts (no ambient state)", () => {
    const render = () => JSON.stringify(chartView(config, inertHtml));
    const first = render();
    const globalWithDpr = globalThis as { devicePixelRatio?: number };
    const originalDpr = Object.getOwnPropertyDescriptor(globalWithDpr, "devicePixelRatio");
    Object.defineProperty(globalWithDpr, "devicePixelRatio", { configurable: true, value: 3 });
    const originalTz = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati";
    try {
      for (let mount = 0; mount < 50; mount += 1) expect(render()).toBe(first);
    } finally {
      process.env.TZ = originalTz;
      if (originalDpr === undefined) delete globalWithDpr.devicePixelRatio;
      else Object.defineProperty(globalWithDpr, "devicePixelRatio", originalDpr);
    }
  });
});
