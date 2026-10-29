import { Option } from "effect";

import { childAttributes } from "@role-model-router/foldkit/html";
import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import * as Listbox from "@role-model-router/foldkit-ui/listbox";

/**
 * Workspace W1b (S491/S496): the real Foldkit Listbox facade for the two
 * Requests ranking selects. The parent keeps the selected value in its existing
 * RequestsRankingState; this module wraps the vendored single-select Listbox
 * view/update and maps its Selected OutMessage back to the parent's existing
 * Message.
 */
export const requestsMetricListbox = Listbox.create<string>();

export type RequestsMetricListboxModel = Listbox.Model;

export const initRequestsMetricListbox = (): RequestsMetricListboxModel =>
  Listbox.init({ id: "requests-ranking-metric" });

export const initRequestsTargetListbox = (): RequestsMetricListboxModel =>
  Listbox.init({ id: "requests-ranking-target" });

export interface RequestsMetricListboxOption {
  readonly label: string;
  readonly value: string;
}

const requestsListboxView = <ParentMessage>(
  id: "requests-ranking-metric" | "requests-ranking-target",
  dataAttribute: "ranking-metric-option" | "ranking-target-option",
  config: {
    readonly model: Listbox.Model;
    readonly selected: string;
    readonly options: readonly RequestsMetricListboxOption[];
    readonly toParentMessage: (message: Listbox.Message) => ParentMessage;
  },
  h: HtmlBuilder<ParentMessage>,
): Html => {
  const labels = new Map(config.options.map((option) => [option.value, option.label]));
  return h.submodel({
    slotId: id,
    model: config.model,
    view: requestsMetricListbox.view,
    viewInputs: {
      items: config.options.map((option) => option.value),
      itemToConfig: (value: string) => ({
        content: h.span([h.DataAttribute(dataAttribute, value)], [labels.get(value) ?? value]),
      }),
      buttonContent: h.span([h.DataAttribute(id === "requests-ranking-metric" ? "ranking-metric-value" : "ranking-target-value", "")], [
        labels.get(config.selected) ?? config.selected,
      ]),
      maybeSelectedValue: Option.some(config.selected),
      buttonAttributes: childAttributes([
        h.Style({ minHeight: "24px", minWidth: "24px" }),
      ]),
      anchor: { placement: "bottom-start" },
    },
    toParentMessage: config.toParentMessage,
  });
};

export const requestsMetricListboxView = <ParentMessage>(
  config: {
    readonly model: Listbox.Model;
    readonly selected: string;
    readonly options: readonly RequestsMetricListboxOption[];
    readonly toParentMessage: (message: Listbox.Message) => ParentMessage;
  },
  h: HtmlBuilder<ParentMessage>,
): Html => requestsListboxView("requests-ranking-metric", "ranking-metric-option", config, h);

export const requestsTargetListboxView = <ParentMessage>(
  config: {
    readonly model: Listbox.Model;
    readonly selected: string;
    readonly options: readonly RequestsMetricListboxOption[];
    readonly toParentMessage: (message: Listbox.Message) => ParentMessage;
  },
  h: HtmlBuilder<ParentMessage>,
): Html => requestsListboxView("requests-ranking-target", "ranking-target-option", config, h);
