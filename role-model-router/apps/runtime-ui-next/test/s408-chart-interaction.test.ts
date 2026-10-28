import { describe, expect, it } from "vitest";
import { chartPointKeyAction } from "@role-model/ui/foldkit-chart";
import { Url } from "@role-model-router/foldkit";
import { Option } from "effect";

import {
  chartInteractionForRoute,
  chartStateForReadback,
  emptyChartInteraction,
  hideChartTooltip,
  showChartPoint,
  toggleChartSeries,
} from "../src/chart-interaction";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S408: Overview token chart tooltip/toggle/Escape, route-change cleanup and honest status. */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString("http://localhost" + href));

const stateFor = (tag = "Index") => chartInteractionForRoute(emptyChartInteraction(tag), tag);
const modelWith = (state: ReturnType<typeof stateFor>) => shellModel({ chartInteraction: state });

describe("S408 chart keydown mapping", () => {
  it("maps Escape to hide and Enter/Space to show", () => {
    expect(chartPointKeyAction("Escape")).toBe("hide");
    expect(chartPointKeyAction("Enter")).toBe("show");
    expect(chartPointKeyAction(" ")).toBe("show");
    expect(chartPointKeyAction("Tab")).toBeNull();
  });
});

describe("S408 chart interaction state", () => {
  it("shows a tooltip by series+label and dismisses it (Escape path)", () => {
    const shown = showChartPoint(stateFor(), 0, "tokens", "12:00");
    expect(shown.tooltip).toEqual({ label: "12:00", seriesId: "tokens" });
    expect(hideChartTooltip(shown, 0).tooltip).toBeNull();
  });

  it("toggles the legend series and ignores a stale token", () => {
    const hidden = toggleChartSeries(stateFor(), 0, "tokens");
    expect(hidden.hiddenSeriesIds).toEqual(["tokens"]);
    expect(toggleChartSeries(hidden, 0, "tokens").hiddenSeriesIds).toEqual([]);
    expect(toggleChartSeries(stateFor(), 7, "tokens").hiddenSeriesIds).toEqual([]);
  });

  it("clears the tooltip and bumps the token on a route change; a late message is ignored", () => {
    const before = showChartPoint(stateFor("Index"), 0, "tokens", "12:00");
    const afterRoute = chartInteractionForRoute(before, "Models");
    expect(afterRoute.routeTag).toBe("Models");
    expect(afterRoute.tooltip).toBeNull();
    expect(afterRoute.token).toBe(1);
    expect(showChartPoint(afterRoute, 0, "tokens", "stale")).toBe(afterRoute);
  });

  it("maps readback status honestly", () => {
    const base = { message: "boom", rows: [], token: 1 } as const;
    expect(chartStateForReadback({ ...base, status: "idle" })).toEqual({ status: "loading" });
    expect(chartStateForReadback({ ...base, status: "loading" })).toEqual({ status: "loading" });
    expect(chartStateForReadback({ ...base, status: "error" })).toEqual({ message: undefined, reason: "boom", status: "error" });
    expect(chartStateForReadback({ ...base, status: "empty" })).toEqual({ status: "empty" });
    expect(chartStateForReadback({ ...base, status: "ok" })).toEqual({ status: "ready" });
  });
});

describe("S408 chart interaction update", () => {
  it("applies show/hide/toggle through the shell model with the token fence", () => {
    const model = modelWith(stateFor());
    const shown = shellUpdate(model, Message.ChartPointShown({ label: "12:00", seriesId: "tokens", token: 0 }));
    expect(shown.model.chartInteraction?.tooltip).toEqual({ label: "12:00", seriesId: "tokens" });
    const hidden = shellUpdate(shown.model, Message.ChartTooltipDismissed({ token: 0 }));
    expect(hidden.model.chartInteraction?.tooltip).toBeNull();
    const toggled = shellUpdate(hidden.model, Message.ChartSeriesToggled({ seriesId: "tokens", token: 0 }));
    expect(toggled.model.chartInteraction?.hiddenSeriesIds).toEqual(["tokens"]);
    const stale = shellUpdate(toggled.model, Message.ChartPointShown({ label: "late", seriesId: "tokens", token: 9 }));
    expect(stale.model.chartInteraction).toEqual(toggled.model.chartInteraction);
  });
});

describe("S409 route-transition integration", () => {
  it("resets the token and clears the tooltip on a real ChangedUrl navigation (away and back)", () => {
    const before = showChartPoint(stateFor("Index"), 0, "tokens", "12:00");
    const model = shellModel({ chartInteraction: before });
    const away = shellUpdate(model, Message.ChangedUrl({ url: urlOf("/models") }));
    expect(away.model.route._tag).toBe("Models");
    expect(away.model.chartInteraction?.routeTag).toBe("Models");
    expect(away.model.chartInteraction?.tooltip).toBeNull();
    expect(away.model.chartInteraction?.token).toBe(1);
    const back = shellUpdate(away.model, Message.ChangedUrl({ url: urlOf("/") }));
    expect(back.model.route._tag).toBe("Index");
    expect(back.model.chartInteraction?.routeTag).toBe("Index");
    expect(back.model.chartInteraction?.tooltip).toBeNull();
    expect(back.model.chartInteraction?.token).toBe(2);
  });
});
